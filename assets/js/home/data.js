// Content for the home page (index.html). Paths are relative to the site root.
// Mirrors the content in assets/js/data.js, resources-data.js and revit-data.js (used by blog.html, resources.html, revit.html).

const ROOT = '';

/** Zoning categories. `cssVar` points at the colour defined in main.css. */
export const ZONES = {
  code:  { name: 'Code',         tag: 'C-COM', cssVar: '--z-com' },
  bim:   { name: 'BIM/Revit',    tag: 'B-CIV', cssVar: '--z-civ' },
  arch:  { name: 'Architecture', tag: 'A-RES', cssVar: '--z-res' },
  urban: { name: 'Urban',        tag: 'U-GRN', cssVar: '--z-grn' },
  misc:  { name: 'Mixed use',    tag: 'M-MIX', cssVar: '--z-ind' },
};

/** Blog posts, newest first. The first one is the featured card (shows its cover image). */
export const POSTS = [
  {
    zone: 'bim', category: 'Revit API',
    title: 'The Revit API Roadmap — For Absolute Beginners',
    desc: 'A six-stage learning path from zero coding background to building Revit add-ins.',
    image: ROOT + 'assets/images/pyRevit.png',
    url: ROOT + 'posts/revit-api-roadmap-beginners.html',
  },
  {
    zone: 'bim', category: 'Revit API',
    title: 'Why Your Icons8 Icons Get Cropped in Revit',
    desc: 'Why icons from icons8.com render cropped on the Revit ribbon, and a reusable ImageHelper that fixes it.',
    image: ROOT + 'assets/images/WhyYourIcons8Cropped/Cover.png',
    url: ROOT + 'posts/WhyYourIcons8Cropped.html',
  },
  {
    zone: 'bim', category: 'Revit API',
    title: 'Create your Export PDF Add-In',
    desc: 'Export selected sheets/views to PDF or DWG with custom naming tokens, progress, and per-item logging.',
    image: ROOT + 'assets/images/CreateYourExportPDFAddIn/Cover.png',
    url: ROOT + 'posts/CreateYourExportPDFAddIn.html',
  },
];

/** Tools, in metro-line order. */
export const TOOLS = [
  { code: 'EP', name: 'Export PDF', desc: 'Print and rename sheets/views by rules built from their parameters.', type: '.addin .dll', platform: 'Revit', status: 'Prereview', url: ROOT + 'tools/ExportPDF.html' },
  { code: 'FC', name: 'Fixture Connector', desc: 'Connect a fixture to the main pipe with a configurable tee offset and drain slope.', type: '.addin .dll', platform: 'Revit MEPF', status: 'Prereview', url: ROOT + 'tools/FixtureConnector.html' },
  { code: 'MH', name: 'Model Health', desc: 'A model health heat-map: load a JSON or CSV export and compare projects by issues, links, layers, views and layouts.', type: 'Web app', platform: 'ArchiCAD', status: 'Live', url: ROOT + 'archicad-model-health.html' },];

/** Library: books and references (PDF). */
export const RESOURCES = [
  { type: 'PDF', title: 'Atomic Design', desc: 'A five-stage methodology for building interface design systems.', file: ROOT + 'assets/pdf/Atomic-Design.pdf' },
  { type: 'PDF', title: 'Clean Architecture', desc: 'A craftsman’s guide to software structure and design.', file: ROOT + 'assets/pdf/Clean-Architecture-A-Craftsman-Guide-to-Software-Structure-and-Design.pdf' },
  { type: 'PDF', title: 'Computers as Theatre', desc: 'A classic on human-computer interaction and interface design thinking.', file: ROOT + 'assets/pdf/Laurel-ComputersAsTheatre.pdf' },
  { type: 'PDF', title: 'Don’t Make Me Think', desc: 'A practical usability guide to intuitive navigation and interaction.', file: ROOT + 'assets/pdf/Steve-Krug-Dont-Make-Me-Think.pdf' },
  { type: 'PDF', title: 'The Design of Everyday Things', desc: 'Foundational principles for usable, human-centred products.', file: ROOT + 'assets/pdf/The-Design-Of-Everyday-Things.pdf' },
];
