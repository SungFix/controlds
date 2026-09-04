(function initAtestadosEnhancements(){
  "use strict";

  function enhancePicker(picker){
    if(!picker||picker.dataset.triggerReady==="1")return;
    const groups=picker.querySelector(".at-room-groups");
    if(!groups)return;
    picker.dataset.triggerReady="1";

    const trigger=document.createElement("button");
    trigger.type="button";
    trigger.className="at-room-trigger";
    trigger.setAttribute("aria-expanded","false");
    trigger.innerHTML='<span class="at-room-trigger-label">Selecione a turma</span><span class="at-room-trigger-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"/></svg></span>';
    groups.before(trigger);

    const label=trigger.querySelector(".at-room-trigger-label");
    function close(){picker.classList.remove("open");trigger.setAttribute("aria-expanded","false");}
    function open(){picker.classList.add("open");trigger.setAttribute("aria-expanded","true");}
    function sync(){
      const selected=picker.querySelector('input[name="atClass"]:checked');
      if(selected){label.textContent=selected.value;trigger.classList.add("has-value");}
      else{label.textContent="Selecione a turma";trigger.classList.remove("has-value");}
    }

    trigger.addEventListener("click",function(event){event.preventDefault();picker.classList.contains("open")?close():open();});
    picker.addEventListener("change",function(event){if(event.target.matches('input[name="atClass"]')){sync();close();}});
    document.addEventListener("click",function(event){if(!picker.isConnected)return;if(!picker.contains(event.target))close();});
    document.addEventListener("keydown",function(event){if(event.key==="Escape")close();});
    sync();
  }

  function enhanceModule(module){
    if(!module||module.dataset.controlShellReady==="1")return;
    const pageHead=module.querySelector(":scope > .at-page-head");
    const nav=module.querySelector(":scope > .at-nav");
    const view=module.querySelector(":scope > .at-view");
    if(!pageHead||!nav||!view)return;

    module.dataset.controlShellReady="1";
    const shell=document.createElement("div");
    shell.className="at-control-shell";

    const sidebar=document.createElement("aside");
    sidebar.className="at-control-sidebar";
    sidebar.innerHTML='<div class="at-control-brand"><span class="at-control-brandmark">AT</span><span><strong>Atestados</strong><small>Gestão escolar</small></span></div><div class="at-control-section-label">Módulo</div><div class="at-control-nav-slot"></div><div class="at-control-side-card"><span class="at-control-side-dot"></span><div><strong>Dados sincronizados</strong><small>Consulta integrada ao Portal ETE</small></div></div>';

    const main=document.createElement("main");
    main.className="at-control-main";
    const navSlot=sidebar.querySelector(".at-control-nav-slot");
    nav.classList.add("at-control-nav");
    navSlot.appendChild(nav);
    main.appendChild(pageHead);
    main.appendChild(view);
    shell.appendChild(sidebar);
    shell.appendChild(main);
    module.appendChild(shell);
  }

  function ensureLayoutStyles(){
    let link=document.getElementById("eteAtestadosControlLayoutStyles");
    if(link)return;
    link=document.createElement("link");
    link.id="eteAtestadosControlLayoutStyles";
    link.rel="stylesheet";
    link.href="atestados-control-layout.css?v=1";
    document.head.appendChild(link);
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