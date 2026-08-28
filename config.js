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

  if (!document.getElementById("controlThemeStyles")) {
    const themeStyles = document.createElement("link");
    themeStyles.id = "controlThemeStyles";
    themeStyles.rel = "stylesheet";
    themeStyles.href = "theme-light.css?v=1";
    document.head.appendChild(themeStyles);
  }

  function themeButton(extraClass){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle" + (extraClass ? " " + extraClass : "");
    button.setAttribute("aria-label", "Alternar entre tema claro e escuro");
    button.setAttribute("title", "Alternar tema");
    button.innerHTML = '<span class="theme-icon" aria-hidden="true"></span><span class="theme-label"></span>';
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
    });
  }

  function toggleTheme(){
    const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = nextTheme;
    try { localStorage.setItem(STORAGE_KEY, nextTheme); } catch (_) {}
    refreshButtons();
  }

  function mountThemeControls(){
    const topRight = document.querySelector(".top-right");
    if (topRight && !topRight.querySelector(".theme-toggle")) {
      topRight.insertBefore(themeButton("theme-toggle-top"), topRight.firstChild);
    }

    if (!document.querySelector(".theme-toggle-login")) {
      document.body.appendChild(themeButton("theme-toggle-login"));
    }

    refreshButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountThemeControls, { once:true });
  } else {
    mountThemeControls();
  }
})();
