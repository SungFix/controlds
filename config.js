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
    ensureStylesheet("controlThemeSecondaryStyles", "theme-light-secondary.css?v=6");
    ensureStylesheet("controlThemeTransitionStyles", "theme-transition.css?v=8");
  }

  function updateButton(button){
    const light = root.dataset.theme === "light";
    button.innerHTML = '<span aria-hidden="true">' + (light ? '☾' : '☀') + '</span><span class="theme-label">' + (light ? 'Tema escuro' : 'Tema claro') + '</span>';
    button.setAttribute("aria-pressed", String(light));
    button.title = light ? "Mudar para tema escuro" : "Mudar para tema claro";
    button.style.background = light ? "#819aa6" : "#171a1f";
    button.style.color = light ? "#152a33" : "#f3f5f7";
    button.style.borderColor = light ? "#58717c" : "#39414b";
  }

  function setTheme(theme){
    root.dataset.theme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
    document.querySelectorAll(".control-theme-toggle").forEach(updateButton);
  }

  function cleanupTransition(){
    root.classList.remove(
      "theme-transitioning",
      "theme-target-light",
      "theme-target-dark",
      "theme-transition-cover",
      "theme-transition-reveal"
    );
  }

  function toggleTheme(){
    if (root.classList.contains("theme-transitioning")) return;

    const goingLight = root.dataset.theme !== "light";
    root.classList.add("theme-transitioning", goingLight ? "theme-target-light" : "theme-target-dark");

    if (goingLight) {
      /* Primeiro escurece levemente a visão atual, sem alterar o tema. */
      requestAnimationFrame(() => {
        root.classList.add("theme-transition-cover");
      });

      /* O tema claro entra escondido pela película escura. */
      setTimeout(() => {
        setTheme("light");
      }, 130);

      /* Depois revelamos o claro lentamente, evitando salto de luminância. */
      setTimeout(() => {
        root.classList.remove("theme-transition-cover");
        root.classList.add("theme-transition-reveal");
      }, 180);

      setTimeout(cleanupTransition, 1120);
      return;
    }

    /* Claro -> escuro pode ser direto e suave, sem qualquer clarão. */
    requestAnimationFrame(() => {
      setTheme("dark");
    });
    setTimeout(cleanupTransition, 760);
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
