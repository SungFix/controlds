(function(){
  "use strict";

  const directorLevelRoles=["adm","diretor","professor"];

  function hasDirectorLevel(){
    return !!window.currentUser && directorLevelRoles.includes(String(window.currentUser.role||"").toLowerCase());
  }

  function install(){
    try{ window.canCreateRequest=hasDirectorLevel; }catch(_){}
    try{ window.canManageStudents=hasDirectorLevel; }catch(_){}
    try{ window.canCreatePermission=hasDirectorLevel; }catch(_){}
    try{ window.canClearHistory=hasDirectorLevel; }catch(_){}

    try{
      if(typeof window.applyRoleUI==="function") window.applyRoleUI();
    }catch(_){}
  }

  install();
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",install,{once:true});
  }
  window.addEventListener("load",install,{once:true});
})();
