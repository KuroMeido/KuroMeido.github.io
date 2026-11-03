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
    { key: "fills_after", label: "Fills after consolidation" }
  ];

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
    { key: "addons", label: "3rd party add-ons used", group: "project" }
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

  var SECTIONS = [
    {
      id: "1",
      name: "Library Management",
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
          },
          ref: "https://helpcenter.graphisoft.com/user-guide-chapter/85477/"
        },
        {
          id: "1.2", title: "IFC Libraries", axes: ["p", "s", "b"], mult: 3,
          measures: [["IFC library container files (.lcf)", "ifc_lcf", ""], ["IFC folders", "ifc_folders", ""]],
          score: ifcScore,
          advice: {
            good: "No IFC libraries are stored as plain folders. Nothing to do.",
            mid: "Some IFC libraries are stored as folders. Save them as .lcf container files to load faster.",
            low: "Most IFC libraries sit in folders, which slows library loading. Save them as .lcf container files."
          },
          ref: "https://helpcenter.graphisoft.com/knowledgebase/25729/"
        },
        {
          id: "1.3", title: "Images over 1 MB", axes: ["p", "s"], mult: 3,
          measures: [["Number of image files over 1 MB", "images_over_1mb", ""]],
          score: stepScore("images_over_1mb", [5, 20, 50]),
          advice: {
            good: "There are few or no large images. Nothing to do.",
            mid: "A number of large images are in use. Compress or resize those that do not need full size.",
            low: "Many large images are loaded. Reduce their size, because they slow opening and 3D."
          },
          ref: "https://helpcenter.graphisoft.com/user-guide-chapter/85477/"
        },
        {
          id: "1.4", title: "Linked Libraries", axes: ["p", "s"], mult: 5,
          measures: [["Number of linked and BIMcloud libraries", "linked_libs", ""]],
          score: stepScore("linked_libs", [6, 9, 14]),
          advice: {
            good: "The number of linked libraries is within the recommended limit.",
            mid: "More libraries are linked than needed. Remove the ones nobody uses.",
            low: "Too many libraries are linked. Keep the default Archicad library, an office library and a project library, and remove the rest."
          },
          ref: "https://helpcenter.graphisoft.com/user-guide-chapter/85478/"
        },
        {
          id: "1.5", title: "Large Point Cloud files in the Library", axes: ["p", "s", "b"], mult: 3,
          measures: [["Size of point clouds", "point_cloud_mb", " MB"]],
          score: stepScore("point_cloud_mb", [200, 500, 1000]),
          advice: {
            good: "Point cloud files are small in total. Nothing to do.",
            mid: "Point clouds are getting large. Remove the ones no longer needed.",
            low: "Point clouds are very large and slow 3D navigation and library loading. Remove the ones no longer needed."
          },
          ref: "https://helpcenter.graphisoft.com/user-guide-chapter/85653/"
        },
        {
          id: "1.6", title: "Missing Library Parts", axes: ["p", "s"], mult: 3,
          measures: [["Number of missing library parts", "missing_parts", ""]],
          score: stepScore("missing_parts", [0, 10, 50]),
          advice: {
            good: "No library parts are missing.",
            mid: "A few library parts are missing. Replace or delete them, or fix the surfaces that point to missing images.",
            low: "Many library parts are missing. Fix these first; a clean library report shows none."
          },
          ref: "https://helpcenter.graphisoft.com/user-guide/127921"
        },
        {
          id: "1.7", title: "Duplicated Library Parts", axes: ["p", "s"], mult: 1,
          measures: [["Number of duplicated library parts", "duplicate_parts", ""]],
          score: stepScore("duplicate_parts", [0, 5, 20]),
          advice: {
            good: "No library parts are duplicated.",
            mid: "A few library parts are duplicated. Remove the extra copies from one of the libraries and reload.",
            low: "Many library parts are duplicated. Remove them from the libraries and reload so the report shows none."
          },
          ref: "https://helpcenter.graphisoft.com/user-guide-chapter/85653/"
        }
      ]
    },
    {
      id: "2",
      name: "Project Management",
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
          },
          ref: "https://helpcenter.graphisoft.com/user-guide-chapter/85547/"
        },
        {
          id: "2.2", title: "Simultaneously open tabs", axes: ["p"], mult: 1,
          measures: [["Number of tabs open simultaneously", "open_tabs", ""]],
          score: stepScore("open_tabs", [7, 20, 40]),
          advice: {
            good: "A reasonable number of tabs is open. Around 6 or 7 is the most that works well.",
            mid: "More tabs are open than is comfortable. Close the ones you do not need, or open views inside existing tabs (see the User Preferences schemes under More Options).",
            low: "Far too many tabs are open and the project will bog down. Close the tabs you do not need and open views inside existing tabs."
          },
          ref: "https://helpcenter.graphisoft.com/user-guide-chapter/85468"
        },
        {
          id: "2.3", title: "Simultaneously active Trace References", axes: ["p", "s"], mult: 3,
          measures: [["Number of Trace References active simultaneously", "trace_active", ""]],
          score: stepScore("trace_active", [8, 15, 30]),
          advice: {
            good: "A manageable number of Trace References is active. Nothing to do.",
            mid: "A fair number of Trace References are active at once. Turn off the ones you are not using.",
            low: "Many Trace References are active at once and slow the project. Turn off the ones you are not using."
          },
          ref: "https://helpcenter.graphisoft.com/user-guide-chapter/85501/"
        },
        {
          id: "2.4", title: "Trace Referencing Views & Layouts", axes: ["p"], mult: 3,
          measures: [["Number of Trace References using Views or Layouts as source", "trace_views", ""]],
          score: stepScore("trace_views", [10, 30, 80]),
          advice: {
            good: "Few or no views or layouts are used as trace sources. Nothing to do.",
            mid: "Several views or layouts are used as trace sources. Archicad has to work out the view settings of each, so prefer viewpoints from the project map.",
            low: "Many views and layouts are used as trace sources, which slows updates. Switch to viewpoints from the project map where you can."
          },
          ref: "https://helpcenter.graphisoft.com/user-guide/128016/"
        },
        {
          id: "2.5", title: "Number of Elements", axes: ["p"], mult: 3,
          measures: [["Total number of all (2D and 3D) elements in the entire project", "elements_total", ""]],
          score: stepScore("elements_total", [100000, 300000, 1000000]),
          advice: {
            good: "The project has 100 000 elements or fewer, which is manageable. Nothing to do. Elements on the Archicad layer are not counted.",
            mid: "The element count is getting large. Remove what you no longer need. Elements on the Archicad layer are not counted.",
            low: "The element count is very high. Split the model or remove unneeded elements. Elements on the Archicad layer are not counted."
          },
          ref: "https://helpcenter.graphisoft.com/user-guide/128013/"
        },
        {
          id: "2.6", title: "Utilizing Archicad's 3D modeling capabilities", axes: ["p", "b"], mult: 1,
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
          },
          ref: "https://helpcenter.graphisoft.com/knowledgebase/25478/"
        },
        {
          id: "2.7", title: "Number of Groups", axes: ["p"], mult: 3,
          measures: [["Number of groups in the 3D model space and floor plans", "groups", ""]],
          score: stepScore("groups", [100, 300, 1000]),
          advice: {
            good: "The number of groups is manageable. Nothing to do.",
            mid: "There are over 100 groups, which can slow Archicad down. Reduce them where you can; under 100 is a good aim.",
            low: "There are very many groups. Ungroup or merge them to bring the count well down."
          },
          ref: "https://helpcenter.graphisoft.com/user-guide/128013/"
        },
        {
          id: "2.8", title: "Sun Shadows in 3D Styles", axes: ["p"], mult: 3,
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
          },
          ref: "https://helpcenter.graphisoft.com/user-guide/128998/"
        },
        {
          id: "2.9", title: "Errors in 3D", axes: ["p", "s"], mult: 1,
          measures: [["Number of errors in the Session Report", "session_errors", ""]],
          score: stepScore("session_errors", [0, 10, 30]),
          advice: {
            good: "No errors were reported in 3D. Nothing to do.",
            mid: "Archicad reports errors when opening the 3D window. Find the broken elements with Find & Select and fix or replace them. Turning on error interruption and the report in the Model Rebuild Options helps, as does the Element ID Manager when elements share an ID.",
            low: "Many 3D errors are reported. Fix the broken elements first, using Find & Select, the Model Rebuild Options and the Element ID Manager."
          },
          ref: "https://helpcenter.graphisoft.com/user-guide/128945/#XREF_78293_Session_Report"
        },
        {
          id: "2.10", title: "Number of Polygons", axes: ["p", "s"], mult: 5,
          measures: [["Number of polygons in the project", "polygons", ""]],
          score: stepScore("polygons", [1000000, 5000000, 10000000]),
          advice: {
            good: "The polygon count is low. Nothing to do.",
            mid: "The project is under 5 million polygons, so Archicad should run smoothly. Keep the count low: lower the detail level in Model View Options when you are not visualising, delete elements you no longer use and hide layers you do not need. Downloaded objects often carry many polygons.",
            low: "The polygon count is very high. Lower the detail level, delete unused elements and heavy downloaded objects, and hide layers you do not need."
          },
          ref: "https://helpcenter.graphisoft.com/knowledgebase/25868/"
        },
        {
          id: "2.11", title: "Number of Duplicates", axes: ["p", "s", "b"], mult: 3,
          measures: [["Number of duplicated elements in the entire project", "duplicate_elements", ""]],
          score: stepScore("duplicate_elements", [10, 50, 200]),
          advice: {
            good: "There are very few or no duplicates. Run a duplicate check now and then to keep it that way, for example the Check Duplicates command in the Graphisoft Goodies add-on.",
            mid: "Some elements are duplicated. Find and remove them.",
            low: "Many elements are duplicated. Find and remove them; they bloat the file and can cause errors."
          },
          ref: "https://helpcenter.graphisoft.com/knowledgebase/64529/"
        },
        {
          id: "2.12", title: "Model extents and position", axes: ["p", "s", "b"], mult: 3,
          measures: [{ label: "Model's distance from the Archicad project origin", key: "origin_distance_m", unit: " m", dec: 2 }],
          score: stepScore("origin_distance_m", [1000, 10000, 100000]),
          advice: {
            good: "The model is close to the project origin and no elements are out of bounds. Nothing to do.",
            mid: "The model sits far from the project origin. Move it closer to avoid precision problems.",
            low: "The model is very far from the project origin. Move it back close to the origin."
          },
          ref: null
        },
        {
          id: "2.13", title: "Model Accuracy", axes: ["p", "s", "b"], mult: 3,
          measures: [{ label: "Amount of inaccurate perpendicular wall connections", key: "inaccurate_walls", zeroText: "None" }],
          score: stepScore("inaccurate_walls", [0, 10, 50]),
          advice: {
            good: "All walls in all stories are straight and square. Nothing to do.",
            mid: "A few wall connections are slightly off perpendicular. Correct them.",
            low: "Many wall connections are not perpendicular. Correct them to keep the model accurate."
          },
          ref: "https://bimcomponents.com/LCF/Details/6119"
        },
        {
          id: "2.14", title: "2D Linework Consolidation (in Floor Plans)", axes: ["p", "s"], mult: 3,
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
          },
          ref: "https://helpcenter.graphisoft.com/user-guide/128023/"
        },
        {
          id: "2.15", title: "2D Fill Consolidation (in Floor Plans)", axes: ["p", "s"], mult: 3,
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
          },
          ref: "https://helpcenter.graphisoft.com/user-guide/128023/"
        }
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
    fills_before: 7, fills_after: 2
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
    selected: null
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
    search: document.getElementById("ah-search"),
    auditBody: document.getElementById("ai-body"),
    auditProject: document.getElementById("ai-project")
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

  function renderDetails(row) {
    var sec = make("section", "ai-sec");
    sec.appendChild(make("h3", "ai-sec-title", "0. Audit Details"));
    var grid = make("div", "ai-details");
    var auditPairs = AUDIT_TEXT.filter(function (t) { return t.group === "audit"; })
      .map(function (t) { return [t.label, row[t.key]]; });
    var projectPairs = [["Project's name", row.project]]
      .concat(AUDIT_TEXT.filter(function (t) { return t.group === "project"; })
        .map(function (t) { return [t.label, row[t.key]]; }));
    projectPairs.splice(4, 0, ["Project file size", row.size_mb == null ? null : fmt.format(row.size_mb) + " MB"]);
    grid.appendChild(detailList("Audit Details", auditPairs));
    grid.appendChild(detailList("Project Details", projectPairs));
    sec.appendChild(grid);
    return sec;
  }

  function measureOf(m, row) {
    if (Array.isArray(m)) m = { label: m[0], key: m[1], unit: m[2] };
    var v = m.get ? m.get(row) : row[m.key];
    var text;
    if (v == null) {
      text = "N/A";
    } else if (m.zeroText && v === 0) {
      text = m.zeroText;
    } else {
      var dec = m.dec || 0;
      text = new Intl.NumberFormat("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v) + (m.unit || "");
    }
    return [m.label, text];
  }

  function renderCheck(result, row) {
    var check = result.check;
    var level = levelOf(result.points);
    var wrap = make("article", "ai-check");
    var main = make("div", "ai-check-main");
    main.appendChild(make("h4", null, check.id + " " + check.title));

    var meas = make("div", "ai-measures");
    check.measures.forEach(function (m) {
      var shown = measureOf(m, row);
      meas.appendChild(make("span", "ai-measure-label", shown[0] + ":"));
      meas.appendChild(make("strong", "ai-measure-value", shown[1]));
    });
    main.appendChild(meas);

    var advice = result.points == null
      ? "Not enough data to score this check."
      : result.points >= 3 ? check.advice.good : result.points === 2 ? check.advice.mid : check.advice.low;
    main.appendChild(make("p", "ai-advice", advice));

    if (check.ref) {
      var ref = make("p", "ai-ref");
      ref.appendChild(document.createTextNode("Reference: "));
      var link = make("a", null, check.ref.replace(/^https?:\/\//, ""));
      link.href = check.ref;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      ref.appendChild(link);
      main.appendChild(ref);
    }

    var side = make("div", "ai-check-side");
    var scores = make("dl", "ai-scores");
    AXES.forEach(function (axis) {
      var line = make("div");
      line.appendChild(make("dt", null, axis.label));
      var applies = check.axes.indexOf(axis.key) !== -1 && result.points != null;
      line.appendChild(make("dd", null, applies ? result.points + "/3" : "—"));
      scores.appendChild(line);
    });
    var mult = make("div");
    mult.appendChild(make("dt", null, "Impact Multiplier"));
    mult.appendChild(make("dd", null, String(check.mult)));
    scores.appendChild(mult);
    side.appendChild(scores);

    var bar = make("i", "ai-bar ai-bar-" + level);
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", level === "na" ? "Not scored" : level);

    wrap.append(main, side, bar);
    return wrap;
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

  function renderSection(section, row) {
    var scored = scoreSection(section, row);
    var sec = make("section", "ai-sec");
    sec.appendChild(make("h3", "ai-sec-title", section.id + ". " + section.name));
    sec.appendChild(make("p", "ai-intro", section.intro));
    var list = make("div", "ai-checks");
    scored.results.forEach(function (res) { list.appendChild(renderCheck(res, row)); });
    sec.appendChild(list);

    var pot = make("div", "ai-pot");
    pot.appendChild(make("h4", null, section.name + " Potential"));
    pot.appendChild(potentialRow("Overall score", scored.overall));
    pot.appendChild(make("div", "ai-pot-space"));
    pot.appendChild(potentialRow("Performance", scored.p));
    pot.appendChild(potentialRow("Structure", scored.s));
    pot.appendChild(potentialRow("BIM Essentials", scored.b));
    sec.appendChild(pot);
    return sec;
  }

  function renderAudit() {
    if (!el.auditBody) return;
    var row = selectedRow();
    state.selected = row.project;

    var key = state.rows.map(function (r) { return r.project; }).join("\n");
    if (el.auditProject.dataset.key !== key) {
      el.auditProject.dataset.key = key;
      var opts = state.rows.map(function (r) { return new Option(r.project, r.project); });
      el.auditProject.replaceChildren.apply(el.auditProject, opts);
    }
    el.auditProject.value = row.project;

    var frag = document.createDocumentFragment();
    frag.appendChild(renderDetails(row));
    SECTIONS.forEach(function (s) { frag.appendChild(renderSection(s, row)); });
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

  function renderFormat() {
    if (!el.format) return;
    var one = {};
    one.project = "Riverside Tower A";
    NUMBER_KEYS.concat(TEXT_KEYS).forEach(function (k) { one[k] = SAMPLE[0][k]; });
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

  el.auditProject.addEventListener("change", function () { selectProject(el.auditProject.value); });

  renderHead();
  renderDefs();
  renderFormat();
  render();
})();
