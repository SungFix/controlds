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
  let exitLayer=null;
  let authObserver=null;
  let lastAuthenticated=false;
  let syncQueued=false;
  let exitHookInstalled=false;

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

  function buildExitLayer(){
    if(exitLayer||!document.body) return exitLayer;
    exitLayer=document.createElement("div");
    exitLayer.className="ete-exit-layer";
    exitLayer.hidden=true;
    exitLayer.innerHTML=''
      +'<div class="ete-exit-backdrop" data-exit-close></div>'
      +'<section class="ete-exit-card" role="dialog" aria-modal="true" aria-labelledby="eteExitTitle">'
      +'<div class="ete-exit-head"><div><span class="ete-portal-kicker">Sessão</span><h2 id="eteExitTitle">O que deseja fazer?</h2></div><button type="button" class="ete-exit-close" data-exit-close aria-label="Fechar">×</button></div>'
      +'<div class="ete-exit-options">'
      +'<button type="button" class="ete-exit-option" data-exit-portal><span class="ete-exit-option-icon">←</span><span><strong>Voltar ao portal</strong><small>Escolher outro sistema sem sair da conta</small></span></button>'
      +'<button type="button" class="ete-exit-option danger" data-exit-account><span class="ete-exit-option-icon">↪</span><span><strong>Sair da conta</strong><small>Encerrar sua sessão neste dispositivo</small></span></button>'
      +'</div>'
      +'</section>';

    exitLayer.addEventListener("click",function(event){
      if(event.target.closest("[data-exit-close]")){ closeExitMenu(); return; }
      if(event.target.closest("[data-exit-portal]")){ closeExitMenu(); showPortalHome(); return; }
      if(event.target.closest("[data-exit-account]")){
        closeExitMenu();
        try{
          const result=logoutApp?.();
          if(result&&typeof result.catch==="function") result.catch(function(err){console.error("Falha ao sair:",err);});
        }catch(err){ console.error("Falha ao sair:",err); }
      }
    });

    document.body.appendChild(exitLayer);
    return exitLayer;
  }

  function openExitMenu(){
    if(!isAuthenticated()) return;
    buildExitLayer();
    exitLayer.hidden=false;
    document.body.classList.add("ete-exit-open");
    requestAnimationFrame(function(){exitLayer.querySelector("[data-exit-portal]")?.focus();});
  }

  function closeExitMenu(){
    if(!exitLayer) return;
    exitLayer.hidden=true;
    document.body.classList.remove("ete-exit-open");
  }

  function buildPortal(){
    if(portal||!document.body) return portal;
    portal=document.createElement("section");
    portal.id="eteCentralPortal";
    portal.className="ete-portal";
    portal.hidden=true;
    portal.setAttribute("aria-label","Portal de sistemas");

    const cards=systems.map(function(system,index){
      const availability=index===0?"available":"preparing";
      return '<button class="ete-system-card '+availability+'" type="button" data-system="'+system.id+'">'
        +'<span class="ete-system-card-head"><span class="ete-system-icon" aria-hidden="true">'+system.icon+'</span><span class="ete-system-status">'+system.status+'</span></span>'
        +'<span class="ete-system-copy"><strong>'+system.name+'</strong><p>'+system.description+'</p></span>'
        +'<span class="ete-system-open"><span>'+(index===0?'Acessar sistema':'Ver módulo')+'</span><span aria-hidden="true">→</span></span>'
        +'</button>';
    }).join("");

    portal.innerHTML=''
      +'<div class="ete-portal-shell">'
      +'<header class="ete-portal-topbar">'
      +'<div class="ete-portal-brand"><span class="ete-portal-mark">ETE</span><span><strong>Portal ETE</strong><small>Sistemas internos</small></span></div>'
      +'<div class="ete-portal-actions"><span class="ete-portal-user" id="etePortalUser"></span><button class="ete-portal-theme" type="button" id="etePortalTheme">Tema</button><button class="ete-portal-exit" type="button" id="etePortalExit">Sair</button></div>'
      +'</header>'
      +'<main class="ete-portal-home">'
      +'<div class="ete-portal-hero"><span class="ete-portal-kicker">Central de sistemas</span><h1>Escolha onde deseja entrar.</h1><p>Acesse os sistemas internos da ETE em um só lugar, com as áreas organizadas e separadas para manter o trabalho simples e seguro.</p><div class="ete-portal-points"><span>Conta única</span><span>Sistemas separados</span><span>Pronto para crescer</span></div></div>'
      +'<div class="ete-portal-section-head"><span>Seus sistemas</span><small>'+systems.length+' módulos cadastrados</small></div>'
      +'<div class="ete-portal-grid">'+cards+'</div>'
      +'</main>'
      +'<main class="ete-portal-module">'
      +'<button class="ete-portal-back" type="button" id="etePortalBack">← Voltar ao portal</button>'
      +'<section class="ete-module-panel"><span class="ete-portal-kicker">Módulo separado</span><h1>Atestados</h1><p>Esta área está isolada do Control Ds e pronta para receber as telas e funções próprias do sistema de atestados.</p><div class="ete-module-note">O Control Ds continua preservado. Novos módulos podem ser adicionados sem misturar dados, permissões ou funcionalidades.</div></section>'
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
    portal.querySelector("#etePortalExit")?.addEventListener("click",openExitMenu);

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

  function removeOldPortalButton(){
    document.querySelectorAll(".portal-home-button").forEach(function(button){button.remove();});
  }

  function installExitHook(){
    if(exitHookInstalled) return;
    exitHookInstalled=true;
    document.addEventListener("click",function(event){
      const button=event.target.closest?.("#logoutBtn");
      if(!button||!isAuthenticated()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openExitMenu();
    },true);
    document.addEventListener("keydown",function(event){
      if(event.key==="Escape" && exitLayer && !exitLayer.hidden) closeExitMenu();
    });
  }

  function syncState(){
    syncQueued=false;
    const authenticated=isAuthenticated();
    removeOldPortalButton();
    if(!authenticated){
      if(lastAuthenticated) setSelectedSystem("");
      hidePortal();
      closeExitMenu();
      lastAuthenticated=false;
      return;
    }

    buildPortal();
    refreshUser();

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
    installExitHook();
    syncState();
    authObserver=new MutationObserver(queueSync);
    authObserver.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
    window.addEventListener("pageshow",queueSync);
    window.addEventListener("control-theme-change",refreshUser);
    setTimeout(queueSync,80);
    setTimeout(queueSync,240);
    setTimeout(queueSync,700);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.ETEPortal=Object.freeze({
    open:showPortalHome,
    openSystem:openSystem,
    openExitMenu:openExitMenu,
    systems:systems.map(function(system){return Object.freeze({id:system.id,name:system.name});})
  });
})();
