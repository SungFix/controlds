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
  const STORAGE_KEY = "control-ds-theme";
  const root = document.documentElement;

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
    link.href = href;
  }

  function ensureThemeStyles(){
    ensureStylesheet("controlThemeStyles", "theme-light.css?v=6");
    ensureStylesheet("controlThemeRefineStyles", "theme-light-refine.css?v=2");
    ensureStylesheet("controlThemeSecondaryStyles", "theme-light-secondary.css?v=11");
    ensureStylesheet("controlThemeTransitionStyles", "theme-transition.css?v=9");
    ensureStylesheet("controlHeaderPolishStyles", "header-polish.css?v=1");
  }

  function updateButton(button){
    const light = root.dataset.theme === "light";
    button.innerHTML = '<span aria-hidden="true">' + (light ? '☾' : '☀') + '</span><span class="theme-label">' + (light ? 'Tema escuro' : 'Tema claro') + '</span>';
    button.setAttribute("aria-pressed", String(light));
    button.title = light ? "Mudar para tema escuro" : "Mudar para tema claro";
    button.style.background = light ? "#e9f0f3" : "#171a1f";
    button.style.color = light ? "#2f4650" : "#f3f5f7";
    button.style.borderColor = light ? "#c5d5dd" : "#39414b";
  }

  function setTheme(theme){
    root.dataset.theme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
    document.querySelectorAll(".control-theme-toggle").forEach(updateButton);
  }

  function toggleTheme(){
    setTheme(root.dataset.theme === "light" ? "dark" : "light");
  }

  function makeButton(extraClass){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "control-theme-toggle " + (extraClass || "");
    button.setAttribute("aria-label", "Alternar tema claro e escuro");
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.gap = "7px";
    button.style.minWidth = "118px";
    button.style.minHeight = "44px";
    button.style.padding = "0 13px";
    button.style.border = "1px solid #39414b";
    button.style.borderRadius = "11px";
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
    const header = document.querySelector(".top-right, .topbar-right");
    if (header && !header.querySelector(".control-theme-toggle-header")) {
      const button = makeButton("control-theme-toggle-header");
      header.insertBefore(button, header.firstChild);
    }
  }

  function mountFloatingButton(){
    if (document.querySelector(".control-theme-toggle-floating")) return;
    const button = makeButton("control-theme-toggle-floating");
    button.style.position = "fixed";
    button.style.right = "16px";
    button.style.bottom = "16px";
    button.style.zIndex = "2147483647";
    button.style.boxShadow = "0 12px 30px rgba(0,0,0,.28)";
    document.body.appendChild(button);
  }

  function mountThemeControls(){
    ensureThemeStyles();
    mountHeaderButton();
    mountFloatingButton();
    document.querySelectorAll(".control-theme-toggle").forEach(updateButton);
  }

  ensureThemeStyles();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountThemeControls, { once:false });
  } else {
    mountThemeControls();
  }

  window.addEventListener("load", mountThemeControls);
  setTimeout(mountThemeControls, 100);
  setTimeout(mountThemeControls, 500);
  setTimeout(mountThemeControls, 1500);
  setInterval(mountHeaderButton, 3000);
})();
