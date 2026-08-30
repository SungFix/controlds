(function initMobileLogoutIcon(){
  "use strict";

  const MOBILE_QUERY = "(max-width: 820px)";
  const media = window.matchMedia(MOBILE_QUERY);
  const ICON = '<svg class="mobile-logout-svg" aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none"><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M9 12h9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let queued = false;

  function ensureStyles(){
    if (document.getElementById("controlMobileLogoutIconStyles")) return;
    const style = document.createElement("style");
    style.id = "controlMobileLogoutIconStyles";
    style.textContent = `
@media(max-width:820px){
  #logoutBtn.control-mobile-logout,
  .header-logout.control-mobile-logout{
    width:40px !important;
    min-width:40px !important;
    max-width:40px !important;
    height:40px !important;
    min-height:40px !important;
    padding:0 !important;
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
    gap:0 !important;
    font-size:0 !important;
    line-height:0 !important;
    color:var(--ui-text-1,#eef2f5) !important;
    overflow:hidden !important;
  }
  #logoutBtn.control-mobile-logout::before,
  .header-logout.control-mobile-logout::before{
    content:none !important;
    display:none !important;
  }
  #logoutBtn .mobile-logout-svg,
  .header-logout .mobile-logout-svg{
    width:21px !important;
    height:21px !important;
    display:block !important;
    flex:0 0 21px !important;
    color:inherit !important;
  }
}
`;
    document.head.appendChild(style);
  }

  function getLogout(){
    return document.getElementById("logoutBtn") || document.querySelector(".header-logout");
  }

  function apply(){
    queued = false;
    ensureStyles();
    const button = getLogout();
    if (!button) return;

    button.classList.add("control-mobile-logout");
    button.setAttribute("aria-label", "Sair");
    button.setAttribute("title", "Sair");

    if (media.matches) {
      if (button.dataset.mobileLogoutIcon !== "1") {
        button.dataset.mobileLogoutOriginal = button.innerHTML;
        button.innerHTML = ICON;
        button.dataset.mobileLogoutIcon = "1";
      }
    } else if (button.dataset.mobileLogoutIcon === "1") {
      button.innerHTML = button.dataset.mobileLogoutOriginal || "Sair";
      delete button.dataset.mobileLogoutIcon;
    }
  }

  function queueApply(){
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){
      apply();
      if (document.body) new MutationObserver(queueApply).observe(document.body,{childList:true,subtree:true});
    }, {once:true});
  } else {
    apply();
    if (document.body) new MutationObserver(queueApply).observe(document.body,{childList:true,subtree:true});
  }

  if (media.addEventListener) media.addEventListener("change", apply);
  else if (media.addListener) media.addListener(apply);
  window.addEventListener("pageshow", apply);
})();
