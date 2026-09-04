(function initAtestadosEnhancements(){
  "use strict";

  const icons={
    home:'<svg viewBox="0 0 24 24"><path d="m4 11 8-7 8 7"/><path d="M6 10v10h12V10M10 20v-6h4v6"/></svg>',
    list:'<svg viewBox="0 0 24 24"><path d="M8 6h11M8 12h11M8 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    add:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    portal:'<svg viewBox="0 0 24 24"><path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z"/></svg>',
    theme:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    exit:'<svg viewBox="0 0 24 24"><path d="M14 8V5.5A1.5 1.5 0 0 0 12.5 4h-7A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h7a1.5 1.5 0 0 0 1.5-1.5V16"/><path d="M10 12h10M17 9l3 3-3 3"/></svg>'
  };

  function closeOpenPickers(except){
    document.querySelectorAll(".at-room-picker.open").forEach(function(picker){
      if(picker===except)return;
      picker.classList.remove("open");
      picker.querySelector(".at-room-trigger")?.setAttribute("aria-expanded","false");
    });
  }

  document.addEventListener("click",function(event){
    const picker=event.target.closest?.(".at-room-picker");
    if(!picker)closeOpenPickers();
  },true);
  document.addEventListener("keydown",function(event){if(event.key==="Escape")closeOpenPickers();});

  function enhancePicker(picker){
    if(!picker||picker.dataset.triggerReady==="1")return;
    const groups=picker.querySelector(".at-room-groups");
    if(!groups)return;
    picker.dataset.triggerReady="1";
    const trigger=document.createElement("button");
    trigger.type="button";
    trigger.className="at-room-trigger";
    trigger.setAttribute("aria-expanded","false");
    trigger.setAttribute("aria-haspopup","listbox");
    trigger.innerHTML='<span class="at-room-trigger-label">Selecione a turma</span><span class="at-room-trigger-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"/></svg></span>';
    groups.before(trigger);
    const label=trigger.querySelector(".at-room-trigger-label");
    function close(){picker.classList.remove("open");trigger.setAttribute("aria-expanded","false");}
    function open(){closeOpenPickers(picker);picker.classList.add("open");trigger.setAttribute("aria-expanded","true");}
    function sync(){const selected=picker.querySelector('input[name="atClass"]:checked');if(selected){label.textContent=selected.value;trigger.classList.add("has-value");}else{label.textContent="Selecione a turma";trigger.classList.remove("has-value");}}
    trigger.addEventListener("click",function(event){event.preventDefault();event.stopPropagation();picker.classList.contains("open")?close():open();});
    picker.addEventListener("change",function(event){if(event.target.matches('input[name="atClass"]')){sync();close();}});
    sync();
  }

  function tabMeta(tab){if(tab==="records")return["Registros","Consulta de faltas justificadas"];if(tab==="new")return["Cadastrar","Nova falta justificada"];return["Visão geral","Atestados e frequência"];}

  function decorateNav(nav){
    const map={overview:icons.home,records:icons.list,new:icons.add};
    nav.querySelectorAll("[data-at-tab]").forEach(function(button){
      if(button.querySelector(".at-control-navicon"))return;
      const icon=document.createElement("span");
      icon.className="at-control-navicon";
      icon.innerHTML=map[button.dataset.atTab]||icons.list;
      button.prepend(icon);
    });
  }

  function updateTopbar(module){
    const active=module.querySelector(".at-nav-item.active")?.dataset.atTab||"overview";
    const meta=tabMeta(active);
    const title=module.querySelector(".at-app-top-title strong");
    const sub=module.querySelector(".at-app-top-title small");
    if(title)title.textContent=meta[0];
    if(sub)sub.textContent=meta[1];
  }

  function syncConnectionState(module){
    const source=module.querySelector("#atStatus");
    const target=module.querySelector(".at-app-sync");
    if(!source||!target)return;
    const text=String(source.textContent||"").trim();
    const error=source.classList.contains("error")||source.dataset.state==="error";
    target.classList.toggle("error",error);
    target.classList.toggle("loading",!error&&text!=="Atualizado");
    const label=target.querySelector("span");
    if(label)label.textContent=text==="Atualizado"?"Sincronizado":text;
  }

  function enhanceMetrics(module){
    module.querySelectorAll(".at-metric").forEach(function(card){
      if(card.dataset.controlMetric==="1")return;
      card.dataset.controlMetric="1";
      const icon=card.querySelector(".at-metric-icon");
      if(icon)icon.classList.add("at-metric-marker");
    });
  }

  function enhanceModule(module){
    if(!module||module.dataset.controlShellReady==="1")return;
    const pageHead=module.querySelector(":scope > .at-page-head");
    const nav=module.querySelector(":scope > .at-nav");
    const view=module.querySelector(":scope > .at-view");
    if(!pageHead||!nav||!view)return;
    module.dataset.controlShellReady="1";
    decorateNav(nav);

    const shell=document.createElement("div");
    shell.className="at-control-shell at-control-shell-full";
    const sidebar=document.createElement("aside");
    sidebar.className="at-control-sidebar";
    sidebar.innerHTML='<div class="at-control-brand"><span class="at-control-brandmark">ETE</span><span><strong>ETE</strong><small>Atestados e frequência</small></span></div><div class="at-control-nav-slot"></div><div class="at-control-side-card"><span class="at-control-side-dot"></span><div><strong>Supabase</strong></div></div>';

    const app=document.createElement("section");
    app.className="at-app-main";
    const topbar=document.createElement("header");
    topbar.className="at-app-topbar";
    topbar.innerHTML='<div class="at-app-top-left"><button type="button" class="at-app-home" data-at-portal aria-label="Voltar ao portal" title="Voltar ao portal">'+icons.portal+'</button><div class="at-app-top-title"><strong>Visão geral</strong><small>Atestados e frequência</small></div></div><div class="at-app-top-right"><button type="button" class="at-app-theme">'+icons.theme+'<span>Tema</span></button><span class="at-app-sync" role="status" aria-live="polite"><i></i><span>Sincronizando...</span></span><button type="button" class="at-app-exit">'+icons.exit+'<span>Sair</span></button></div>';
    const content=document.createElement("div");
    content.className="at-app-content";
    const navSlot=sidebar.querySelector(".at-control-nav-slot");
    nav.classList.add("at-control-nav");
    navSlot.appendChild(nav);
    content.appendChild(pageHead);
    content.appendChild(view);
    app.appendChild(topbar);
    app.appendChild(content);
    shell.appendChild(sidebar);
    shell.appendChild(app);
    module.appendChild(shell);

    topbar.querySelector("[data-at-portal]")?.addEventListener("click",function(){window.ETEPortal?.open();});
    topbar.querySelector(".at-app-theme")?.addEventListener("click",function(){try{window.ControlTheme?.toggle();}catch(_){}});
    topbar.querySelector(".at-app-exit")?.addEventListener("click",function(event){event.stopPropagation();window.ETEPortal?.openExitMenu(event.currentTarget);});
    nav.addEventListener("click",function(){requestAnimationFrame(function(){updateTopbar(module);enhanceMetrics(module);syncConnectionState(module);});});

    const viewObserver=new MutationObserver(function(){enhanceMetrics(module);updateTopbar(module);syncConnectionState(module);});
    viewObserver.observe(view,{childList:true,subtree:true});
    const statusObserver=new MutationObserver(function(){syncConnectionState(module);});
    statusObserver.observe(pageHead,{childList:true,subtree:true,attributes:true,attributeFilter:["class","data-state"]});
    enhanceMetrics(module);
    updateTopbar(module);
    syncConnectionState(module);
  }

  function ensureLayoutStyles(){
    const assets=[
      ["eteAtestadosControlLayoutStyles","atestados-control-layout.css?v=3"],
      ["eteAtestadosSizeParityStyles","atestados-size-parity.css?v=2"]
    ];
    assets.forEach(function(pair){
      let link=document.getElementById(pair[0]);
      if(!link){link=document.createElement("link");link.id=pair[0];link.rel="stylesheet";document.head.appendChild(link);}
      if(link.getAttribute("href")!==pair[1])link.href=pair[1];
    });
  }

  function scan(){
    ensureLayoutStyles();
    document.querySelectorAll(".ete-atestados").forEach(enhanceModule);
    document.querySelectorAll(".at-room-picker").forEach(enhancePicker);
  }

  const observer=new MutationObserver(scan);
  function start(){scan();if(document.body)observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
