(function initCentralPortal(){
  "use strict";

  const SESSION_KEY="ete-portal-selected-system";
  const systems=[
    {id:"control-ds",name:"Control Ds",description:"Controle de notebooks, pedidos, alunos, permissões e histórico.",icon:"▦",status:"Disponível"},
    {id:"atestados",name:"Atestados",description:"Gestão de faltas justificadas, turmas, indicadores e acompanhamento pelos professores.",icon:"▤",status:"Disponível"}
  ];

  let portal=null;
  let exitLayer=null;
  let exitAnchor=null;
  let authObserver=null;
  let lastAuthenticated=false;
  let syncQueued=false;
  let exitHookInstalled=false;

  function ensureExitDropdownStyles(){
    let link=document.getElementById("etePortalExitDropdownStyles");
    if(link)return;
    link=document.createElement("link");
    link.id="etePortalExitDropdownStyles";
    link.rel="stylesheet";
    link.href="portal-exit-dropdown.css?v=3";
    document.head.appendChild(link);
  }

  function ensureAtestadosAssets(callback){
    let css=document.getElementById("eteAtestadosStyles");
    if(!css){css=document.createElement("link");css.id="eteAtestadosStyles";css.rel="stylesheet";css.href="atestados.css?v=3";document.head.appendChild(css);}else if(css.getAttribute("href")!=="atestados.css?v=3")css.href="atestados.css?v=3";
    if(window.ETEAtestados){callback?.();return;}
    let script=document.getElementById("eteAtestadosScript");
    if(!script){script=document.createElement("script");script.id="eteAtestadosScript";script.src="atestados.js?v=2";script.defer=true;script.addEventListener("load",function(){callback?.();},{once:true});document.head.appendChild(script);return;}
    if(script.getAttribute("src")!=="atestados.js?v=2")script.src="atestados.js?v=2";
    script.addEventListener("load",function(){callback?.();},{once:true});
  }

  function getUser(){try{if(typeof currentUser!=="undefined"&&currentUser)return currentUser;}catch(_){}return null;}
  function isAuthenticated(){return !!getUser()&&!document.documentElement.classList.contains("auth-locked");}
  function userLabel(){const user=getUser();if(!user)return"Usuário";const name=String(user.displayName||user.username||"Usuário");const role=String(user.roleLabel||user.role||"");return role?name+" · "+role:name;}
  function selectedSystem(){try{return sessionStorage.getItem(SESSION_KEY)||"";}catch(_){return"";}}
  function setSelectedSystem(value){try{if(value)sessionStorage.setItem(SESSION_KEY,value);else sessionStorage.removeItem(SESSION_KEY);}catch(_){}}

  function buildExitLayer(){
    if(exitLayer||!document.body)return exitLayer;
    exitLayer=document.createElement("div");exitLayer.className="ete-exit-layer";exitLayer.hidden=true;
    const backIcon='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10.5 6 4.5 12l6 6"/><path d="M5 12h14"/></svg>';
    const logoutIcon='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 8V5.75A1.75 1.75 0 0 0 12.25 4h-6.5A1.75 1.75 0 0 0 4 5.75v12.5A1.75 1.75 0 0 0 5.75 20h6.5A1.75 1.75 0 0 0 14 18.25V16"/><path d="M10 12h10"/><path d="m17 9 3 3-3 3"/></svg>';
    exitLayer.innerHTML='<section class="ete-exit-card" role="menu" aria-label="Opções de saída"><div class="ete-exit-head"><div><span class="ete-portal-kicker">Sessão</span><h2>O que deseja fazer?</h2></div></div><div class="ete-exit-options"><button type="button" class="ete-exit-option" role="menuitem" data-exit-portal><span class="ete-exit-option-icon">'+backIcon+'</span><span><strong>Voltar ao portal</strong><small>Escolher outro sistema sem sair da conta</small></span></button><button type="button" class="ete-exit-option danger" role="menuitem" data-exit-account><span class="ete-exit-option-icon">'+logoutIcon+'</span><span><strong>Sair da conta</strong><small>Encerrar sua sessão neste dispositivo</small></span></button></div></section>';
    exitLayer.addEventListener("click",function(event){event.stopPropagation();if(event.target.closest("[data-exit-portal]")){closeExitMenu();showPortalHome();return;}if(event.target.closest("[data-exit-account]")){closeExitMenu();try{const result=logoutApp?.();if(result&&typeof result.catch==="function")result.catch(function(err){console.error("Falha ao sair:",err);});}catch(err){console.error("Falha ao sair:",err);}}});
    document.body.appendChild(exitLayer);return exitLayer;
  }

  function positionExitMenu(anchor){if(!exitLayer||exitLayer.hidden||!anchor)return;const card=exitLayer.querySelector(".ete-exit-card");if(!card)return;const rect=anchor.getBoundingClientRect(),margin=8,viewportW=document.documentElement.clientWidth,viewportH=document.documentElement.clientHeight,cardW=Math.min(320,viewportW-20);card.style.width=cardW+"px";const left=Math.min(viewportW-cardW-10,Math.max(10,rect.right-cardW));card.style.left=left+"px";card.style.right="auto";card.style.top="auto";card.style.bottom="auto";const cardH=card.offsetHeight||210;let top=rect.bottom+margin;if(top+cardH>viewportH-10)top=Math.max(10,rect.top-cardH-margin);card.style.top=top+"px";}
  function openExitMenu(anchor){if(!isAuthenticated())return;ensureExitDropdownStyles();buildExitLayer();exitAnchor=anchor||document.querySelector("#etePortalExit")||document.querySelector("#logoutBtn");exitLayer.hidden=false;document.body.classList.add("ete-exit-open");if(exitAnchor)exitAnchor.setAttribute("aria-expanded","true");requestAnimationFrame(function(){positionExitMenu(exitAnchor);});}
  function closeExitMenu(){if(!exitLayer)return;exitLayer.hidden=true;document.body.classList.remove("ete-exit-open");if(exitAnchor)exitAnchor.setAttribute("aria-expanded","false");exitAnchor=null;}

  function buildPortal(){
    if(portal||!document.body)return portal;
    portal=document.createElement("section");portal.id="eteCentralPortal";portal.className="ete-portal";portal.hidden=true;portal.setAttribute("aria-label","Portal de sistemas");
    const cards=systems.map(function(system){return '<button class="ete-system-card available" type="button" data-system="'+system.id+'"><span class="ete-system-card-head"><span class="ete-system-icon" aria-hidden="true">'+system.icon+'</span><span class="ete-system-status">'+system.status+'</span></span><span class="ete-system-copy"><strong>'+system.name+'</strong><p>'+system.description+'</p></span><span class="ete-system-open"><span>Acessar sistema</span><span aria-hidden="true">→</span></span></button>';}).join("");
    portal.innerHTML='<div class="ete-portal-shell"><header class="ete-portal-topbar"><div class="ete-portal-brand"><span class="ete-portal-mark">ETE</span><span><strong>Portal ETE</strong><small>Sistemas internos</small></span></div><div class="ete-portal-actions"><span class="ete-portal-user" id="etePortalUser"></span><button class="ete-portal-theme" type="button" id="etePortalTheme">Tema</button><button class="ete-portal-exit" type="button" id="etePortalExit" aria-haspopup="menu" aria-expanded="false">Sair</button></div></header><main class="ete-portal-home"><div class="ete-portal-hero"><span class="ete-portal-kicker">Central de sistemas</span><h1>Escolha onde deseja entrar.</h1><p>Acesse os sistemas internos da ETE em um só lugar, com as áreas organizadas e separadas para manter o trabalho simples e seguro.</p><div class="ete-portal-points"><span>Conta única</span><span>Sistemas separados</span><span>Pronto para crescer</span></div></div><div class="ete-portal-section-head"><span>Seus sistemas</span><small>'+systems.length+' módulos cadastrados</small></div><div class="ete-portal-grid">'+cards+'</div></main><main class="ete-portal-module"><button class="ete-portal-back" type="button" id="etePortalBack">← Voltar ao portal</button><div id="eteAtestadosRoot"></div></main></div>';
    portal.addEventListener("click",function(event){const card=event.target.closest("[data-system]");if(card)openSystem(card.dataset.system);});
    portal.querySelector("#etePortalBack")?.addEventListener("click",showPortalHome);
    portal.querySelector("#etePortalTheme")?.addEventListener("click",function(){try{window.ControlTheme?.toggle();}catch(_){}});
    portal.querySelector("#etePortalExit")?.addEventListener("click",function(event){event.preventDefault();event.stopPropagation();if(exitLayer&&!exitLayer.hidden&&exitAnchor===event.currentTarget)closeExitMenu();else openExitMenu(event.currentTarget);});
    document.body.appendChild(portal);return portal;
  }

  function refreshUser(){if(!portal)return;const node=portal.querySelector("#etePortalUser");if(node)node.textContent=userLabel();}
  function stopAtestados(){try{window.ETEAtestados?.unmount();}catch(_){}}
  function showPortalHome(){if(!isAuthenticated())return;closeExitMenu();stopAtestados();buildPortal();portal.classList.remove("module-open");refreshUser();portal.hidden=false;document.body.classList.add("portal-open");setSelectedSystem("");}
  function hidePortal(){if(!portal)return;closeExitMenu();stopAtestados();portal.hidden=true;portal.classList.remove("module-open");document.body.classList.remove("portal-open");}
  function openSystem(systemId){if(systemId==="control-ds"){setSelectedSystem("control-ds");hidePortal();return;}if(systemId==="atestados"){setSelectedSystem("atestados");buildPortal();portal.classList.add("module-open");refreshUser();portal.hidden=false;document.body.classList.add("portal-open");ensureAtestadosAssets(function(){window.ETEAtestados?.mount("#eteAtestadosRoot");});}}
  function removeOldPortalButton(){document.querySelectorAll(".portal-home-button").forEach(function(button){button.remove();});}

  function installExitHook(){if(exitHookInstalled)return;exitHookInstalled=true;document.addEventListener("click",function(event){const button=event.target.closest?.("#logoutBtn");if(button&&isAuthenticated()){event.preventDefault();event.stopImmediatePropagation();if(exitLayer&&!exitLayer.hidden&&exitAnchor===button)closeExitMenu();else openExitMenu(button);return;}if(exitLayer&&!exitLayer.hidden&&!event.target.closest?.(".ete-exit-card")&&!event.target.closest?.("#etePortalExit"))closeExitMenu();},true);document.addEventListener("keydown",function(event){if(event.key==="Escape"&&exitLayer&&!exitLayer.hidden)closeExitMenu();});window.addEventListener("resize",function(){if(exitLayer&&!exitLayer.hidden)positionExitMenu(exitAnchor);});window.addEventListener("scroll",function(){if(exitLayer&&!exitLayer.hidden)positionExitMenu(exitAnchor);},true);}

  function syncState(){syncQueued=false;const authenticated=isAuthenticated();removeOldPortalButton();if(!authenticated){if(lastAuthenticated)setSelectedSystem("");hidePortal();closeExitMenu();lastAuthenticated=false;return;}buildPortal();refreshUser();if(!lastAuthenticated){const selected=selectedSystem();if(selected==="control-ds")hidePortal();else if(selected==="atestados")openSystem("atestados");else showPortalHome();}lastAuthenticated=true;}
  function queueSync(){if(syncQueued)return;syncQueued=true;requestAnimationFrame(syncState);}
  function start(){ensureExitDropdownStyles();installExitHook();syncState();authObserver=new MutationObserver(queueSync);authObserver.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});window.addEventListener("pageshow",queueSync);window.addEventListener("control-theme-change",refreshUser);setTimeout(queueSync,80);setTimeout(queueSync,240);setTimeout(queueSync,700);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
  window.ETEPortal=Object.freeze({open:showPortalHome,openSystem:openSystem,openExitMenu:openExitMenu,systems:systems.map(function(system){return Object.freeze({id:system.id,name:system.name});})});
})();