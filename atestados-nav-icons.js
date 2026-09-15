(function initAtestadosNavIcons(){
  "use strict";

  let observer=null;
  let queued=false;

  const ICONS={
    overview:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
    records:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5M10 15h5M10 18h4"/></svg>',
    reports:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V10M12 19V5M19 19v-6"/><path d="M3 19.5h18"/></svg>',
    new:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M12 11v6M9 14h6"/></svg>'
  };

  function pageKey(button){
    if(!button)return"overview";
    if(button.hasAttribute("data-at-report"))return"reports";
    const key=String(button.dataset.atTab||"").toLowerCase();
    if(key==="records")return"records";
    if(key==="reports")return"reports";
    if(key==="new")return"new";
    return"overview";
  }

  function iconMarkup(key){return ICONS[key]||ICONS.overview;}

  function decorateNav(module){
    const nav=module.querySelector(".at-nav");
    if(!nav)return;

    nav.querySelectorAll(".at-nav-item").forEach(button=>{
      const key=pageKey(button);
      let icon=button.querySelector(":scope > .at-control-navicon");
      if(!icon){
        icon=document.createElement("span");
        icon.className="at-control-navicon";
        button.insertBefore(icon,button.firstChild);
      }
      if(icon.dataset.atPageIcon!==key){
        icon.innerHTML=iconMarkup(key);
        icon.dataset.atPageIcon=key;
      }
      icon.setAttribute("aria-hidden","true");
      icon.setAttribute("role","presentation");
      icon.style.cursor="default";
    });

    if(nav.dataset.atIconClickGuard!=="1"){
      nav.dataset.atIconClickGuard="1";
      nav.addEventListener("click",event=>{
        if(!event.target.closest?.(".at-control-navicon"))return;
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
      },true);
    }
  }

  function activePageKey(module){
    const active=module.querySelector(".at-nav-item.active");
    return pageKey(active);
  }

  function decorateHeader(module){
    const left=module.querySelector(".at-app-top-left");
    const current=left?.querySelector(".at-app-home,.at-page-icon");
    if(!left||!current)return;

    let icon=current;
    if(current.tagName==="BUTTON"){
      icon=document.createElement("span");
      icon.className=current.className+" at-page-icon";
      current.replaceWith(icon);
    }else if(!icon.classList.contains("at-page-icon")){
      icon.classList.add("at-page-icon");
    }

    const key=activePageKey(module);
    if(icon.dataset.atPageIcon!==key){
      icon.innerHTML=iconMarkup(key);
      icon.dataset.atPageIcon=key;
    }
    icon.setAttribute("aria-hidden","true");
    icon.setAttribute("role","presentation");
    icon.removeAttribute("tabindex");
    icon.style.cursor="default";
    icon.style.pointerEvents="none";
  }

  function sync(){
    queued=false;
    document.querySelectorAll(".ete-atestados").forEach(module=>{
      decorateNav(module);
      decorateHeader(module);
    });
  }

  function queueSync(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(sync);
  }

  function start(){
    sync();
    if(!document.body)return;
    observer=new MutationObserver(queueSync);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
