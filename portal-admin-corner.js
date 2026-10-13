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

    const actions=portal.querySelector(".ete-portal-actions");
    if(!actions)return;

    // O botão nasce dentro das ações do Portal e deve permanecer ali.
    // Versões anteriores o moviam para um canto fixo, o que podia cobrir
    // a marca/títulos em telas menores.
    if(button.parentElement!==actions)actions.insertBefore(button,actions.firstChild);

    const visible=isPortalHomeVisible(portal);
    button.hidden=!visible;
    button.setAttribute("aria-hidden",visible?"false":"true");
    button.setAttribute("aria-label","Administração");
    button.title="Administração";
    button.style.setProperty("display",visible?"inline-flex":"none","important");

    // Limpa qualquer posicionamento inline deixado por versões antigas.
    ["top","left","right","bottom","z-index"].forEach(prop=>button.style.removeProperty(prop));
    button.style.setProperty("position","static","important");
    button.style.setProperty("margin","0","important");
    button.style.setProperty("transform","none","important");
    button.style.setProperty("font-size","0","important");
    button.style.setProperty("line-height","1","important");
    button.style.setProperty("align-items","center","important");
    button.style.setProperty("justify-content","center","important");
    button.dataset.cornerFixed="false";
    button.dataset.iconOnly="true";
    button.dataset.notebookCorner="actions";
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
        if(mutation.target===document.body||mutation.target.id==="eteCentralPortal"||mutation.target.classList?.contains("ete-portal-actions")){
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
