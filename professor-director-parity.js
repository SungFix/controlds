(function(){
  "use strict";

  const directorLevelRoles=["adm","diretor","professor"];

  function getCurrentRole(){
    try{
      if(typeof currentUser!=="undefined" && currentUser) return String(currentUser.role||"").toLowerCase();
    }catch(_){}
    return "";
  }

  function hasDirectorLevel(){
    return directorLevelRoles.includes(getCurrentRole());
  }

  function install(){
    try{ canCreateRequest=hasDirectorLevel; }catch(_){}
    try{ canManageStudents=hasDirectorLevel; }catch(_){}
    try{ canCreatePermission=hasDirectorLevel; }catch(_){}
    try{ canClearHistory=hasDirectorLevel; }catch(_){}

    try{
      if(typeof applyRoleUI==="function") applyRoleUI();
    }catch(_){}
  }

  install();
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",install,{once:true});
  }
  window.addEventListener("load",install,{once:true});
})();
