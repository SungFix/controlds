window.ETE_CONFIG = {
  supabaseUrl: "https://fisgkrmporzovogpmfpg.supabase.co",
  supabasePublishableKey: "sb_publishable_Wc3EyfhAQGbrf3n_NE0Clg_ermVC_Pq",
  authEmails: {
    klenio: "klenio@email.com",
    miguel: "miguel@email.com",
    ronaldo: "ronaldo@email.com",
    monitor: "monitor@email.com"
  }
};

(function initControlTheme(){
  "use strict";

  const STORAGE_KEY = "control-ds-theme";
  const root = document.documentElement;
  let observerQueued = false;

  let savedTheme = "dark";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") savedTheme = stored;
  } catch (_) {}
  root.dataset.theme = savedTheme;

  function ensureStylesheet(id, href){
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) link.href = href;
  }

  function ensureScript(id, src){
    let script = document.getElementById(id);
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = false;
      script.defer = true;
      document.head.appendChild(script);
    } else if (script.getAttribute("src") !== src) {
      script.src = src;
    }
  }

  function ensureThemeStyles(){
    ensureStylesheet("controlThemeStyles", "theme-light.css?v=6");
    ensureStylesheet("controlThemeRefineStyles", "theme-light-refine.css?v=2");
    ensureStylesheet("controlThemeSecondaryStyles", "theme-light-secondary.css?v=11");
    ensureStylesheet("controlLightPermissionsStyles", "theme-light-permissions.css?v=2");
    ensureStylesheet("controlPermissionCardsStyles", "permission-cards.css?v=1");
    ensureStylesheet("controlThemeTransitionStyles", "theme-transition.css?v=9");
    ensureStylesheet("controlHeaderPolishStyles", "header-polish.css?v=2");
    ensureStylesheet("controlMobileMenuStyles", "mobile-menu-enhance.css?v=2");
    ensureStylesheet("controlMobilePolishStyles", "mobile-polish.css?v=1");
    ensureStylesheet("controlMobileHeaderPolishStyles", "mobile-header-polish.css?v=2");
    ensureStylesheet("controlThemeParityStyles", "theme-light-parity.css?v=1");
    ensureStylesheet("controlVisualPrimeStyles", "visual-prime.css?v=2");
    ensureStylesheet("controlAccessibilityPrimeStyles", "accessibility-prime.css?v=1");

    ensureScript("controlMobileMenuScript", "mobile-menu-enhance.js?v=2");
    ensureScript("controlComputerIdScript", "computer-id-enhance.js?v=1");
    ensureScript("controlPermissionDetailsScript", "permission-details-enhance.js?v=2");
    ensureScript("controlRoleLabelFixScript", "role-label-fix.js?v=1");
    ensureScript("controlProfessorDirectorParityScript", "professor-director-parity.js?v=1");
    ensureScript("controlUxPrimeScript", "ux-prime.js?v=2");
  }

  function updateButton(button){
    const light = root.dataset.theme === "light";
    button.innerHTML = '<span aria-hidden="true">' + (light ? '☾' : '☀') + '</span><span class="theme-label">' + (light ? 'Tema escuro' : 'Tema claro') + '</span>';
    button.setAttribute("aria-pressed", String(light));
    button.setAttribute("aria-label", light ? "Mudar para tema escuro" : "Mudar para tema claro");
    button.title = light ? "Mudar para tema escuro" : "Mudar para tema claro";
  }

  function setTheme(theme){
    const next = theme === "light" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
    document.querySelectorAll(".control-theme-toggle").forEach(updateButton);
  }

  function toggleTheme(){
    setTheme(root.dataset.theme === "light" ? "dark" : "light");
  }

  function makeButton(extraClass){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "control-theme-toggle " + (extraClass || "");
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.gap = "7px";
    button.style.minHeight = "42px";
    button.style.padding = "0 12px";
    button.style.font = "inherit";
    button.style.fontSize = "10px";
    button.style.fontWeight = "800";
    button.style.cursor = "pointer";
    button.style.visibility = "visible";
    button.style.opacity = "1";
    button.style.pointerEvents = "auto";
    button.addEventListener("click", toggleTheme);
    updateButton(button);
    return button;
  }

  function mountHeaderButton(){
    const header = document.querySelector(".topbar-right, .top-right");
    if (!header) return;
    let button = header.querySelector(".control-theme-toggle-header");
    if (!button) {
      button = makeButton("control-theme-toggle-header");
      header.insertBefore(button, header.firstChild);
    }
    updateButton(button);
  }

  function mountFloatingButton(){
    if (!document.body) return;
    let button = document.querySelector(".control-theme-toggle-floating");
    if (!button) {
      button = makeButton("control-theme-toggle-floating");
      button.style.position = "fixed";
      button.style.right = "16px";
      button.style.bottom = "16px";
      button.style.zIndex = "2147483645";
      document.body.appendChild(button);
    }
    updateButton(button);
  }

  function mountThemeControls(){
    observerQueued = false;
    ensureThemeStyles();
    mountHeaderButton();
    mountFloatingButton();
    document.querySelectorAll(".control-theme-toggle").forEach(updateButton);
  }

  function queueMount(){
    if (observerQueued) return;
    observerQueued = true;
    requestAnimationFrame(mountThemeControls);
  }

  ensureThemeStyles();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){
      mountThemeControls();
      if (document.body) {
        const observer = new MutationObserver(queueMount);
        observer.observe(document.body,{childList:true,subtree:true});
      }
    }, { once:true });
  } else {
    mountThemeControls();
    if (document.body) {
      const observer = new MutationObserver(queueMount);
      observer.observe(document.body,{childList:true,subtree:true});
    }
  }

  window.addEventListener("load", mountThemeControls, { once:true });
})();
