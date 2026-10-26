(() => {
  "use strict";

  const SITE_URL = "https://savorlen.com";
  const DATA_URL = "/_data/products.json";
  const CONTACT = {
    email: "main.savorlen@gmail.com",
    emailHref: "mailto:main.savorlen@gmail.com",
    phoneDisplay: "+91 98424 98324",
    phoneHref: "tel:+919842498324",
    whatsapp: "https://wa.me/919842498324"
  };
  const CURRENCY_LOCALES = {
    INR: "en-IN",
    USD: "en-US",
    GBP: "en-GB",
    AED: "en-AE"
  };
  const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const state = {
    products: [],
    categories: [],
    activeCategory: "all"
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function link(text, href, className) {
    const node = el("a", className, text);
    node.href = href;
    return node;
  }

  function cleanString(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function normalizeImage(value) {
    if (typeof value === "string") return value.trim();
    if (value && typeof value === "object" && typeof value.path === "string") {
      return value.path.trim();
    }
    return "";
  }

  function parseMoney(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") {
      return Number.isFinite(value) && value >= 0 ? value : null;
    }
    const cleaned = String(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
    const amount = Number(cleaned);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }

  function normalizeInventory(raw) {
    const status = cleanString(raw.inventory)
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (status === "in_stock" || status === "instock") {
      return { status: "in_stock", label: "In stock" };
    }

    if (status === "out_of_stock" || status === "outofstock") {
      return { status: "out_of_stock", label: "Out of stock" };
    }

    if (status === "quantity" || status === "numeric") {
      const quantity = Number(raw.quantity);
      if (Number.isFinite(quantity) && quantity >= 0) {
        return quantity > 0
          ? { status: "in_stock", label: "In stock" }
          : { status: "out_of_stock", label: "Out of stock" };
      }
      return { status: "unknown", label: "Availability not published" };
    }

    const legacyQuantity = Number(raw.inventory);
    if (Number.isFinite(legacyQuantity) && legacyQuantity >= 0) {
      return legacyQuantity > 0
        ? { status: "in_stock", label: "In stock" }
        : { status: "out_of_stock", label: "Out of stock" };
    }

    return { status: "unknown", label: "Availability not published" };
  }

  function normalizeProduct(raw) {
    if (!raw || typeof raw !== "object") return null;

    const name = cleanString(raw.name);
    const slug = cleanString(raw.slug);

    if (!name || !slug || !SLUG_PATTERN.test(slug)) {
      console.warn(
        "[SAVORLEN] Skipping a product without a valid name and slug.",
        raw
      );
      return null;
    }

    return {
      name,
      slug,
      image: normalizeImage(raw.image),
      description: cleanString(raw.description),
      category: cleanString(raw.category),
      price: parseMoney(raw.price),
      currency: cleanString(raw.currency).toUpperCase(),
      slashedPrice: parseMoney(raw.slashed_price ?? raw.slashedPrice),
      inventory: normalizeInventory(raw)
    };
  }

  async function fetchProducts() {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Product data request failed with ${response.status}.`);
    }

    const data = await response.json();
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data.products)
        ? data.products
        : [];

    return list.map(normalizeProduct).filter(Boolean);
  }

  function formatCurrency(value, currency) {
    if (value === null || !/^[A-Z]{3}$/.test(currency)) return null;

    try {
      return new Intl.NumberFormat(CURRENCY_LOCALES[currency] || "en", {
        style: "currency",
        currency,
        maximumFractionDigits: 2
      }).format(value);
    } catch (error) {
      console.warn("[SAVORLEN] Could not format a product price.", error);
      return null;
    }
  }

  function getValidSlashedPrice(product) {
    if (product.price === null || product.slashedPrice === null) return null;

    if (product.slashedPrice > product.price) return product.slashedPrice;

    console.warn(
      "[SAVORLEN] Slashed price must be greater than the current price; it will not be shown.",
      product.name
    );
    return null;
  }

  function buildPrice(product) {
    const current = formatCurrency(product.price, product.currency);
    if (!current) return null;

    const price = el("div", "price");
    price.append(el("span", "price__current", current));

    const oldValue = getValidSlashedPrice(product);
    const oldText = oldValue === null
      ? null
      : formatCurrency(oldValue, product.currency);

    if (oldText) {
      const old = el("span", "price__old");
      old.append(
        el("span", "visually-hidden", "Original price: "),
        document.createTextNode(oldText)
      );
      price.append(old);
    }

    return price;
  }

  function buildStock(product) {
    const status = product.inventory.status;
    const modifier =
      status === "in_stock" ? "in" : status === "out_of_stock" ? "out" : "unknown";
    const badge = el("span", `stock stock--${modifier}`);
    const dot = el("span", "stock__dot");
    dot.setAttribute("aria-hidden", "true");
    badge.append(dot, document.createTextNode(product.inventory.label));
    return badge;
  }

  function buildFallbackMedia(mediaClass, fallbackClass, markClass, labelClass) {
    const fallback = el("div", `${mediaClass} ${fallbackClass}`);
    const mark = el("img", markClass);
    mark.src = "/assets/logos/LOGO_mark.svg";
    mark.alt = "";
    mark.width = 200;
    mark.height = 200;
    mark.loading = "lazy";

    const label = el("span", labelClass, "Image not published");
    fallback.append(mark, label);
    return fallback;
  }

  function buildMedia(product, variant) {
    const detail = variant === "detail";
    const mediaClass = detail ? "product-detail__media" : "product-card__media";
    const fallbackClass = detail
      ? "product-detail__media--fallback"
      : "product-card__media--fallback";
    const markClass = detail
      ? "product-detail__fallback-mark"
      : "product-card__fallback-mark";
    const labelClass = detail
      ? "product-detail__fallback-label"
      : "product-card__fallback-label";

    if (!product.image) {
      return buildFallbackMedia(mediaClass, fallbackClass, markClass, labelClass);
    }

    const media = el("div", mediaClass);
    const image = el("img");
    image.src = product.image;
    image.alt = product.name;
    image.width = 800;
    image.height = 1000;
    image.decoding = "async";
    image.loading = detail ? "eager" : "lazy";
    if (detail && "fetchPriority" in image) image.fetchPriority = "high";

    image.addEventListener(
      "error",
      () => {
        media.replaceWith(
          buildFallbackMedia(mediaClass, fallbackClass, markClass, labelClass)
        );
      },
      { once: true }
    );

    media.append(image);
    return media;
  }

  function productHref(slug) {
    return `/products/product.html?slug=${encodeURIComponent(slug)}`;
  }

  function whatsappProductHref(product) {
    const message = `Hello SAVORLEN, I would like to know more about ${product.name}.`;
    return `${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
  }

  function renderProductCard(product) {
    const card = el("article", "product-card");
    const body = el("div", "product-card__body");

    if (product.category) {
      body.append(el("p", "product-card__category", product.category));
    }

    const heading = el("h3", "product-card__name");
    heading.append(
      link(product.name, productHref(product.slug), "product-card__link")
    );
    body.append(heading);

    if (product.description) {
      body.append(el("p", "product-card__desc", product.description));
    }

    const footer = el("div", "product-card__footer");
    const price = buildPrice(product);
    if (price) footer.append(price);
    footer.append(buildStock(product));
    body.append(footer);

    card.append(buildMedia(product, "card"), body);
    return card;
  }

  function buildEmptyPanel() {
    const panel = el("div", "empty-panel");
    const mark = el("img", "empty-panel__mark");
    mark.src = "/assets/logos/LOGO_mark.svg";
    mark.alt = "";
    mark.width = 176;
    mark.height = 176;
    mark.loading = "lazy";

    const body = el("div");
    body.append(
      el("p", "empty-panel__label", "Catalogue"),
      el("h2", "empty-panel__title", "The catalogue is being prepared."),
      el(
        "p",
        "empty-panel__copy",
        "Products will appear here when they are published. In the meantime, contact SAVORLEN for product information."
      )
    );

    const actions = el("div", "empty-panel__actions btn-group");
    actions.append(
      link("Contact SAVORLEN", "/contact.html", "btn btn--primary"),
      link("Email SAVORLEN", CONTACT.emailHref, "btn btn--secondary")
    );
    body.append(actions);
    panel.append(mark, body);
    return panel;
  }

  function buildErrorPanel(retry) {
    const panel = el("div", "state-panel state-panel--error");
    panel.append(
      el("p", "empty-panel__label", "Catalogue"),
      el("h2", "state-panel__title", "We could not load the catalogue."),
      el(
        "p",
        "state-panel__copy",
        "The product data did not load. Please try again. If the problem continues, contact SAVORLEN directly."
      )
    );

    const actions = el("div", "state-panel__actions btn-group");
    const retryButton = el("button", "btn btn--primary", "Try again");
    retryButton.type = "button";
    retryButton.addEventListener("click", retry);
    actions.append(
      retryButton,
      link("Contact SAVORLEN", "/contact.html", "btn btn--secondary")
    );
    panel.append(actions);
    return panel;
  }

  function buildFilterEmptyPanel() {
    const panel = el("div", "state-panel state-panel--compact");
    panel.append(
      el("h2", "state-panel__title", "No products in this category."),
      el(
        "p",
        "state-panel__copy",
        "Try another category or view the full catalogue."
      )
    );

    const actions = el("div", "state-panel__actions");
    const showAll = el("button", "btn btn--secondary", "Show all products");
    showAll.type = "button";
    showAll.addEventListener("click", () => setCategory("all"));
    actions.append(showAll);
    panel.append(actions);
    return panel;
  }

  function buildCompactErrorPanel() {
    const panel = el("div", "state-panel state-panel--error state-panel--compact");
    panel.append(
      el("h2", "state-panel__title", "The catalogue is temporarily unavailable."),
      el(
        "p",
        "state-panel__copy",
        "Please try again shortly, or contact SAVORLEN directly."
      )
    );

    const actions = el("div", "state-panel__actions btn-group");
    actions.append(
      link("View catalogue", "/products/", "btn btn--secondary"),
      link("Contact SAVORLEN", "/contact.html", "btn btn--primary")
    );
    panel.append(actions);
    return panel;
  }

  function buildSkeleton() {
    const grid = el("div", "skeleton-grid");
    grid.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 3; index += 1) {
      const card = el("div", "skeleton-card");
      const body = el("div", "skeleton-card__body");
      body.append(
        el("div", "skeleton-line skeleton-line--short"),
        el("div", "skeleton-line skeleton-line--title"),
        el("div", "skeleton-line")
      );
      card.append(el("div", "skeleton-card__media"), body);
      grid.append(card);
    }

    return grid;
  }

  function getCategories(products) {
    return Array.from(
      new Set(products.map((product) => product.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }

  function getCategoryFromUrl() {
    const requested = new URLSearchParams(window.location.search).get("category");
    return requested && state.categories.includes(requested) ? requested : "all";
  }

  function syncCategoryUrl(category) {
    const url = new URL(window.location.href);
    if (category === "all") {
      url.searchParams.delete("category");
    } else {
      url.searchParams.set("category", category);
    }
    window.history.replaceState({}, "", url);
  }

  function updateFilterButtons() {
    document
      .querySelectorAll("[data-filter-list] button[data-filter]")
      .forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.filter === state.activeCategory)
        );
      });
  }

  function initCatalogue() {
    const grid = document.querySelector("[data-product-grid]");
    if (!grid) return;

    const filterList = document.querySelector("[data-filter-list]");
    const results = document.querySelector("[data-results-count]");
    const status = document.querySelector("[data-catalogue-status]");

    const showLoading = () => {
      grid.setAttribute("aria-busy", "true");
      grid.replaceChildren(buildSkeleton());
      if (results) results.textContent = "Loading products…";
      if (status) status.textContent = "Loading products.";
    };

    const renderFilters = () => {
      if (!filterList) return;

      filterList.replaceChildren();

      if (state.categories.length < 2) {
        filterList.hidden = true;
        return;
      }

      filterList.hidden = false;

      const allItem = el("li");
      const allButton = el("button", "filter-chip", "All products");
      allButton.type = "button";
      allButton.dataset.filter = "all";
      allButton.setAttribute(
        "aria-pressed",
        String(state.activeCategory === "all")
      );
      allButton.addEventListener("click", () => setCategory("all"));
      allItem.append(allButton);
      filterList.append(allItem);

      state.categories.forEach((category) => {
        const item = el("li");
        const button = el("button", "filter-chip", category);
        button.type = "button";
        button.dataset.filter = category;
        button.setAttribute(
          "aria-pressed",
          String(state.activeCategory === category)
        );
        button.addEventListener("click", () => setCategory(category));
        item.append(button);
        filterList.append(item);
      });
    };

    const renderGrid = () => {
      const filtered =
        state.activeCategory === "all"
          ? state.products
          : state.products.filter(
              (product) => product.category === state.activeCategory
            );

      grid.setAttribute("aria-busy", "false");
      grid.replaceChildren();

      if (!state.products.length) {
        if (filterList) filterList.hidden = true;
        grid.append(buildEmptyPanel());
        if (results) results.textContent = "0 products";
        if (status) status.textContent = "The catalogue is currently empty.";
        return;
      }

      if (!filtered.length) {
        grid.append(buildFilterEmptyPanel());
        if (results) results.textContent = "0 products";
        if (status) {
          status.textContent = `No products in ${state.activeCategory}.`;
        }
        return;
      }

      const cards = el("div", "product-grid");
      filtered.forEach((product) => cards.append(renderProductCard(product)));
      grid.append(cards);

      if (results) {
        results.textContent = `${filtered.length} ${
          filtered.length === 1 ? "product" : "products"
        }`;
      }

      if (status) {
        status.textContent =
          state.activeCategory === "all"
            ? `Showing all ${filtered.length} ${
                filtered.length === 1 ? "product" : "products"
              }.`
            : `Showing ${filtered.length} ${
                filtered.length === 1 ? "product" : "products"
              } in ${state.activeCategory}.`;
      }
    };

    const setCategory = (category) => {
      state.activeCategory = category;
      updateFilterButtons();
      renderGrid();
      syncCategoryUrl(category);
    };

    const renderError = () => {
      grid.setAttribute("aria-busy", "false");
      grid.replaceChildren(buildErrorPanel(load));
      if (filterList) filterList.hidden = true;
      if (results) results.textContent = "";
      if (status) status.textContent = "The catalogue could not be loaded.";
    };

    const load = async () => {
      showLoading();

      try {
        state.products = await fetchProducts();
        state.categories = getCategories(state.products);
        state.activeCategory = getCategoryFromUrl();
        renderFilters();
        renderGrid();
      } catch (error) {
        console.error("[SAVORLEN] Failed to load the catalogue.", error);
        renderError();
      }
    };

    load();
  }

  async function initHomePreview() {
    const container = document.querySelector("[data-home-products]");
    if (!container) return;

    try {
      const products = await fetchProducts();
      if (!products.length) return;

      const grid = el("div", "product-grid");
      products.slice(0, 3).forEach((product) => {
        grid.append(renderProductCard(product));
      });
      container.replaceChildren(grid);
    } catch (error) {
      console.error("[SAVORLEN] Failed to load the home catalogue preview.", error);
      container.replaceChildren(buildCompactErrorPanel());
    }
  }

  function setMeta(attribute, key, content) {
    let node = document.head.querySelector(`meta[${attribute}="${key}"]`);
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute(attribute, key);
      document.head.append(node);
    }
    node.setAttribute("content", content);
  }

  function setCanonical(href) {
    let node = document.head.querySelector('link[rel="canonical"]');
    if (!node) {
      node = document.createElement("link");
      node.rel = "canonical";
      document.head.append(node);
    }
    node.href = href;
  }

  function absoluteUrl(path) {
    if (!path) return `${SITE_URL}/assets/images/og-image.png`;
    try {
      return new URL(path, `${SITE_URL}/`).href;
    } catch (error) {
      return `${SITE_URL}/assets/images/og-image.png`;
    }
  }

  function truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    const cut = text.slice(0, maxLength - 1);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
  }

  function setProductMeta(product) {
    const title = `${product.name} — SAVORLEN`;
    const description = product.description
      ? truncate(product.description, 155)
      : `View ${product.name} in the SAVORLEN catalogue.`;
    const url = `${SITE_URL}/products/product.html?slug=${encodeURIComponent(
      product.slug
    )}`;
    const image = product.image
      ? absoluteUrl(product.image)
      : `${SITE_URL}/assets/images/og-image.png`;

    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", "index, follow");
    setCanonical(url);
    setMeta("property", "og:type", "product");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);
  }

  function setNotFoundMeta() {
    document.title = "Product not found — SAVORLEN";
    setMeta("name", "robots", "noindex, follow");
    setMeta(
      "name",
      "description",
      "The requested product could not be found. Browse the SAVORLEN catalogue or contact us for help."
    );
    setCanonical(`${SITE_URL}/products/`);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:title", "Product not found — SAVORLEN");
    setMeta(
      "property",
      "og:description",
      "The requested product could not be found."
    );
    setMeta("property", "og:url", `${SITE_URL}/products/`);
    setMeta("name", "twitter:title", "Product not found — SAVORLEN");
    setMeta(
      "name",
      "twitter:description",
      "The requested product could not be found."
    );
  }

  function metaRow(label, value) {
    const row = el("div", "product-detail__row");
    row.append(el("span", "product-detail__label", label));
    if (typeof value === "string") {
      row.append(el("span", null, value));
    } else {
      row.append(value);
    }
    return row;
  }

  function buildBreadcrumb(product) {
    const breadcrumb = el("nav", "breadcrumb");
    breadcrumb.setAttribute("aria-label", "Breadcrumb");

    const separator = () => {
      const node = el("span", "breadcrumb__sep", "/");
      node.setAttribute("aria-hidden", "true");
      return node;
    };

    const current = el("span", null, product.name);
    current.setAttribute("aria-current", "page");

    breadcrumb.append(
      link("Home", "/"),
      separator(),
      link("Products", "/products/"),
      separator(),
      current
    );
    return breadcrumb;
  }

  function renderProductDetail(product) {
    const content = document.querySelector("[data-product-content]");
    if (!content) return;

    const info = el("div", "product-detail__info");

    if (product.category) {
      info.append(el("p", "product-detail__category", product.category));
    }

    info.append(el("h1", "product-detail__title", product.name));

    if (product.description) {
      info.append(el("p", "product-detail__description", product.description));
    } else {
      info.append(
        el(
          "p",
          "product-detail__description",
          "A description for this product has not been published yet."
        )
      );
    }

    const meta = el("div", "product-detail__meta");
    if (product.category) {
      meta.append(metaRow("Category", product.category));
    }
    meta.append(metaRow("Availability", buildStock(product)));

    const price = buildPrice(product);
    if (price) meta.append(metaRow("Price", price));
    info.append(meta);

    const actions = el("div", "product-detail__actions btn-group");
    actions.append(
      link(
        "Enquire on WhatsApp",
        whatsappProductHref(product),
        "btn btn--primary"
      ),
      link("Contact SAVORLEN", "/contact.html", "btn btn--secondary")
    );
    info.append(actions);

    const note = el("p", "product-detail__note");
    note.append(
      document.createTextNode(
        "Only information supplied for this product is shown. For ingredient, allergen, and packaging details, "
      ),
      link("contact SAVORLEN", "/contact.html"),
      document.createTextNode(".")
    );
    info.append(note);

    const grid = el("div", "product-detail__grid");
    grid.append(buildMedia(product, "detail"), info);
    content.replaceChildren(buildBreadcrumb(product), grid);
  }

  function initProductDetail() {
    const loading = document.querySelector("[data-product-loading]");
    const content = document.querySelector("[data-product-content]");
    const notFound = document.querySelector("[data-product-not-found]");
    const error = document.querySelector("[data-product-error]");
    const status = document.querySelector("[data-product-status]");

    if (!loading || !content || !notFound || !error) return;

    const views = { loading, content, notFound, error };

    const announce = (message) => {
      if (status) status.textContent = message;
    };

    const setView = (active) => {
      Object.keys(views).forEach((key) => {
        views[key].hidden = key !== active;
      });
    };

    const slug = new URLSearchParams(window.location.search).get("slug");

    if (!slug || !SLUG_PATTERN.test(slug)) {
      setView("notFound");
      setNotFoundMeta();
      announce("Product not found.");
      return;
    }

    setView("loading");
    announce("Loading product information.");

    fetchProducts()
      .then((products) => {
        const product = products.find((item) => item.slug === slug);

        if (!product) {
          setView("notFound");
          setNotFoundMeta();
          announce("Product not found.");
          return;
        }

        renderProductDetail(product);
        setProductMeta(product);
        setView("content");
        announce("Product information loaded.");
      })
      .catch((fetchError) => {
        console.error("[SAVORLEN] Failed to load the product.", fetchError);
        setView("error");
        setNotFoundMeta();
        announce("Product information could not be loaded.");
      });
  }

  const page = document.body.dataset.page;

  if (page === "home") initHomePreview();
  if (page === "catalogue") initCatalogue();
  if (page === "product") initProductDetail();
})();
