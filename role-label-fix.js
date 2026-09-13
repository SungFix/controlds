(function(){
  "use strict";

  const employeeUsers=new Set(["paulo","carlinhos"]);
  let wrappedSetCurrentUser=false;

  function normalizedRoleLabel(role){
    const value=String(role||"").toLowerCase();
    if(value==="adm")return"Administrador";
    if(value==="diretor")return"Diretor";
    if(value==="vice_diretor"||value==="vice-diretor")return"Vice-Diretor";
    if(value==="professor")return"Professor";
    if(value==="monitor")return"Monitor";
    return String(role||"Usuário");
  }

  function normalizeUser(user){
    if(!user)return user;
    const username=String(user.username||"").toLowerCase();
    if(employeeUsers.has(username))user.roleLabel="Funcionário";
    else user.roleLabel=normalizedRoleLabel(user.role);
    return user;
  }

  function applyCurrent(){
    try{
      if(typeof currentUser==="undefined"||!currentUser)return;
      normalizeUser(currentUser);
      const headerRole=document.querySelector("#headerUserRole");
      if(headerRole)headerRole.textContent=currentUser.roleLabel;
    }catch(_){}
  }

  function install(){
    try{
      if(typeof ROLE_MAP!=="undefined"&&ROLE_MAP.ronaldo){
        ROLE_MAP.ronaldo.role="professor";
        ROLE_MAP.ronaldo.roleLabel="Professor";
        ROLE_MAP.ronaldo.displayName="Ronaldo";
      }
    }catch(_){}

    try{if(typeof v46RoleLabel==="function")v46RoleLabel=normalizedRoleLabel;}catch(_){}

    try{
      if(!wrappedSetCurrentUser&&typeof setCurrentUser==="function"){
        const base=setCurrentUser;
        setCurrentUser=function(user){return base(normalizeUser(user));};
        setCurrentUser.__roleLabelFix=true;
        wrappedSetCurrentUser=true;
      }
    }catch(_){}

    applyCurrent();
    return wrappedSetCurrentUser;
  }

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{tries++;if(install()||tries>=100)clearInterval(timer);},50);
  }
  document.addEventListener("DOMContentLoaded",install,{once:true});
  window.addEventListener("pageshow",install);
})();
