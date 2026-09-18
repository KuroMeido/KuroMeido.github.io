function renderBlogPosts(postsToRender) {
  const list = document.getElementById("blog-post-list");
  const posts = Array.isArray(postsToRender) ? postsToRender : window.siteData?.blogPosts;

  if (!list || !Array.isArray(posts)) {
    return;
  }

  const fragment = document.createDocumentFragment();
  list.replaceChildren();

  posts.forEach((post) => {
    const link = document.createElement("a");
    link.href = post.url;
    link.className = "post-card-link";
    link.style.textDecoration = "none";
    link.style.color = "inherit";

    const article = document.createElement("article");
    article.className = "post-card";
    article.style.cursor = "pointer";
    article.style.transition = "transform 0.2s, box-shadow 0.2s";

    article.addEventListener("mouseenter", () => {
      article.style.transform = "translateY(-4px)";
      article.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)";
    });

    article.addEventListener("mouseleave", () => {
      article.style.transform = "translateY(0)";
      article.style.boxShadow = "";
    });

    const image = document.createElement("img");
    image.src = post.image;
    image.alt = post.title;

    const category = document.createElement("span");
    category.className = "post-category";
    category.textContent = post.category;

    const title = document.createElement("h3");
    title.textContent = post.title;

    const description = document.createElement("p");
    description.textContent = post.description;

    const openLink = document.createElement("span");
    openLink.className = "post-open-link";
    openLink.textContent = "Open →";

    article.append(image, category, title, description, openLink);
    link.append(article);
    fragment.append(link);
  });

  list.append(fragment);
}

function renderResources() {
  const list = document.getElementById("resource-list");
  const resources = window.siteData?.resources;

  if (!list || !Array.isArray(resources)) {
    return;
  }

  const fragment = document.createDocumentFragment();
  list.replaceChildren();

  resources.forEach((resource) => {
    const article = document.createElement("article");
    article.className = "resource-card";

    const type = document.createElement("span");
    type.className = "resource-type";
    type.textContent = resource.type;

    const title = document.createElement("h3");
    title.textContent = resource.title;

    const description = document.createElement("p");
    description.textContent = resource.description;

    const meta = document.createElement("p");
    meta.className = "resource-meta";
    meta.textContent = resource.meta;

    const link = document.createElement("a");
    link.href = resource.file;
    link.textContent = "Open →";

    article.append(type, title, description, meta, link);
    fragment.append(article);
  });

  list.append(fragment);
}

function RenderRevits() {
    const list = document.getElementById("revit-list");
    const revits = window.siteData?.revits;

    if (!list || !Array.isArray(revits)) {
        return;
    }

    const fragment = document.createDocumentFragment();
    list.replaceChildren();

    revits.forEach((revit) => {
        const article = document.createElement("article");
        article.className = "resource-card";

        if (revit.status) {
            const status = document.createElement("span");
            status.className = "revit-status";
            status.textContent = revit.status;
            article.append(status);
        }

        const type = document.createElement("span");
        type.className = "resource-type";
        type.textContent = revit.type;

        const title = document.createElement("h3");
        title.textContent = revit.title;

        const description = document.createElement("p");
        description.textContent = revit.description;

        const meta = document.createElement("p");
        meta.className = "resource-meta";
        meta.textContent = revit.meta;

        const link = document.createElement("a");
        link.textContent = "Open →";

        const isComingSoon = (revit.status || "").toLowerCase() === "coming soon";
        if (isComingSoon) {
            link.href = "javascript:void(0)";
            link.setAttribute("aria-disabled", "true");
            link.classList.add("is-disabled");
            link.addEventListener("click", (e) => e.preventDefault());
        } else {
            link.href = revit.url || revit.file;
        }

        article.append(type, title, description, meta, link);
        fragment.append(article);
    });

    list.append(fragment);
}
function updateCurrentYear() {
  const year = new Date().getFullYear();
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(year);
  });
}

function setupBlogSearch() {
  const input = document.getElementById("blog-search");
  const allPosts = window.siteData?.blogPosts;

  if (!input || !Array.isArray(allPosts)) {
    return;
  }

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      renderBlogPosts(allPosts);
      return;
    }

    const filtered = allPosts.filter((post) => {
      const haystack = `${post.title} ${post.category} ${post.description}`.toLowerCase();
      return haystack.includes(query);
    });

    renderBlogPosts(filtered);
  });
}

function setupTypewriter() {
    const element = document.querySelector(".typewriter");
    if (!element) return;

    const text = (element.textContent || "").trim();
    if (!text) return;

    const speed = Number(element.dataset.typeSpeed) || 60;
    const startDelay = Number(element.dataset.typeDelay) || 0;
    const loopDelay = 3000; // dừng 3 giây rồi chạy lại

    let index = 0;
    element.textContent = "";

    const run = () => {
        index = 0;
        element.textContent = "";

        const typeNext = () => {
            index += 1;
            element.textContent = text.slice(0, index);

            if (index < text.length) {
                setTimeout(typeNext, speed);
            } else {
                setTimeout(run, loopDelay);
            }
        };

        typeNext();
    };

    setTimeout(run, startDelay);
}


renderBlogPosts();
renderResources();
RenderRevits();
setupBlogSearch();
updateCurrentYear();
setupTypewriter();

