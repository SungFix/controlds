(function(){
  "use strict";

  const managementRoles=["adm","diretor","professor"];

  function getCurrentRole(){
    try{
      if(typeof currentUser!=="undefined" && currentUser) return String(currentUser.role||"").toLowerCase();
    }catch(_){}
    return "";
  }

  function hasManagementLevel(){
    return managementRoles.includes(getCurrentRole());
  }

  function canPickupWithProfessor(){
    return ["adm","professor","monitor"].includes(getCurrentRole());
  }

  function canDeleteRequestWithProfessor(request){
    if(!request) return false;
    const role=getCurrentRole();
    if(role==="adm" || role==="professor") return true;

    try{
      const authId=String(typeof v46AuthUser!=="undefined" && v46AuthUser?.id ? v46AuthUser.id : "");
      const requestedById=String(request.requestedById||"");
      if(authId && requestedById) return authId===requestedById;
    }catch(_){}

    try{
      const username=String(currentUser?.username||"").toLowerCase();
      const requestedBy=String(request.requestedBy||request.requestedByUsername||"").toLowerCase();
      return !!username && username===requestedBy;
    }catch(_){}

    return false;
  }

  function install(){
    try{ canCreateRequest=hasManagementLevel; }catch(_){}
    try{ canManageStudents=hasManagementLevel; }catch(_){}
    try{ canCreatePermission=hasManagementLevel; }catch(_){}
    try{ canClearHistory=hasManagementLevel; }catch(_){}
    try{ canPickup=canPickupWithProfessor; }catch(_){}
    try{ canDeleteRequest=canDeleteRequestWithProfessor; }catch(_){}

    try{
      if(typeof applyRoleUI==="function") applyRoleUI();
    }catch(_){}
  }

  install();
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",install,{once:true});
  }
  window.addEventListener("load",install,{once:true});
  setTimeout(install,100);
  setTimeout(install,500);
  setTimeout(install,1200);
})();
