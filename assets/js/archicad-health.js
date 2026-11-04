(function archicadModelHealth() {
  "use strict";

  /* ---------- Heat-map columns ---------- */

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

  /* ---------- Project Audit: inputs ---------- */

  /* Numbers measured for the audit. Add more here as sections are added. */
  var AUDIT_FIELDS = [
    { key: "embedded_items", label: "Embedded Library items" },
    { key: "ifc_lcf", label: "IFC LCF files" },
    { key: "ifc_folders", label: "IFC folders" },
    { key: "images_over_1mb", label: "Images over 1 MB" },
    { key: "linked_libs", label: "Linked libraries" },
    { key: "point_cloud_mb", label: "Point cloud size (MB)" },
    { key: "missing_parts", label: "Missing library parts" },
    { key: "duplicate_parts", label: "Duplicated library parts" },
    { key: "seo_ops", label: "Solid element operations" },
    { key: "seo_targets", label: "SEO target elements" },
    { key: "seo_operators", label: "SEO operator elements" },
    { key: "open_tabs", label: "Open tabs" },
    { key: "trace_active", label: "Active trace references" },
    { key: "trace_views", label: "Trace references using views or layouts" },
    { key: "elements_total", label: "Total elements" },
    { key: "elements_3d", label: "3D elements" },
    { key: "elements_2d", label: "2D elements" },
    { key: "groups", label: "Groups" },
    { key: "styles_sun", label: "3D styles with sun shadows" },
    { key: "styles_total", label: "3D styles" },
    { key: "session_errors", label: "Session report errors" },
    { key: "polygons", label: "Polygons" },
    { key: "duplicate_elements", label: "Duplicated elements" },
    { key: "origin_distance_m", label: "Distance from origin (m)" },
    { key: "inaccurate_walls", label: "Inaccurate wall connections" },
    { key: "lw_duplicates", label: "Linework deleted duplicates" },
    { key: "lw_merged_connecting", label: "Linework merged connecting lines" },
    { key: "lw_merged_overlapping", label: "Linework merged overlapping lines" },
    { key: "lw_identical", label: "Linework deleted lines overlapped by identical lines" },
    { key: "lw_covered", label: "Linework deleted lines covered by solid lines" },
    { key: "lw_different", label: "Linework deleted lines overlapped by different type lines" },
    { key: "lw_adjusted", label: "Linework adjusted lines" },
    { key: "lw_split", label: "Linework split lines" },
    { key: "lw_total", label: "Linework total affected lines" },
    { key: "fills_before", label: "Fills before consolidation" },
    { key: "fills_after", label: "Fills after consolidation" },
    { key: "attrs_in_use", label: "Attributes in use" },
    { key: "attrs_total", label: "Attributes in the project" },
    { key: "archicad_layer_elements", label: "Elements on the Archicad layer" },
    { key: "mvo_used", label: "Model View Option combinations in use" },
    { key: "mvo_total", label: "Model View Option combinations" },
    { key: "mvo_curtain", label: "MVO combinations with Curtain Walls in Full Detail" },
    { key: "mvo_stairs", label: "MVO combinations with Stairs and Railings in Full Detail" },
    { key: "mvo_objects", label: "MVO combinations with Objects in Full Detail" },
    { key: "go_used", label: "Graphic Override combinations in use" },
    { key: "go_total", label: "Graphic Override combinations" },
    { key: "renov_used", label: "Renovation Filters in use" },
    { key: "renov_total", label: "Renovation Filters" },
    { key: "styles_used", label: "3D styles in use" },
    { key: "greyed_favorites", label: "Greyed-out favorites" },
    { key: "project_info_items", label: "Filled Project Info items" },
    { key: "dup_ids", label: "Elements with duplicate IDs" },
    { key: "undef_structural", label: "Elements with undefined Structural Function" },
    { key: "undef_position", label: "Elements with undefined Position" },
    { key: "undef_classification", label: "Elements with undefined Classification" },
    { key: "dimprefs_used", label: "Dimension Preferences in use" },
    { key: "dimprefs_total", label: "Dimension Preferences" },
    { key: "legacy_enabled", label: "Legacy Preferences enabled" },
    { key: "hidden_rules", label: "Hidden Stair Rules" },
    { key: "stair_rules_total", label: "Stair Rules" },
    { key: "vp_stories", label: "Stories" },
    { key: "vp_sections", label: "Sections" },
    { key: "vp_elevations", label: "Elevations" },
    { key: "vp_interior", label: "Interior Elevations" },
    { key: "vp_worksheets", label: "Worksheets" },
    { key: "vp_details", label: "Details" },
    { key: "vp_cameras", label: "Cameras" },
    { key: "vp_schedules", label: "Schedules" },
    { key: "vp_indexes", label: "Project Indexes" },
    { key: "vp_3d", label: "3D Documents" },
    { key: "vp_lists", label: "Lists" },
    { key: "vp_independent", label: "Independent or linked Viewpoints" },
    { key: "vp_derived", label: "Viewpoints derived from the 3D model" },
    { key: "vp_shadow", label: "Viewpoints with shadows" },
    { key: "vp_shadow_total", label: "Sections, Elevations and 3D Documents" },
    { key: "views_clone", label: "Views in cloned folders" },
    { key: "views_total", label: "Views" },
    { key: "views_custom", label: "Views with custom or missing settings" },
    { key: "layouts_count", label: "Layouts in the Layout Book" },
    { key: "drawings_stored", label: "Drawings stored in the project file" },
    { key: "drawings_total", label: "Drawings" },
    { key: "master_unused", label: "Unused Master Layouts" },
    { key: "master_total", label: "Master Layouts" },
    { key: "linked_drawings_master", label: "Linked Drawings on Master Layouts" },
    { key: "shortcut_items", label: "Publisher Set items in shortcut folders" },
    { key: "publisher_items", label: "Publisher Set items" },
    { key: "missing_internal_drawings", label: "Missing internal drawings" },
    { key: "external_drawings", label: "External drawings" },
    { key: "hl_pln", label: "Hotlinks from PLN files" },
    { key: "hl_mod", label: "Hotlinks from MOD files" },
    { key: "hl_teamwork", label: "Hotlinks from Teamwork projects" },
    { key: "hl_ifc", label: "Hotlinks from IFC files" },
    { key: "hl_3dm", label: "Hotlinks from 3DM files" },
    { key: "xref_bound", label: "XREFs bound to the project" },
    { key: "xref_attached", label: "XREFs attached to the project" }
  ];

  /* Naming, structure and setting checks take the percentage of items with a problem in
     issue_<section>_<number>, for example issue_3_2. Leave empty when not checked. */
  var Q_IDS = ["3.2", "3.3", "3.4", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12", "3.13", "3.14", "3.15", "3.16", "3.17",
    "4.1", "4.2", "4.3", "4.4", "4.5", "4.10", "4.12", "4.13", "4.15", "4.17", "4.18", "4.20", "4.22", "4.23", "4.24", "4.29", "4.30",
    "5.1", "5.2", "5.4", "5.5", "5.6", "5.7", "5.10",
    "6.1", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.10", "6.11", "6.12", "6.13", "6.15", "6.18", "6.20", "6.21",
    "6.22", "6.23", "6.27", "6.28", "6.30", "6.31", "7.5"];
  Q_IDS.forEach(function (id) {
    AUDIT_FIELDS.push({ key: "issue_" + id.replace(".", "_"), label: "Items with issues in check " + id + " (%)" });
  });

  /* Text shown under "0. Audit Details". */
  var AUDIT_TEXT = [
    { key: "audit_date", label: "Date of audit", group: "audit" },
    { key: "audit_version", label: "Audit version", group: "audit" },
    { key: "auditor", label: "Auditor's name", group: "audit" },
    { key: "audited_by", label: "Audit provided by", group: "audit" },
    { key: "audit_archicad", label: "Archicad version used for auditing", group: "audit" },
    { key: "report_language", label: "Report language", group: "audit" },
    { key: "project_stage", label: "Project stage", group: "project" },
    { key: "archicad_version", label: "Archicad version", group: "project" },
    { key: "file_name", label: "Project file name", group: "project" },
    { key: "addons", label: "3rd party add-ons used", group: "project" },
    { key: "magic_wand_preference", label: "Magic Wand: give preference to", group: "setting" },
    { key: "magic_wand_tracing", label: "Magic Wand: tracing method", group: "setting" },
    { key: "notes_1", label: "Auditor notes, section 1", group: "notes" },
    { key: "notes_2", label: "Auditor notes, section 2", group: "notes" },
    { key: "notes_3", label: "Auditor notes, section 3", group: "notes" },
    { key: "notes_4", label: "Auditor notes, section 4", group: "notes" },
    { key: "notes_5", label: "Auditor notes, section 5", group: "notes" },
    { key: "notes_6", label: "Auditor notes, section 6", group: "notes" },
    { key: "notes_7", label: "Auditor notes, section 7", group: "notes" }
  ];

  /* ---------- Project Audit: scoring rules ----------
     Every check gives 0 to 3 points. Each axis (Performance, Structure,
     BIM Essentials) that applies to a check is worth points x multiplier out of
     3 x multiplier. A section's score for an axis is the sum of what its checks
     earned divided by the sum of what they could earn.
     The step values below are starting values chosen to reproduce a sample
     report. Replace them with your own standard.
     steps = [a, b, c]: value <= a gives 3, <= b gives 2, <= c gives 1, else 0. */

  function stepScore(field, steps) {
    return function (row) {
      var v = row[field];
      if (v == null) return null;
      return v <= steps[0] ? 3 : v <= steps[1] ? 2 : v <= steps[2] ? 1 : 0;
    };
  }

  function ifcScore(row) {
    var lcf = row.ifc_lcf;
    var folders = row.ifc_folders;
    if (lcf == null || folders == null) return null;
    var total = lcf + folders;
    var share = total ? folders / total : 0;
    return share === 0 ? 3 : share < 0.34 ? 2 : share < 0.9 ? 1 : 0;
  }

  function ratioPct(a, b) {
    return a == null || b == null || !b ? null : Math.round((a / b) * 100);
  }

  function share3d(row) {
    if (row.elements_3d == null || row.elements_2d == null) return null;
    return ratioPct(row.elements_3d, row.elements_3d + row.elements_2d);
  }

  function sunShare(row) {
    return ratioPct(row.styles_sun, row.styles_total);
  }

  function issueKey(id) { return "issue_" + id.replace(".", "_"); }

  /* Checks about naming, structure or settings are scored from one input:
     issue_<section>_<number> is the percentage (0 to 100) of the checked items that
     have a problem, for example issue_3_2 = 15 when 15% of the layers break the naming
     convention. For an on/off setting use 0 (fine) or 100 (wrong). Empty means not checked.
     Share of items with issues: up to 5% gives 3, up to 25% gives 2, up to 60% gives 1, else 0. */
  function issueScore(pct) {
    return pct == null ? null : pct <= 5 ? 3 : pct <= 25 ? 2 : pct <= 60 ? 1 : 0;
  }

  function qCheck(id, title, axes, mult, advice) {
    return {
      id: id, title: title, axes: axes, mult: mult,
      measures: [{ label: "Share of checked items with issues", key: issueKey(id), unit: "%" }],
      score: function (row) { return issueScore(row[issueKey(id)]); },
      advice: advice
    };
  }

  function namingAdvice(subject) {
    return {
      good: subject + " follow a consistent, clear naming convention. Nothing to do.",
      mid: "Some " + subject.toLowerCase() + " break the naming convention or contain spelling mistakes, and duplicates may exist. Tidy them up.",
      low: "Many " + subject.toLowerCase() + " break the naming convention or contain spelling and grammar mistakes, and duplicates may exist. Correct them."
    };
  }

  function defaultsAdvice(kind) {
    return {
      good: "The default Archicad " + kind + " are untouched and new ones follow a clear naming convention. Nothing to do.",
      mid: "Some default Archicad " + kind + " may have been overridden, which can make library parts look wrong. Re-import the defaults, remove duplicates and follow one naming convention.",
      low: "Many default Archicad " + kind + " have been overridden or renamed, and duplicates may exist. Re-import the defaults, remove duplicates and follow one naming convention."
    };
  }

  /* Share of something in use: higher is better. */
  function usedShareScore(pct) {
    return pct == null ? null : pct >= 80 ? 3 : pct >= 50 ? 2 : pct >= 15 ? 1 : 0;
  }

  /* Share of something heavy switched on: lower is better. */
  function lowerShareScore(pct) {
    return pct == null ? null : pct <= 25 ? 3 : pct <= 75 ? 2 : pct <= 95 ? 1 : 0;
  }

  function atLeastScore(field, steps) {
    return function (row) {
      var v = row[field];
      if (v == null) return null;
      return v >= steps[0] ? 3 : v >= steps[1] ? 2 : v >= steps[2] ? 1 : 0;
    };
  }

  function pctMeasure(label, partKey, totalKey) {
    return { label: label, get: function (r) { return ratioPct(r[partKey], r[totalKey]); }, unit: "%" };
  }

  function shareScore(partKey, totalKey, scorer) {
    return function (row) { return scorer(ratioPct(row[partKey], row[totalKey])); };
  }

  /* Shorthand for a check scored by hand that has one text for "all good" and one for "needs work". */
  function qs(id, title, axes, mult, good, fix) {
    return qCheck(id, title, axes, mult, { good: good, mid: fix, low: fix });
  }

  function sumOrNull(row, keys) {
    var total = 0;
    for (var i = 0; i < keys.length; i++) {
      if (row[keys[i]] == null) return null;
      total += row[keys[i]];
    }
    return total;
  }

  function vpTotal(row) {
    return sumOrNull(row, ["vp_stories", "vp_sections", "vp_elevations", "vp_interior", "vp_worksheets", "vp_details",
      "vp_cameras", "vp_schedules", "vp_indexes", "vp_3d", "vp_lists"]);
  }

  function independentTotal(row) { return sumOrNull(row, ["vp_independent", "vp_derived"]); }

  function independentPct(row) {
    var t = independentTotal(row);
    return t == null ? null : ratioPct(row.vp_independent, t);
  }

  function hotlinkTotal(row) { return sumOrNull(row, ["hl_pln", "hl_mod", "hl_teamwork", "hl_ifc", "hl_3dm"]); }

  var SECTIONS = [
    {
      id: "1",
      name: "Library Management",
      short: "Library",
      intro: "Libraries add to file size and slow a project down when they are large, duplicated or broken. " +
        "Missing or duplicated library parts, too many linked libraries and a heavy Embedded Library all cost speed. " +
        "A common setup is the default Archicad library, one office library and one library for the project.",
      checks: [
        {
          id: "1.1", title: "Embedded Library", axes: ["p", "s", "b"], mult: 5,
          measures: [["Number of items in the Embedded Library", "embedded_items", ""]],
          score: stepScore("embedded_items", [10, 50, 150]),
          advice: {
            good: "The Embedded Library is small. Nothing to do.",
            mid: "The Embedded Library holds a number of items. Sorting them into folders keeps it tidy; leaving it is not a serious risk.",
            low: "The Embedded Library is large. Move reusable objects into a proper library so the project file stays light and loads faster."
          }
        },
        {
          id: "1.2", title: "IFC Libraries", axes: ["p", "s", "b"], mult: 3,
          headline: function (r) { return r.ifc_lcf == null || r.ifc_folders == null ? null : r.ifc_lcf + " LCF \u00b7 " + r.ifc_folders + " folders"; },
          measures: [["IFC library container files (.lcf)", "ifc_lcf", ""], ["IFC folders", "ifc_folders", ""]],
          score: ifcScore,
          advice: {
            good: "No IFC libraries are stored as plain folders. Nothing to do.",
            mid: "Some IFC libraries are stored as folders. Save them as .lcf container files to load faster.",
            low: "Most IFC libraries sit in folders, which slows library loading. Save them as .lcf container files."
          }
        },
        {
          id: "1.3", title: "Images over 1 MB", axes: ["p", "s"], mult: 3,
          measures: [["Number of image files over 1 MB", "images_over_1mb", ""]],
          score: stepScore("images_over_1mb", [5, 20, 50]),
          advice: {
            good: "There are few or no large images. Nothing to do.",
            mid: "A number of large images are in use. Compress or resize those that do not need full size.",
            low: "Many large images are loaded. Reduce their size, because they slow opening and 3D."
          }
        },
        {
          id: "1.4", title: "Linked Libraries", axes: ["p", "s"], mult: 5,
          measures: [["Number of linked and BIMcloud libraries", "linked_libs", ""]],
          score: stepScore("linked_libs", [6, 9, 14]),
          advice: {
            good: "The number of linked libraries is within the recommended limit.",
            mid: "More libraries are linked than needed. Remove the ones nobody uses.",
            low: "Too many libraries are linked. Keep the default Archicad library, an office library and a project library, and remove the rest."
          }
        },
        {
          id: "1.5", title: "Large Point Cloud files in the Library", axes: ["p", "s", "b"], mult: 3,
          measures: [["Size of point clouds", "point_cloud_mb", " MB"]],
          score: stepScore("point_cloud_mb", [200, 500, 1000]),
          advice: {
            good: "Point cloud files are small in total. Nothing to do.",
            mid: "Point clouds are getting large. Remove the ones no longer needed.",
            low: "Point clouds are very large and slow 3D navigation and library loading. Remove the ones no longer needed."
          }
        },
        {
          id: "1.6", title: "Missing Library Parts", axes: ["p", "s"], mult: 3,
          measures: [["Number of missing library parts", "missing_parts", ""]],
          score: stepScore("missing_parts", [0, 10, 50]),
          advice: {
            good: "No library parts are missing.",
            mid: "A few library parts are missing. Replace or delete them, or fix the surfaces that point to missing images.",
            low: "Many library parts are missing. Fix these first; a clean library report shows none."
          }
        },
        {
          id: "1.7", title: "Duplicated Library Parts", axes: ["p", "s"], mult: 1,
          measures: [["Number of duplicated library parts", "duplicate_parts", ""]],
          score: stepScore("duplicate_parts", [0, 5, 20]),
          advice: {
            good: "No library parts are duplicated.",
            mid: "A few library parts are duplicated. Remove the extra copies from one of the libraries and reload.",
            low: "Many library parts are duplicated. Remove them from the libraries and reload so the report shows none."
          }
        }
      ]
    },
    {
      id: "2",
      name: "Project Management",
      short: "Management",
      intro: "How the model and the annotation are managed affects the size and speed of a project. " +
        "2D and 3D elements and trace references can all slow it down and add bulk when they are not kept in check.",
      checks: [
        {
          id: "2.1", title: "Solid Element Operations", axes: ["p", "s", "b"], mult: 5,
          measures: [
            ["Number of Solid Element Operations", "seo_ops", ""],
            ["Number of target elements", "seo_targets", ""],
            ["Number of operator elements", "seo_operators", ""]
          ],
          score: stepScore("seo_ops", [50, 200, 600]),
          advice: {
            good: "There are few Solid Element Operations. Nothing to do.",
            mid: "The project has a sizeable number of Solid Element Operations. Be careful adding more; where you can, use polygon editing, priority-based connections or trims instead.",
            low: "Too many Solid Element Operations slow Archicad down considerably. Replace them with polygon editing, priority-based connections or trims where you can."
          }
        },
        {
          id: "2.2", title: "Simultaneously open tabs", axes: ["p"], mult: 1,
          measures: [["Number of tabs open simultaneously", "open_tabs", ""]],
          score: stepScore("open_tabs", [7, 20, 40]),
          advice: {
            good: "A reasonable number of tabs is open. Around 6 or 7 is the most that works well.",
            mid: "More tabs are open than is comfortable. Close the ones you do not need, or open views inside existing tabs (see the User Preferences schemes under More Options).",
            low: "Far too many tabs are open and the project will bog down. Close the tabs you do not need and open views inside existing tabs."
          }
        },
        {
          id: "2.3", title: "Simultaneously active Trace References", axes: ["p", "s"], mult: 3,
          measures: [["Number of Trace References active simultaneously", "trace_active", ""]],
          score: stepScore("trace_active", [8, 15, 30]),
          advice: {
            good: "A manageable number of Trace References is active. Nothing to do.",
            mid: "A fair number of Trace References are active at once. Turn off the ones you are not using.",
            low: "Many Trace References are active at once and slow the project. Turn off the ones you are not using."
          }
        },
        {
          id: "2.4", title: "Trace Referencing Views & Layouts", axes: ["p"], mult: 3,
          measures: [["Number of Trace References using Views or Layouts as source", "trace_views", ""]],
          score: stepScore("trace_views", [10, 30, 80]),
          advice: {
            good: "Few or no views or layouts are used as trace sources. Nothing to do.",
            mid: "Several views or layouts are used as trace sources. Archicad has to work out the view settings of each, so prefer viewpoints from the project map.",
            low: "Many views and layouts are used as trace sources, which slows updates. Switch to viewpoints from the project map where you can."
          }
        },
        {
          id: "2.5", title: "Number of Elements", axes: ["p"], mult: 3,
          measures: [["Total number of all (2D and 3D) elements in the entire project", "elements_total", ""]],
          score: stepScore("elements_total", [100000, 300000, 1000000]),
          advice: {
            good: "The project has 100 000 elements or fewer, which is manageable. Nothing to do. Elements on the Archicad layer are not counted.",
            mid: "The element count is getting large. Remove what you no longer need. Elements on the Archicad layer are not counted.",
            low: "The element count is very high. Split the model or remove unneeded elements. Elements on the Archicad layer are not counted."
          }
        },
        {
          id: "2.6", title: "Utilizing Archicad's 3D modeling capabilities", axes: ["p", "b"], mult: 1, headlineIndex: 3,
          measures: [
            ["Number of 3D elements in the 3D model space and floor plans", "elements_3d", ""],
            ["Number of 2D elements in floor plans", "elements_2d", ""],
            {
              label: "Number of all (2D and 3D) elements in the 3D model space and floor plans",
              get: function (r) { return r.elements_3d == null || r.elements_2d == null ? null : r.elements_3d + r.elements_2d; }
            },
            { label: "Percentage of 3D elements out of all elements", get: share3d, unit: "%" }
          ],
          score: function (row) {
            var pct = share3d(row);
            return pct == null ? null : pct >= 80 ? 3 : pct >= 50 ? 2 : pct >= 25 ? 1 : 0;
          },
          advice: {
            good: "Most or all building elements are modelled in 3D. Nothing to do.",
            mid: "A fair share of the model is drawn in 2D. Model more of it in 3D where it makes sense.",
            low: "Most of the content is drawn in 2D. Build the building elements in 3D so the model can be reused."
          }
        },
        {
          id: "2.7", title: "Number of Groups", axes: ["p"], mult: 3,
          measures: [["Number of groups in the 3D model space and floor plans", "groups", ""]],
          score: stepScore("groups", [100, 300, 1000]),
          advice: {
            good: "The number of groups is manageable. Nothing to do.",
            mid: "There are over 100 groups, which can slow Archicad down. Reduce them where you can; under 100 is a good aim.",
            low: "There are very many groups. Ungroup or merge them to bring the count well down."
          }
        },
        {
          id: "2.8", title: "Sun Shadows in 3D Styles", axes: ["p"], mult: 3, headlineIndex: 2,
          measures: [
            ["Number of 3D styles that have Sun Shadows turned on", "styles_sun", ""],
            ["Total number of 3D styles in the project", "styles_total", ""],
            { label: "Percentage of 3D styles with Sun Shadows out of all 3D styles", get: sunShare, unit: "%" }
          ],
          score: function (row) {
            var pct = sunShare(row);
            return pct == null ? null : pct <= 10 ? 3 : pct <= 50 ? 2 : pct <= 80 ? 1 : 0;
          },
          advice: {
            good: "Few 3D styles use Sun Shadows. Nothing to do.",
            mid: "Some 3D styles have Sun Shadows on, which costs performance. Keep them only where needed, especially if they are assigned to views.",
            low: "Most 3D styles have Sun Shadows on, which costs performance. Turn them off where they are not needed."
          }
        },
        {
          id: "2.9", title: "Errors in 3D", axes: ["p", "s"], mult: 1,
          measures: [["Number of errors in the Session Report", "session_errors", ""]],
          score: stepScore("session_errors", [0, 10, 30]),
          advice: {
            good: "No errors were reported in 3D. Nothing to do.",
            mid: "Archicad reports errors when opening the 3D window. Find the broken elements with Find & Select and fix or replace them. Turning on error interruption and the report in the Model Rebuild Options helps, as does the Element ID Manager when elements share an ID.",
            low: "Many 3D errors are reported. Fix the broken elements first, using Find & Select, the Model Rebuild Options and the Element ID Manager."
          }
        },
        {
          id: "2.10", title: "Number of Polygons", axes: ["p", "s"], mult: 5,
          measures: [["Number of polygons in the project", "polygons", ""]],
          score: stepScore("polygons", [1000000, 5000000, 10000000]),
          advice: {
            good: "The polygon count is low. Nothing to do.",
            mid: "The project is under 5 million polygons, so Archicad should run smoothly. Keep the count low: lower the detail level in Model View Options when you are not visualising, delete elements you no longer use and hide layers you do not need. Downloaded objects often carry many polygons.",
            low: "The polygon count is very high. Lower the detail level, delete unused elements and heavy downloaded objects, and hide layers you do not need."
          }
        },
        {
          id: "2.11", title: "Number of Duplicates", axes: ["p", "s", "b"], mult: 3,
          measures: [["Number of duplicated elements in the entire project", "duplicate_elements", ""]],
          score: stepScore("duplicate_elements", [10, 50, 200]),
          advice: {
            good: "There are very few or no duplicates. Run a duplicate check now and then to keep it that way, for example the Check Duplicates command in the Graphisoft Goodies add-on.",
            mid: "Some elements are duplicated. Find and remove them.",
            low: "Many elements are duplicated. Find and remove them; they bloat the file and can cause errors."
          }
        },
        {
          id: "2.12", title: "Model extents and position", axes: ["p", "s", "b"], mult: 3,
          measures: [{ label: "Model's distance from the Archicad project origin", key: "origin_distance_m", unit: " m", dec: 2 }],
          score: stepScore("origin_distance_m", [1000, 10000, 100000]),
          advice: {
            good: "The model is close to the project origin and no elements are out of bounds. Nothing to do.",
            mid: "The model sits far from the project origin. Move it closer to avoid precision problems.",
            low: "The model is very far from the project origin. Move it back close to the origin."
          }
        },
        {
          id: "2.13", title: "Model Accuracy", axes: ["p", "s", "b"], mult: 3,
          measures: [{ label: "Amount of inaccurate perpendicular wall connections", key: "inaccurate_walls", zeroText: "None" }],
          score: stepScore("inaccurate_walls", [0, 10, 50]),
          advice: {
            good: "All walls in all stories are straight and square. Nothing to do.",
            mid: "A few wall connections are slightly off perpendicular. Correct them.",
            low: "Many wall connections are not perpendicular. Correct them to keep the model accurate."
          }
        },
        {
          id: "2.14", title: "2D Linework Consolidation (in Floor Plans)", axes: ["p", "s"], mult: 3, headlineIndex: 8,
          measures: [
            ["Number of deleted duplicates", "lw_duplicates", ""],
            ["Number of merged connecting lines", "lw_merged_connecting", ""],
            ["Number of merged overlapping lines", "lw_merged_overlapping", ""],
            ["Number of deleted lines overlapped by identical lines", "lw_identical", ""],
            ["Number of deleted lines covered by solid lines", "lw_covered", ""],
            ["Number of deleted lines overlapped by different type lines", "lw_different", ""],
            ["Number of adjusted lines", "lw_adjusted", ""],
            ["Number of split lines", "lw_split", ""],
            ["Total number of affected lines", "lw_total", ""]
          ],
          score: stepScore("lw_total", [10, 100, 1000]),
          advice: {
            good: "The plan views needed no or very little linework consolidation. Nothing to do, although other viewpoints may still need it.",
            mid: "Some linework consolidation was needed in the plan views. Clean up the drawn lines.",
            low: "A lot of linework consolidation was needed. Clean up duplicated and overlapping lines in the plans."
          }
        },
        {
          id: "2.15", title: "2D Fill Consolidation (in Floor Plans)", axes: ["p", "s"], mult: 3,
          headline: function (r) { return r.fills_before == null || r.fills_after == null ? null : r.fills_before + " \u2192 " + r.fills_after; },
          measures: [
            ["Number of fills before consolidation", "fills_before", ""],
            ["Number of fills after consolidation", "fills_after", ""]
          ],
          score: function (row) {
            if (row.fills_before == null || row.fills_after == null) return null;
            var removed = row.fills_before - row.fills_after;
            return removed <= 10 ? 3 : removed <= 50 ? 2 : removed <= 200 ? 1 : 0;
          },
          advice: {
            good: "The plan views needed no or very little fill consolidation. Nothing to do, although other viewpoints may still need it.",
            mid: "Some fill consolidation was needed. Merge the fills that can be combined.",
            low: "A lot of fill consolidation was needed. Merge or remove the extra fills."
          }
        }
      ]
    },
    {
      id: "3",
      name: "Attribute Management",
      short: "Attributes",
      intro: "Attributes do not greatly affect performance, but a tight structure matters, especially when several people work together or hotlinked modules are shared between projects. " +
        "Attributes are managed in the Attribute Manager and should have thoughtful names and IDs. Special Graphisoft attributes such as pens and fills should stay as they came, or elements may not appear correctly.",
      checks: [
        {
          id: "3.1", title: "Attributes in use", axes: ["p", "s"], mult: 3,
          measures: [
            ["Number of attributes in use in the project", "attrs_in_use", ""],
            ["Total number of attributes in the project", "attrs_total", ""],
            pctMeasure("Percentage of attributes in use out of total", "attrs_in_use", "attrs_total")
          ],
          headlineIndex: 2,
          score: function (row) {
            var p = ratioPct(row.attrs_in_use, row.attrs_total);
            return p == null ? null : p >= 50 ? 3 : p >= 30 ? 2 : p >= 15 ? 1 : 0;
          },
          advice: {
            good: "A high share of the attributes is in use. Nothing to do.",
            mid: "A fair share of the attributes is unused. Keep those you may need later and remove the redundant ones.",
            low: "Many attributes are unused and add complexity and file size. Remove the ones you will not need."
          }
        },
        qCheck("3.2", "Structuring of Layers", ["s", "b"], 1, {
          good: "Layers follow a consistent naming convention, including external layers. Nothing to do.",
          mid: "Layers mostly follow a naming convention, but some external layers (from consultants or XREFs) are named differently. Rename them so they read the same.",
          low: "Layer names are inconsistent. Agree one naming system and apply it to all layers, including external ones."
        }),
        qCheck("3.3", "Layer Intersection Group Numbers", ["s", "b"], 5, {
          good: "Layer intersection numbers are used well across all layer combinations. Nothing to do.",
          mid: "Layer intersection numbers are used on some layers only. Assign them across all layers.",
          low: "Layer intersection numbers are barely used. Assign them so intersections resolve predictably."
        }),
        qCheck("3.4", "Layer Extensions", ["s", "b"], 1, {
          good: "Layer extensions are used on all layers. Nothing to do.",
          mid: "Not all layers use extensions. Add extensions to every layer; they help with identification and sorting.",
          low: "Layer extensions are barely used. Add them to every layer to help identification and sorting."
        }),
        {
          id: "3.5", title: "Number of Layers", axes: ["p", "s"], mult: 3,
          measures: [["Total number of layers in the project", "layers", ""]],
          score: stepScore("layers", [100, 200, 400]),
          advice: {
            good: "Fewer than 100 layers is a good amount. Nothing to do.",
            mid: "The project has more layers than it needs. Merge or delete the unused ones.",
            low: "The project has far too many layers. Merge or delete the ones you do not need."
          }
        },
        {
          id: "3.6", title: "Elements on the \"Archicad\" Layer", axes: ["s", "b"], mult: 3,
          measures: [["Number of elements on the Archicad layer in floor plans", "archicad_layer_elements", ""]],
          score: stepScore("archicad_layer_elements", [0, 20, 200]),
          advice: {
            good: "No elements sit on the Archicad layer. Keep it that way: the layer cannot be deleted, hidden or renamed, so elements belong on their own layers.",
            mid: "A few elements sit on the Archicad layer. Move them to dedicated layers.",
            low: "Many elements sit on the Archicad layer. Move them to dedicated layers."
          }
        },
        qCheck("3.7", "Structuring of Layer Combinations", ["s", "b"], 1, {
          good: "Layer combination names follow a consistent convention and have correct layer settings. Nothing to do.",
          mid: "Some layer combination names or settings are off. Check the wireframe settings of layers, which may need to match across combinations, and look for layers that are visible without need.",
          low: "Layer combinations are inconsistent. Rename them to one convention and correct the layer settings."
        }),
        qCheck("3.8", "Structuring of Pens & Colors", ["s"], 1, {
          good: "Pen sets are in use, pens have descriptions and the pen sets are used. Nothing to do.",
          mid: "Some pens lack descriptions or some pen sets are unused. Add descriptions and remove unused pen sets.",
          low: "Pens and pen sets are poorly described or unused. Add descriptions and remove unused pen sets."
        }),
        qCheck("3.9", "Structuring of Line Type attributes", ["s"], 1, defaultsAdvice("line types")),
        qCheck("3.10", "Structuring of Fill Type attributes", ["s"], 1, defaultsAdvice("fill types")),
        qCheck("3.11", "Structuring of Composite Structure attributes", ["s", "b"], 1, namingAdvice("Composite structures")),
        qCheck("3.12", "Structuring of Complex Profile attributes", ["s", "b"], 1, namingAdvice("Complex profiles")),
        qCheck("3.13", "Structuring of Surface attributes", ["s", "b"], 1, defaultsAdvice("surfaces")),
        qCheck("3.14", "Structuring of Building Material attributes", ["s", "b"], 1, namingAdvice("Building materials")),
        qCheck("3.15", "Structuring of Zone Categories", ["s", "b"], 1, namingAdvice("Zone categories")),
        qCheck("3.16", "Structuring of City attributes", ["s"], 1, namingAdvice("Cities")),
        qCheck("3.17", "Structuring of Operation Profiles", ["s"], 1, namingAdvice("Operation profiles"))
      ]
    },
    {
      id: "4",
      name: "Project Settings",
      short: "Settings",
      intro: "Project settings affect performance less than they affect structure. The items below are suggestions that improve how the project is organised rather than faults that harm its health.",
      checks: [
        qCheck("4.1", "Autogrouping", ["p"], 1, {
          good: "Autogrouping is off. Nothing to do.",
          mid: "Autogrouping is on. Consider whether you need it long term and use it with care, because too many groups slow Archicad down.",
          low: "Autogrouping is on and creating many groups. Turn it off unless you need it."
        }),
        qCheck("4.2", "Snap Point Settings", ["p"], 1, {
          good: "The snap point settings are light. Nothing to do.",
          mid: "The snap point settings may slow pre-selection. If you notice lag, set Snap Points to 'Half' and 'Along Entire Element', which need the least processing. Do not turn all of them off, since they improve accuracy and speed.",
          low: "The snap point settings are heavy and likely slow pre-selection. Set Snap Points to 'Half' and 'Along Entire Element'."
        }),
        Object.assign(qCheck("4.3", "Magic Wand Settings", ["p"], 3, {
          good: "The Magic Wand settings are the defaults or suitable ones. Changing them for a task is fine, but set them back afterwards to avoid creating excessive segments.",
          mid: "The Magic Wand settings differ from the defaults. Set them back after special tasks to avoid excessive segments.",
          low: "The Magic Wand settings create very detailed results. Return them to the defaults."
        }), {
          measures: [
            { label: "Give preference to", key: "magic_wand_preference" },
            { label: "Tracing method", key: "magic_wand_tracing" }
          ],
          score: function (row) {
            if (row.magic_wand_preference == null || row.magic_wand_tracing == null) return null;
            var best = /best match/i.test(row.magic_wand_preference);
            var coarse = /\u226540|>=\s*40/.test(row.magic_wand_tracing);
            return best && coarse ? 3 : best ? 2 : 1;
          }
        }),
        qCheck("4.4", "On-screen View Options", ["p"], 1, {
          good: "The on-screen view options that slow 2D are off. Nothing to do.",
          mid: "Some on-screen view options that slow 2D are enabled (Vectorial Hatching, Show Trimming Bodies, Hidden Morph Geometry). If 2D feels slow, turn them off.",
          low: "Several on-screen view options that slow 2D are enabled. Turn them off."
        }),
        qCheck("4.5", "Structuring of Model View Option Combinations", ["s", "b"], 1, defaultsAdvice("Model View Option combinations")),
        {
          id: "4.6", title: "Model View Option Combinations in use", axes: ["s"], mult: 3,
          measures: [
            ["Number of Model View Option combinations in use in the project", "mvo_used", ""],
            ["Total number of Model View Option combinations in the project", "mvo_total", ""],
            pctMeasure("Percentage of combinations in use out of total", "mvo_used", "mvo_total")
          ],
          headlineIndex: 2,
          score: shareScore("mvo_used", "mvo_total", usedShareScore),
          advice: {
            good: "Almost all combinations are assigned to views. Nothing to do.",
            mid: "Some combinations are not assigned to views, or views point to missing ones. Fix these or delete the unneeded combinations.",
            low: "Many combinations are unused or missing from views. Fix these or delete the unneeded combinations."
          }
        },
        {
          id: "4.7", title: "Curtain Walls shown in Full Detail in 3D", axes: ["p"], mult: 1,
          measures: [
            ["Number of combinations with Curtain Walls in Full Detail", "mvo_curtain", ""],
            ["Total number of Model View Option combinations in the project", "mvo_total", ""],
            pctMeasure("Percentage out of total", "mvo_curtain", "mvo_total")
          ],
          headlineIndex: 2,
          score: shareScore("mvo_curtain", "mvo_total", lowerShareScore),
          advice: {
            good: "Few combinations show curtain walls in full detail. Nothing to do.",
            mid: "Several combinations show curtain walls in full detail, which can slow Archicad. If you notice slowness, switch the combinations that do not need full detail to schematic, at least those not used for publishing.",
            low: "Most combinations show curtain walls in full detail, which slows Archicad. Switch the combinations that do not need it to schematic, at least those not used for publishing."
          }
        },
        {
          id: "4.8", title: "Stairs & Railings shown in Full Detail in 3D", axes: ["p"], mult: 1,
          measures: [
            ["Number of combinations with Stairs and Railings in Full Detail", "mvo_stairs", ""],
            ["Total number of Model View Option combinations in the project", "mvo_total", ""],
            pctMeasure("Percentage out of total", "mvo_stairs", "mvo_total")
          ],
          headlineIndex: 2,
          score: shareScore("mvo_stairs", "mvo_total", lowerShareScore),
          advice: {
            good: "Few combinations show stairs and railings in full detail. Nothing to do.",
            mid: "Several combinations show stairs and railings in full detail, which can slow Archicad. Switch the ones that do not need it to schematic, at least those not used for publishing.",
            low: "Many combinations show stairs and railings in full detail, which can slow Archicad. If you notice slowness, switch the ones that do not need it to schematic, at least those not used for publishing."
          }
        },
        {
          id: "4.9", title: "Objects shown in Full Detail in 3D", axes: ["p"], mult: 1,
          measures: [
            ["Number of combinations with taps, handles and knobs in 3D", "mvo_objects", ""],
            ["Total number of Model View Option combinations in the project", "mvo_total", ""],
            pctMeasure("Percentage out of total", "mvo_objects", "mvo_total")
          ],
          headlineIndex: 2,
          score: shareScore("mvo_objects", "mvo_total", lowerShareScore),
          advice: {
            good: "Few combinations show objects at a high detail level. Nothing to do.",
            mid: "Several combinations show objects at a high detail level, which can slow the 3D window, sections and elevations. This is set by the Object and Lamp Detail Level and Accessories in 3D options in the Model View Options. Lower them where full detail is not needed.",
            low: "Many combinations show objects at a high detail level, which slows the 3D window, sections and elevations. Lower the Object and Lamp Detail Level and Accessories in 3D options where full detail is not needed."
          }
        },
        qCheck("4.10", "Structuring of Graphic Override Combinations", ["s", "b"], 1, defaultsAdvice("Graphic Override combinations")),
        {
          id: "4.11", title: "Graphic Override Combinations in use", axes: ["s"], mult: 3,
          measures: [
            ["Number of Graphic Override combinations in use in the project", "go_used", ""],
            ["Total number of Graphic Override combinations in the project", "go_total", ""],
            pctMeasure("Percentage in use out of total", "go_used", "go_total")
          ],
          headlineIndex: 2,
          score: shareScore("go_used", "go_total", usedShareScore),
          advice: {
            good: "Most Graphic Override combinations are assigned to views. Nothing to do.",
            mid: "Some combinations are not assigned to views. Delete the unneeded ones.",
            low: "Many combinations are not assigned to views, or views use 'No Overrides'. Delete the unneeded combinations and assign dedicated ones to all views."
          }
        },
        qCheck("4.12", "Structuring of Graphic Override Rules", ["s"], 1, {
          good: "Graphic overrides refer to rules that have dedicated pens and surfaces and clear names. Nothing to do.",
          mid: "Some Graphic Override rules lack dedicated pens or surfaces, or have naming mistakes. Tidy them.",
          low: "Many Graphic Override rules lack dedicated pens or surfaces or have naming mistakes. Correct them."
        }),
        qCheck("4.13", "Structuring of Renovation Filters", ["s"], 1, defaultsAdvice("Renovation Filters")),
        {
          id: "4.14", title: "Renovation Filters in use", axes: ["s"], mult: 3,
          measures: [
            ["Number of Renovation Filters in use in the project", "renov_used", ""],
            ["Total number of Renovation Filters in the project", "renov_total", ""],
            pctMeasure("Percentage in use out of total", "renov_used", "renov_total")
          ],
          headlineIndex: 2,
          score: shareScore("renov_used", "renov_total", usedShareScore),
          advice: {
            good: "Most Renovation Filters are assigned to views. Nothing to do.",
            mid: "Some Renovation Filters are not assigned to views. Delete the ones you do not need.",
            low: "Many Renovation Filters are not assigned to views. Delete the ones you do not need."
          }
        },
        qCheck("4.15", "Structuring of 3D Styles", ["s"], 1, defaultsAdvice("3D styles")),
        {
          id: "4.16", title: "3D Styles in use", axes: ["s"], mult: 3,
          measures: [
            ["Number of 3D styles in use in the project", "styles_used", ""],
            ["Total number of 3D styles in the project", "styles_total", ""],
            pctMeasure("Percentage in use out of total", "styles_used", "styles_total")
          ],
          headlineIndex: 2,
          score: shareScore("styles_used", "styles_total", usedShareScore),
          advice: {
            good: "Most 3D styles are assigned to views. Nothing to do.",
            mid: "Some 3D styles are not assigned to views. Delete the ones you do not need.",
            low: "Many 3D styles are not assigned to views. Delete the ones you do not need."
          }
        },
        qCheck("4.17", "Renovation Status of Elements", ["s", "b"], 3, {
          good: "All elements have the proper renovation status. Nothing to do.",
          mid: "Some elements do not have the proper renovation status. Correct them.",
          low: "Many elements do not have the proper renovation status. Correct them."
        }),
        qCheck("4.18", "Structuring of Favorites", ["s", "b"], 1, {
          good: "The favorites are comprehensive, with few or no incorrect settings or naming mistakes and a good folder structure. Nothing to do.",
          mid: "Some favorites have incorrect settings or naming mistakes, or the folder structure is weak. Tidy them.",
          low: "Many favorites have incorrect settings or naming mistakes. Clean up the favorites and their folders."
        }),
        {
          id: "4.19", title: "Greyed out Favorites", axes: ["s"], mult: 1,
          measures: [["Number of greyed-out favorites in the project", "greyed_favorites", ""]],
          score: stepScore("greyed_favorites", [0, 5, 20]),
          advice: {
            good: "No favorites are greyed out, so all of them are usable. Nothing to do.",
            mid: "A few favorites are greyed out. Repair or delete them.",
            low: "Many favorites are greyed out. Repair or delete them."
          }
        },
        qCheck("4.20", "Structuring of Element Transfer Settings", ["p"], 1, {
          good: "The Element Transfer Settings follow a clear naming convention and have correct settings, which makes transferring much easier. Nothing to do.",
          mid: "Some Element Transfer Settings have naming mistakes or incorrect settings. Tidy them.",
          low: "Many Element Transfer Settings have naming mistakes or incorrect settings. Correct them."
        }),
        {
          id: "4.21", title: "Project Info", axes: ["s", "b"], mult: 1,
          measures: [["Number of filled Project Info items", "project_info_items", ""]],
          score: atLeastScore("project_info_items", [10, 5, 1]),
          advice: {
            good: "The project has many Project Info entries, which also appear in file properties, IFC and BIMx files. Nothing to do.",
            mid: "Only some Project Info entries are filled in. Add more.",
            low: "Almost no Project Info entries are filled in. Fill them in."
          }
        },
        qCheck("4.22", "Project Notes", ["b"], 1, {
          good: "Project Notes are in use. Nothing to do.",
          mid: "Project Notes are used a little. Use them more to record the progress of the project.",
          low: "Project Notes are barely used. Use them to record the progress of the project.",
          na: "There are no notes. Project Notes can store useful comments about the progress of the project; consider using them. Ask your BIM consultant how to apply them."
        }),
        qCheck("4.23", "Project Preview", ["s"], 1, {
          good: "An appropriate picture is set for the Project Preview. It appears in operating system previews and as the BIMx cover photo. Nothing to do.",
          mid: "A Project Preview picture is set but could be better. Choose a clearer picture.",
          low: "No suitable Project Preview picture is set. Set one; it appears in operating system previews and as the BIMx cover photo."
        }),
        qCheck("4.24", "Architect Credits in BIMx", ["s"], 1, {
          good: "The Architect Credits have a clear company logo (with an alpha channel where it applies) and a fully qualified URL starting with https:// with display text. Nothing to do.",
          mid: "The Architect Credits are partly set up. Check the logo, the URL (it must start with https://) and the display text.",
          low: "The Architect Credits are missing or broken. Add a logo, a fully qualified URL and display text."
        }),
        {
          id: "4.25", title: "Element ID Management", axes: ["s", "b"], mult: 3,
          measures: [["Number of elements with duplicate IDs", "dup_ids", ""]],
          score: stepScore("dup_ids", [0, 100, 5000]),
          advice: {
            good: "Every element has a unique ID. Nothing to do.",
            mid: "Some elements share IDs. Give every element a unique ID unless your workflow needs otherwise.",
            low: "Many elements share the same ID. Unique IDs make data management easier and help when finding and quantifying elements in schedules; give every element one unless your workflow needs otherwise."
          }
        },
        {
          id: "4.26", title: "Structural Function", axes: ["s", "b"], mult: 3,
          measures: [["Number of elements set to 'Undefined'", "undef_structural", ""]],
          score: stepScore("undef_structural", [0, 100, 10000]),
          advice: {
            good: "Every element has a Structural Function. Nothing to do.",
            mid: "Some elements have their Structural Function set to Undefined. Set it to Load-Bearing or Non Load-Bearing; a schedule helps audit them.",
            low: "Many elements have their Structural Function set to Undefined. Set it to Load-Bearing or Non Load-Bearing, especially when working with structural engineers; a schedule helps audit them."
          }
        },
        {
          id: "4.27", title: "Position", axes: ["s", "b"], mult: 3,
          measures: [["Number of elements set to 'Undefined'", "undef_position", ""]],
          score: stepScore("undef_position", [0, 100, 10000]),
          advice: {
            good: "Every element has a Position. Nothing to do.",
            mid: "Some elements have their Position set to Undefined. Set it to Interior or Exterior; a schedule helps audit them.",
            low: "Many elements have their Position set to Undefined. Set it to Interior or Exterior, especially for energy evaluation; a schedule helps audit them."
          }
        },
        {
          id: "4.28", title: "Element Classification", axes: ["s", "b"], mult: 5,
          measures: [["Number of elements set to 'Undefined'", "undef_classification", ""]],
          score: stepScore("undef_classification", [0, 50, 1000]),
          advice: {
            good: "Every element is classified. Nothing to do.",
            mid: "Some elements have no classification. Assign one, and check that the classification matches the type of element; a schedule helps audit the values.",
            low: "Many elements have no classification, which matters when collaborating through IFC. Assign one to each element and check that it matches the type of element; a schedule helps audit the values."
          }
        },
        qCheck("4.29", "Structuring of Archicad Properties", ["s", "b"], 3, {
          good: "Template default properties and custom properties in use follow a consistent naming convention and have correct settings. Nothing to do.",
          mid: "Some properties have naming mistakes or incorrect settings. Tidy them.",
          low: "Many properties have naming mistakes or incorrect settings. Correct them."
        }),
        qCheck("4.30", "Find & Select Criteria Sets", ["b"], 1, {
          good: "Find & Select criteria sets are saved and make finding elements easier. Nothing to do.",
          mid: "A few criteria sets are saved. Add more for the searches you repeat.",
          low: "The saved criteria sets are not useful. Rebuild them for the searches you repeat.",
          na: "No Find & Select criteria sets are saved. Saving them makes finding and selecting elements easier; ask your BIM consultant how to apply them."
        })
      ]
    },
    {
      id: "5",
      name: "Project Preferences",
      short: "Preferences",
      intro: "Project Preferences hardly affect performance, but sensible preferences give correct results and ease the workflow. " +
        "The items below are suggestions that improve structure rather than faults that harm the project.",
      checks: [
        qs("5.1", "Working Units", ["s"], 3, "Working Units match the template defaults or the local standards. Nothing to do.", "Working Units differ from the template defaults and local standards. Align them."),
        qs("5.2", "Dimension Preferences", ["s", "b"], 5, "Dimension Preferences match the template defaults or the local standards. Nothing to do.", "Dimension Preferences differ from the template defaults and local standards. Align them."),
        {
          id: "5.3", title: "Dimension Preferences in use", axes: ["s"], mult: 5,
          measures: [
            ["Number of Dimension Preferences in use in the project", "dimprefs_used", ""],
            ["Total number of Dimension Preferences in the project", "dimprefs_total", ""],
            pctMeasure("Percentage in use out of total", "dimprefs_used", "dimprefs_total")
          ],
          headlineIndex: 2,
          score: shareScore("dimprefs_used", "dimprefs_total", usedShareScore),
          advice: {
            good: "Most Dimension Standards are assigned to views. Nothing to do.",
            mid: "Some Dimension Standards are not assigned to views, or custom ones are. Fix or delete the extra ones.",
            low: "Many Dimension Standards are not assigned to views, and custom ones are assigned. Fix them and delete what you do not need."
          }
        },
        qs("5.4", "Calculation Units & Rules", ["s"], 1, "The template defaults are kept, or the new settings are appropriate. Nothing to do.", "The Calculation Units & Rules differ from the defaults without a clear reason. Review them."),
        qs("5.5", "Conditional Rules", ["s"], 1, "No schedules use conditional parameters, or the rules they rely on are set correctly. Nothing to do.", "Conditional Rules are not set correctly for the schedules that use conditional parameters. Check them."),
        qs("5.6", "Zone Preferences", ["s"], 1, "Zone Preferences are set correctly. Nothing to do.", "Zone Preferences give unexpected results. Review them."),
        qs("5.7", "Reference Levels", ["p", "s"], 1, "The Sea Level (and some Reference Levels) are used. They automate annotation in sections, elevations and level dimensions, and the Sea Level links to the altitude in Project Location. Nothing to do.", "Reference Levels are not used. Set them up to automate annotation and level dimensions."),
        {
          id: "5.8", title: "Legacy Preferences", axes: ["p", "s"], mult: 3,
          measures: [["Number of Legacy Preferences enabled", "legacy_enabled", ""]],
          score: stepScore("legacy_enabled", [0, 2, 5]),
          advice: {
            good: "No Legacy Preferences are enabled, so the project uses the latest features. Nothing to do.",
            mid: "A few Legacy Preferences are enabled, which can mean the latest features are not fully used. Review them.",
            low: "Many Legacy Preferences are enabled, so the project is not using the latest features. Review and turn them off."
          }
        },
        {
          id: "5.9", title: "Stair Rules and Standards", axes: ["p", "s"], mult: 1,
          measures: [
            ["Number of hidden Rules", "hidden_rules", ""],
            ["Total number of Rules", "stair_rules_total", ""]
          ],
          headline: function (r) { return r.hidden_rules == null || r.stair_rules_total == null ? null : r.hidden_rules + " / " + r.stair_rules_total; },
          score: function (row) {
            var p = ratioPct(row.hidden_rules, row.stair_rules_total);
            return p == null ? null : p >= 50 ? 3 : p >= 25 ? 2 : p > 0 ? 1 : 0;
          },
          advice: {
            good: "Unused Stair Rules are hidden, so the Rules & Standards panel stays clear. Nothing to do.",
            mid: "Some Stair Rules are hidden. Hide the rest of the ones you do not use.",
            low: "No Stair Rules are hidden. Rules that are hidden do not show in the Stair Settings panel, so hiding the ones you do not use keeps it clear and avoids confusing users. Ask your BIM consultant how to apply this."
          }
        },
        qs("5.10", "Project Location Settings", ["s", "b"], 3, "The Project Location matches the address in Project Info, and the Project North and Altitude are set. Nothing to do.", "The Project Location does not match Project Info, or the Project North or Altitude is missing. Complete it.")
      ]
    },
    {
      id: "6",
      name: "Project Structure",
      short: "Structure",
      intro: "Project Structure covers the viewpoints in the Project Map, the views in the View Map, the Layout Book and the Publisher Sets. " +
        "A well organised structure saves time because it is consistent, predictable and easy to understand. Very large projects with too many layouts can run into performance issues.",
      checks: [
        qs("6.1", "Structuring of Project Map", ["p", "s"], 3, "Viewpoints in the Project Map are organised and spelled correctly. Nothing to do.", "The Project Map is disorganised or has spelling mistakes. Tidy it."),
        {
          id: "6.2", title: "Number of Viewpoints", axes: ["p", "s"], mult: 5,
          measures: [
            ["Number of Stories", "vp_stories", ""],
            ["Number of Sections", "vp_sections", ""],
            ["Number of Elevations", "vp_elevations", ""],
            ["Number of Interior Elevations", "vp_interior", ""],
            ["Number of Worksheets", "vp_worksheets", ""],
            ["Number of Details", "vp_details", ""],
            ["Number of Cameras", "vp_cameras", ""],
            ["Number of Schedules", "vp_schedules", ""],
            ["Number of Project Indexes", "vp_indexes", ""],
            ["Number of 3D Documents", "vp_3d", ""],
            ["Number of Lists", "vp_lists", ""],
            { label: "Total Number of Viewpoints", get: vpTotal }
          ],
          headlineIndex: 11,
          score: function (row) {
            var v = vpTotal(row);
            return v == null ? null : v <= 150 ? 3 : v <= 400 ? 2 : v <= 1000 ? 1 : 0;
          },
          advice: {
            good: "There are no excess viewpoints. Nothing to do.",
            mid: "The project has many viewpoints. Remove the ones you do not need.",
            low: "The project has far too many viewpoints, which slows it down. Remove the ones you do not need."
          }
        },
        {
          id: "6.3", title: "Viewpoints not derived from 3D model", axes: ["s"], mult: 5,
          measures: [
            ["Number of Independent/Linked Viewpoints", "vp_independent", ""],
            ["Number of Viewpoints derived from the 3D model (Auto/Manual rebuild)", "vp_derived", ""],
            { label: "Total number of Viewpoints", get: independentTotal },
            { label: "Percentage of Independent/Linked out of all Viewpoints", get: independentPct, unit: "%" }
          ],
          headlineIndex: 3,
          score: function (row) {
            var p = independentPct(row);
            return p == null ? null : p <= 10 ? 3 : p <= 30 ? 2 : p <= 60 ? 1 : 0;
          },
          advice: {
            good: "Apart from Worksheets and Details, all viewpoints are set to Auto-rebuild or Manual-rebuild, so the model can be rebuilt and updated at any time. Nothing to do.",
            mid: "Some viewpoints are independent or linked. Set them to Auto-rebuild or Manual-rebuild unless there is a special reason.",
            low: "Many viewpoints are independent or linked, so they cannot be updated from the model. Set them to Auto-rebuild or Manual-rebuild unless there is a special reason."
          }
        },
        qs("6.4", "Story Settings", ["s", "b"], 3, "The story structure is sound: names are correct and follow a convention, and heights are relevant with no zero-height stories. Nothing to do.", "The story structure has naming or height problems, such as zero-height stories. Fix them."),
        qs("6.5", "Section Settings", ["s"], 1, "All (or most) Sections are set correctly. Nothing to do.", "Some Sections have wrong settings. Correct them."),
        qs("6.6", "Elevation Settings", ["s"], 1, "All (or most) Elevations are set correctly. Nothing to do.", "Some Elevations have wrong settings. Correct them."),
        qs("6.7", "Interior Elevation Settings", ["s"], 1, "All Interior Elevations are set correctly. Nothing to do.", "Some Interior Elevations have wrong settings. Correct them."),
        qs("6.8", "Worksheet Settings", ["s"], 1, "All Worksheets are set correctly. Nothing to do.", "Some Worksheets have wrong settings. Correct them."),
        qs("6.9", "Detail Settings", ["s"], 1, "All Details are set correctly. Nothing to do.", "Some Details have wrong settings. Correct them."),
        qs("6.10", "3D Document settings", ["s"], 1, "All 3D Documents are set correctly. Nothing to do.", "Some 3D Documents have wrong settings. Correct them."),
        qCheck("6.11", "Camera and Path Settings", ["p"], 1, {
          good: "Cameras and Paths are set correctly. Nothing to do.",
          mid: "There are some issues with Cameras and Paths. Cameras are only needed for fly-throughs and Gallery Views in BIMx Publisher Sets, and you can save 3D Views without them. No action is required.",
          low: "Cameras and Paths have serious setting problems. Review or delete the ones you do not need."
        }),
        qCheck("6.12", "Schedule Settings", ["s"], 5, {
          good: "Schedule Schemes are set correctly. Nothing to do.",
          mid: "Some Schedule Schemes have issues: missing criteria to omit elements, wrong criteria or sorting, or no summation. Review them.",
          low: "Many Schedule Schemes have one or more of these issues: no criteria to omit elements, incorrect criteria, incorrect sorting or no summation. Some listed Archicad Property fields may also have been deleted from the project and show as MISSING in the scheme settings. Consider fixing them."
        }),
        qCheck("6.13", "Project Index Settings", ["s"], 1, {
          good: "Project Indexes are set up correctly. Nothing to do.",
          mid: "Some Project Indexes have wrong settings. Correct them.",
          low: "Project Indexes have wrong settings. Correct them.",
          na: "Project Indexes were not used. That may be fine at this project stage, but they are an important part of Archicad projects. Ask your BIM consultant how to apply them."
        }),
        {
          id: "6.14", title: "Shadow Casting in 2D Viewpoints", axes: ["p"], mult: 5,
          measures: [
            ["Number of Viewpoints with shadows applied", "vp_shadow", ""],
            ["Total number of Sections, (Interior) Elevations & 3D Documents", "vp_shadow_total", ""],
            pctMeasure("Percentage of Viewpoints with shadows out of the total", "vp_shadow", "vp_shadow_total")
          ],
          headlineIndex: 2,
          score: shareScore("vp_shadow", "vp_shadow_total", lowerShareScore),
          advice: {
            good: "Few viewpoints have Shadow Casting on. Nothing to do.",
            mid: "Some views have Shadow Casting on, which takes time to calculate. Use shadows only for presentation, not while editing. If rebuilds get slow, turn them off until you publish.",
            low: "Many views have Shadow Casting on, which slows rebuilds. Use shadows only for presentation, and turn them off while editing."
          }
        },
        qs("6.15", "Structuring of View Map", ["s"], 5, "The View Map is organised into folders that match the Layout Book and has no spelling errors. Nothing to do.", "The View Map is not organised to match the Layout Book, or has spelling errors. Tidy it."),
        {
          id: "6.16", title: "Views in Clone folders", axes: ["s", "b"], mult: 3,
          measures: [
            ["Number of Views in cloned folders", "views_clone", ""],
            ["Total number of Views", "views_total", ""],
            pctMeasure("Percentage of Views in cloned folders out of the total", "views_clone", "views_total")
          ],
          headlineIndex: 2,
          score: function (row) {
            var p = ratioPct(row.views_clone, row.views_total);
            return p == null ? null : p >= 50 ? 3 : p >= 20 ? 2 : p >= 5 ? 1 : 0;
          },
          advice: {
            good: "Many views use clone folders. Nothing to do.",
            mid: "The project contains some clones, but it could use more. Clones are encouraged for views that show the final status of a project.",
            low: "Few views are in clone folders. Use more clones for views that show the final status of the project."
          }
        },
        {
          id: "6.17", title: "View Settings", axes: ["s"], mult: 1,
          measures: [["Number of views with custom or missing settings", "views_custom", ""]],
          score: stepScore("views_custom", [0, 5, 20]),
          advice: {
            good: "There are no MISSING or CUSTOM settings in View Settings. Nothing to do. If a Settings Combination or Preset is deleted, or was not saved before being applied, the view loses its link and can output differently from what was intended.",
            mid: "Some views have custom or missing settings. Restore or save the combinations they refer to.",
            low: "Many views have custom or missing settings, which can change their output. Restore or save the combinations they refer to."
          }
        },
        qs("6.18", "Structuring of Layout Book", ["s"], 5, "The Layout Book is organised into subsets with correct numbering and no spelling errors. Nothing to do.", "The Layout Book has subset, numbering or spelling problems. Tidy it."),
        {
          id: "6.19", title: "Number of Layouts", axes: ["p"], mult: 5,
          measures: [["Number of Layouts in the Layout Book", "layouts_count", ""]],
          score: stepScore("layouts_count", [150, 300, 600]),
          advice: {
            good: "There are fewer than 150 layouts. Nothing to do.",
            mid: "The project has many layouts. Remove the ones you do not need.",
            low: "The project has far too many layouts, which can cause performance issues. Remove the ones you do not need."
          }
        },
        qs("6.20", "Layout IDs inherited from Subsets", ["s"], 3, "All layouts get their ID from the subsets and Layout Book, which automates layout numbering. Nothing to do.", "Some layouts do not inherit their ID from subsets. Set them to, so numbering is automatic."),
        qs("6.21", "Drawing Name by Source View Name", ["s"], 1, "Drawings take their name from the View Map, so a renamed view renames its drawing. Nothing to do.", "Some drawings do not take their name from the source view. Set them to, so names stay in sync."),
        qs("6.22", "Drawing IDs inherited from Layout", ["s"], 3, "Drawings take their ID from the layouts and are part of the drawing ID sequence, which automates numbering. Nothing to do.", "Some drawings do not inherit their ID from the layout. Set them to, so numbering is automatic."),
        qs("6.23", "Drawing Settings", ["s"], 3, "All (or most) drawings have consistent, robust settings. Nothing to do.", "Some drawings have inconsistent settings. Review them."),
        {
          id: "6.24", title: "Drawings stored in the project file", axes: ["p", "s"], mult: 3,
          measures: [
            ["Number of Drawings stored in the project file", "drawings_stored", ""],
            ["Total number of Drawings", "drawings_total", ""],
            pctMeasure("Percentage of stored Drawings out of total", "drawings_stored", "drawings_total")
          ],
          headlineIndex: 2,
          score: shareScore("drawings_stored", "drawings_total", lowerShareScore),
          advice: {
            good: "Few or no drawings are stored in the project file. Nothing to do.",
            mid: "Some drawings have 'Store Drawing in the Project File' checked. Stored drawings keep their lines, fills and text in the file and can greatly increase its size. Consider reviewing them.",
            low: "Many drawings have 'Store Drawing in the Project File' checked, which greatly increases the project file size. Review them."
          }
        },
        {
          id: "6.25", title: "Unused Master Layouts", axes: ["p", "s"], mult: 3,
          measures: [
            ["Number of unused Master Layouts", "master_unused", ""],
            ["Total number of Master Layouts", "master_total", ""],
            pctMeasure("Percentage of unused Master Layouts out of total", "master_unused", "master_total")
          ],
          headlineIndex: 2,
          score: shareScore("master_unused", "master_total", lowerShareScore),
          advice: {
            good: "Few or no Master Layouts are unused. Nothing to do.",
            mid: "Some Master Layouts are unused. They can be redundant and add size. Keep only the ones you may need later.",
            low: "Many Master Layouts are unused and add unnecessary size. Delete the ones you will not need."
          }
        },
        {
          id: "6.26", title: "Linked Drawings on Master Layouts", axes: ["p", "s"], mult: 5,
          measures: [["Number of Linked Drawings placed on Master Layouts", "linked_drawings_master", ""]],
          score: stepScore("linked_drawings_master", [0, 5, 20]),
          advice: {
            good: "No linked drawings are placed on Master Layouts. Title blocks and logos that are linked onto Master Layouts add overhead even though they rarely change, so this is good. Nothing to do.",
            mid: "A few linked drawings sit on Master Layouts. Linked title blocks and logos add overhead; use them sparingly.",
            low: "Many linked drawings sit on Master Layouts, which adds unnecessary overhead. Reduce them."
          }
        },
        qs("6.27", "Autotexts", ["s"], 5, "The Master Layouts make good use of Autotext. Nothing to do.", "The Master Layouts make little use of Autotext. Use it for values that change from layout to layout."),
        qs("6.28", "Structuring of Publisher Sets", ["s", "b"], 5, "Publisher Sets are well structured, have no spelling errors and make good use of their functions. Nothing to do.", "Publisher Sets have structure or spelling problems. Tidy them."),
        {
          id: "6.29", title: "Shortcut folders in Publisher Sets", axes: ["s"], mult: 5,
          measures: [
            ["Number of Publisher Set items in shortcut folders", "shortcut_items", ""],
            ["Total number of Publisher Set items", "publisher_items", ""],
            pctMeasure("Percentage of items in shortcut folders out of total", "shortcut_items", "publisher_items")
          ],
          headlineIndex: 2,
          score: function (row) {
            var p = ratioPct(row.shortcut_items, row.publisher_items);
            return p == null ? null : p >= 90 ? 3 : p >= 50 ? 2 : p >= 20 ? 1 : 0;
          },
          advice: {
            good: "Almost all Publisher Set items use shortcuts. Nothing to do.",
            mid: "Most Publisher Sets were created with shortcuts. Use as many shortcuts as possible, because placing views and layouts by hand can lead to unexpected or missing information. Consider recreating the rest with shortcuts.",
            low: "Most Publisher Set items were placed by hand, which can lead to unexpected or missing information. Recreate them with shortcuts."
          }
        },
        qs("6.30", "Use Architect Credits in BIMx Publisher Set", ["s"], 3, "'Use Architect Credits in BIMx Hyper-models' is checked in all BIMx Publisher Sets, so the credits show in BIMx. Nothing to do.", "'Use Architect Credits in BIMx Hyper-models' is not checked in some BIMx Publisher Sets. Turn it on."),
        qCheck("6.31", "Info Sets in BIMx Publisher Set", ["s", "b"], 1, {
          good: "The Info Sets use a schedule, which gives control over what is shown. Nothing to do.",
          mid: "The Info Set is set to Classification and Properties in most BIMx Publisher Sets. That shows a lot of useful information but gives little control over what is displayed. Consider selecting a schedule instead.",
          low: "The Info Sets show everything without control over what is displayed. Select a schedule for them."
        })
      ]
    },
    {
      id: "7",
      name: "External Content",
      short: "External Content",
      intro: "How external content is managed affects all three foundations of a project: size, speed and structure. " +
        "Removing redundant or embedded data can solve many issues.",
      checks: [
        {
          id: "7.1", title: "Internal Drawings", axes: ["p", "s"], mult: 5,
          measures: [["Number of missing internal drawings", "missing_internal_drawings", ""]],
          score: stepScore("missing_internal_drawings", [0, 5, 20]),
          advice: {
            good: "No internal drawings are missing. Nothing to do.",
            mid: "Some internal drawings are missing. Relink or delete them. External drawings may also be missing, but they are not covered by the checkup and must be checked locally.",
            low: "Many internal drawings are missing. Relink or delete them. External drawings may also be missing and must be checked locally."
          }
        },
        {
          id: "7.2", title: "External Drawings", axes: ["p", "s"], mult: 5,
          measures: [["Number of external drawings", "external_drawings", ""]],
          score: stepScore("external_drawings", [0, 5, 20]),
          advice: {
            good: "No external drawings are linked. Nothing to do.",
            mid: "The project has some linked files. They may be large, and without access to them they cannot be assessed here. Check the images, PDFs and DWGs.",
            low: "The project has many linked files, which may be large. Check the images, PDFs and DWGs."
          }
        },
        {
          id: "7.3", title: "Hotlink Module Management", axes: ["p", "s", "b"], mult: 5,
          measures: [
            ["Number of hotlinks referenced from PLN files", "hl_pln", ""],
            ["Number of hotlinks referenced from MOD files", "hl_mod", ""],
            ["Number of hotlinks referenced from Teamwork projects", "hl_teamwork", ""],
            ["Number of hotlinks referenced from IFC files", "hl_ifc", ""],
            ["Number of hotlinks referenced from 3DM files", "hl_3dm", ""]
          ],
          headline: function (r) { var t = hotlinkTotal(r); return t == null ? null : String(t); },
          score: function (row) {
            var t = hotlinkTotal(row);
            return t == null || t === 0 ? null : t <= 10 ? 3 : t <= 30 ? 2 : t <= 60 ? 1 : 0;
          },
          advice: {
            good: "Hotlink Modules are used in a manageable way. Nothing to do.",
            mid: "The project uses a fair number of hotlinks. Review them and remove the ones you no longer need.",
            low: "The project uses very many hotlinks. Review them and remove the ones you no longer need.",
            na: "There are no Hotlink Modules in the project. They are an important part of Archicad projects, so ask your BIM consultant how to apply them."
          }
        },
        {
          id: "7.4", title: "XREF Management", axes: ["p", "s"], mult: 1,
          measures: [
            ["Number of XREFs bound to project", "xref_bound", ""],
            ["Number of XREFs attached to project", "xref_attached", ""]
          ],
          score: stepScore("xref_bound", [0, 3, 10]),
          advice: {
            good: "No XREFs have been bound. Nothing to do.",
            mid: "Some XREFs have been bound (or exploded), which can increase the project size. Consider whether you need that data. Deleting their layers removes most of it; removing their attributes in the Attribute Manager is the only way to remove every trace.",
            low: "Many XREFs have been bound, which increases the project size. Delete their layers, and remove their attributes in the Attribute Manager to remove every trace."
          }
        },
        qCheck("7.5", "IFC Translators", ["b"], 5, {
          good: "Publisher Set IFC items use suitable translators for their purpose. Nothing to do.",
          mid: "All the IFC items in the Publisher Sets use a Generic Translator. That makes sense if you only need a generic export and do not collaborate with other disciplines; otherwise export different IFC files with the appropriate translators.",
          low: "The IFC items in the Publisher Sets have no suitable translator. Assign the appropriate translators."
        })
      ]
    }
  ];

  var AXES = [
    { key: "p", label: "Performance" },
    { key: "s", label: "Structure" },
    { key: "b", label: "BIM Essentials" }
  ];

  /* ---------- Sample values for the audit (invented) ---------- */

  function seeded(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var STAGES = ["Concept Design", "Schematic Design", "Design Development", "Construction Documents"];

  SAMPLE.forEach(function (r, i) {
    var rnd = seeded(i + 31);
    var f = function (a, b) { return Math.floor(a + rnd() * (b - a)); };
    r.embedded_items = f(0, 120);
    r.ifc_lcf = f(0, 4);
    r.ifc_folders = f(0, 5);
    r.images_over_1mb = f(0, 40);
    r.linked_libs = f(2, 18);
    r.point_cloud_mb = f(0, 700);
    r.missing_parts = rnd() < 0.4 ? 0 : f(1, 25);
    r.duplicate_parts = rnd() < 0.5 ? 0 : f(1, 12);
    r.audit_date = "2026-11-03";
    r.audit_version = "Sample";
    r.auditor = "Sample data";
    r.audited_by = "Kuro Hitsuji";
    r.audit_archicad = "Archicad 2027";
    r.report_language = "English";
    r.project_stage = STAGES[f(0, STAGES.length)];
    r.archicad_version = "Archicad 2027";
    r.file_name = r.project.replace(/\s+/g, "_") + ".pln";
    r.addons = rnd() < 0.6 ? "No 3rd party add-ons." : "Tapir";
  });

  SAMPLE.forEach(function (r, i) {
    var rnd = seeded(i + 97);
    var f = function (a, b) { return Math.floor(a + rnd() * (b - a)); };
    r.seo_ops = f(0, 700);
    r.seo_targets = Math.round(r.seo_ops * (0.2 + rnd() * 0.5));
    r.seo_operators = Math.round(r.seo_ops * (0.2 + rnd() * 0.5));
    r.open_tabs = f(2, 30);
    r.trace_active = f(0, 22);
    r.trace_views = f(0, 45);
    r.elements_3d = Math.round(r.size_mb * f(30, 90));
    r.elements_2d = Math.round(r.elements_3d * (0.01 + rnd() * 0.6));
    r.elements_total = Math.round((r.elements_3d + r.elements_2d) * (1 + rnd() * 0.15));
    r.groups = f(0, 420);
    r.styles_total = f(3, 30);
    r.styles_sun = f(0, r.styles_total + 1);
    r.session_errors = rnd() < 0.4 ? 0 : f(1, 40);
    r.polygons = Math.round(r.size_mb * f(1500, 14000));
    r.duplicate_elements = rnd() < 0.3 ? 0 : f(1, 260);
    r.origin_distance_m = Math.round(rnd() * rnd() * 150000) / 100;
    r.inaccurate_walls = rnd() < 0.5 ? 0 : f(1, 80);
    r.lw_duplicates = rnd() < 0.5 ? 0 : f(1, 60);
    r.lw_merged_connecting = rnd() < 0.5 ? 0 : f(1, 120);
    r.lw_merged_overlapping = rnd() < 0.5 ? 0 : f(1, 120);
    r.lw_identical = rnd() < 0.5 ? 0 : f(1, 80);
    r.lw_covered = rnd() < 0.5 ? 0 : f(1, 80);
    r.lw_different = rnd() < 0.5 ? 0 : f(1, 40);
    r.lw_adjusted = rnd() < 0.5 ? 0 : f(1, 60);
    r.lw_split = rnd() < 0.5 ? 0 : f(1, 60);
    r.lw_total = r.lw_duplicates + r.lw_merged_connecting + r.lw_merged_overlapping + r.lw_identical +
      r.lw_covered + r.lw_different + r.lw_adjusted + r.lw_split;
    r.fills_after = f(0, 400);
    r.fills_before = r.fills_after + (rnd() < 0.5 ? f(0, 8) : f(8, 260));
  });

  SAMPLE.forEach(function (r, i) {
    var rnd = seeded(i + 211);
    var f = function (a, b) { return Math.floor(a + rnd() * (b - a)); };
    var q = function (id, nullable) {
      var v = rnd();
      r["q_" + id.replace(".", "_")] = nullable && rnd() < 0.5 ? null : v < 0.1 ? 0 : v < 0.3 ? 1 : v < 0.55 ? 2 : 3;
    };
    r.attrs_total = f(150, 900);
    r.attrs_in_use = Math.round(r.attrs_total * (0.1 + rnd() * 0.6));
    r.archicad_layer_elements = rnd() < 0.5 ? 0 : f(1, 400);
    r.mvo_total = f(3, 20);
    r.mvo_used = f(0, r.mvo_total + 1);
    r.mvo_curtain = f(0, r.mvo_total + 1);
    r.mvo_stairs = f(0, r.mvo_total + 1);
    r.mvo_objects = f(0, r.mvo_total + 1);
    r.go_total = f(2, 30);
    r.go_used = f(0, r.go_total + 1);
    r.renov_total = f(3, 8);
    r.renov_used = f(0, r.renov_total + 1);
    r.styles_used = f(0, r.styles_total + 1);
    r.greyed_favorites = rnd() < 0.5 ? 0 : f(1, 40);
    r.project_info_items = f(0, 30);
    r.dup_ids = rnd() < 0.3 ? 0 : f(1, 8000);
    r.undef_structural = rnd() < 0.3 ? 0 : f(1, 20000);
    r.undef_position = rnd() < 0.3 ? 0 : f(1, 20000);
    r.undef_classification = rnd() < 0.3 ? 0 : f(1, 3000);
    r.magic_wand_preference = rnd() < 0.7 ? "Best Match" : "Straight Lines";
    r.magic_wand_tracing = rnd() < 0.7 ? "Deviation from Curves (\u226540 mm)" : "Deviation from Curves (\u22655 mm)";
    Q_IDS.forEach(function (id) { q(id, id === "4.22" || id === "4.30"); });
  });

  SAMPLE.forEach(function (r, i) {
    var rnd = seeded(i + 523);
    var f = function (a, b) { return Math.floor(a + rnd() * (b - a)); };
    var q = function (id, nullable) {
      var v = rnd();
      r["q_" + id.replace(".", "_")] = nullable && rnd() < 0.5 ? null : v < 0.1 ? 0 : v < 0.3 ? 1 : v < 0.55 ? 2 : 3;
    };
    r.dimprefs_total = f(2, 12);
    r.dimprefs_used = f(0, r.dimprefs_total + 1);
    r.legacy_enabled = rnd() < 0.5 ? 0 : f(1, 6);
    r.stair_rules_total = 6;
    r.hidden_rules = f(0, 5);
    r.vp_stories = f(2, 20);
    r.vp_sections = f(0, 60);
    r.vp_elevations = f(0, 60);
    r.vp_interior = f(0, 40);
    r.vp_worksheets = f(0, 30);
    r.vp_details = f(0, 80);
    r.vp_cameras = rnd() < 0.5 ? 0 : f(1, 10);
    r.vp_schedules = f(0, 60);
    r.vp_indexes = f(0, 12);
    r.vp_3d = f(0, 12);
    r.vp_lists = f(0, 100);
    r.vp_independent = rnd() < 0.4 ? 0 : f(1, 120);
    r.vp_derived = f(20, 400);
    r.vp_shadow_total = r.vp_sections + r.vp_elevations + r.vp_interior + r.vp_3d;
    r.vp_shadow = f(0, r.vp_shadow_total + 1);
    r.views_total = f(20, 500);
    r.views_clone = f(0, r.views_total + 1);
    r.views_custom = rnd() < 0.5 ? 0 : f(1, 40);
    r.layouts_count = f(5, 400);
    r.drawings_total = f(1, 300);
    r.drawings_stored = f(0, r.drawings_total + 1);
    r.master_total = f(1, 12);
    r.master_unused = f(0, r.master_total + 1);
    r.linked_drawings_master = rnd() < 0.5 ? 0 : f(1, 30);
    r.publisher_items = f(10, 500);
    r.shortcut_items = f(0, r.publisher_items + 1);
    r.missing_internal_drawings = rnd() < 0.5 ? 0 : f(1, 30);
    r.external_drawings = rnd() < 0.4 ? 0 : f(1, 40);
    r.hl_pln = rnd() < 0.5 ? 0 : f(1, 20);
    r.hl_mod = rnd() < 0.7 ? 0 : f(1, 10);
    r.hl_teamwork = rnd() < 0.8 ? 0 : f(1, 6);
    r.hl_ifc = rnd() < 0.6 ? 0 : f(1, 12);
    r.hl_3dm = rnd() < 0.9 ? 0 : f(1, 4);
    r.xref_bound = rnd() < 0.5 ? 0 : f(1, 14);
    r.xref_attached = f(0, 10);
    Q_IDS.forEach(function (id) {
      if (/^[567]\./.test(id)) q(id, id === "6.13");
    });
  });

  /* The first sample project uses the values of the reports this layout follows,
     so its scores can be compared with them: section 1 gives 64%, 64%, 64%, 67%
     (overall, performance, structure, BIM Essentials) and section 2 gives
     87%, 86%, 87%, 89%. */
  Object.assign(SAMPLE[0], {
    embedded_items: 31, ifc_lcf: 1, ifc_folders: 2, images_over_1mb: 3,
    linked_libs: 13, point_cloud_mb: 153, missing_parts: 7, duplicate_parts: 1,
    seo_ops: 128, seo_targets: 49, seo_operators: 45, open_tabs: 15,
    trace_active: 5, trace_views: 1, elements_total: 11170,
    elements_3d: 10120, elements_2d: 151, groups: 145,
    styles_sun: 5, styles_total: 13, session_errors: 2, polygons: 2134404,
    duplicate_elements: 6, origin_distance_m: 0, inaccurate_walls: 0,
    lw_duplicates: 0, lw_merged_connecting: 0, lw_merged_overlapping: 0, lw_identical: 0,
    lw_covered: 0, lw_different: 0, lw_adjusted: 0, lw_split: 0, lw_total: 0,
    fills_before: 7, fills_after: 2,
    attrs_in_use: 353, attrs_total: 587, archicad_layer_elements: 0,
    mvo_used: 6, mvo_total: 8, mvo_curtain: 5, mvo_stairs: 7, mvo_objects: 6,
    go_used: 12, go_total: 26, renov_used: 4, renov_total: 6, styles_used: 2,
    greyed_favorites: 0, project_info_items: 23, dup_ids: 2796,
    undef_structural: 6870, undef_position: 6870, undef_classification: 382,
    magic_wand_preference: "Best Match", magic_wand_tracing: "Deviation from Curves (\u226540 mm)",
    q_3_2: 2, q_3_3: 3, q_3_4: 2, q_3_7: 3, q_3_8: 3, q_3_9: 2, q_3_10: 2, q_3_11: 1, q_3_12: 1,
    q_3_13: 3, q_3_14: 3, q_3_15: 3, q_3_16: 2, q_3_17: 1,
    q_4_1: 2, q_4_2: 2, q_4_3: 3, q_4_4: 2, q_4_5: 3, q_4_10: 3, q_4_12: 3, q_4_13: 3, q_4_15: 3,
    q_4_17: 3, q_4_18: 3, q_4_20: 3, q_4_22: null, q_4_23: 3, q_4_24: 3, q_4_29: 3, q_4_30: null,
    notes_3: "Layer and attribute names mix several conventions. Composite structures and complex profiles need the most tidying; layer combinations and surfaces are in good shape.",
    dimprefs_used: 2, dimprefs_total: 7, legacy_enabled: 0, hidden_rules: 0, stair_rules_total: 6,
    vp_stories: 7, vp_sections: 3, vp_elevations: 4, vp_interior: 4, vp_worksheets: 2, vp_details: 3,
    vp_cameras: 0, vp_schedules: 23, vp_indexes: 5, vp_3d: 4, vp_lists: 54,
    vp_independent: 0, vp_derived: 109, vp_shadow: 4, vp_shadow_total: 15,
    views_clone: 14, views_total: 66, views_custom: 0, layouts_count: 26,
    drawings_stored: 1, drawings_total: 2, master_unused: 2, master_total: 7, linked_drawings_master: 0,
    shortcut_items: 144, publisher_items: 181, missing_internal_drawings: 3, external_drawings: 3,
    hl_pln: 0, hl_mod: 0, hl_teamwork: 0, hl_ifc: 0, hl_3dm: 0, xref_bound: 2, xref_attached: 2,
    q_5_1: 3, q_5_2: 3, q_5_4: 3, q_5_5: 3, q_5_6: 3, q_5_7: 3, q_5_10: 3,
    q_6_1: 3, q_6_4: 3, q_6_5: 3, q_6_6: 3, q_6_7: 3, q_6_8: 3, q_6_9: 3, q_6_10: 3, q_6_11: 2, q_6_12: 1, q_6_13: null,
    q_6_15: 3, q_6_18: 3, q_6_20: 3, q_6_21: 3, q_6_22: 3, q_6_23: 3, q_6_27: 3, q_6_28: 3, q_6_30: 3, q_6_31: 2, q_7_5: 2,
    notes_6: "Drawing IDs mostly follow the source views, but some views have no ID so their drawings have none either. Few views use clone folders; more would speed up documentation. Some Dimension settings are custom and some Renovation Filters are missing. Shadow casting is used sensibly: only the elevations have it on, not the technical drawings.",
    notes_7: "The Structural IFC Model item in the Publisher Set has no translator assigned.",
    notes_4: "Many elements still have Undefined for Structural Function, Position and Classification, and some share the same ID. Fixing these is the quickest way to raise the Structure and BIM Essentials scores."
  });

  /* The sample was written with 0 to 3 points per check; turn them into the percentage of
     items with issues that the page now scores itself. */
  SAMPLE.forEach(function (r, i) {
    var pctFor = i === 0
      ? { 3: 0, 2: 15, 1: 40, 0: 80 }
      : { 3: i % 5, 2: 10 + (i * 3) % 14, 1: 30 + (i * 5) % 25, 0: 65 + (i * 7) % 30 };
    Object.keys(r).forEach(function (k) {
      if (!/^q_\d+_\d+$/.test(k)) return;
      r["issue_" + k.slice(2)] = r[k] == null ? null : pctFor[r[k]];
      delete r[k];
    });
  });

  /* ---------- State and elements ---------- */

  var NUMBER_KEYS = COLUMNS.map(function (c) { return c.key; })
    .concat(AUDIT_FIELDS.map(function (a) { return a.key; }));
  var TEXT_KEYS = AUDIT_TEXT.map(function (a) { return a.key; });

  var state = {
    rows: SAMPLE.slice(),
    sourceLabel: "Sample data: 15 invented projects, not real models.",
    sortKey: "issues",
    sortDir: -1,
    query: "",
    limit: 2000,
    selected: null,
    filter: "all",
    open: {}
  };

  var el = {
    take: document.getElementById("ah-take"),
    head: document.getElementById("ah-head"),
    body: document.getElementById("ah-body"),
    source: document.getElementById("ah-source"),
    defs: document.getElementById("ah-defs"),
    file: document.getElementById("ah-file"),
    sample: document.getElementById("ah-sample"),
    template: document.getElementById("ah-template"),
    limit: document.getElementById("ah-limit"),
    search: document.getElementById("ah-search"),
    auditBody: document.getElementById("ai-body"),
    auditProject: document.getElementById("ai-project"),
    auditFilters: document.getElementById("ai-filters"),
    auditCards: document.getElementById("ai-cards"),
    auditExpand: document.getElementById("ai-expand"),
    auditCollapse: document.getElementById("ai-collapse")
  };

  if (!el.body || !el.head) return;

  var fmt = new Intl.NumberFormat("en-US");

  /* ---------- Reading files ---------- */

  function normalizeKey(text) {
    return String(text).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  var ALIASES = {};
  COLUMNS.forEach(function (c) {
    ALIASES[c.key] = c.key;
    ALIASES[normalizeKey(c.label)] = c.key;
  });
  AUDIT_FIELDS.concat(AUDIT_TEXT).forEach(function (a) {
    ALIASES[a.key] = a.key;
    ALIASES[normalizeKey(a.label)] = a.key;
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

  function toText(value) {
    if (value === null || value === undefined) return null;
    var t = String(value).trim();
    return t === "" ? null : t;
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
          var key = ALIASES[nk];
          row[key] = TEXT_KEYS.indexOf(key) !== -1 ? toText(item[k]) : toNumber(item[k]);
        }
      });
      if (!row.project) row.project = "Project " + (index + 1);
      NUMBER_KEYS.concat(TEXT_KEYS).forEach(function (k) { if (!(k in row)) row[k] = null; });
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

  /* ---------- Heat-map table ---------- */

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
      ["b", fmt.format(over)], [null, " of "], ["b", fmt.format(rows.length)],
      [null, " projects carry more than "], ["b", fmt.format(state.limit)], [null, " integrity issues."]
    ];
    if (ranked.length) {
      parts.push([null, " "], ["b", ranked[0].project], [null, " has the most, at "],
        ["b", fmt.format(ranked[0].issues)], [null, "."]);
    }
    parts.forEach(function (p) {
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
      name.tabIndex = 0;
      name.title = "Show the project audit for this project";
      if (r.project === state.selected) tr.className = "ah-selected";
      name.addEventListener("click", function () { selectProject(r.project); });
      name.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectProject(r.project); }
      });
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

  /* ---------- Project audit ---------- */

  function selectedRow() {
    var found = state.rows.filter(function (r) { return r.project === state.selected; })[0];
    return found || state.rows[0];
  }

  function selectProject(name) {
    state.selected = name;
    renderBody();
    renderAudit();
  }

  /* Points 3 = good, 2 = moderate, 0 or 1 = critical, null = not scored. */
  function levelOf(points) {
    if (points == null) return "na";
    return points >= 3 ? "good" : points >= 2 ? "moderate" : "critical";
  }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function scoreSection(section, row) {
    var totals = { p: [0, 0], s: [0, 0], b: [0, 0] };
    var results = section.checks.map(function (check) {
      var points = check.score(row);
      if (points != null) {
        check.axes.forEach(function (a) {
          totals[a][0] += points * check.mult;
          totals[a][1] += 3 * check.mult;
        });
      }
      return { check: check, points: points };
    });
    var earned = totals.p[0] + totals.s[0] + totals.b[0];
    var possible = totals.p[1] + totals.s[1] + totals.b[1];
    var pct = function (pair) { return pair[1] ? Math.round((pair[0] / pair[1]) * 100) : null; };
    return {
      results: results,
      totals: totals,
      overall: possible ? Math.round((earned / possible) * 100) : null,
      p: pct(totals.p),
      s: pct(totals.s),
      b: pct(totals.b)
    };
  }

  function detailList(title, pairs) {
    var box = make("div", "ai-detail");
    box.appendChild(make("h4", null, title));
    var dl = make("dl", "ai-dl");
    pairs.forEach(function (p) {
      var wrap = make("div");
      wrap.appendChild(make("dt", null, p[0]));
      wrap.appendChild(make("dd", null, p[1] == null ? "N/A" : p[1]));
      dl.appendChild(wrap);
    });
    box.appendChild(dl);
    return box;
  }

  var LEVEL_LABEL = { critical: "Critical", moderate: "Moderate", good: "Good", na: "Not scored" };
  var FILTERS = ["all", "critical", "moderate", "good", "na"];

  /* Percentage colour for a section score. */
  function pctLevel(pct) {
    if (pct == null) return "na";
    return pct >= 80 ? "good" : pct >= 50 ? "moderate" : "critical";
  }

  function measureOf(m, row) {
    if (Array.isArray(m)) m = { label: m[0], key: m[1], unit: m[2] };
    var v = m.get ? m.get(row) : row[m.key];
    var text;
    if (v == null) {
      text = "N/A";
    } else if (typeof v === "string") {
      text = v;
    } else if (m.zeroText && v === 0) {
      text = m.zeroText;
    } else {
      var dec = m.dec || 0;
      text = new Intl.NumberFormat("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v) + (m.unit || "");
    }
    return [m.label, text];
  }

  function headlineOf(check, row) {
    if (check.headline) {
      var h = check.headline(row);
      return h == null ? "N/A" : h;
    }
    var m = check.measures[check.headlineIndex || 0];
    return m ? measureOf(m, row)[1] : "";
  }

  function isOpen(key) {
    return state.filter !== "all" || !!state.open[key];
  }

  function makeDetails(className, key) {
    var d = make("details", className);
    d.dataset.key = key;
    if (isOpen(key)) d.open = true;
    return d;
  }

  function renderDetails(row) {
    var d = makeDetails("ai-acc ai-acc-info", "s0");
    var sum = make("summary", "ai-sum");
    sum.appendChild(make("span", "ai-sum-title", "0. Audit Details"));
    sum.appendChild(make("span", "ai-sum-meta", [row.audit_date, row.auditor, row.archicad_version].filter(Boolean).join(" · ")));
    d.appendChild(sum);
    var body = make("div", "ai-acc-body");
    var grid = make("div", "ai-details");
    var auditPairs = AUDIT_TEXT.filter(function (t) { return t.group === "audit"; })
      .map(function (t) { return [t.label, row[t.key]]; });
    var projectPairs = [["Project's name", row.project]]
      .concat(AUDIT_TEXT.filter(function (t) { return t.group === "project"; })
        .map(function (t) { return [t.label, row[t.key]]; }));
    projectPairs.splice(4, 0, ["Project file size", row.size_mb == null ? null : fmt.format(row.size_mb) + " MB"]);
    grid.appendChild(detailList("Audit Details", auditPairs));
    grid.appendChild(detailList("Project Details", projectPairs));
    body.appendChild(grid);
    d.appendChild(body);
    return d;
  }

  function chipsFor(check, points) {
    var wrap = make("span", "ai-chips");
    AXES.forEach(function (axis) {
      if (check.axes.indexOf(axis.key) === -1) return;
      var chip = make("span", "ai-chip ai-chip-" + levelOf(points), axis.key.toUpperCase() + " " + (points == null ? "N/A" : points + "/3"));
      chip.title = axis.label;
      wrap.appendChild(chip);
    });
    return wrap;
  }

  function renderCheck(result, row) {
    var check = result.check;
    var level = levelOf(result.points);
    var d = makeDetails("ai-row ai-row-" + level, "c" + check.id);
    var sum = make("summary", "ai-rsum");
    sum.appendChild(make("span", "ai-rid", check.id));
    sum.appendChild(make("span", "ai-rtitle", check.title));
    sum.appendChild(make("span", "ai-rvalue", headlineOf(check, row)));
    sum.appendChild(chipsFor(check, result.points));
    sum.appendChild(make("span", "ai-rmult", "×" + check.mult));
    d.appendChild(sum);

    var body = make("div", "ai-rbody");
    if (check.measures.length) {
      var meas = make("dl", "ai-measures");
      check.measures.forEach(function (m) {
        var shown = measureOf(m, row);
        var line = make("div");
        line.appendChild(make("dt", null, shown[0]));
        line.appendChild(make("dd", null, shown[1]));
        meas.appendChild(line);
      });
      body.appendChild(meas);
    }
    var advice;
    if (result.points == null) {
      advice = check.advice.na || "Not enough data to score this check.";
    } else {
      advice = result.points >= 3 ? check.advice.good : result.points === 2 ? check.advice.mid : check.advice.low;
    }
    body.appendChild(make("p", "ai-advice", advice));
    var scoreLine = AXES.filter(function (a) { return check.axes.indexOf(a.key) !== -1; }).map(function (a) {
      return a.label + " " + (result.points == null ? "N/A" : result.points + "/3");
    }).join(" · ");
    body.appendChild(make("p", "ai-rscores", scoreLine + " · Impact Multiplier " + check.mult + " · " + LEVEL_LABEL[level]));
    d.appendChild(body);
    return d;
  }

  function potentialRow(label, pct) {
    var line = make("div", "ai-pot-row");
    line.appendChild(make("span", "ai-pot-label", label));
    var track = make("div", "ai-pot-track");
    if (pct == null) {
      track.appendChild(make("span", "ai-pot-na", "N/A"));
    } else {
      var have = make("span", "ai-pot-have", pct + "%");
      have.style.width = pct + "%";
      var gap = make("span", "ai-pot-gap", 100 - pct + "%");
      gap.style.width = 100 - pct + "%";
      if (pct === 0) have.textContent = "";
      if (pct === 100) gap.textContent = "";
      track.append(have, gap);
    }
    line.appendChild(track);
    return line;
  }

  function countLevels(results) {
    var c = { critical: 0, moderate: 0, good: 0, na: 0 };
    results.forEach(function (r) { c[levelOf(r.points)]++; });
    return c;
  }

  function pctText(v) { return v == null ? "N/A" : v + "%"; }

  function renderSection(section, scored) {
    var shown = scored.results.filter(function (r) {
      return state.filter === "all" || levelOf(r.points) === state.filter;
    });
    if (!shown.length) return null;
    var counts = countLevels(scored.results);
    var d = makeDetails("ai-acc", "s" + section.id);
    d.id = "ai-sec-" + section.id;

    var sum = make("summary", "ai-sum");
    sum.appendChild(make("span", "ai-sum-title", section.id + ". " + section.name));
    sum.appendChild(make("span", "ai-pill ai-pill-" + pctLevel(scored.overall), pctText(scored.overall)));
    sum.appendChild(make("span", "ai-sum-meta ai-sum-axes",
      "P " + pctText(scored.p) + " · S " + pctText(scored.s) + " · B " + pctText(scored.b)));
    var dots = make("span", "ai-dots");
    ["critical", "moderate", "good"].forEach(function (lv) {
      if (!counts[lv]) return;
      var dot = make("span", "ai-dot ai-dot-" + lv, String(counts[lv]));
      dot.title = counts[lv] + " " + LEVEL_LABEL[lv].toLowerCase();
      dots.appendChild(dot);
    });
    sum.appendChild(dots);
    d.appendChild(sum);

    var body = make("div", "ai-acc-body");
    var pot = make("div", "ai-pot");
    pot.appendChild(potentialRow("Overall score", scored.overall));
    pot.appendChild(potentialRow("Performance", scored.p));
    pot.appendChild(potentialRow("Structure", scored.s));
    pot.appendChild(potentialRow("BIM Essentials", scored.b));
    body.appendChild(pot);

    var intro = makeDetails("ai-intro-box", "i" + section.id);
    intro.appendChild(make("summary", null, "About this section"));
    intro.appendChild(make("p", "ai-intro", section.intro));
    body.appendChild(intro);

    var head = make("div", "ai-rhead");
    ["Check", "Value", "Scores", "×"].forEach(function (t) { head.appendChild(make("span", null, t)); });
    body.appendChild(head);

    var list = make("div", "ai-rows");
    shown.forEach(function (res) { list.appendChild(renderCheck(res, selectedRowCache)); });
    body.appendChild(list);

    var notes = selectedRowCache["notes_" + section.id];
    if (notes) {
      var nd = makeDetails("ai-notes", "n" + section.id);
      nd.appendChild(make("summary", null, "Auditor Notes"));
      nd.appendChild(make("p", "ai-advice", notes));
      body.appendChild(nd);
    }
    d.appendChild(body);
    return d;
  }

  var selectedRowCache = null;

  function renderFilters(all) {
    var totals = { critical: 0, moderate: 0, good: 0, na: 0 };
    all.forEach(function (s) {
      var c = countLevels(s.results);
      Object.keys(totals).forEach(function (k) { totals[k] += c[k]; });
    });
    var sum = totals.critical + totals.moderate + totals.good + totals.na;
    var frag = document.createDocumentFragment();
    FILTERS.forEach(function (f) {
      var btn = make("button", "ai-filter" + (state.filter === f ? " is-on" : ""));
      btn.type = "button";
      btn.setAttribute("aria-pressed", state.filter === f ? "true" : "false");
      if (f !== "all") btn.appendChild(make("i", "ai-sw ai-sw-" + f));
      btn.appendChild(document.createTextNode((f === "all" ? "All" : LEVEL_LABEL[f]) + " "));
      btn.appendChild(make("b", null, String(f === "all" ? sum : totals[f])));
      btn.addEventListener("click", function () {
        state.filter = f;
        renderAudit();
      });
      frag.appendChild(btn);
    });
    el.auditFilters.replaceChildren(frag);
  }

  /* Scores pooled over every section: points earned divided by points possible. */
  function overallScores(all) {
    var t = { p: [0, 0], s: [0, 0], b: [0, 0] };
    all.forEach(function (item) {
      ["p", "s", "b"].forEach(function (a) {
        t[a][0] += item.totals[a][0];
        t[a][1] += item.totals[a][1];
      });
    });
    var pct = function (pair) { return pair[1] ? Math.round((pair[0] / pair[1]) * 100) : null; };
    var earned = t.p[0] + t.s[0] + t.b[0];
    var possible = t.p[1] + t.s[1] + t.b[1];
    return { overall: possible ? Math.round((earned / possible) * 100) : null, p: pct(t.p), s: pct(t.s), b: pct(t.b) };
  }

  var SVG_NS = "http://www.w3.org/2000/svg";

  function svg(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  /* Radar chart: one polygon per series, one spoke per label, rings every 20%. */
  function radarChart(title, labels, series) {
    var size = 320;
    var c = size / 2;
    var r = 100;
    var n = labels.length;
    var root = svg("svg", { viewBox: "0 0 " + size + " " + size, class: "ai-radar", role: "img", "aria-label": title });
    var pt = function (i, v) {
      var a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [c + Math.cos(a) * r * v / 100, c + Math.sin(a) * r * v / 100];
    };
    [20, 40, 60, 80, 100].forEach(function (ring) {
      var pts = labels.map(function (_, i) { return pt(i, ring).join(","); }).join(" ");
      root.appendChild(svg("polygon", { points: pts, class: "ai-radar-ring" }));
    });
    labels.forEach(function (label, i) {
      var e = pt(i, 100);
      root.appendChild(svg("line", { x1: c, y1: c, x2: e[0], y2: e[1], class: "ai-radar-spoke" }));
      var l = pt(i, 122);
      var anchor = Math.abs(l[0] - c) < 6 ? "middle" : l[0] > c ? "start" : "end";
      root.appendChild(svg("text", { x: l[0], y: l[1] + 4, "text-anchor": anchor, class: "ai-radar-label" }, label));
    });
    series.forEach(function (sr) {
      var pts = sr.values.map(function (v, i) { return pt(i, v == null ? 0 : v).join(","); }).join(" ");
      root.appendChild(svg("polygon", { points: pts, class: "ai-radar-area", fill: sr.color, stroke: sr.color }));
    });
    return root;
  }

  function renderSummary(all) {
    var tot = overallScores(all);
    var box = make("div", "ai-summary");
    var top = make("div", "ai-summary-top");
    var big = make("div", "ai-summary-big");
    big.appendChild(make("span", "ai-summary-pct ai-text-" + pctLevel(tot.overall), pctText(tot.overall)));
    big.appendChild(make("span", "ai-summary-label", "Overall score"));
    top.appendChild(big);
    var pot = make("div", "ai-pot");
    pot.appendChild(potentialRow("Performance", tot.p));
    pot.appendChild(potentialRow("Structure", tot.s));
    pot.appendChild(potentialRow("BIM Essentials", tot.b));
    top.appendChild(pot);
    box.appendChild(top);

    var labels = all.map(function (item) { return item.section.short || item.section.name; });
    var d = makeDetails("ai-radars", "rad");
    d.appendChild(make("summary", null, "Scores by section (radar charts)"));
    var wrap = make("div", "ai-radar-wrap");
    var one = make("figure", "ai-radar-fig");
    one.appendChild(radarChart("Overall score by section", labels, [
      { name: "Overall", color: "#6f7fd6", values: all.map(function (item) { return item.overall; }) }
    ]));
    one.appendChild(make("figcaption", null, "Overall"));
    var cat = make("figure", "ai-radar-fig");
    cat.appendChild(radarChart("Performance, Structure and BIM Essentials by section", labels, [
      { name: "Performance", color: "#6f7fd6", values: all.map(function (item) { return item.p; }) },
      { name: "Structure", color: "#ff6a00", values: all.map(function (item) { return item.s; }) },
      { name: "BIM Essentials", color: "#2ea043", values: all.map(function (item) { return item.b; }) }
    ]));
    var cap = make("figcaption", "ai-radar-key");
    [["Performance", "#6f7fd6"], ["Structure", "#ff6a00"], ["BIM Essentials", "#2ea043"]].forEach(function (k) {
      var span = make("span", null, k[0]);
      var sw = make("i", "ai-sw");
      sw.style.background = k[1];
      span.prepend(sw);
      cap.appendChild(span);
    });
    cat.appendChild(cap);
    wrap.append(one, cat);
    d.appendChild(wrap);
    box.appendChild(d);
    return box;
  }

  function renderCards(all) {
    var frag = document.createDocumentFragment();
    frag.appendChild(renderSummary(all));
    all.forEach(function (item) {
      var s = item.section;
      var c = countLevels(item.results);
      var card = make("button", "ai-scard");
      card.type = "button";
      card.appendChild(make("span", "ai-scard-name", s.id + ". " + s.name));
      card.appendChild(make("span", "ai-scard-pct ai-text-" + pctLevel(item.overall), pctText(item.overall)));
      var bars = make("span", "ai-mini");
      [["P", item.p], ["S", item.s], ["B", item.b]].forEach(function (pair) {
        var line = make("span", "ai-mini-row");
        line.appendChild(make("span", "ai-mini-k", pair[0]));
        var track = make("span", "ai-mini-track");
        var fill = make("span", "ai-mini-fill ai-fill-" + pctLevel(pair[1]));
        fill.style.width = (pair[1] == null ? 0 : pair[1]) + "%";
        track.appendChild(fill);
        line.appendChild(track);
        line.appendChild(make("span", "ai-mini-v", pctText(pair[1])));
        bars.appendChild(line);
      });
      card.appendChild(bars);
      card.appendChild(make("span", "ai-scard-meta", c.critical + " critical · " + c.moderate + " moderate"));
      card.addEventListener("click", function () {
        state.open["s" + s.id] = true;
        renderAudit();
        var target = document.getElementById("ai-sec-" + s.id);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      frag.appendChild(card);
    });
    el.auditCards.replaceChildren(frag);
  }

  function setAllOpen(open) {
    state.open = {};
    if (open) {
      state.open.s0 = true;
      SECTIONS.forEach(function (s) {
        state.open["s" + s.id] = true;
        state.open["i" + s.id] = true;
        state.open["n" + s.id] = true;
        s.checks.forEach(function (c) { state.open["c" + c.id] = true; });
      });
    }
    if (state.filter !== "all") state.filter = "all";
    renderAudit();
  }

  function renderAudit() {
    if (!el.auditBody) return;
    var row = selectedRow();
    selectedRowCache = row;
    state.selected = row.project;

    var key = state.rows.map(function (r) { return r.project; }).join("\n");
    if (el.auditProject.dataset.key !== key) {
      el.auditProject.dataset.key = key;
      var opts = state.rows.map(function (r) { return new Option(r.project, r.project); });
      el.auditProject.replaceChildren.apply(el.auditProject, opts);
    }
    el.auditProject.value = row.project;

    var all = SECTIONS.map(function (s) {
      var scored = scoreSection(s, row);
      scored.section = s;
      return scored;
    });
    renderFilters(all);
    renderCards(all);

    var frag = document.createDocumentFragment();
    if (state.filter === "all") frag.appendChild(renderDetails(row));
    var any = false;
    all.forEach(function (scored) {
      var node = renderSection(scored.section, scored);
      if (node) { frag.appendChild(node); any = true; }
    });
    if (!any) frag.appendChild(make("p", "ah-note", "No checks match this filter."));
    el.auditBody.replaceChildren(frag);
  }

  function render() {
    renderSource();
    renderTake();
    state.selected = selectedRow().project;
    renderBody();
    renderAudit();
  }

  /* ---------- Definitions, file format, buttons ---------- */

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

  el.auditProject.addEventListener("change", function () { selectProject(el.auditProject.value); });
  el.auditExpand.addEventListener("click", function () { setAllOpen(true); });
  el.auditCollapse.addEventListener("click", function () { setAllOpen(false); });
  el.auditBody.addEventListener("toggle", function (e) {
    var d = e.target;
    if (state.filter === "all" && d.dataset && d.dataset.key) state.open[d.dataset.key] = d.open;
  }, true);

  renderHead();
  renderDefs();
  render();
})();
