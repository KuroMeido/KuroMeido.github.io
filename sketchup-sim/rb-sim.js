/*
 * pyKuro SketchUp preview - Ruby reader + SketchUp simulator (no 3D here, see viewer.js).
 *
 * It does NOT run arbitrary Ruby. It reads the script that SketchUpRubyWriter.cs writes:
 *   - the helper library "module PyKuroCad2Su ... end" (checked against the expected signatures),
 *   - the main block: model / start_operation / begin / PyKuroCad2Su.reset / root group /
 *     PyKuroCad2Su.layer(...) / PyKuroCad2Su.trees(...) / commit_operation / zoom_extents / puts / rescue ... end.
 * Any other statement is reported as "not supported" (it is NOT executed).
 *
 * The helpers are then replayed with the same rules SketchUp would apply (add_face needs >= 3 distinct, non collinear
 * points; holes are cut only when they lie inside the outline; pushpull only when the height is > 0.5 mm; tree sizes are
 * rounded to 250 mm and definitions are shared by size; materials are shared by tag name ...). The result says what
 * SketchUp would build, what it would skip (the "skipped" count printed by the script) and what aborts the whole script.
 *
 * Works in the browser (window.PyKuroSim) and in Node (module.exports) for tests.
 */
(function (root) {
  'use strict';

  var SU_TOL = 0.0254;          // SketchUp merges points closer than 0.001 inch (mm)
  var SHORT_EDGE = 1.0;         // edges shorter than this (mm) are reported as a risk

  // ------------------------------------------------------------------ lexer

  function lex(src, lineOffset) {
    var toks = [], i = 0, line = 1 + (lineOffset || 0), n = src.length;
    function push(t, v, l) { toks.push({ t: t, v: v, line: l === undefined ? line : l }); }
    while (i < n) {
      var c = src[i];
      if (c === '\n') { push('nl', '\n'); line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r' || c === '﻿') { i++; continue; }
      if (c === '\\' && src[i + 1] === '\n') { i += 2; line++; continue; }
      if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === "'") {
        var s = '', j = i + 1, startLine = line;
        while (j < n && src[j] !== "'") {
          if (src[j] === '\\' && (src[j + 1] === "'" || src[j + 1] === '\\')) { s += src[j + 1]; j += 2; continue; }
          if (src[j] === '\n') line++;
          s += src[j]; j++;
        }
        if (j >= n) throw syntax('Chuỗi \'...\' không đóng', startLine);
        push('str', s, startLine); i = j + 1; continue;
      }
      if (c === '"') {
        var j2 = i + 1, startLine2 = line;
        while (j2 < n && src[j2] !== '"') { if (src[j2] === '\\') j2++; if (src[j2] === '\n') line++; j2++; }
        if (j2 >= n) throw syntax('Chuỗi "..." không đóng', startLine2);
        push('dstr', src.slice(i + 1, j2), startLine2); i = j2 + 1; continue;
      }
      var prev = toks.length ? toks[toks.length - 1] : null;
      var numStart = /[0-9]/.test(c) ||
        (c === '-' && /[0-9.]/.test(src[i + 1] || '') && (!prev || prev.t === 'nl' || prev.v === '(' || prev.v === '[' || prev.v === ',' || prev.v === '='));
      if (numStart) {
        var m = /^-?(?:\d[\d_]*)?(?:\.\d+)?(?:[eE][-+]?\d+)?/.exec(src.slice(i, i + 64));
        if (m && m[0] !== '-' && m[0] !== '') {
          push('num', parseFloat(m[0].replace(/_/g, ''))); i += m[0].length; continue;
        }
      }
      var id = /^[A-Za-z_][A-Za-z0-9_]*[?!]?/.exec(src.slice(i, i + 128));
      if (id) { push('id', id[0]); i += id[0].length; continue; }
      if (src.substr(i, 2) === '=>' || src.substr(i, 2) === '::' || src.substr(i, 2) === '==') { push('p', src.substr(i, 2)); i += 2; continue; }
      if ('()[],.={}|+-*/<>&!:;'.indexOf(c) >= 0) { push('p', c); i++; continue; }
      throw syntax('Ký tự không đọc được: ' + JSON.stringify(c), line);
    }
    push('nl', '\n');
    return toks;
  }

  function syntax(msg, line) { var e = new Error(msg); e.rbLine = line; e.syntax = true; return e; }

  // split tokens into statements: a newline at bracket depth 0 ends one (';' too)
  function statements(toks) {
    var out = [], cur = [], depth = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.t === 'p' && (t.v === '(' || t.v === '[' || t.v === '{')) depth++;
      if (t.t === 'p' && (t.v === ')' || t.v === ']' || t.v === '}')) {
        depth--;
        if (depth < 0) throw syntax('Thừa dấu đóng ngoặc "' + t.v + '"', t.line);
      }
      if ((t.t === 'nl' || (t.t === 'p' && t.v === ';')) && depth === 0) {
        if (cur.length) out.push(cur);
        cur = [];
        continue;
      }
      if (t.t !== 'nl') cur.push(t);
    }
    if (depth > 0) throw syntax('Thiếu dấu đóng ngoặc ở cuối file', cur.length ? cur[0].line : 0);
    if (cur.length) out.push(cur);
    return out;
  }

  // Ruby literal: number | 'string' | nil | true | false | identifier | [ literal, ... (trailing comma ok) ]
  function parseValue(tk, pos) {
    var t = tk[pos];
    if (!t) throw syntax('Thiếu giá trị', tk.length ? tk[tk.length - 1].line : 0);
    if (t.t === 'num') return { v: t.v, pos: pos + 1 };
    if (t.t === 'str') return { v: t.v, pos: pos + 1 };
    if (t.t === 'id') {
      if (t.v === 'nil') return { v: null, pos: pos + 1 };
      if (t.v === 'true') return { v: true, pos: pos + 1 };
      if (t.v === 'false') return { v: false, pos: pos + 1 };
      return { v: { ref: t.v }, pos: pos + 1 };
    }
    if (t.t === 'p' && t.v === '[') {
      var arr = [], p = pos + 1;
      if (tk[p] && tk[p].v === ']') return { v: arr, pos: p + 1 };
      for (;;) {
        var r = parseValue(tk, p);
        arr.push(r.v); p = r.pos;
        var s = tk[p];
        if (!s) throw syntax('Mảng [...] không đóng', t.line);
        if (s.v === ']') return { v: arr, pos: p + 1 };
        if (s.v !== ',') throw syntax('Cần "," hoặc "]" nhưng gặp "' + s.v + '"', s.line);
        p++;
        if (tk[p] && tk[p].v === ']') return { v: arr, pos: p + 1 };   // trailing comma
      }
    }
    throw syntax('Giá trị không hỗ trợ: "' + t.v + '"', t.line);
  }

  function parseArgs(tk, pos) {     // tk[pos] === '('
    var args = [], p = pos + 1;
    if (tk[p] && tk[p].v === ')') return { args: args, pos: p + 1 };
    for (;;) {
      var r = parseValue(tk, p);
      args.push(r.v); p = r.pos;
      var s = tk[p];
      if (!s) throw syntax('Lời gọi hàm thiếu ")"', tk[pos].line);
      if (s.v === ')') return { args: args, pos: p + 1 };
      if (s.v !== ',') throw syntax('Cần "," hoặc ")" nhưng gặp "' + s.v + '"', s.line);
      p++;
    }
  }

  function canon(st) {
    return st.map(function (t) { return t.t === 'str' ? "'" + t.v + "'" : t.t === 'dstr' ? '"' + t.v + '"' : String(t.v); }).join(' ');
  }

  // ------------------------------------------------------------------ geometry (mm)

  function ringPts(flat) {
    var pts = [];
    for (var i = 0; i + 1 < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
    return pts;
  }
  function signedArea(p) {
    var a = 0;
    for (var i = 0, n = p.length; i < n; i++) { var q = p[i], r = p[(i + 1) % n]; a += q[0] * r[1] - r[0] * q[1]; }
    return a / 2;
  }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function orient(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
  function segX(a, b, c, d) {   // proper or touching intersection of two segments
    var d1 = orient(c, d, a), d2 = orient(c, d, b), d3 = orient(a, b, c), d4 = orient(a, b, d);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    return false;
  }
  function selfIntersects(p) {
    var n = p.length;
    if (n < 4 || n > 3000) return false;
    for (var i = 0; i < n; i++) {
      var a = p[i], b = p[(i + 1) % n];
      for (var j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        if (segX(a, b, p[j], p[(j + 1) % n])) return true;
      }
    }
    return false;
  }
  function ringsCross(p, q) {
    if (p.length * q.length > 4e6) return false;
    for (var i = 0; i < p.length; i++)
      for (var j = 0; j < q.length; j++)
        if (segX(p[i], p[(i + 1) % p.length], q[j], q[(j + 1) % q.length])) return true;
    return false;
  }
  function inside(pt, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function bbox(p) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    p.forEach(function (q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); });
    return b;
  }

  /** What SketchUp's add_face does with this flat [x,y,...] list: null when fine, otherwise the reason it fails. */
  function faceProblem(flat) {
    if (!Array.isArray(flat)) return 'không phải mảng tọa độ';
    for (var k = 0; k < flat.length; k++) if (typeof flat[k] !== 'number') return 'tọa độ thứ ' + (k + 1) + ' không phải số';
    if (flat.length % 2) return 'số lượng tọa độ lẻ (' + flat.length + ') - thiếu một giá trị Y';
    var p = ringPts(flat);
    if (p.length < 3) return 'chỉ có ' + p.length + ' điểm (add_face cần ít nhất 3)';
    for (var i = 0; i < p.length; i++)
      for (var j = i + 1; j < p.length; j++)
        if (dist(p[i], p[j]) < SU_TOL) return 'điểm trùng nhau (#' + (i + 1) + ' và #' + (j + 1) + ' tại ' + p[i][0] + ', ' + p[i][1] + ') - SketchUp báo "Duplicate points"';
    var a = Math.abs(signedArea(p)), per = 0;
    for (var e = 0; e < p.length; e++) per += dist(p[e], p[(e + 1) % p.length]);
    if (selfIntersects(p)) return 'đường bao tự cắt nhau - SketchUp không tạo được một mặt đúng';
    if (a < 1e-6 * per * per || a < 1) return 'các điểm thẳng hàng / diện tích bằng 0 - không tạo được mặt';
    return null;
  }

  // ------------------------------------------------------------------ simulator

  var LIB_CHECKS = [
    ['def self.layer(root, tag_name, rgb, bands, shapes)', 'hàm layer'],
    ['def self.trees(root, tag_name, rgb, z0, h, list)', 'hàm trees'],
    ['def self.solid(ents, outer, holes, z0, z1, tag, mat)', 'hàm solid'],
    ['def self.tree_def(model, r, h, crown, trunk)', 'hàm tree_def'],
    ['face.pushpull((z1 - z0).mm) if z1 - z0 > 0.5', 'quy tắc pushpull > 0.5 mm'],
    ['z1 = top if top && i == bands.length - 1', 'quy tắc chiều cao theo số tầng'],
    ['r = [(list[i + 2] / 250.0).round * 250.0, 250.0].max', 'làm tròn bán kính cây 250 mm'],
    ['d = tree_def(model, r, [h, 2.2 * r].max, crown, trunk)', 'chiều cao cây tối thiểu 2.2 R'],
    ['trunk_h = [h - 1.6 * r, h * 0.3].max', 'chiều cao thân cây'],
  ];

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

  function simulate(text) {
    var res = {
      ok: true, fatal: null, console: [], issues: [], unsupported: [],
      rootName: null, tags: {}, tagOrder: [], materials: {}, definitions: {}, objects: [], failed: [],
      count: 0, errors: 0, stats: { shapes: 0, bands: 0, trees: 0, lines: 0 },
    };
    function issue(level, line, msg, obj) { res.issues.push({ level: level, line: line, msg: msg, obj: obj === undefined ? null : obj }); }

    text = String(text || '').replace(/\r\n?/g, '\n');
    var lines = text.split('\n');
    res.stats.lines = lines.length;

    // ---- library block
    var libStart = -1, libEnd = -1;
    for (var i = 0; i < lines.length; i++) {
      if (libStart < 0 && /^module\s+PyKuroCad2Su\s*$/.test(lines[i])) libStart = i;
      else if (libStart >= 0 && /^end\s*$/.test(lines[i])) { libEnd = i; break; }
    }
    if (libStart < 0 || libEnd < 0) {
      issue('error', 1, 'Không tìm thấy thư viện "module PyKuroCad2Su ... end". Đây không phải file do CmdCadToSketchUp xuất ra - SketchUp sẽ báo NameError ở lời gọi PyKuroCad2Su đầu tiên.');
    } else {
      var lib = norm(lines.slice(libStart, libEnd + 1).join('\n'));
      LIB_CHECKS.forEach(function (c) {
        if (lib.indexOf(norm(c[0])) < 0)
          issue('warn', libStart + 1, 'Thư viện Ruby khác bản chuẩn (' + c[1] + ': không thấy "' + c[0] + '"). Trang này vẫn giả lập theo bản chuẩn, kết quả trong SketchUp có thể khác.');
      });
    }
    var hasLib = libStart >= 0 && libEnd >= 0;

    // ---- main statements (everything outside the library)
    var mainSrc = lines.map(function (l, k) { return hasLib && k >= libStart && k <= libEnd ? '' : l; }).join('\n');
    var sts;
    try { sts = statements(lex(mainSrc)); }
    catch (e) {
      res.ok = false;
      res.fatal = { line: e.rbLine || 0, msg: 'Lỗi cú pháp Ruby: ' + e.message };
      res.console.push('SyntaxError (dòng ' + (e.rbLine || '?') + '): ' + e.message);
      return res;
    }

    var vars = {}, began = false, depthBegin = 0, inRescue = false, didReset = false, committed = false;
    var rescueSeen = false;

    for (var s = 0; s < sts.length; s++) {
      var st = sts[s], line = st[0].line, c = canon(st);
      if (inRescue) {   // rescue branch only runs on failure: just check it
        if (c === 'end') { inRescue = false; depthBegin--; continue; }
        if (!/^(model \. abort_operation|raise|puts .*)$/.test(c)) res.unsupported.push({ line: line, code: c });
        continue;
      }
      if (/^model = Sketchup \. active_model$/.test(c)) { vars.model = 'model'; continue; }
      if (/^model \. start_operation \( '.*' , (true|false) \)$/.test(c)) { needVar('model', line); continue; }
      if (c === 'begin') { began = true; depthBegin++; continue; }
      if (c === 'PyKuroCad2Su . reset') { didReset = true; continue; }
      if (/^root = model \. active_entities \. add_group$/.test(c)) { needVar('model', line); vars.root = 'root'; continue; }
      if (st.length === 5 && st[0].v === 'root' && st[1].v === '.' && st[2].v === 'name' && st[3].v === '=' && st[4].t === 'str') {
        needVar('root', line); res.rootName = st[4].v; continue;
      }
      if (st[0].v === 'PyKuroCad2Su' && st[1] && st[1].v === '.' && st[2] && (st[2].v === 'layer' || st[2].v === 'trees')) {
        if (!hasLib) { fatal(line, "NameError: uninitialized constant PyKuroCad2Su"); break; }
        if (!st[3] || st[3].v !== '(') { res.unsupported.push({ line: line, code: c }); continue; }
        var parsed;
        try { parsed = parseArgs(st, 3); }
        catch (e) { fatal(e.rbLine || line, 'Lỗi cú pháp trong lời gọi ' + st[2].v + ': ' + e.message); break; }
        if (parsed.pos !== st.length) { res.unsupported.push({ line: line, code: c }); continue; }
        if (!didReset) issue('warn', line, 'Gọi ' + st[2].v + ' trước PyKuroCad2Su.reset: @count/@errors là nil, phép "+= 1" sẽ lỗi.');
        var ok = st[2].v === 'layer' ? doLayer(parsed.args, line) : doTrees(parsed.args, line);
        if (!ok) break;
        continue;
      }
      if (c === 'model . commit_operation') { committed = true; continue; }
      if (c === 'model . active_view . zoom_extents') continue;
      if (/^puts /.test(c)) {
        res.console.push(st.slice(1).map(function (t) { return t.t === 'dstr' ? t.v : t.v; }).join(' ')
          .replace(/#\{PyKuroCad2Su\.count\}/g, '{count}').replace(/#\{PyKuroCad2Su\.errors\}/g, '{errors}'));
        continue;
      }
      if (/^rescue( StandardError)?( => e)?$/.test(c)) { inRescue = true; rescueSeen = true; continue; }
      if (c === 'end') { depthBegin--; continue; }
      res.unsupported.push({ line: line, code: c.length > 120 ? c.slice(0, 120) + ' …' : c });
    }

    if (res.fatal) {
      res.ok = false;
      res.console = ['pyKuro: failed - ' + res.fatal.msg, 'Toàn bộ thao tác bị hủy (abort_operation) - SketchUp không giữ lại đối tượng nào.'];
      return res;
    }

    if (!began || !rescueSeen) issue('info', 1, 'Không có khối begin/rescue: nếu có lỗi, SketchUp sẽ không tự hủy thao tác dở dang.');
    if (depthBegin !== 0) issue('warn', lines.length, 'Số "begin"/"end" không khớp ở phần chính của script.');
    if (!committed) issue('warn', lines.length, 'Thiếu model.commit_operation: thao tác chưa được ghi lại (Undo không gom thành một bước).');
    res.unsupported.forEach(function (u) {
      issue('warn', u.line, 'Lệnh chưa được giả lập (bỏ qua, KHÔNG chạy): ' + u.code);
    });

    // materials are shared by name: the last colour set wins for every object using it
    Object.keys(res.tags).forEach(function (k) {
      var t = res.tags[k];
      if (t.colors.length > 1) {
        var uniq = t.colors.filter(function (v, idx, a) { return a.findIndex(function (w) { return w.join() === v.join(); }) === idx; });
        if (uniq.length > 1) issue('warn', t.lines[t.lines.length - 1], 'Tag "' + k + '" được dùng ở ' + t.colors.length + ' lớp với màu khác nhau: vật liệu dùng chung theo tên nên mọi đối tượng sẽ lấy màu cuối cùng rgb(' + t.colors[t.colors.length - 1].join(', ') + ').');
      }
    });

    var tmpl = res.console.length ? res.console : ['pyKuro: done (#{count} objects, #{errors} skipped)'];
    res.console = tmpl.map(function (l) { return l.replace('{count}', res.count).replace('{errors}', res.errors); });
    return res;

    // ---------------- helpers (closures)
    function needVar(name, line) { if (!vars[name]) issue('warn', line, 'Biến "' + name + '" được dùng trước khi gán.'); }
    function fatal(line, msg) { res.fatal = { line: line, msg: msg }; }

    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function isRgb(v) { return Array.isArray(v) && v.length === 3 && v.every(function (x) { return isNum(x); }); }

    function tagOf(name, rgb, line) {
      var t = res.tags[name];
      if (!t) {
        t = res.tags[name] = { name: name, colors: [], lines: [], objects: 0, skipped: 0, expected: 0, area: 0, zmin: Infinity, zmax: -Infinity,
                               kind: 'layer', display: [], sources: [], heights: {} };
        res.tagOrder.push(name);
      }
      // the writer puts "# <standard layer> <- <CAD layers>" on the line before each call
      var cm = /^\s*#\s*(.*?)\s*<-\s*(.*)$/.exec(lines[line - 2] || '');
      if (cm) {
        if (t.display.indexOf(cm[1]) < 0) t.display.push(cm[1]);
        cm[2].split(',').forEach(function (x) { x = x.trim(); if (x && t.sources.indexOf(x) < 0) t.sources.push(x); });
      }
      t.colors.push(rgb.map(function (x) { return Math.max(0, Math.min(255, Math.round(x))); }));
      t.lines.push(line);
      res.materials[name] = t.colors[t.colors.length - 1];
      return t;
    }

    function doLayer(a, line) {
      if (a.length !== 5) { fatal(line, 'ArgumentError: wrong number of arguments (given ' + a.length + ', expected 5) - PyKuroCad2Su.layer'); return false; }
      if (!a[0] || a[0].ref !== 'root' || !vars.root) issue('warn', line, 'Đối số đầu của layer phải là biến root (group gốc).');
      if (typeof a[1] !== 'string') { fatal(line, 'TypeError: tên tag phải là chuỗi'); return false; }
      if (!isRgb(a[2])) { fatal(line, 'ArgumentError: màu phải là [r, g, b] - Sketchup::Color.new lỗi'); return false; }
      var bands = a[3], shapes = a[4];
      if (!Array.isArray(bands) || !bands.every(function (b) { return Array.isArray(b) && b.length >= 2 && isNum(b[0]) && isNum(b[1]); })) {
        fatal(line, 'Danh sách cao độ (bands) không đúng dạng [[z0, z1], ...]'); return false;
      }
      if (!Array.isArray(shapes)) { fatal(line, 'NoMethodError: danh sách hình (shapes) không phải mảng'); return false; }
      if (bands.length === 0) issue('warn', line, 'Tag "' + a[1] + '": bands rỗng - không tạo đối tượng nào.');
      var tag = tagOf(a[1], a[2], line);
      tag.expected += shapes.length * bands.length;
      tag.bands = bands.map(function (b) { return [b[0], b[1]]; });
      if (a[1].trim() === '') issue('warn', line, 'Tên tag rỗng.');
      for (var si = 0; si < shapes.length; si++) {
        var sh = shapes[si];
        if (!Array.isArray(sh)) { fatal(line, 'Hình thứ ' + (si + 1) + ' của tag "' + a[1] + '" không phải mảng [outer, holes, top]'); return false; }
        var outer = sh[0], holes = sh[1] === undefined ? null : sh[1], top = sh[2] === undefined ? null : sh[2];
        if (!Array.isArray(holes)) { fatal(line, 'NoMethodError: undefined method `each\' - hình thứ ' + (si + 1) + ' của tag "' + a[1] + '" thiếu danh sách lỗ'); return false; }
        if (top !== null && !isNum(top)) { fatal(line, 'Cao độ đỉnh của hình thứ ' + (si + 1) + ' không phải số'); return false; }
        res.stats.shapes++;
        var shLine = shapeLine(line, si);
        for (var bi = 0; bi < bands.length; bi++) {
          var z0 = bands[bi][0], z1 = bands[bi][1];
          if (top !== null && bi === bands.length - 1) {
            z1 = top;
            if (top < z0) issue('warn', shLine, 'Tag "' + a[1] + '" hình ' + (si + 1) + ': cao độ theo số tầng (' + top + ') thấp hơn đáy (' + z0 + ') - chỉ tạo mặt phẳng.');
          }
          res.stats.bands++;
          solid(tag, a[1], outer, holes, z0, z1, shLine, si);
        }
      }
      return true;
    }

    // approximate line of shape si inside a multi-line layer call: writer puts one shape per line after the call line
    function shapeLine(callLine, si) {
      var l = callLine + 1 + si;
      return l <= lines.length && /^\s*\[\[/.test(lines[l - 1] || '') ? l : callLine;
    }

    function solid(tag, tagName, outer, holes, z0, z1, line, si) {
      var why = faceProblem(outer);
      var base = { tag: tagName, line: line, shape: si + 1, z0: z0, z1: z1 };
      if (why) {
        res.errors++; tag.skipped++;
        var f = Object.assign({ kind: 'failed', reason: why, outer: Array.isArray(outer) ? ringPts(outer.filter(isNum)) : [] }, base);
        res.failed.push(f);
        issue('error', line, 'Tag "' + tagName + '" hình ' + (si + 1) + ': ' + why + ' → bị bỏ qua (tính vào "skipped").', f);
        return;
      }
      var o = ringPts(outer), ob = bbox(o), keep = [];
      holes.forEach(function (h, hi) {
        var hw = faceProblem(h);
        if (hw) { issue('warn', line, 'Tag "' + tagName + '" hình ' + (si + 1) + ', lỗ ' + (hi + 1) + ': ' + hw + ' → lỗ bị bỏ qua (hình vẫn được tạo, không có lỗ).'); return; }
        var hp = ringPts(h);
        if (ringsCross(o, hp)) { issue('warn', line, 'Tag "' + tagName + '" hình ' + (si + 1) + ', lỗ ' + (hi + 1) + ': lỗ cắt qua đường bao → SketchUp chia mặt, chỉ giữ mảnh lớn nhất (hình sẽ bị sai).'); return; }
        var allIn = hp.every(function (p) { return inside(p, o); });
        if (!allIn) { issue('warn', line, 'Tag "' + tagName + '" hình ' + (si + 1) + ', lỗ ' + (hi + 1) + ': lỗ nằm ngoài đường bao → không khoét được, còn sót cạnh thừa trong group.'); return; }
        for (var k = 0; k < keep.length; k++) if (ringsCross(keep[k], hp) || inside(hp[0], keep[k]) || inside(keep[k][0], hp)) {
          issue('warn', line, 'Tag "' + tagName + '" hình ' + (si + 1) + ', lỗ ' + (hi + 1) + ': chồng lên lỗ khác → kết quả khoét không chắc chắn.'); return;
        }
        keep.push(hp);
      });
      var shortest = Infinity;
      [o].concat(keep).forEach(function (r) { for (var e = 0; e < r.length; e++) shortest = Math.min(shortest, dist(r[e], r[(e + 1) % r.length])); });
      if (shortest < SHORT_EDGE) issue('info', line, 'Tag "' + tagName + '" hình ' + (si + 1) + ': có cạnh rất ngắn (' + shortest.toFixed(2) + ' mm) - SketchUp có thể không tạo được cạnh này.');
      var h = z1 - z0 > 0.5 ? z1 - z0 : 0;
      var area = Math.abs(signedArea(o)) - keep.reduce(function (s2, r) { return s2 + Math.abs(signedArea(r)); }, 0);
      var obj = Object.assign({ kind: 'solid', id: res.objects.length, outer: o, holes: keep, height: h, area: area, bbox: ob }, base);
      res.objects.push(obj);
      res.count++;
      tag.objects++;
      tag.area += area;
      var hk = (z0 / 1000).toFixed(2) + '→' + ((z0 + h) / 1000).toFixed(2);
      tag.heights[hk] = (tag.heights[hk] || 0) + 1;
      tag.zmin = Math.min(tag.zmin, z0); tag.zmax = Math.max(tag.zmax, z0 + h);
    }

    function doTrees(a, line) {
      if (a.length !== 6) { fatal(line, 'ArgumentError: wrong number of arguments (given ' + a.length + ', expected 6) - PyKuroCad2Su.trees'); return false; }
      if (typeof a[1] !== 'string') { fatal(line, 'TypeError: tên tag phải là chuỗi'); return false; }
      if (!isRgb(a[2])) { fatal(line, 'ArgumentError: màu phải là [r, g, b]'); return false; }
      if (!isNum(a[3]) || !isNum(a[4])) { fatal(line, 'Cao độ gốc / chiều cao cây không phải số'); return false; }
      var list = a[5];
      if (!Array.isArray(list)) { fatal(line, 'Danh sách cây không phải mảng'); return false; }
      var bad = list.findIndex(function (x) { return !isNum(x); });
      if (bad >= 0) { fatal(line, 'Giá trị thứ ' + (bad + 1) + ' trong danh sách cây không phải số (hàm trees không có rescue → cả script dừng)'); return false; }
      if (list.length % 3) { fatal(line, 'NoMethodError: undefined method `/\' for nil - danh sách cây có ' + list.length + ' số, không chia hết cho 3 (x, y, r)'); return false; }
      var tag = tagOf(a[1], a[2], line);
      tag.kind = 'trees';
      tag.expected += list.length / 3;
      var z0 = a[3], h = a[4];
      res.materials['pyKuro Tree Trunk'] = [110, 80, 50];
      for (var i = 0; i < list.length; i += 3) {
        var r = Math.max(rubyRound(list[i + 2] / 250.0) * 250.0, 250.0);
        var hh = Math.max(h, 2.2 * r);
        var key = 'pyKuro Tree R' + rubyRound(r) + ' H' + rubyRound(hh);
        var d = res.definitions[key];
        if (!d) {
          d = res.definitions[key] = {
            key: key, r: r, h: hh, trunkH: Math.max(hh - 1.6 * r, hh * 0.3), trunkR: Math.max(r * 0.1, 80.0),
            crownMat: a[1], instances: 0, line: line,
          };
        } else if (d.crownMat !== a[1]) {
          if (!d.warned) issue('warn', line, 'Định nghĩa cây "' + key + '" đã được tạo bởi tag "' + d.crownMat + '": cây cùng kích thước của tag "' + a[1] + '" dùng lại định nghĩa đó nên mang màu tán của "' + d.crownMat + '".');
          d.warned = true;
        }
        d.instances++;
        res.objects.push({ kind: 'tree', id: res.objects.length, tag: a[1], line: line, x: list[i], y: list[i + 1], z0: z0, def: key, rIn: list[i + 2] });
        res.count++; tag.objects++; res.stats.trees++;
        tag.zmin = Math.min(tag.zmin, z0); tag.zmax = Math.max(tag.zmax, z0 + hh);
      }
      return true;
    }
  }

  function rubyRound(x) { return x < 0 ? -Math.round(-x) : Math.round(x); }   // half away from zero

  var api = { simulate: simulate, lex: lex, statements: statements, faceProblem: faceProblem, signedArea: signedArea };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PyKuroSim = api;
})(typeof window !== 'undefined' ? window : this);
