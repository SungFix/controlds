(function initMobileLogoutIcon(){
  "use strict";

  const STYLE_ID = "controlMobileLogoutIconStyles";
  let queued = false;

  function ensureStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
@media(max-width:820px){
  .control-mobile-logout{
    width:38px !important;
    min-width:38px !important;
    max-width:38px !important;
    height:40px !important;
    min-height:40px !important;
    padding:0 !important;
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
    gap:0 !important;
    font-size:0 !important;
    line-height:0 !important;
    color:transparent !important;
    position:relative !important;
    overflow:hidden !important;
  }
  .control-mobile-logout > *{
    font-size:0 !important;
    color:transparent !important;
  }
  .control-mobile-logout::before{
    content:"" !important;
    width:21px !important;
    height:21px !important;
    display:block !important;
    background:#eef2f5 !important;
    -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M9 12h9' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
    mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M9 12h9' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
    -webkit-mask-repeat:no-repeat !important;
    mask-repeat:no-repeat !important;
    -webkit-mask-position:center !important;
    mask-position:center !important;
    -webkit-mask-size:21px 21px !important;
    mask-size:21px 21px !important;
  }
  html[data-theme="light"] .control-mobile-logout::before{
    background:#182129 !important;
  }
}
`;
    document.head.appendChild(style);
  }

  function isLogoutControl(el){
    const text = (el.textContent || "").replace(/\s+/g," ").trim().toLowerCase();
    const aria = (el.getAttribute("aria-label") || "").trim().toLowerCase();
    const title = (el.getAttribute("title") || "").trim().toLowerCase();
    return text === "sair" || aria === "sair" || title === "sair" || el.id === "logoutBtn";
  }

  function apply(){
    queued = false;
    ensureStyles();
    document.querySelectorAll(".topbar button, .topbar a, .topbar-right button, .topbar-right a, .top-right button, .top-right a").forEach(function(el){
      if (!isLogoutControl(el)) return;
      el.classList.add("control-mobile-logout");
      if (!el.getAttribute("aria-label")) el.setAttribute("aria-label","Sair");
      if (!el.getAttribute("title")) el.setAttribute("title","Sair");
    });
  }

  function queueApply(){
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){
      apply();
      if (document.body) new MutationObserver(queueApply).observe(document.body,{childList:true,subtree:true,characterData:true});
    }, {once:true});
  } else {
    apply();
    if (document.body) new MutationObserver(queueApply).observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  window.addEventListener("pageshow", apply);
})();