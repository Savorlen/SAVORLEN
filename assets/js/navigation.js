(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  const details = document.querySelector("[data-mobile-nav]");

  if (header) {
    let ticking = false;

    const syncHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    };

    syncHeader();
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(syncHeader);
      },
      { passive: true }
    );
  }

  if (!details) return;

  const summary = details.querySelector("summary");
  const panel = details.querySelector(".mobile-nav__panel");
  const label = details.querySelector(".mobile-nav__label");
  const links = details.querySelectorAll("a");
  const desktop = window.matchMedia("(min-width: 901px)");

  if (!summary || !panel) return;

  panel.id = panel.id || "mobile-menu";
  summary.setAttribute("aria-controls", panel.id);

  const syncState = () => {
    summary.setAttribute("aria-expanded", String(details.open));
    if (label) label.textContent = details.open ? "Close" : "Menu";
  };

  syncState();

  details.addEventListener("toggle", syncState);

  links.forEach((link) => {
    link.addEventListener("click", () => {
      details.open = false;
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !details.open) return;
    details.open = false;
    summary.focus();
  });

  document.addEventListener("click", (event) => {
    if (!details.open || details.contains(event.target)) return;
    details.open = false;
  });

  const closeOnDesktop = () => {
    if (desktop.matches) details.open = false;
  };

  if (typeof desktop.addEventListener === "function") {
    desktop.addEventListener("change", closeOnDesktop);
  } else if (typeof desktop.addListener === "function") {
    desktop.addListener(closeOnDesktop);
  }
})();
