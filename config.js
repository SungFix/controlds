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

  function ensureThemeStyles(){
    if (!document.getElementById("controlThemeStyles")) {
      const link = document.createElement("link");
      link.id = "controlThemeStyles";
      link.rel = "stylesheet";
      link.href = "theme-light.css?v=4";
      document.head.appendChild(link);
    }
  }

  function updateButton(button){
    const light = root.dataset.theme === "light";
    button.innerHTML = '<span aria-hidden="true">' + (light ? '☾' : '☀') + '</span><span class="theme-label">' + (light ? 'Tema escuro' : 'Tema claro') + '</span>';
    button.setAttribute("aria-pressed", String(light));
    button.title = light ? "Mudar para tema escuro" : "Mudar para tema claro";
  }

  function toggleTheme(){
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    try { localStorage.setItem(STORAGE_KEY, root.dataset.theme); } catch (_) {}
    document.querySelectorAll(".control-theme-toggle").forEach(updateButton);
  }

  function makeButton(){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "control-theme-toggle btn secondary small";
    button.setAttribute("aria-label", "Alternar tema claro e escuro");
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.gap = "7px";
    button.style.minWidth = "112px";
    button.style.minHeight = "44px";
    button.style.visibility = "visible";
    button.style.opacity = "1";
    button.addEventListener("click", toggleTheme);
    updateButton(button);
    return button;
  }

  function mountThemeControls(){
    ensureThemeStyles();
    const header = document.querySelector(".topbar-right");
    if (header && !header.querySelector(".control-theme-toggle")) {
      header.insertBefore(makeButton(), header.firstChild);
    }
  }

  ensureThemeStyles();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountThemeControls);
  else mountThemeControls();
  window.addEventListener("load", mountThemeControls);
  setTimeout(mountThemeControls, 250);
  setTimeout(mountThemeControls, 1000);
})();