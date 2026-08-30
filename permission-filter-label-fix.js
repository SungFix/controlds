(function initPermissionFilterLabelFix(){
  "use strict";

  function syncPermissionFilterLabel(){
    const hidden=document.getElementById("permissionFilter");
    const title=document.getElementById("permissionFilterTitle");
    const subtitle=document.getElementById("permissionFilterSubtitle");
    const allOption=document.querySelector('[data-interval-target="permissionFilter"][data-interval-value="all"]');

    if(allOption){
      const optionTitle=allOption.querySelector("strong");
      const optionSubtitle=allOption.querySelector("small");
      if(optionTitle) optionTitle.textContent="Todos os horários";
      if(optionSubtitle) optionSubtitle.hidden=true;
    }

    if(!hidden || !title || !subtitle) return;

    const isAll=hidden.value==="all";
    if(isAll){
      title.textContent="Todos os horários";
      subtitle.textContent="";
      subtitle.hidden=true;
    }else{
      subtitle.hidden=false;
    }
  }

  function queueSync(){
    queueMicrotask(syncPermissionFilterLabel);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",syncPermissionFilterLabel,{once:true});
  }else{
    syncPermissionFilterLabel();
  }

  document.addEventListener("click",function(event){
    if(event.target.closest?.('[data-interval-target="permissionFilter"]')) queueSync();
  });

  const observer=new MutationObserver(function(){
    const hidden=document.getElementById("permissionFilter");
    const title=document.getElementById("permissionFilterTitle");
    const subtitle=document.getElementById("permissionFilterSubtitle");
    if(hidden?.value==="all" && (title?.textContent!=="Todos os horários" || !subtitle?.hidden)){
      syncPermissionFilterLabel();
    }
  });

  function observe(){
    if(document.body) observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  if(document.body) observe();
  else document.addEventListener("DOMContentLoaded",observe,{once:true});
})();
