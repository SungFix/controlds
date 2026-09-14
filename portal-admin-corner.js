(function initPortalAdminCorner(){
  "use strict";

  let queued=false;

  function isPortalHomeVisible(portal){
    return !!portal
      && !portal.hidden
      && !portal.classList.contains("module-open")
      && document.body.classList.contains("portal-open");
  }

  function isNotebookViewport(){
    return window.innerWidth>=1024 && window.innerWidth<=1600;
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

    const notebook=isNotebookViewport();

    button.style.setProperty("position","fixed","important");
    button.style.setProperty("top",notebook?"auto":"8px","important");
    button.style.setProperty("left","8px","important");
    button.style.setProperty("right","auto","important");
    button.style.setProperty("bottom",notebook?"8px":"auto","important");
    button.style.setProperty("margin","0","important");
    button.style.setProperty("transform","none","important");
    button.style.setProperty("z-index","2147483643","important");
    button.style.setProperty("width","50px","important");
    button.style.setProperty("min-width","50px","important");
    button.style.setProperty("height","50px","important");
    button.style.setProperty("min-height","50px","important");
    button.style.setProperty("padding","0","important");
    button.style.setProperty("font-size","0","important");
    button.style.setProperty("line-height","1","important");
    button.style.setProperty("align-items","center","important");
    button.style.setProperty("justify-content","center","important");
    button.style.setProperty("border-radius","13px","important");
    button.dataset.cornerFixed="true";
    button.dataset.iconOnly="true";
    button.dataset.notebookCorner=notebook?"bottom-left":"top-left";
  }

  function queuePlace(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(placeButton);
  }

  function nodeMayAffectButton(node){
    if(!node||node.nodeType!==1)return false;
    if(node.id==="eteCentralPortal"||node.id==="etePortalAdminButton")return true;
    return !!node.querySelector?.("#eteCentralPortal,#etePortalAdminButton");
  }

  function handleMutations(mutations){
    for(const mutation of mutations){
      if(mutation.type==="attributes"){
        const target=mutation.target;
        if(target===document.body||target.id==="eteCentralPortal"||target.id==="etePortalAdminButton"){
          queuePlace();
          return;
        }
        continue;
      }

      if(mutation.type==="childList"){
        if(mutation.target===document.body||mutation.target.id==="eteCentralPortal"){
          queuePlace();
          return;
        }
        for(const node of mutation.addedNodes){
          if(nodeMayAffectButton(node)){
            queuePlace();
            return;
          }
        }
      }
    }
  }

  function install(){
    placeButton();
    if(!document.body)return;
    const observer=new MutationObserver(handleMutations);
    observer.observe(document.body,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","hidden"]
    });
    window.addEventListener("pageshow",placeButton);
    window.addEventListener("popstate",placeButton);
    window.addEventListener("resize",queuePlace,{passive:true});
    setTimeout(placeButton,80);
    setTimeout(placeButton,300);
    setTimeout(placeButton,800);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
