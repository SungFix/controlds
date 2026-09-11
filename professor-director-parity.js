(function(){
  "use strict";

  const managementRoles=["adm","diretor","professor"];
  const requestCreatorUsernames=new Set(["adm","miguel","klenio","ronaldo"]);

  function ensureCapabilitiesRuntime(){
    if(document.getElementById("eteUserCapabilitiesScript")||window.ETEPermissions)return;
    const script=document.createElement("script");
    script.id="eteUserCapabilitiesScript";
    script.src="user-capabilities.js?v=1";
    script.async=false;
    script.addEventListener("load",install,{once:true});
    document.head.appendChild(script);
  }

  function getCurrentRole(){
    try{
      if(typeof currentUser!=="undefined" && currentUser) return String(currentUser.role||"").toLowerCase();
    }catch(_){}
    return "";
  }

  function getCurrentUsername(){
    try{
      if(typeof currentUser!=="undefined" && currentUser) return String(currentUser.username||"").trim().toLowerCase();
    }catch(_){}
    return "";
  }

  function capability(key,fallback){
    try{if(window.ETEPermissions)return !!window.ETEPermissions.can(key);}catch(_){}
    return !!fallback;
  }

  function hasManagementLevel(){
    return managementRoles.includes(getCurrentRole());
  }

  function canCreateRequestForApprovedAccount(){
    return capability("can_create_requests",requestCreatorUsernames.has(getCurrentUsername()));
  }

  function canManageStudentsByCapability(){
    return capability("can_manage_students",hasManagementLevel());
  }

  function canManagePermissionsByCapability(){
    return capability("can_manage_permissions",hasManagementLevel());
  }

  function canClearHistoryByCapability(){
    return capability("can_clear_history",hasManagementLevel());
  }

  function canPickupWithProfessor(){
    return capability("can_pickup_notebooks",["adm","professor","monitor"].includes(getCurrentRole()));
  }

  function canReturnByCapability(){
    return capability("can_return_notebooks",!!getCurrentUsername());
  }

  function canConfirmExitByCapability(){
    return capability("can_confirm_exits",!!getCurrentUsername());
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
    ensureCapabilitiesRuntime();
    try{ canCreateRequest=canCreateRequestForApprovedAccount; }catch(_){}
    try{ canManageStudents=canManageStudentsByCapability; }catch(_){}
    try{ canCreatePermission=canManagePermissionsByCapability; }catch(_){}
    try{ canClearHistory=canClearHistoryByCapability; }catch(_){}
    try{ canPickup=canPickupWithProfessor; }catch(_){}
    try{ canReturn=canReturnByCapability; }catch(_){}
    try{ canConfirmExit=canConfirmExitByCapability; }catch(_){}
    try{ canDeleteRequest=canDeleteRequestWithProfessor; }catch(_){}

    try{
      if(typeof applyRoleUI==="function") applyRoleUI();
      if(typeof render==="function") render();
    }catch(_){}
  }

  window.addEventListener("ete-capabilities-change",install);
  install();
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",install,{once:true});
  }
  window.addEventListener("load",install,{once:true});
  setTimeout(install,100);
  setTimeout(install,500);
  setTimeout(install,1200);
})();
