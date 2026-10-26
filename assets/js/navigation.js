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
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!summary || !panel) return;

  panel.id = panel.id || "mobile-menu";
  summary.setAttribute("aria-controls", panel.id);

  const scrim = document.createElement("button");
  scrim.type = "button";
  scrim.className = "mobile-nav-scrim";
  scrim.tabIndex = -1;
  scrim.setAttribute("aria-hidden", "true");
  document.body.append(scrim);

  let animation = null;
  let closeTimer = 0;
  let closeToken = 0;
  let closing = false;

  const setExpanded = (value) => {
    summary.setAttribute("aria-expanded", String(value));
    if (label) label.textContent = value ? "Close" : "Menu";
  };

  const lockScroll = (locked) => {
    document.body.classList.toggle("nav-open", locked);
  };

  const readPanel = () => {
    const style = window.getComputedStyle(panel);
    const opacity = Number(style.opacity);
    return {
      opacity: Number.isFinite(opacity) ? opacity : 1,
      transform: style.transform === "none" ? "translateY(0)" : style.transform
    };
  };

  const animateTo = (target, duration, start) => {
    if (!panel.animate || reduceMotion.matches) {
      if (animation) animation.cancel();
      animation = null;
      return;
    }

    const from = start || readPanel();
    if (animation) animation.cancel();
    animation = panel.animate([from, target], {
      duration,
      easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      fill: "both"
    });
  };

  const openPanel = () => {
    closing = false;
    closeToken += 1;
    window.clearTimeout(closeTimer);
    lockScroll(true);
    setExpanded(true);
    animateTo(
      { opacity: 1, transform: "translateY(0)" },
      260,
      { opacity: 0, transform: "translateY(-8px)" }
    );
  };

  const reopenPanel = () => {
    closing = false;
    closeToken += 1;
    window.clearTimeout(closeTimer);
    setExpanded(true);
    animateTo({ opacity: 1, transform: "translateY(0)" }, 220);
  };

  const closeMenu = (immediate) => {
    if (!details.open || closing) return;

    closing = true;

    if (immediate || reduceMotion.matches || !panel.animate) {
      closing = false;
      closeToken += 1;
      window.clearTimeout(closeTimer);
      if (animation) animation.cancel();
      details.open = false;
      lockScroll(false);
      setExpanded(false);
      return;
    }

    animateTo({ opacity: 0, transform: "translateY(-6px)" }, 200);

    const token = ++closeToken;
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (token !== closeToken || !closing) return;
      closing = false;
      details.open = false;
      lockScroll(false);
      setExpanded(false);
    }, 220);
  };

  details.addEventListener("toggle", () => {
    if (details.open) {
      if (!closing) openPanel();
      return;
    }

    lockScroll(false);
    setExpanded(false);
    if (animation) animation.cancel();
  });

  summary.addEventListener("click", (event) => {
    if (!details.open) return;
    event.preventDefault();

    if (closing) {
      reopenPanel();
      return;
    }

    closeMenu();
  });

  links.forEach((link) => {
    link.addEventListener("click", () => closeMenu(true));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !details.open) return;
    closeMenu();
    summary.focus();
  });

  document.addEventListener("click", (event) => {
    if (!details.open || closing) return;
    if (details.contains(event.target)) return;
    closeMenu();
  });

  scrim.addEventListener("click", () => closeMenu());

  const closeOnDesktop = () => {
    if (desktop.matches) closeMenu(true);
  };

  if (typeof desktop.addEventListener === "function") {
    desktop.addEventListener("change", closeOnDesktop);
  } else if (typeof desktop.addListener === "function") {
    desktop.addListener(closeOnDesktop);
  }

  if (details.open) {
    openPanel();
  } else {
    lockScroll(false);
    setExpanded(false);
  }
})();
