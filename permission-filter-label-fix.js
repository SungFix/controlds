(function initPermissionFilterLabelFix(){
  "use strict";

  function ensureStyle(){
    if(document.getElementById("permissionFilterLabelFixStyles")) return;
    const style=document.createElement("style");
    style.id="permissionFilterLabelFixStyles";
    style.textContent=`
      #permissionFilterTrigger.permission-filter-all-selected{
        min-height:52px !important;
        height:52px;
      }
      #permissionFilterTrigger.permission-filter-all-selected .interval-picker-main{
        align-self:stretch;
        display:flex;
        flex-direction:column;
        justify-content:center;
      }
      #permissionFilterPopup .permission-filter-all-option{
        min-height:52px !important;
        height:52px;
      }
      #permissionFilterPopup .permission-filter-all-option .interval-option-copy{
        align-self:stretch;
        display:flex;
        flex-direction:column;
        justify-content:center;
      }
      @media(max-width:820px){
        #permissionFilterTrigger.permission-filter-all-selected,
        #permissionFilterPopup .permission-filter-all-option{
          min-height:52px !important;
          height:52px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncPermissionFilterLabel(){
    ensureStyle();

    const hidden=document.getElementById("permissionFilter");
    const trigger=document.getElementById("permissionFilterTrigger");
    const title=document.getElementById("permissionFilterTitle");
    const subtitle=document.getElementById("permissionFilterSubtitle");
    const allOption=document.querySelector('[data-interval-target="permissionFilter"][data-interval-value="all"]');

    if(allOption){
      const optionTitle=allOption.querySelector("strong");
      const optionSubtitle=allOption.querySelector("small");
      allOption.classList.add("permission-filter-all-option");
      if(optionTitle) optionTitle.textContent="Todos os horários";
      if(optionSubtitle) optionSubtitle.hidden=true;
    }

    if(!hidden || !title || !subtitle) return;

    const isAll=hidden.value==="all";
    trigger?.classList.toggle("permission-filter-all-selected",isAll);

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
    const trigger=document.getElementById("permissionFilterTrigger");
    if(hidden?.value==="all" && (title?.textContent!=="Todos os horários" || !subtitle?.hidden || !trigger?.classList.contains("permission-filter-all-selected"))){
      syncPermissionFilterLabel();
    }
  });

  function observe(){
    if(document.body) observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  if(document.body) observe();
  else document.addEventListener("DOMContentLoaded",observe,{once:true});
})();
