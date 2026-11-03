(function archicadModelHealth() {
  "use strict";

  var COLUMNS = [
    { key: "size_mb", label: "File size (MB)", def: "Size of the .pln, .pla or .bimproject file on disk, in MB." },
    { key: "issues", label: "Issues", def: "Integrity problems: unclassified elements, elements with no zone, unconnected walls and slabs, duplicates." },
    { key: "dwg_drawings", label: "DWG drawings", def: "DWG and DXF files placed as drawings in the project." },
    { key: "morphs", label: "Morphs", def: "Morph elements, often used where a library object or structural element belongs." },
    { key: "hotlinks", label: "Hotlinks", def: "Hotlink modules and linked files (PLN, IFC, DWG). A dash means the project could not report it." },
    { key: "layers", label: "Layers", def: "Layers defined in the project." },
    { key: "unused_attrs", label: "Unused attributes", def: "Surfaces, fills, line types and composites that no element uses." },
    { key: "views", label: "Views", def: "Views in the View Map: stories, sections, elevations, 3D, details and worksheets." },
    { key: "layouts", label: "Layouts", def: "Layouts in the Layout Book." }
  ];

  var NAME_KEYS = ["project", "name", "file", "project_name"];

  var SAMPLE = [
    { project: "Riverside Tower A", size_mb: 812, issues: 4720, dwg_drawings: 6, morphs: 142, hotlinks: 9, layers: 96, unused_attrs: 318, views: 1240, layouts: 410 },
    { project: "Thu Thiem Block B", size_mb: 372, issues: 4115, dwg_drawings: 11, morphs: 38, hotlinks: 6, layers: 74, unused_attrs: 204, views: 860, layouts: 215 },
    { project: "Saigon Podium", size_mb: 429, issues: 2983, dwg_drawings: 21, morphs: 66, hotlinks: 13, layers: 88, unused_attrs: 160, views: 1010, layouts: 237 },
    { project: "Hospital Annex", size_mb: 133, issues: 2650, dwg_drawings: 0, morphs: 12, hotlinks: 3, layers: 52, unused_attrs: 71, views: 340, layouts: 88 },
    { project: "School Campus", size_mb: 429, issues: 2201, dwg_drawings: 2, morphs: 44, hotlinks: 5, layers: 63, unused_attrs: 98, views: 520, layouts: 140 },
    { project: "Cultural Centre", size_mb: 129, issues: 2138, dwg_drawings: 0, morphs: 7, hotlinks: 1, layers: 41, unused_attrs: 39, views: 300, layouts: 72 },
    { project: "Hotel Lakeside", size_mb: 585, issues: 2133, dwg_drawings: 1, morphs: 52, hotlinks: 3, layers: 70, unused_attrs: 120, views: 780, layouts: 194 },
    { project: "Factory Atlas 01", size_mb: 310, issues: 2094, dwg_drawings: 31, morphs: 47, hotlinks: 8, layers: 58, unused_attrs: 133, views: 640, layouts: 189 },
    { project: "Mixed Use Block C", size_mb: 119, issues: 2026, dwg_drawings: 4, morphs: 9, hotlinks: 8, layers: 45, unused_attrs: 51, views: 260, layouts: 82 },
    { project: "Master Plan Phase 2", size_mb: 445, issues: 1945, dwg_drawings: 126, morphs: 149, hotlinks: 1, layers: 34, unused_attrs: 265, views: 79, layouts: 19 },
    { project: "Office Tower East", size_mb: 40, issues: 1907, dwg_drawings: 0, morphs: 0, hotlinks: null, layers: 31, unused_attrs: 8, views: 21, layouts: 1 },
    { project: "Retail Arcade", size_mb: 367, issues: 1705, dwg_drawings: 1, morphs: 38, hotlinks: 2, layers: 55, unused_attrs: 96, views: 700, layouts: 148 },
    { project: "Apartment Row D", size_mb: 338, issues: 1624, dwg_drawings: 21, morphs: 4, hotlinks: 14, layers: 49, unused_attrs: 84, views: 990, layouts: 297 },
    { project: "Villa Cluster 7", size_mb: 185, issues: 1133, dwg_drawings: 1, morphs: 3, hotlinks: 0, layers: 29, unused_attrs: 22, views: 140, layouts: 36 },
    { project: "Warehouse Hub", size_mb: 295, issues: 1563, dwg_drawings: 2, morphs: 10, hotlinks: null, layers: 33, unused_attrs: 47, views: 590, layouts: 122 }
  ];

  var state = {
    rows: SAMPLE.slice(),
    sourceLabel: "Sample data: 15 invented projects, not real models.",
    sortKey: "issues",
    sortDir: -1,
    query: "",
    limit: 2000
  };

  var el = {
    take: document.getElementById("ah-take"),
    head: document.getElementById("ah-head"),
    body: document.getElementById("ah-body"),
    source: document.getElementById("ah-source"),
    defs: document.getElementById("ah-defs"),
    format: document.getElementById("ah-format"),
    file: document.getElementById("ah-file"),
    sample: document.getElementById("ah-sample"),
    template: document.getElementById("ah-template"),
    limit: document.getElementById("ah-limit"),
    search: document.getElementById("ah-search")
  };

  if (!el.body || !el.head) return;

  var fmt = new Intl.NumberFormat("en-US");

  function normalizeKey(text) {
    return String(text).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  var ALIASES = {};
  COLUMNS.forEach(function (c) {
    ALIASES[c.key] = c.key;
    ALIASES[normalizeKey(c.label)] = c.key;
  });
  ALIASES.file_size = "size_mb";
  ALIASES.file_size_mb = "size_mb";
  ALIASES.dwg = "dwg_drawings";
  ALIASES.unused_attributes = "unused_attrs";

  function toNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
      var t = value.trim();
      if (t === "" || t === "-" || t === "–") return null;
      value = Number(t.replace(/,/g, ""));
    }
    return typeof value === "number" && isFinite(value) ? value : null;
  }

  function normalizeRows(raw) {
    if (!Array.isArray(raw)) throw new Error("The file must hold a list of projects.");
    var rows = raw.map(function (item, index) {
      if (!item || typeof item !== "object") return null;
      var row = { project: "", _i: index };
      var named = false;
      Object.keys(item).forEach(function (k) {
        var nk = normalizeKey(k);
        if (!named && NAME_KEYS.indexOf(nk) !== -1) {
          row.project = String(item[k] == null ? "" : item[k]);
          named = true;
        } else if (ALIASES[nk]) {
          row[ALIASES[nk]] = toNumber(item[k]);
        }
      });
      if (!row.project) row.project = "Project " + (index + 1);
      COLUMNS.forEach(function (c) { if (!(c.key in row)) row[c.key] = null; });
      return row;
    }).filter(Boolean);
    if (!rows.length) throw new Error("No projects found in the file.");
    return rows;
  }

  function parseCsv(text) {
    var rows = [];
    var field = "";
    var row = [];
    var inQuotes = false;
    var i;
    text = text.replace(/^﻿/, "");
    for (i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { field += ch; }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === "," || ch === ";") {
        row.push(field); field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some(function (c) { return c !== ""; })) rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
    row.push(field);
    if (row.some(function (c) { return c !== ""; })) rows.push(row);
    if (rows.length < 2) throw new Error("The CSV needs a header row and at least one project.");
    var header = rows[0];
    return rows.slice(1).map(function (r) {
      var obj = {};
      header.forEach(function (h, idx) { obj[h] = r[idx]; });
      return obj;
    });
  }

  function loadFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var text = String(reader.result);
        var isJson = /\.json$/i.test(file.name) || /^\s*[\[{]/.test(text);
        var raw = isJson ? JSON.parse(text) : parseCsv(text);
        if (raw && !Array.isArray(raw)) raw = raw.rows || raw.data || raw.projects || raw.results;
        state.rows = normalizeRows(raw);
        state.sourceLabel = "Loaded from " + file.name + ".";
        render();
      } catch (err) {
        state.sourceLabel = "Could not read " + file.name + ": " + err.message;
        renderSource();
      }
    };
    reader.onerror = function () {
      state.sourceLabel = "Could not read " + file.name + ".";
      renderSource();
    };
    reader.readAsText(file);
  }

  function renderHead() {
    var tr = document.createElement("tr");
    var cols = [{ key: "project", label: "Project file" }].concat(COLUMNS);
    cols.forEach(function (c) {
      var th = document.createElement("th");
      th.scope = "col";
      th.dataset.key = c.key;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = c.label;
      th.appendChild(btn);
      th.addEventListener("click", function () {
        if (state.sortKey === c.key) {
          state.sortDir = -state.sortDir;
        } else {
          state.sortKey = c.key;
          state.sortDir = c.key === "project" ? 1 : -1;
        }
        renderBody();
      });
      tr.appendChild(th);
    });
    el.head.replaceChildren(tr);
  }

  function markSort() {
    el.head.querySelectorAll("th").forEach(function (th) {
      th.setAttribute("aria-sort", th.dataset.key === state.sortKey
        ? (state.sortDir === 1 ? "ascending" : "descending") : "none");
    });
  }

  function quantile(sorted, q) {
    if (!sorted.length) return 0;
    var pos = (sorted.length - 1) * q;
    var base = Math.floor(pos);
    var rest = pos - base;
    var next = sorted[base + 1] !== undefined ? sorted[base + 1] : sorted[base];
    return sorted[base] + rest * (next - sorted[base]);
  }

  function bucketFor(cuts, value) {
    var i = 0;
    while (i < 4 && value > cuts[i]) i++;
    return i;
  }

  function renderSource() {
    el.source.textContent = state.sourceLabel;
  }

  function renderTake() {
    var rows = state.rows;
    var over = rows.filter(function (r) { return r.issues != null && r.issues > state.limit; }).length;
    var ranked = rows.filter(function (r) { return r.issues != null; })
      .sort(function (a, b) { return b.issues - a.issues; });
    el.take.replaceChildren();
    var parts = [
      [null, ""],
      ["b", fmt.format(over)], [null, " of "], ["b", fmt.format(rows.length)],
      [null, " projects carry more than "], ["b", fmt.format(state.limit)], [null, " integrity issues."]
    ];
    if (ranked.length) {
      parts.push([null, " "], ["b", ranked[0].project], [null, " has the most, at "],
        ["b", fmt.format(ranked[0].issues)], [null, "."]);
    }
    parts.forEach(function (p) {
      if (!p[1]) return;
      if (p[0]) {
        var b = document.createElement(p[0]);
        b.textContent = p[1];
        el.take.appendChild(b);
      } else {
        el.take.appendChild(document.createTextNode(p[1]));
      }
    });
  }

  function renderBody() {
    var all = state.rows;
    var cuts = {};
    COLUMNS.forEach(function (c) {
      var vals = all.map(function (r) { return r[c.key]; })
        .filter(function (v) { return v != null; })
        .sort(function (a, b) { return a - b; });
      cuts[c.key] = [0.2, 0.4, 0.6, 0.8].map(function (q) { return quantile(vals, q); });
    });

    var q = state.query.trim().toLowerCase();
    var rows = all.filter(function (r) { return !q || r.project.toLowerCase().indexOf(q) !== -1; });
    var key = state.sortKey;
    var dir = state.sortDir;
    rows.sort(function (a, b) {
      var x = a[key];
      var y = b[key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === "string") return dir * x.localeCompare(y);
      return dir * (x - y);
    });

    var frag = document.createDocumentFragment();
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      var name = document.createElement("td");
      name.className = "ah-name";
      name.textContent = r.project;
      tr.appendChild(name);
      COLUMNS.forEach(function (c) {
        var td = document.createElement("td");
        var v = r[c.key];
        if (v == null) {
          td.className = "ah-none";
          td.textContent = "–";
        } else {
          td.className = "h" + bucketFor(cuts[c.key], v);
          td.textContent = fmt.format(v);
        }
        tr.appendChild(td);
      });
      frag.appendChild(tr);
    });

    if (!rows.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.className = "ah-empty";
      td.colSpan = COLUMNS.length + 1;
      td.textContent = "No projects match that search.";
      tr.appendChild(td);
      frag.appendChild(tr);
    }

    el.body.replaceChildren(frag);
    markSort();
  }

  function render() {
    renderSource();
    renderTake();
    renderBody();
  }

  function renderDefs() {
    var frag = document.createDocumentFragment();
    COLUMNS.forEach(function (c) {
      var wrap = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = c.label;
      dd.textContent = c.def;
      wrap.append(dt, dd);
      frag.appendChild(wrap);
    });
    el.defs.replaceChildren(frag);
  }

  function renderFormat() {
    if (!el.format) return;
    var one = {};
    one.project = "Riverside Tower A";
    COLUMNS.forEach(function (c) { one[c.key] = SAMPLE[0][c.key]; });
    el.format.textContent = JSON.stringify([one], null, 2);
  }

  function download(filename, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  el.file.addEventListener("change", function () {
    var file = el.file.files && el.file.files[0];
    if (file) loadFile(file);
    el.file.value = "";
  });

  el.sample.addEventListener("click", function () {
    state.rows = SAMPLE.slice();
    state.sourceLabel = "Sample data: 15 invented projects, not real models.";
    render();
  });

  el.template.addEventListener("click", function () {
    download("archicad-model-health-template.json", JSON.stringify(SAMPLE, null, 2), "application/json");
  });

  el.limit.addEventListener("input", function () {
    var n = Number(el.limit.value);
    state.limit = isFinite(n) && n >= 0 ? n : 0;
    renderTake();
  });

  el.search.addEventListener("input", function () {
    state.query = el.search.value;
    renderBody();
  });

  renderHead();
  renderDefs();
  renderFormat();
  render();
})();
