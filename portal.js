(function initCentralPortal(){
  "use strict";

  const SESSION_KEY="ete-portal-selected-system";
  const systems=[
    {
      id:"control-ds",
      name:"Control Ds",
      description:"Controle de notebooks, pedidos, alunos, permissões e histórico.",
      icon:"▦",
      status:"Disponível"
    },
    {
      id:"atestados",
      name:"Atestados",
      description:"Área separada para o futuro sistema de atestados.",
      icon:"▤",
      status:"Em preparação"
    }
  ];

  let portal=null;
  let authObserver=null;
  let lastAuthenticated=false;
  let syncQueued=false;

  function getUser(){
    try{
      if(typeof currentUser!=="undefined" && currentUser) return currentUser;
    }catch(_){}
    return null;
  }

  function isAuthenticated(){
    return !!getUser() && !document.documentElement.classList.contains("auth-locked");
  }

  function userLabel(){
    const user=getUser();
    if(!user) return "Usuário";
    const name=String(user.displayName||user.username||"Usuário");
    const role=String(user.roleLabel||user.role||"");
    return role?name+" · "+role:name;
  }

  function selectedSystem(){
    try{return sessionStorage.getItem(SESSION_KEY)||"";}catch(_){return "";}
  }

  function setSelectedSystem(value){
    try{
      if(value) sessionStorage.setItem(SESSION_KEY,value);
      else sessionStorage.removeItem(SESSION_KEY);
    }catch(_){}
  }

  function buildPortal(){
    if(portal||!document.body) return portal;
    portal=document.createElement("section");
    portal.id="eteCentralPortal";
    portal.className="ete-portal";
    portal.hidden=true;
    portal.setAttribute("aria-label","Portal de sistemas");

    const cards=systems.map(function(system){
      return '<button class="ete-system-card" type="button" data-system="'+system.id+'">'
        +'<span class="ete-system-card-head"><span class="ete-system-icon" aria-hidden="true">'+system.icon+'</span><span class="ete-system-status">'+system.status+'</span></span>'
        +'<span><strong>'+system.name+'</strong><p>'+system.description+'</p></span>'
        +'<span class="ete-system-open"><span>Acessar sistema</span><span aria-hidden="true">→</span></span>'
        +'</button>';
    }).join("");

    portal.innerHTML=''
      +'<div class="ete-portal-shell">'
      +'<header class="ete-portal-topbar">'
      +'<div class="ete-portal-brand"><span class="ete-portal-mark">ETE</span><span><strong>Portal ETE</strong><small>Sistemas internos</small></span></div>'
      +'<div class="ete-portal-actions"><span class="ete-portal-user" id="etePortalUser"></span><button class="ete-portal-theme" type="button" id="etePortalTheme">Tema</button></div>'
      +'</header>'
      +'<main class="ete-portal-home">'
      +'<div class="ete-portal-hero"><span class="ete-portal-kicker">Central de sistemas</span><h1>Escolha onde deseja entrar.</h1><p>Todos os sistemas ficam organizados no mesmo portal, mantendo suas áreas e funções separadas.</p></div>'
      +'<div class="ete-portal-grid">'+cards+'</div>'
      +'</main>'
      +'<main class="ete-portal-module">'
      +'<button class="ete-portal-back" type="button" id="etePortalBack">← Voltar ao portal</button>'
      +'<section class="ete-module-panel"><span class="ete-portal-kicker">Módulo separado</span><h1>Atestados</h1><p>Esta área já está isolada do Control Ds e pronta para receber as telas e funções do sistema de atestados.</p><div class="ete-module-note">Nenhuma função do Control Ds foi movida ou alterada. O módulo de Atestados será desenvolvido aqui sem misturar dados ou ações entre os sistemas.</div></section>'
      +'</main>'
      +'</div>';

    portal.addEventListener("click",function(event){
      const card=event.target.closest("[data-system]");
      if(card) openSystem(card.dataset.system);
    });

    portal.querySelector("#etePortalBack")?.addEventListener("click",showPortalHome);
    portal.querySelector("#etePortalTheme")?.addEventListener("click",function(){
      try{window.ControlTheme?.toggle();}catch(_){}
    });

    document.body.appendChild(portal);
    return portal;
  }

  function refreshUser(){
    if(!portal) return;
    const node=portal.querySelector("#etePortalUser");
    if(node) node.textContent=userLabel();
  }

  function showPortalHome(){
    if(!isAuthenticated()) return;
    buildPortal();
    portal.classList.remove("module-open");
    refreshUser();
    portal.hidden=false;
    document.body.classList.add("portal-open");
    setSelectedSystem("");
  }

  function hidePortal(){
    if(!portal) return;
    portal.hidden=true;
    portal.classList.remove("module-open");
    document.body.classList.remove("portal-open");
  }

  function openSystem(systemId){
    if(systemId==="control-ds"){
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
    }
  }

  function mountPortalButton(){
    if(!isAuthenticated()) return;
    const header=document.querySelector(".topbar-right, .top-right");
    if(!header||header.querySelector(".portal-home-button")) return;
    const button=document.createElement("button");
    button.type="button";
    button.className="portal-home-button";
    button.innerHTML='<span aria-hidden="true">⌂</span><span class="portal-home-label">Portal</span>';
    button.setAttribute("aria-label","Voltar ao portal de sistemas");
    button.addEventListener("click",function(event){event.preventDefault();showPortalHome();});
    header.insertBefore(button,header.firstChild);
  }

  function syncState(){
    syncQueued=false;
    const authenticated=isAuthenticated();
    if(!authenticated){
      if(lastAuthenticated) setSelectedSystem("");
      hidePortal();
      lastAuthenticated=false;
      return;
    }

    buildPortal();
    refreshUser();
    mountPortalButton();

    if(!lastAuthenticated){
      const selected=selectedSystem();
      if(selected==="control-ds") hidePortal();
      else if(selected==="atestados") openSystem("atestados");
      else showPortalHome();
    }
    lastAuthenticated=true;
  }

  function queueSync(){
    if(syncQueued) return;
    syncQueued=true;
    requestAnimationFrame(syncState);
  }

  function start(){
    syncState();
    authObserver=new MutationObserver(queueSync);
    authObserver.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
    window.addEventListener("pageshow",queueSync);
    window.addEventListener("control-theme-change",refreshUser);

    // Pequenas tentativas cobrem a conclusão assíncrona do login sem observar toda a página.
    setTimeout(queueSync,80);
    setTimeout(queueSync,240);
    setTimeout(queueSync,700);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.ETEPortal=Object.freeze({
    open:showPortalHome,
    openSystem:openSystem,
    systems:systems.map(function(system){return Object.freeze({id:system.id,name:system.name});})
  });
})();
