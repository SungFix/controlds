(function initCentralPortal(){
  "use strict";

  const SESSION_KEY="ete-portal-selected-system";
  const CONTROL_DS_USERS=new Set(["monitor","miguel","klenio","adm","ronaldo"]);
  const systems=[
    {id:"control-ds",name:"Control Ds",description:"Controle de notebooks, pedidos, alunos, permissões e histórico.",icon:"▦",status:"Disponível"},
    {id:"atestados",name:"Atestados",description:"Gestão de faltas justificadas, turmas, indicadores e acompanhamento pelos professores.",icon:"▤",status:"Disponível"}
  ];

  let portal=null,exitLayer=null,exitAnchor=null,authObserver=null,lastAuthenticated=false,syncQueued=false,exitHookInstalled=false;

  function ensureExitDropdownStyles(){
    let link=document.getElementById("etePortalExitDropdownStyles");
    if(link)return;
    link=document.createElement("link");
    link.id="etePortalExitDropdownStyles";
    link.rel="stylesheet";
    link.href="portal-exit-dropdown.css?v=3";
    document.head.appendChild(link);
  }

  function ensureAccessStyles(){
    if(document.getElementById("etePortalAccessStyles"))return;
    const style=document.createElement("style");
    style.id="etePortalAccessStyles";
    style.textContent=`
      .ete-system-card.locked,
      .ete-system-card:disabled{
        cursor:not-allowed!important;
        opacity:.62;
        filter:saturate(.58);
      }
      .ete-system-card.locked:before{background:linear-gradient(90deg,#a9666d,transparent 72%)!important}
      .ete-system-card.locked .ete-system-status:before{background:#a9666d!important}
      .ete-system-card.locked:hover,
      .ete-system-card:disabled:hover{
        transform:none!important;
        border-color:#343a42!important;
        background:#111419!important;
        box-shadow:0 16px 36px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.025)!important;
      }
      .ete-system-card.locked .ete-system-open{color:#8d969f}
      .ete-system-card.locked .ete-system-open span:last-child{font-size:14px;color:#aeb6be}
      html[data-theme="light"] .ete-system-card.locked:hover,
      html[data-theme="light"] .ete-system-card:disabled:hover{background:#fff!important;border-color:#d6e0e6!important}
    `;
    document.head.appendChild(style);
  }

  function asset(tag,id,attrs){
    let el=document.getElementById(id);
    if(!el){
      el=document.createElement(tag);
      el.id=id;
      Object.assign(el,attrs);
      document.head.appendChild(el);
    }else Object.assign(el,attrs);
    return el;
  }

  function ensureAtestadosAssets(callback){
    asset("link","eteAtestadosStyles",{rel:"stylesheet",href:"atestados.css?v=6"});
    asset("link","eteAtestadosRoomStyles",{rel:"stylesheet",href:"atestados-room-picker.css?v=6"});
    asset("link","eteAtestadosControlLayoutStyles",{rel:"stylesheet",href:"atestados-control-layout.css?v=3"});
    asset("link","eteAtestadosMinimalStyles",{rel:"stylesheet",href:"atestados-minimal.css?v=4"});
    asset("link","eteAtestadosFigmaStyles",{rel:"stylesheet",href:"atestados-figma-features.css?v=5"});
    asset("link","eteAtestadosTimePickerStyles",{rel:"stylesheet",href:"atestados-time-picker.css?v=2"});
    asset("link","eteAtestadosDatePickerStyles",{rel:"stylesheet",href:"atestados-date-picker.css?v=2"});
    asset("script","eteAtestadosRoomScript",{src:"atestados-room-picker.js?v=9",defer:true});
    asset("script","eteAtestadosTimePickerScript",{src:"atestados-time-picker.js?v=3",defer:true});
    asset("script","eteAtestadosDatePickerScript",{src:"atestados-date-picker.js?v=1",defer:true});
    asset("script","eteAtestadosStudentFlowScript",{src:"atestados-student-flow.js?v=1",defer:true});
    if(window.ETEAtestados){callback?.();return;}
    let script=document.getElementById("eteAtestadosScript");
    if(!script){
      script=document.createElement("script");
      script.id="eteAtestadosScript";
      script.src="atestados.js?v=8";
      script.defer=true;
      script.addEventListener("load",function(){callback?.();},{once:true});
      document.head.appendChild(script);
      return;
    }
    script.addEventListener("load",function(){callback?.();},{once:true});
  }

  function getUser(){
    try{if(typeof currentUser!=="undefined"&&currentUser)return currentUser;}catch(_){}
    return null;
  }

  function getUsername(){
    const user=getUser();
    return String(user?.username||"").trim().toLowerCase();
  }

  function isAuthenticated(){
    return !!getUser()&&!document.documentElement.classList.contains("auth-locked");
  }

  function canAccessControlDs(){
    return isAuthenticated()&&CONTROL_DS_USERS.has(getUsername());
  }

  function canAccessSystem(systemId){
    return systemId!=="control-ds"||canAccessControlDs();
  }

  function userLabel(){
    const user=getUser();
    if(!user)return"Usuário";
    const name=String(user.displayName||user.username||"Usuário");
    const role=String(user.roleLabel||user.role||"");
    return role?name+" · "+role:name;
  }

  function selectedSystem(){
    try{return sessionStorage.getItem(SESSION_KEY)||"";}catch(_){return"";}
  }

  function setSelectedSystem(value){
    try{
      if(value)sessionStorage.setItem(SESSION_KEY,value);
      else sessionStorage.removeItem(SESSION_KEY);
    }catch(_){}
  }

  function systemCardMarkup(system){
    const allowed=canAccessSystem(system.id);
    const stateClass=allowed?"available":"locked";
    const status=allowed?system.status:"Bloqueado";
    const action=allowed?"Acessar sistema":"Acesso bloqueado";
    const actionIcon=allowed?"→":"🔒";
    const disabled=allowed?"":" disabled aria-disabled=\"true\" title=\"Acesso não liberado para esta conta\"";
    return '<button class="ete-system-card '+stateClass+'" type="button" data-system="'+system.id+'"'+disabled+'><span class="ete-system-card-head"><span class="ete-system-icon">'+system.icon+'</span><span class="ete-system-status">'+status+'</span></span><span class="ete-system-copy"><strong>'+system.name+'</strong><p>'+system.description+'</p></span><span class="ete-system-open"><span>'+action+'</span><span>'+actionIcon+'</span></span></button>';
  }

  function refreshSystemCards(){
    if(!portal)return;
    const grid=portal.querySelector(".ete-portal-grid");
    if(grid)grid.innerHTML=systems.map(systemCardMarkup).join("");
  }

  function buildExitLayer(){
    if(exitLayer||!document.body)return exitLayer;
    exitLayer=document.createElement("div");
    exitLayer.className="ete-exit-layer";
    exitLayer.hidden=true;
    exitLayer.innerHTML='<section class="ete-exit-card" role="menu" aria-label="Opções de saída"><div class="ete-exit-head"><div><span class="ete-portal-kicker">Sessão</span><h2>O que deseja fazer?</h2></div></div><div class="ete-exit-options"><button type="button" class="ete-exit-option" role="menuitem" data-exit-portal><span><strong>Voltar ao portal</strong><small>Escolher outro sistema sem sair da conta</small></span></button><button type="button" class="ete-exit-option danger" role="menuitem" data-exit-account><span><strong>Sair da conta</strong><small>Encerrar sua sessão neste dispositivo</small></span></button></div></section>';
    exitLayer.addEventListener("click",function(event){
      event.stopPropagation();
      if(event.target.closest("[data-exit-portal]")){closeExitMenu();showPortalHome();return;}
      if(event.target.closest("[data-exit-account]")){
        closeExitMenu();
        try{
          const result=logoutApp?.();
          if(result&&typeof result.catch==="function")result.catch(err=>console.error("Falha ao sair:",err));
        }catch(err){console.error("Falha ao sair:",err);}
      }
    });
    document.body.appendChild(exitLayer);
    return exitLayer;
  }

  function positionExitMenu(anchor){
    if(!exitLayer||exitLayer.hidden||!anchor)return;
    const card=exitLayer.querySelector(".ete-exit-card");
    if(!card)return;
    const rect=anchor.getBoundingClientRect();
    const margin=8;
    const viewportW=document.documentElement.clientWidth;
    const viewportH=document.documentElement.clientHeight;
    const cardW=Math.min(320,viewportW-20);
    card.style.width=cardW+"px";
    card.style.left=Math.min(viewportW-cardW-10,Math.max(10,rect.right-cardW))+"px";
    const cardH=card.offsetHeight||210;
    let top=rect.bottom+margin;
    if(top+cardH>viewportH-10)top=Math.max(10,rect.top-cardH-margin);
    card.style.top=top+"px";
  }

  function openExitMenu(anchor){
    if(!isAuthenticated())return;
    ensureExitDropdownStyles();
    buildExitLayer();
    exitAnchor=anchor||document.querySelector("#etePortalExit")||document.querySelector("#logoutBtn");
    exitLayer.hidden=false;
    document.body.classList.add("ete-exit-open");
    if(exitAnchor)exitAnchor.setAttribute("aria-expanded","true");
    requestAnimationFrame(()=>positionExitMenu(exitAnchor));
  }

  function closeExitMenu(){
    if(!exitLayer)return;
    exitLayer.hidden=true;
    document.body.classList.remove("ete-exit-open");
    if(exitAnchor)exitAnchor.setAttribute("aria-expanded","false");
    exitAnchor=null;
  }

  function buildPortal(){
    if(portal||!document.body)return portal;
    ensureAccessStyles();
    portal=document.createElement("section");
    portal.id="eteCentralPortal";
    portal.className="ete-portal";
    portal.hidden=true;
    portal.setAttribute("aria-label","Portal de sistemas");
    portal.innerHTML='<div class="ete-portal-shell"><header class="ete-portal-topbar"><div class="ete-portal-brand"><span class="ete-portal-mark">ETE</span><span><strong>Portal ETE</strong><small>Sistemas internos</small></span></div><div class="ete-portal-actions"><span class="ete-portal-user" id="etePortalUser"></span><button class="ete-portal-theme" type="button" id="etePortalTheme">Tema</button><button class="ete-portal-exit" type="button" id="etePortalExit">Sair</button></div></header><main class="ete-portal-home"><div class="ete-portal-hero"><span class="ete-portal-kicker">Central de sistemas</span><h1>Escolha onde deseja entrar.</h1><p>Acesse os sistemas internos da ETE em um só lugar.</p></div><div class="ete-portal-section-head"><span>Seus sistemas</span><small>'+systems.length+' módulos cadastrados</small></div><div class="ete-portal-grid"></div></main><main class="ete-portal-module"><button class="ete-portal-back" type="button" id="etePortalBack">← Voltar ao portal</button><div id="eteAtestadosRoot"></div></main></div>';
    portal.addEventListener("click",event=>{
      const card=event.target.closest("[data-system]");
      if(card&&!card.disabled)openSystem(card.dataset.system);
    });
    portal.querySelector("#etePortalBack")?.addEventListener("click",showPortalHome);
    portal.querySelector("#etePortalTheme")?.addEventListener("click",()=>{try{window.ControlTheme?.toggle();}catch(_){}});
    portal.querySelector("#etePortalExit")?.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      openExitMenu(event.currentTarget);
    });
    document.body.appendChild(portal);
    refreshSystemCards();
    return portal;
  }

  function refreshUser(){
    if(!portal)return;
    const node=portal.querySelector("#etePortalUser");
    if(node)node.textContent=userLabel();
    refreshSystemCards();
  }

  function stopAtestados(){
    try{window.ETEAtestados?.unmount();}catch(_){}
  }

  function showPortalHome(){
    if(!isAuthenticated())return;
    closeExitMenu();
    stopAtestados();
    buildPortal();
    portal.classList.remove("module-open");
    refreshUser();
    portal.hidden=false;
    document.body.classList.add("portal-open");
    setSelectedSystem("");
  }

  function hidePortal(){
    if(!portal)return;
    closeExitMenu();
    stopAtestados();
    portal.hidden=true;
    portal.classList.remove("module-open");
    document.body.classList.remove("portal-open");
  }

  function openSystem(systemId){
    if(systemId==="control-ds"){
      if(!canAccessControlDs()){
        setSelectedSystem("");
        showPortalHome();
        return;
      }
      setSelectedSystem("control-ds");
      hidePortal();
      return;
    }
    if(systemId==="atestados"){
      setSelectedSystem("atestados");
      buildPortal();
      portal.classList.add("module-open");
      refreshUser();
      portal.hidden=false;
      document.body.classList.add("portal-open");
      ensureAtestadosAssets(()=>window.ETEAtestados?.mount("#eteAtestadosRoot"));
    }
  }

  function removeOldPortalButton(){
    document.querySelectorAll(".portal-home-button").forEach(button=>button.remove());
  }

  function installExitHook(){
    if(exitHookInstalled)return;
    exitHookInstalled=true;
    document.addEventListener("click",function(event){
      const button=event.target.closest?.("#logoutBtn");
      if(button&&isAuthenticated()){
        event.preventDefault();
        event.stopImmediatePropagation();
        openExitMenu(button);
        return;
      }
      if(exitLayer&&!exitLayer.hidden&&!event.target.closest?.(".ete-exit-card")&&!event.target.closest?.("#etePortalExit"))closeExitMenu();
    },true);
    document.addEventListener("keydown",event=>{if(event.key==="Escape")closeExitMenu();});
    window.addEventListener("resize",()=>{if(exitLayer&&!exitLayer.hidden)positionExitMenu(exitAnchor);});
  }

  function syncState(){
    syncQueued=false;
    const authenticated=isAuthenticated();
    removeOldPortalButton();
    if(!authenticated){
      if(lastAuthenticated)setSelectedSystem("");
      hidePortal();
      closeExitMenu();
      lastAuthenticated=false;
      return;
    }

    buildPortal();
    refreshUser();

    if(!lastAuthenticated){
      const selected=selectedSystem();
      if(selected==="control-ds"){
        if(canAccessControlDs())hidePortal();
        else showPortalHome();
      }else if(selected==="atestados")openSystem("atestados");
      else showPortalHome();
    }else if(selectedSystem()==="control-ds"&&!canAccessControlDs()){
      showPortalHome();
    }

    lastAuthenticated=true;
  }

  function queueSync(){
    if(syncQueued)return;
    syncQueued=true;
    requestAnimationFrame(syncState);
  }

  function start(){
    ensureExitDropdownStyles();
    ensureAccessStyles();
    installExitHook();
    syncState();
    authObserver=new MutationObserver(queueSync);
    authObserver.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
    window.addEventListener("pageshow",queueSync);
    setTimeout(queueSync,80);
    setTimeout(queueSync,240);
    setTimeout(queueSync,700);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.ETEPortal=Object.freeze({
    open:showPortalHome,
    openSystem,
    openExitMenu,
    canAccessControlDs,
    systems:systems.map(system=>Object.freeze({id:system.id,name:system.name}))
  });
})();
