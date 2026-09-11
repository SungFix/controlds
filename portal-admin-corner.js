(function initPortalAdminCorner(){
  "use strict";

  let queued=false;

  function isPortalHomeVisible(portal){
    return !!portal
      && !portal.hidden
      && !portal.classList.contains("module-open")
      && document.body.classList.contains("portal-open");
  }

  function placeButton(){
    queued=false;
    const portal=document.getElementById("eteCentralPortal");
    const button=document.getElementById("etePortalAdminButton");
    if(!portal||!button)return;

    if(button.parentElement!==portal)portal.insertBefore(button,portal.firstChild);

    const visible=isPortalHomeVisible(portal);
    button.hidden=!visible;
    button.setAttribute("aria-hidden",visible?"false":"true");
    button.setAttribute("aria-label","Administração");
    button.title="Administração";
    button.style.setProperty("display",visible?"inline-flex":"none","important");

    if(!visible)return;

    button.style.setProperty("position","fixed","important");
    button.style.setProperty("top","8px","important");
    button.style.setProperty("left","8px","important");
    button.style.setProperty("right","auto","important");
    button.style.setProperty("bottom","auto","important");
    button.style.setProperty("margin","0","important");
    button.style.setProperty("transform","none","important");
    button.style.setProperty("z-index","2147483643","important");
    button.style.setProperty("width","44px","important");
    button.style.setProperty("min-width","44px","important");
    button.style.setProperty("height","44px","important");
    button.style.setProperty("min-height","44px","important");
    button.style.setProperty("padding","0","important");
    button.style.setProperty("font-size","0","important");
    button.style.setProperty("line-height","1","important");
    button.style.setProperty("border-radius","12px","important");
    button.dataset.cornerFixed="true";
    button.dataset.iconOnly="true";
  }

  function queuePlace(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(placeButton);
  }

  function install(){
    placeButton();
    if(!document.body)return;
    const observer=new MutationObserver(queuePlace);
    observer.observe(document.body,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","hidden"]
    });
    window.addEventListener("pageshow",placeButton);
    window.addEventListener("popstate",placeButton);
    setTimeout(placeButton,80);
    setTimeout(placeButton,300);
    setTimeout(placeButton,800);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
