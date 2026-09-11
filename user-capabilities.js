(function initUserCapabilities(){
  "use strict";

  const KEYS=Object.freeze([
    "control_ds_access",
    "atestados_access",
    "can_create_requests",
    "can_manage_students",
    "can_manage_permissions",
    "can_confirm_exits",
    "can_pickup_notebooks",
    "can_return_notebooks",
    "can_clear_history"
  ]);

  const CONTROL_DS_USERS=new Set(["monitor","miguel","klenio","adm","ronaldo"]);
  const REQUEST_CREATORS=new Set(["adm","miguel","klenio","ronaldo"]);
  const MANAGEMENT_ROLES=new Set(["adm","diretor","professor"]);
  const PICKUP_ROLES=new Set(["adm","professor","monitor"]);

  let state=null;
  let stateUserId="";
  let channel=null;
  let refreshPromise=null;
  let syncQueued=false;

  function getCurrentUser(){
    try{if(typeof currentUser!=="undefined"&&currentUser)return currentUser;}catch(_){}
    return null;
  }

  function getClient(){
    try{
      if(typeof initSupabase==="function")return initSupabase();
      if(typeof sb!=="undefined"&&sb)return sb;
    }catch(_){}
    return null;
  }

  function authUserId(){
    const user=getCurrentUser();
    const fromProfile=String(user?.userId||user?.user_id||"");
    if(fromProfile)return fromProfile;
    try{return String(typeof v46AuthUser!=="undefined"&&v46AuthUser?.id?v46AuthUser.id:"");}catch(_){}
    return "";
  }

  function fallback(key){
    const user=getCurrentUser();
    if(!user)return false;
    const username=String(user.username||"").trim().toLowerCase();
    const role=String(user.role||"").trim().toLowerCase();
    switch(key){
      case "control_ds_access": return CONTROL_DS_USERS.has(username);
      case "atestados_access": return true;
      case "can_create_requests": return REQUEST_CREATORS.has(username);
      case "can_manage_students": return MANAGEMENT_ROLES.has(role);
      case "can_manage_permissions": return MANAGEMENT_ROLES.has(role);
      case "can_confirm_exits": return true;
      case "can_pickup_notebooks": return PICKUP_ROLES.has(role);
      case "can_return_notebooks": return true;
      case "can_clear_history": return MANAGEMENT_ROLES.has(role);
      default: return false;
    }
  }

  function can(key){
    if(!KEYS.includes(key))return false;
    const uid=authUserId();
    if(uid&&state&&stateUserId===uid&&Object.prototype.hasOwnProperty.call(state,key))return !!state[key];
    return fallback(key);
  }

  function snapshot(){
    const result={ready:!!state&&!!stateUserId,user_id:stateUserId};
    for(const key of KEYS)result[key]=can(key);
    return Object.freeze(result);
  }

  function emit(){
    try{window.dispatchEvent(new CustomEvent("ete-capabilities-change",{detail:snapshot()}));}catch(_){}
  }

  function stopChannel(){
    const client=getClient();
    if(channel&&client){try{client.removeChannel(channel);}catch(_){}}
    channel=null;
  }

  function subscribe(uid){
    const client=getClient();
    if(!client||!uid)return;
    stopChannel();
    try{
      channel=client
        .channel("ete-user-capabilities-"+uid)
        .on("postgres_changes",{
          event:"*",
          schema:"public",
          table:"ete_user_capabilities",
          filter:"user_id=eq."+uid
        },()=>{refresh(true).catch(()=>{});})
        .subscribe();
    }catch(_){channel=null;}
  }

  function clear(){
    const hadState=!!state||!!stateUserId;
    state=null;
    stateUserId="";
    stopChannel();
    if(hadState)emit();
  }

  async function refresh(force){
    if(refreshPromise&&!force)return refreshPromise;
    const uid=authUserId();
    const client=getClient();
    if(!uid||!client){clear();return null;}

    refreshPromise=(async()=>{
      const {data,error}=await client
        .from("ete_user_capabilities")
        .select("user_id,control_ds_access,atestados_access,can_create_requests,can_manage_students,can_manage_permissions,can_confirm_exits,can_pickup_notebooks,can_return_notebooks,can_clear_history,updated_at")
        .eq("user_id",uid)
        .maybeSingle();

      if(error){
        console.warn("Falha ao carregar permissões do usuário:",error.message||error);
        return null;
      }

      const changedUser=stateUserId!==uid;
      state=data||null;
      stateUserId=uid;
      if(changedUser)subscribe(uid);
      emit();
      return snapshot();
    })();

    try{return await refreshPromise;}
    finally{refreshPromise=null;}
  }

  function queueSync(){
    if(syncQueued)return;
    syncQueued=true;
    requestAnimationFrame(()=>{
      syncQueued=false;
      const user=getCurrentUser();
      const locked=document.documentElement.classList.contains("auth-locked");
      if(!user||locked){clear();return;}
      const uid=authUserId();
      if(uid&&uid!==stateUserId)refresh(true).catch(()=>{});
      else if(uid&&!state)refresh(false).catch(()=>{});
    });
  }

  window.ETEPermissions=Object.freeze({
    keys:KEYS,
    can,
    get:snapshot,
    ready:()=>!!state&&!!stateUserId,
    refresh:()=>refresh(true)
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",queueSync,{once:true});
  else queueSync();

  const observer=new MutationObserver(queueSync);
  observer.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
  window.addEventListener("pageshow",queueSync);
  setTimeout(queueSync,100);
  setTimeout(queueSync,500);
  setTimeout(queueSync,1200);
})();
