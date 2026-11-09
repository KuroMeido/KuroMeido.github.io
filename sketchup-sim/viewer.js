/* SketchUp Sim - 3D view + panels. Reads with PyKuroSim (rb-sim.js), draws with three.js (r147, lib/). Z is up, 1 unit = 1 m. */
(function () {
  'use strict';
  var Sim = window.PyKuroSim;
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (v, d) { return Number(v).toLocaleString('vi-VN', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ------------------------------------------------------------------ three.js scene
  THREE.Object3D.DefaultUp.set(0, 0, 1);
  var view = $('view');
  var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  view.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = skyTexture();
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100000);
  camera.position.set(-60, -90, 70);
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.screenSpacePanning = true;
  controls.maxPolarAngle = Math.PI;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8d7a, 0.75));
  var sun = new THREE.DirectionalLight(0xffffff, 0.55);
  sun.position.set(-0.5, -0.8, 1.4);
  scene.add(sun);
  var fill = new THREE.DirectionalLight(0xffffff, 0.18);
  fill.position.set(0.7, 0.6, 0.4);
  scene.add(fill);

  var axes = new THREE.Group();
  scene.add(axes);
  var modelRoot = new THREE.Group();
  scene.add(modelRoot);
  var selBox = null;

  function skyTexture() {
    var c = document.createElement('canvas'); c.width = 2; c.height = 256;
    var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#b7d0e8'); gr.addColorStop(0.6, '#eef3f8'); gr.addColorStop(1, '#f6f6f2');
    g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }

  function resize() {
    var w = view.clientWidth, h = view.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  (function loop() { requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); })();

  // ------------------------------------------------------------------ state
  var state = { res: null, name: '', offset: [0, 0], box: null, tagGroups: {}, mats: {}, edgeGroups: [], failedGroup: null, pickables: [] };
  var edgeMat = new THREE.LineBasicMaterial({ color: 0x1b1b1b, transparent: true, opacity: 0.55 });
  var failMat = new THREE.LineBasicMaterial({ color: 0xff2020 });
  var failPtMat = new THREE.PointsMaterial({ color: 0xff2020, size: 8, sizeAttenuation: false });

  function clearModel() {
    modelRoot.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    Object.keys(state.mats).forEach(function (k) { state.mats[k].dispose(); });
    modelRoot.clear();
    axes.clear();
    if (selBox) { scene.remove(selBox); selBox = null; }
    state.tagGroups = {}; state.mats = {}; state.edgeGroups = []; state.pickables = []; state.failedGroup = null;
  }

  function matFor(name, rgb) {
    if (!state.mats[name]) {
      var c = new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
      state.mats[name] = new THREE.MeshLambertMaterial({
        color: c, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
      });
    }
    return state.mats[name];
  }

  function load(text, name) {
    var t0 = performance.now();
    var res = Sim.simulate(text);
    state.res = res; state.name = name;
    clearModel();
    build(res);
    renderPanels(res, performance.now() - t0);
    $('empty').hidden = true;
    zoomExtents('iso');
  }

  // ------------------------------------------------------------------ geometry
  function build(res) {
    // model bounds (mm), then everything is drawn relative to its centre so large coordinates stay precise
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    function grow(x, y) { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
    res.objects.forEach(function (o) {
      if (o.kind === 'solid') { grow(o.bbox[0], o.bbox[1]); grow(o.bbox[2], o.bbox[3]); }
      else grow(o.x, o.y);
    });
    res.failed.forEach(function (f) { f.outer.forEach(function (p) { grow(p[0], p[1]); }); });
    if (!isFinite(b[0])) b = [0, 0, 0, 0];
    var ox = (b[0] + b[2]) / 2, oy = (b[1] + b[3]) / 2;
    state.offset = [ox, oy];
    var X = function (x) { return (x - ox) / 1000; }, Y = function (y) { return (y - oy) / 1000; };

    res.tagOrder.forEach(function (name) {
      var g = new THREE.Group(); g.name = name;
      state.tagGroups[name] = g; modelRoot.add(g);
      matFor(name, res.materials[name]);
    });
    var edges = new THREE.Group(); modelRoot.add(edges); state.edgeGroups.push(edges);

    res.objects.forEach(function (o) {
      if (o.kind !== 'solid') return;
      var shape = new THREE.Shape(o.outer.map(function (p) { return new THREE.Vector2(X(p[0]), Y(p[1])); }));
      o.holes.forEach(function (h) { shape.holes.push(new THREE.Path(h.map(function (p) { return new THREE.Vector2(X(p[0]), Y(p[1])); }))); });
      var geo = o.height > 0 ? new THREE.ExtrudeGeometry(shape, { depth: o.height / 1000, bevelEnabled: false, curveSegments: 1 })
                             : new THREE.ShapeGeometry(shape, 1);
      geo.translate(0, 0, o.z0 / 1000);
      var mesh = new THREE.Mesh(geo, state.mats[o.tag]);
      mesh.userData.obj = o;
      state.tagGroups[o.tag].add(mesh);
      state.pickables.push(mesh);
      var eg = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edgeMat);
      eg.userData.tag = o.tag;
      mesh.userData.edges = eg;
      edges.add(eg);
    });

    // trees: one definition per size, instanced; the crown takes the material of the tag that created the definition
    var trunkMat = matFor('pyKuro Tree Trunk', res.materials['pyKuro Tree Trunk'] || [110, 80, 50]);
    var byTagDef = {};
    res.objects.forEach(function (o) {
      if (o.kind !== 'tree') return;
      var k = o.tag + '\u0000' + o.def;
      (byTagDef[k] = byTagDef[k] || []).push(o);
    });
    Object.keys(byTagDef).forEach(function (k) {
      var list = byTagDef[k], d = res.definitions[list[0].def], tag = list[0].tag;
      var trunkGeo = new THREE.CylinderGeometry(d.trunkR / 1000, d.trunkR / 1000, d.trunkH / 1000, 8);
      trunkGeo.rotateX(Math.PI / 2); trunkGeo.translate(0, 0, d.trunkH / 2000);
      var crownGeo = new THREE.SphereGeometry(d.r / 1000, 16, 10);
      crownGeo.translate(0, 0, (d.h - d.r) / 1000);
      [[trunkGeo, trunkMat], [crownGeo, state.mats[d.crownMat] || matFor(d.crownMat, res.materials[d.crownMat])]].forEach(function (pair) {
        var im = new THREE.InstancedMesh(pair[0], pair[1], list.length);
        var m = new THREE.Matrix4();
        list.forEach(function (o, i) { m.makeTranslation(X(o.x), Y(o.y), o.z0 / 1000); im.setMatrixAt(i, m); });
        im.userData.objs = list;
        state.tagGroups[tag].add(im);
        state.pickables.push(im);
      });
    });

    // what SketchUp would skip: red outlines (or red dots when there are fewer than 2 points)
    var fg = new THREE.Group(); fg.name = 'failed'; modelRoot.add(fg); state.failedGroup = fg;
    res.failed.forEach(function (f) {
      var pts = f.outer.map(function (p) { return new THREE.Vector3(X(p[0]), Y(p[1]), f.z0 / 1000 + 0.05); });
      if (!pts.length) return;
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var obj = pts.length >= 2 ? new THREE.LineLoop(geo, failMat) : new THREE.Points(geo, failPtMat);
      obj.userData.failed = f;
      fg.add(obj);
      if (pts.length >= 2) { var dots = new THREE.Points(geo.clone(), failPtMat); fg.add(dots); }
    });
    fg.visible = $('failed').checked;

    // axes at the drawing origin (SketchUp colours), and the bounding box (m)
    var size = Math.max((b[2] - b[0]) / 1000, (b[3] - b[1]) / 1000, 10);
    var O = new THREE.Vector3(X(0), Y(0), 0);
    [[1, 0, 0, 0xd62828, 0.6], [0, 1, 0, 0x2a9d2a, 0.6], [0, 0, 1, 0x1d4ed8, 0.12]].forEach(function (a) {
      var g = new THREE.BufferGeometry().setFromPoints([O, O.clone().add(new THREE.Vector3(a[0], a[1], a[2]).multiplyScalar(size * a[4]))]);
      axes.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: a[3] })));
    });
    state.box = new THREE.Box3().setFromObject(modelRoot);
    applyEdges(); applyXray();
  }

  function applyEdges() { state.edgeGroups.forEach(function (g) { g.visible = $('edges').checked; }); syncEdgeTags(); }
  function syncEdgeTags() {
    state.edgeGroups.forEach(function (g) { g.children.forEach(function (e) { var tg = state.tagGroups[e.userData.tag]; e.visible = !tg || tg.visible; }); });
  }
  function applyXray() {
    var x = $('xray').checked;
    Object.keys(state.mats).forEach(function (k) { var m = state.mats[k]; m.transparent = x; m.opacity = x ? 0.45 : 1; m.depthWrite = !x; m.needsUpdate = true; });
  }

  // ------------------------------------------------------------------ camera
  function zoomExtents(dir, box) {
    box = box || (state.box && !state.box.isEmpty() ? state.box : new THREE.Box3(new THREE.Vector3(-10, -10, 0), new THREE.Vector3(10, 10, 5)));
    var c = box.getCenter(new THREE.Vector3()), r = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 1);
    var dist = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
    var d = { iso: [-0.55, -0.7, 0.45], top: [0, -0.0001, 1], front: [0, -1, 0.02], right: [1, 0, 0.02] }[dir || 'current'];
    if (!d) d = camera.position.clone().sub(controls.target).normalize().toArray();
    var v = new THREE.Vector3().fromArray(d).normalize();
    camera.position.copy(c).addScaledVector(v, dist);
    camera.near = Math.max(dist / 1000, 0.05); camera.far = dist * 20; camera.updateProjectionMatrix();
    controls.target.copy(c); controls.update();
  }

  // ------------------------------------------------------------------ picking
  var down = null;
  renderer.domElement.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', function (e) {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    var r = renderer.domElement.getBoundingClientRect();
    var ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
    var hits = ray.intersectObjects(state.pickables.filter(function (m) { return m.parent && m.parent.visible; }), false);
    if (!hits.length) { select(null); return; }
    var h = hits[0], o = h.object.userData.obj || (h.object.userData.objs && h.object.userData.objs[h.instanceId]);
    select(o, h.object);
  });

  function select(o, mesh) {
    if (selBox) { scene.remove(selBox); selBox = null; }
    var el = $('selection');
    if (!o) { el.hidden = true; return; }
    var res = state.res, tag = res.tags[o.tag], html;
    if (o.kind === 'solid') {
      html = '<b>' + esc(o.tag) + '</b> · hình ' + o.shape + ' · dòng ' + o.line +
        '<br>Cao độ: ' + fmt(o.z0 / 1000, 2) + ' → ' + fmt((o.z0 + o.height) / 1000, 2) + ' m' + (o.height ? ' (pushpull ' + fmt(o.height / 1000, 2) + ' m)' : ' (mặt phẳng)') +
        '<br>Diện tích: ' + fmt(o.area / 1e6, 2) + ' m² · ' + o.outer.length + ' đỉnh' + (o.holes.length ? ' · ' + o.holes.length + ' lỗ' : '');
      if (mesh) { mesh.geometry.computeBoundingBox(); selBox = new THREE.Box3Helper(mesh.geometry.boundingBox.clone(), 0xff8c00); }
    } else if (o.kind === 'tree') {
      var d = res.definitions[o.def];
      html = '<b>' + esc(o.tag) + '</b> · cây (component) · dòng ' + o.line +
        '<br>Định nghĩa: ' + esc(o.def) + ' (' + d.instances + ' cây dùng chung)' +
        '<br>Bán kính trong CAD: ' + fmt(o.rIn / 1000, 2) + ' m → làm tròn ' + fmt(d.r / 1000, 2) + ' m · cao ' + fmt(d.h / 1000, 2) + ' m';
      var p = new THREE.Vector3((o.x - state.offset[0]) / 1000, (o.y - state.offset[1]) / 1000, o.z0 / 1000);
      selBox = new THREE.Box3Helper(new THREE.Box3(p.clone().add(new THREE.Vector3(-d.r / 1000, -d.r / 1000, 0)), p.clone().add(new THREE.Vector3(d.r / 1000, d.r / 1000, d.h / 1000))), 0xff8c00);
    } else {
      html = '<b>' + esc(o.tag) + '</b> · hình ' + o.shape + ' · dòng ' + o.line + '<br><span style="color:#f87171">SketchUp bỏ qua: ' + esc(o.reason) + '</span>';
    }
    if (tag && tag.sources.length) html += '<br><small>Lớp CAD: ' + esc(tag.sources.join(', ')) + '</small>';
    el.innerHTML = html; el.hidden = false;
    if (selBox) scene.add(selBox);
  }

  function focusObject(o) {
    var pts = o.kind === 'tree' ? [[o.x, o.y]] : o.outer;
    if (!pts.length) return;
    var box = new THREE.Box3();
    pts.forEach(function (p) { box.expandByPoint(new THREE.Vector3((p[0] - state.offset[0]) / 1000, (p[1] - state.offset[1]) / 1000, (o.z0 || 0) / 1000)); });
    box.expandByScalar(5);
    zoomExtents('current', box);
    var mesh = null;
    state.pickables.forEach(function (m) { if (m.userData.obj === o) mesh = m; });
    select(o, mesh);
  }

  // ------------------------------------------------------------------ panels
  function renderPanels(res, ms) {
    var v = $('verdict');
    var nErr = res.issues.filter(function (i) { return i.level === 'error'; }).length;
    var nWarn = res.issues.filter(function (i) { return i.level === 'warn'; }).length;
    if (res.fatal) {
      v.className = 'verdict err';
      v.innerHTML = '✗ Script sẽ dừng ở dòng ' + res.fatal.line + ': ' + esc(res.fatal.msg) +
        '<small>SketchUp hủy toàn bộ thao tác (abort_operation), file .skp sẽ không có gì từ script này.</small>';
    } else if (res.errors > 0) {
      v.className = 'verdict warn';
      v.innerHTML = '⚠ SketchUp dựng được ' + fmt(res.count) + ' đối tượng, bỏ qua ' + fmt(res.errors) + '.' +
        '<small>Các hình bị bỏ qua được vẽ viền đỏ trong khung 3D; xem chi tiết ở mục Lỗi và cảnh báo.</small>';
    } else if (nWarn > 0) {
      v.className = 'verdict warn';
      v.innerHTML = '⚠ Dựng được toàn bộ ' + fmt(res.count) + ' đối tượng, nhưng có ' + nWarn + ' cảnh báo cần xem.';
    } else {
      v.className = 'verdict ok';
      v.innerHTML = '✓ Dựng được toàn bộ ' + fmt(res.count) + ' đối tượng, không có lỗi.' +
        '<small>Kết quả giả lập khớp với những gì CAD xuất ra. Vẫn nên mở thử trong SketchUp thật.</small>';
    }

    $('console-panel').hidden = false;
    $('console').textContent = '> load \'' + state.name + '\'\n' + res.console.join('\n');

    // tags table
    var body = '', tot = { exp: 0, obj: 0, skip: 0, area: 0 };
    res.tagOrder.forEach(function (name) {
      var t = res.tags[name], rgb = res.materials[name];
      var heights = t.kind === 'trees' ? (t.objects ? fmt(t.zmin / 1000, 2) + ' → ' + fmt(t.zmax / 1000, 2) : '–')
        : Object.keys(t.heights).map(function (k) { return k.replace(/\./g, ',') + (Object.keys(t.heights).length > 1 ? ' <small>×' + t.heights[k] + '</small>' : ''); }).join('<br>') || '–';
      var okRow = t.objects === t.expected;
      body += '<tr data-tag="' + esc(name) + '">' +
        '<td><input type="checkbox" checked aria-label="Hiện tag ' + esc(name) + '" /></td>' +
        '<td><span class="swatch" style="background:rgb(' + rgb.join(',') + ')"></span><span class="tagname">' + esc(name) + '</span>' +
        (t.display.length || t.sources.length ? '<div class="src">' + esc(t.display.join(', ')) + (t.sources.length ? ' ← ' + esc(t.sources.join(', ')) : '') + '</div>' : '') + '</td>' +
        '<td class="num">' + fmt(t.expected) + '</td>' +
        '<td class="num ' + (okRow ? 'good' : 'bad') + '">' + fmt(t.objects) + '</td>' +
        '<td class="num' + (t.skipped ? ' bad' : '') + '">' + (t.skipped ? fmt(t.skipped) : '–') + '</td>' +
        '<td class="num">' + heights + '</td>' +
        '<td class="num">' + (t.kind === 'trees' ? '<small>cây</small>' : fmt(t.area / 1e6, 0)) + '</td></tr>';
      tot.exp += t.expected; tot.obj += t.objects; tot.skip += t.skipped; tot.area += t.kind === 'trees' ? 0 : t.area;
    });
    $('tags').innerHTML = body || '<tr><td colspan="7" class="src">Không có lời gọi PyKuroCad2Su.layer / trees nào.</td></tr>';
    $('tags-total').innerHTML = '<tr><td></td><td>Tổng</td><td class="num">' + fmt(tot.exp) + '</td><td class="num">' + fmt(tot.obj) +
      '</td><td class="num">' + (tot.skip ? fmt(tot.skip) : '–') + '</td><td></td><td class="num">' + fmt(tot.area / 1e6, 0) + '</td></tr>';
    $('tags-panel').hidden = false;
    Array.prototype.forEach.call($('tags').querySelectorAll('tr[data-tag] input'), function (cb) {
      cb.addEventListener('change', function () {
        var tr = cb.closest('tr'), g = state.tagGroups[tr.dataset.tag];
        if (g) g.visible = cb.checked;
        tr.classList.toggle('hidden-tag', !cb.checked);
        syncEdgeTags();
      });
    });

    renderIssues(res);

    // model info
    var size = state.box && !state.box.isEmpty() ? state.box.getSize(new THREE.Vector3()) : new THREE.Vector3();
    var defs = Object.keys(res.definitions);
    var info = [
      ['File', esc(state.name)],
      ['Group gốc', esc(res.rootName || '–')],
      ['Kích thước', fmt(size.x, 1) + ' × ' + fmt(size.y, 1) + ' × ' + fmt(size.z, 1) + ' m'],
      ['Tâm (so với gốc CAD)', fmt(state.offset[0] / 1000, 1) + ', ' + fmt(state.offset[1] / 1000, 1) + ' m'],
      ['Tags', res.tagOrder.length],
      ['Hình (mỗi dải cao độ = 1 group)', fmt(res.stats.bands)],
      ['Cây (component)', fmt(res.stats.trees) + (defs.length ? ' · ' + defs.length + ' định nghĩa' : '')],
      ['Vật liệu', Object.keys(res.materials).length],
      ['Script', fmt(res.stats.lines) + ' dòng · đọc trong ' + fmt(ms, 0) + ' ms'],
    ];
    $('info').innerHTML = info.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('');
    $('info-panel').hidden = false;
    $('selection').hidden = true;
  }

  function renderIssues(res) {
    var show = {};
    Array.prototype.forEach.call(document.querySelectorAll('.filters input'), function (c) { show[c.dataset.level] = c.checked; });
    var lines = state.text ? state.text.split('\n') : [];
    var list = res.issues.slice();
    if (res.fatal) list.unshift({ level: 'error', line: res.fatal.line, msg: res.fatal.msg, obj: null });
    var order = { error: 0, warn: 1, info: 2 };
    list.sort(function (a, b) { return order[a.level] - order[b.level] || a.line - b.line; });
    var shown = list.filter(function (i) { return show[i.level]; }).slice(0, 500);
    var ol = $('issues');
    ol.innerHTML = '';
    if (!list.length) ol.innerHTML = '<li class="none">Không có lỗi hay cảnh báo nào.</li>';
    shown.forEach(function (i) {
      var li = document.createElement('li');
      li.className = i.level + (i.obj ? ' clickable' : '');
      var code = (lines[i.line - 1] || '').trim();
      li.innerHTML = '<span class="ln">dòng ' + i.line + '</span>' + esc(i.msg) + (code ? '<span class="code">' + esc(code.slice(0, 160)) + '</span>' : '');
      if (i.obj) li.addEventListener('click', function () { focusObject(i.obj); });
      ol.appendChild(li);
    });
    if (list.length > shown.length && shown.length === 500) ol.insertAdjacentHTML('beforeend', '<li>… còn ' + (list.length - 500) + ' mục</li>');
    var nE = list.filter(function (i) { return i.level === 'error'; }).length, nW = list.filter(function (i) { return i.level === 'warn'; }).length;
    $('issue-count').textContent = '(' + nE + ' lỗi, ' + nW + ' cảnh báo)';
    $('issues-panel').hidden = false;
  }

  // ------------------------------------------------------------------ inputs
  function loadText(text, name) { state.text = text.replace(/\r\n?/g, '\n'); load(state.text, name); }
  function readFile(f) {
    if (!f) return;
    var r = new FileReader();
    r.onload = function () { loadText(String(r.result), f.name); };
    r.readAsText(f, 'utf-8');
  }
  $('file').addEventListener('change', function (e) { readFile(e.target.files[0]); e.target.value = ''; });
  $('sample-ok').addEventListener('click', function () { loadText(window.PYKURO_SAMPLES['sample_quyhoach.rb'], 'sample_quyhoach.rb'); });
  $('sample-bad').addEventListener('click', function () { loadText(window.PYKURO_SAMPLES['sample_loi.rb'], 'sample_loi.rb'); });

  var dragDepth = 0;
  document.addEventListener('dragenter', function (e) { e.preventDefault(); dragDepth++; $('drop').hidden = false; });
  document.addEventListener('dragleave', function () { if (--dragDepth <= 0) { dragDepth = 0; $('drop').hidden = true; } });
  document.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.addEventListener('drop', function (e) {
    e.preventDefault(); dragDepth = 0; $('drop').hidden = true;
    readFile(e.dataTransfer.files && e.dataTransfer.files[0]);
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (b) { b.addEventListener('click', function () { zoomExtents(b.dataset.view); }); });
  $('zoom').addEventListener('click', function () { zoomExtents('current'); });
  $('edges').addEventListener('change', applyEdges);
  $('xray').addEventListener('change', applyXray);
  $('failed').addEventListener('change', function () { if (state.failedGroup) state.failedGroup.visible = $('failed').checked; });
  Array.prototype.forEach.call(document.querySelectorAll('.filters input'), function (c) { c.addEventListener('change', function () { if (state.res) renderIssues(state.res); }); });

  // ?sample=ok|loi opens a sample directly (handy for sharing a link)
  var q = /[?&]sample=(\w+)/.exec(location.search);
  if (q) loadText(window.PYKURO_SAMPLES[q[1] === 'loi' ? 'sample_loi.rb' : 'sample_quyhoach.rb'], q[1] === 'loi' ? 'sample_loi.rb' : 'sample_quyhoach.rb');
})();
