(function initPortalAdminCorner(){
  "use strict";

  let queued=false;

  function placeButton(){
    queued=false;
    const portal=document.getElementById("eteCentralPortal");
    const button=document.getElementById("etePortalAdminButton");
    if(!portal||!button)return;

    if(button.parentElement!==portal)portal.insertBefore(button,portal.firstChild);

    button.style.setProperty("position","fixed","important");
    button.style.setProperty("top","8px","important");
    button.style.setProperty("left","8px","important");
    button.style.setProperty("right","auto","important");
    button.style.setProperty("bottom","auto","important");
    button.style.setProperty("margin","0","important");
    button.style.setProperty("transform","none","important");
    button.style.setProperty("z-index","2147483643","important");
    button.dataset.cornerFixed="true";
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
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener("pageshow",placeButton);
    setTimeout(placeButton,80);
    setTimeout(placeButton,300);
    setTimeout(placeButton,800);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
