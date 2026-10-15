(function renderSharedHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;

  const page = (document.body?.dataset?.page || "").toLowerCase();
  const active = { home: "", blog: "", resources: "", revit: "" };

  if (page === "post") {
    active.blog = "is-active";
  } else if (Object.prototype.hasOwnProperty.call(active, page)) {
    active[page] = "is-active";
  }

  const current = (key) => (active[key] ? ' aria-current="page"' : "");

  header.innerHTML = `
    <div class="container nav">
      <a class="brand" href="/index.html">Kuro Hitsuji</a>
      <nav class="menu" aria-label="Main navigation">
        <a class="${active.home}" href="/index.html"${current("home")}>Home</a>
        <a class="${active.blog}" href="/blog.html"${current("blog")}>Blog</a>
        <a class="${active.resources}" href="/resources.html"${current("resources")}>Resources</a>
        <a class="${active.revit}" href="/revit.html"${current("revit")}>Revit Tool</a>
      </nav>
    </div>
  `;
})();
