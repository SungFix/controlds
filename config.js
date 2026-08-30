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

  function normalizeTheme(value){
    return value === "light" ? "light" : "dark";
  }

  function readStoredTheme(){
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch (_) {}
    return "dark";
  }

  function applyRootTheme(theme){
    const next = normalizeTheme(theme);
    if (root.dataset.theme !== next) root.dataset.theme = next;
    root.classList.toggle("theme-light", next === "light");
    root.classList.toggle("theme-dark", next === "dark");
    root.style.colorScheme = next;
    return next;
  }

  applyRootTheme(readStoredTheme());

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
    ensureStylesheet("controlThemeStyles", "theme-light.css?v=7");
    ensureStylesheet("controlThemeRefineStyles", "theme-light-refine.css?v=3");
    ensureStylesheet("controlThemeSecondaryStyles", "theme-light-secondary.css?v=12");
    ensureStylesheet("controlLightPermissionsStyles", "theme-light-permissions.css?v=3");
    ensureStylesheet("controlPermissionCardsStyles", "permission-cards.css?v=2");
    ensureStylesheet("controlThemeTransitionStyles", "theme-transition.css?v=10");
    ensureStylesheet("controlHeaderPolishStyles", "header-polish.css?v=4");
    ensureStylesheet("controlMobileMenuStyles", "mobile-menu-enhance.css?v=3");
    ensureStylesheet("controlMobilePolishStyles", "mobile-polish.css?v=2");
    ensureStylesheet("controlMobileHeaderPolishStyles", "mobile-header-polish.css?v=3");
    ensureStylesheet("controlThemeParityStyles", "theme-light-parity.css?v=2");
    ensureStylesheet("controlVisualPrimeStyles", "visual-prime.css?v=3");
    ensureStylesheet("controlAccessibilityPrimeStyles", "accessibility-prime.css?v=2");
    ensureStylesheet("controlStudentLightPolishStyles", "student-light-polish.css?v=1");
    ensureStylesheet("controlPermissionFormPickerStyles", "permission-form-picker-enhance.css?v=1");
    ensureStylesheet("controlActionModalStyles", "action-modal.css?v=1");
    ensureStylesheet("controlFinalPolishStyles", "final-polish.css?v=2");
    ensureStylesheet("controlContrastSweepStyles", "contrast-sweep.css?v=5");
    ensureStylesheet("controlTopbarFinalOverrideStyles", "topbar-final-override.css?v=7");
    ensureStylesheet("controlUserProfileStyles", "user-profile.css?v=3");
    ensureStylesheet("controlStudentCardActionsStyles", "student-card-actions.css?v=3");
    ensureStylesheet("controlRequestSortSizeStyles", "request-sort-size.css?v=1");
    ensureStylesheet("controlHistoryFilterSizeStyles", "history-filter-size.css?v=3");

    ensureScript("controlMobileMenuScript", "mobile-menu-enhance.js?v=3");
    ensureScript("controlComputerIdScript", "computer-id-enhance.js?v=2");
    ensureScript("controlPermissionDetailsScript", "permission-details-enhance.js?v=3");
    ensureScript("controlRoleLabelFixScript", "role-label-fix.js?v=2");
    ensureScript("controlProfessorDirectorParityScript", "professor-director-parity.js?v=3");
    ensureScript("controlPermissionFormPickerScript", "permission-form-picker-enhance.js?v=1");
    ensureScript("controlActionModalScript", "action-modal.js?v=1");
    ensureScript("controlPermissionDeleteScript", "permission-delete-enhance.js?v=2");
    ensureScript("controlComputerDeleteScript", "computer-delete-enhance.js?v=4");
    ensureScript("controlUxPrimeScript", "ux-prime.js?v=3");
    ensureScript("controlFinalPolishScript", "final-polish.js?v=1");
    ensureScript("controlNavigationSimplifyScript", "navigation-simplify.js?v=1");
    ensureScript("controlStudentUseChoiceScript", "student-use-choice.js?v=2");
    ensureScript("controlUserProfileScript", "user-profile.js?v=1");
    ensureScript("controlStudentCardActionsScript", "student-card-actions.js?v=2");
    ensureScript("controlPermissionFilterLabelFixScript", "permission-filter-label-fix.js?v=1");
    ensureScript("controlHistoryFilterPolishScript", "history-filter-polish.js?v=1");
  }

  function updateButton(button){
    const light = root.dataset.theme === "light";
    const state = light ? "light" : "dark";
    if (button.dataset.themeState !== state) {
      button.innerHTML = '<span aria-hidden="true">' + (light ? '☾' : '☀') + '</span><span class="theme-label">' + (light ? 'Tema escuro' : 'Tema claro') + '</span>';
      button.dataset.themeState = state;
    }
    button.setAttribute("aria-pressed", String(light));
    button.setAttribute("aria-label", light ? "Mudar para tema escuro" : "Mudar para tema claro");
    button.title = light ? "Mudar para tema escuro" : "Mudar para tema claro";
  }

  function setTheme(theme, options){
    const next = applyRootTheme(theme);
    const persist = !options || options.persist !== false;
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
    }
    document.querySelectorAll(".control-theme-toggle").forEach(updateButton);
    try { window.dispatchEvent(new CustomEvent("control-theme-change", { detail: { theme: next } })); } catch (_) {}
    return next;
  }

  function toggleTheme(){ setTheme(root.dataset.theme === "light" ? "dark" : "light"); }

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
    button.addEventListener("click", function(event){ event.preventDefault(); event.stopPropagation(); toggleTheme(); });
    updateButton(button);
    return button;
  }

  function mountHeaderButton(){
    const header = document.querySelector(".topbar-right, .top-right");
    if (!header) return;
    let button = header.querySelector(".control-theme-toggle-header");
    if (!button) { button = makeButton("control-theme-toggle-header"); header.insertBefore(button, header.firstChild); }
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
    applyRootTheme(readStoredTheme());
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

  window.addEventListener("storage", function(event){
    if (event.key !== STORAGE_KEY) return;
    if (event.newValue === "light" || event.newValue === "dark") setTheme(event.newValue, { persist:false });
  });

  window.addEventListener("pageshow", function(){ setTheme(readStoredTheme(), { persist:false }); mountThemeControls(); });
  window.addEventListener("load", mountThemeControls, { once:true });

  window.ControlTheme = Object.freeze({
    get: function(){ return root.dataset.theme === "light" ? "light" : "dark"; },
    set: function(theme){ return setTheme(theme); },
    toggle: toggleTheme
  });
})();