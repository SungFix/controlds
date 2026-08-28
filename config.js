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
      const themeStyles = document.createElement("link");
      themeStyles.id = "controlThemeStyles";
      themeStyles.rel = "stylesheet";
      themeStyles.href = "theme-light.css?v=3";
      document.head.appendChild(themeStyles);
    }
  }

  function applyEmergencyButtonStyle(button, floating){
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.gap = "7px";
    button.style.minHeight = "40px";
    button.style.padding = "8px 12px";
    button.style.borderRadius = "10px";
    button.style.border = "1px solid #59616b";
    button.style.background = root.dataset.theme === "light" ? "#ffffff" : "#171a1f";
    button.style.color = root.dataset.theme === "light" ? "#24313e" : "#f3f5f7";
    button.style.font = "inherit";
    button.style.fontSize = "10px";
    button.style.fontWeight = "800";
    button.style.cursor = "pointer";
    button.style.whiteSpace = "nowrap";
    button.style.boxShadow = floating ? "0 10px 30px rgba(0,0,0,.22)" : "none";
    if (floating) {
      button.style.position = "fixed";
      button.style.top = "16px";
      button.style.right = "16px";
      button.style.zIndex = "2147483647";
    }
  }

  function themeButton(extraClass, floating){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle" + (extraClass ? " " + extraClass : "");
    button.setAttribute("aria-label", "Alternar entre tema claro e escuro");
    button.setAttribute("title", "Alternar tema");
    button.innerHTML = '<span class="theme-icon" aria-hidden="true"></span><span class="theme-label"></span>';
    applyEmergencyButtonStyle(button, floating);
    button.addEventListener("click", toggleTheme);
    return button;
  }

  function refreshButtons(){
    const isLight = root.dataset.theme === "light";
    document.querySelectorAll(".theme-toggle").forEach((button) => {
      const icon = button.querySelector(".theme-icon");
      const label = button.querySelector(".theme-label");
      if (icon) icon.textContent = isLight ? "☾" : "☀";
      if (label) label.textContent = isLight ? "Tema escuro" : "Tema claro";
      button.setAttribute("aria-pressed", String(isLight));
      applyEmergencyButtonStyle(button, button.classList.contains("theme-toggle-floating"));
    });
  }

  function toggleTheme(){
    const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = nextTheme;
    try { localStorage.setItem(STORAGE_KEY, nextTheme); } catch (_) {}
    refreshButtons();
  }

  function mountThemeControls(){
    ensureThemeStyles();

    const topRight = document.querySelector(".top-right");
    if (topRight && !topRight.querySelector(".theme-toggle-top")) {
      topRight.insertBefore(themeButton("theme-toggle-top", false), topRight.firstChild);
    }

    if (!document.querySelector(".theme-toggle-floating")) {
      document.body.appendChild(themeButton("theme-toggle-floating", true));
    }

    refreshButtons();
  }

  ensureThemeStyles();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountThemeControls, { once:true });
  } else {
    mountThemeControls();
  }

  window.addEventListener("load", mountThemeControls, { once:true });
  setTimeout(mountThemeControls, 300);
  setTimeout(mountThemeControls, 1200);
})();
