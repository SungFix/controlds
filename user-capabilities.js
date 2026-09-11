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

  const PORTAL_SESSION_KEY="ete-portal-selected-system";
  const CONTROL_DS_USERS=new Set(["monitor","miguel","klenio","adm","ronaldo"]);
  const REQUEST_CREATORS=new Set(["adm","miguel","klenio","ronaldo"]);
  const MANAGEMENT_ROLES=new Set(["adm","diretor","professor"]);
  const PICKUP_ROLES=new Set(["adm","professor","monitor"]);

  let state=null;
  let stateUserId="";
  let channel=null;
  let refreshPromise=null;
  let syncQueued=false;
  let domObserver=null;

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

  function selectedSystem(){
    try{return sessionStorage.getItem(PORTAL_SESSION_KEY)||"";}catch(_){return"";}
  }

  function setSelectedSystem(value){
    try{
      if(value)sessionStorage.setItem(PORTAL_SESSION_KEY,value);
      else sessionStorage.removeItem(PORTAL_SESSION_KEY);
    }catch(_){}
  }

  function emit(){
    try{window.dispatchEvent(new CustomEvent("ete-capabilities-change",{detail:snapshot()}));}catch(_){}
    queueDomSync();
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

  function stopControlDsRealtime(){
    try{
      if(typeof v46Channels!=="undefined"&&Array.isArray(v46Channels)&&typeof sb!=="undefined"&&sb){
        for(const item of v46Channels){try{sb.removeChannel(item);}catch(_){}}
        v46Channels=[];
      }
    }catch(_){}
  }

  function clearControlDsData(){
    stopControlDsRealtime();
    try{if(typeof data!=="undefined")data=[];}catch(_){}
    try{if(typeof students!=="undefined")students=[];}catch(_){}
    try{if(typeof permissions!=="undefined")permissions=[];}catch(_){}
    try{if(typeof history!=="undefined")history=[];}catch(_){}
    try{if(typeof deletedRequestIds!=="undefined")deletedRequestIds=[];}catch(_){}
    try{if(typeof render==="function")render();}catch(_){}
  }

  function prepareControlDsData(){
    try{
      if(typeof v46LoadData==="function"){
        const result=v46LoadData(true);
        if(result&&typeof result.then==="function")result.then(()=>{try{if(typeof v46Subscribe==="function")v46Subscribe();}catch(_){}}).catch(()=>{});
      }
    }catch(_){}
  }

  function capabilityForSystem(systemId){
    return systemId==="control-ds"?"control_ds_access":systemId==="atestados"?"atestados_access":"";
  }

  function updateCard(card){
    const systemId=String(card?.dataset?.system||"");
    const key=capabilityForSystem(systemId);
    if(!key)return;
    const allowed=can(key);
    card.disabled=!allowed;
    card.classList.toggle("locked",!allowed);
    card.classList.toggle("available",allowed);
    card.setAttribute("aria-disabled",allowed?"false":"true");
    if(allowed)card.removeAttribute("title");
    else card.title="Acesso não liberado para esta conta";
    const status=card.querySelector(".ete-system-status");
    if(status)status.textContent=allowed?"Disponível":"Bloqueado";
    const open=card.querySelector(".ete-system-open");
    if(open){
      const parts=open.querySelectorAll("span");
      if(parts[0])parts[0].textContent=allowed?"Acessar sistema":"Acesso bloqueado";
      if(parts[1])parts[1].textContent=allowed?"→":"🔒";
    }
  }

  function applyPortalCards(){
    document.querySelectorAll("#eteCentralPortal [data-system]").forEach(updateCard);
  }

  function enforceCurrentModule(){
    if(!state||!stateUserId)return;
    const selected=selectedSystem();
    if(selected==="control-ds"&&!can("control_ds_access")){
      clearControlDsData();
      setSelectedSystem("");
      try{window.ETEPortal?.open();}catch(_){}
      return;
    }
    if(selected==="atestados"&&!can("atestados_access")){
      setSelectedSystem("");
      try{window.ETEPortal?.open();}catch(_){}
    }
  }

  function queueDomSync(){
    if(syncQueued)return;
    syncQueued=true;
    requestAnimationFrame(()=>{
      syncQueued=false;
      applyPortalCards();
      enforceCurrentModule();
    });
  }

  function openControlDsFromCapability(){
    const portal=document.getElementById("eteCentralPortal");
    if(!portal||!can("control_ds_access"))return;
    setSelectedSystem("control-ds");
    try{window.ETEAtestados?.unmount();}catch(_){}
    portal.hidden=true;
    portal.classList.remove("module-open");
    document.body.classList.remove("portal-open");
    prepareControlDsData();
  }

  function handlePortalClick(event){
    const card=event.target?.closest?.("#eteCentralPortal [data-system]");
    if(!card)return;
    const systemId=String(card.dataset.system||"");
    const key=capabilityForSystem(systemId);
    if(!key)return;
    const allowed=can(key);
    if(!allowed){
      event.preventDefault();
      event.stopImmediatePropagation();
      updateCard(card);
      return;
    }

    // The original portal kept a legacy username allowlist for Control Ds.
    // When the database grants access to another account, enter directly here
    // so the Supabase capability becomes the source of truth.
    if(systemId==="control-ds"&&!CONTROL_DS_USERS.has(String(getCurrentUser()?.username||"").trim().toLowerCase())){
      event.preventDefault();
      event.stopImmediatePropagation();
      openControlDsFromCapability();
    }
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

  function queueAuthSync(){
    requestAnimationFrame(()=>{
      const user=getCurrentUser();
      const locked=document.documentElement.classList.contains("auth-locked");
      if(!user||locked){clear();return;}
      const uid=authUserId();
      if(uid&&uid!==stateUserId)refresh(true).catch(()=>{});
      else if(uid&&!state)refresh(false).catch(()=>{});
      else queueDomSync();
    });
  }

  window.ETEPermissions=Object.freeze({
    keys:KEYS,
    can,
    get:snapshot,
    ready:()=>!!state&&!!stateUserId,
    refresh:()=>refresh(true)
  });

  document.addEventListener("click",handlePortalClick,true);

  function observePortalDom(){
    if(!document.body||domObserver)return;
    domObserver=new MutationObserver(queueDomSync);
    domObserver.observe(document.body,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","hidden"]
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{
    queueAuthSync();
    observePortalDom();
  },{once:true});
  else{
    queueAuthSync();
    observePortalDom();
  }

  const authObserver=new MutationObserver(queueAuthSync);
  authObserver.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
  window.addEventListener("pageshow",queueAuthSync);
  window.addEventListener("ete-capabilities-change",queueDomSync);
  setTimeout(queueAuthSync,100);
  setTimeout(queueAuthSync,500);
  setTimeout(queueAuthSync,1200);
})();
