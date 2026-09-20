(function(){
  "use strict";

  const root=document.documentElement;
  const PAGE_LABELS={
    home:"Visão geral",
    agenda:"Agenda",
    permissions:"Permissões",
    requests:"Pedidos",
    students:"Alunos",
    computers:"Computadores",
    history:"Histórico"
  };
  let lastDialogOpener=null;
  let observerQueued=false;
  let keyboardInstalled=false;
  let structuredKeyboardInstalled=false;
  let dialogClickInstalled=false;

  function visible(el){
    if(!el) return false;
    const style=getComputedStyle(el);
    return style.display!=="none"&&style.visibility!=="hidden"&&el.getClientRects().length>0;
  }

  function addHeadLink(rel,href,id,crossOrigin){
    if(document.getElementById(id)) return;
    const link=document.createElement("link");
    link.id=id; link.rel=rel; link.href=href;
    if(crossOrigin) link.crossOrigin=crossOrigin;
    document.head.appendChild(link);
  }

  function addMeta(name,content,id){
    let meta=document.getElementById(id)||document.querySelector(`meta[name="${name}"]`);
    if(!meta){
      meta=document.createElement("meta");
      meta.id=id; meta.name=name;
      document.head.appendChild(meta);
    }
    meta.content=content;
    return meta;
  }

  function installDocumentMetadata(){
    addMeta("description","Sistema escolar para controle de notebooks, pedidos, permissões, alunos e histórico.","controlMetaDescription");
    addMeta("application-name","Control Ds","controlApplicationName");
    addMeta("apple-mobile-web-app-capable","yes","controlAppleCapable");
    addMeta("apple-mobile-web-app-status-bar-style","default","controlAppleStatus");
    addHeadLink("manifest","manifest.webmanifest?v=1","controlManifest");
    addHeadLink("preconnect","https://fisgkrmporzovogpmfpg.supabase.co","controlSupabasePreconnect","anonymous");
    addHeadLink("preconnect","https://cdn.jsdelivr.net","controlJsdelivrPreconnect","anonymous");
    syncThemeColor();
  }

  function syncThemeColor(){
    const light=root.dataset.theme==="light";
    addMeta("theme-color",light?"#f8fafb":"#0a0d10","controlThemeColor");
    root.style.colorScheme=light?"light":"dark";
  }

  function installSkipLink(){
    const content=document.querySelector(".content");
    if(!content) return;
    if(!content.id) content.id="mainContent";
    content.setAttribute("role","main");
    if(!content.hasAttribute("tabindex")) content.tabIndex=-1;
    if(document.querySelector(".prime-skip-link")) return;
    const link=document.createElement("a");
    link.className="prime-skip-link";
    link.href="#"+content.id;
    link.textContent="Ir para o conteúdo";
    document.body.prepend(link);
  }

  function installNetworkBanner(){
    if(document.querySelector(".prime-network-banner")) return;
    const banner=document.createElement("div");
    banner.className="prime-network-banner";
    banner.setAttribute("role","status");
    banner.setAttribute("aria-live","polite");
    banner.setAttribute("aria-atomic","true");
    banner.textContent="Sem conexão. Evite alterações até a internet voltar.";
    banner.hidden=true;
    document.body.appendChild(banner);
    syncNetworkState();
  }

  function syncNetworkState(){
    const online=navigator.onLine!==false;
    root.dataset.network=online?"online":"offline";
    const banner=document.querySelector(".prime-network-banner");
    if(banner) banner.hidden=online;
  }

  function activePageKey(){
    const activeButton=document.querySelector('.nav button.active[data-page]');
    if(activeButton) return activeButton.dataset.page||"";
    const active=document.querySelector('.page.active[id^="page-"]');
    return active?active.id.replace(/^page-/,""):"";
  }

  function syncNavigation(){
    const activeKey=activePageKey();
    const nav=document.querySelector(".nav");
    if(nav){
      nav.setAttribute("aria-label","Navegação principal");
      if(!nav.id) nav.id="controlPrimaryNav";
    }
    const sidebar=document.querySelector(".sidebar");
    if(sidebar&&!sidebar.getAttribute("aria-label")) sidebar.setAttribute("aria-label","Menu principal");

    document.querySelectorAll('.nav button[data-page]').forEach(button=>{
      const key=button.dataset.page||"";
      const page=document.getElementById("page-"+key);
      const current=key===activeKey;
      if(current) button.setAttribute("aria-current","page");
      else button.removeAttribute("aria-current");
      if(page){
        button.setAttribute("aria-controls",page.id);
        page.setAttribute("aria-hidden",String(!current));
      }
      const label=PAGE_LABELS[key];
      if(label&&!button.title) button.title=label;
    });

    const label=PAGE_LABELS[activeKey];
    if(label&&!root.classList.contains("auth-locked")) document.title=`${label} · Control Ds`;
    else if(root.classList.contains("auth-locked")) document.title="Control Ds";
  }

  function findActiveSearch(){
    const active=document.querySelector(".page.active")||document;
    for(const selector of [
      "input[type='search']","#requestSearch","#studentSearch","#permissionSearch",
      "#computerSearch","#historySearch",".request-search-wrap input",
      ".computer-search-wrap input",".search input",".toolbar input"
    ]){
      const el=active.querySelector(selector);
      if(visible(el)&&!el.disabled&&!el.readOnly) return el;
    }
    return null;
  }

  function closeTransientUi(){
    root.classList.remove("mobile-menu-open");
    document.body.classList.remove("mobile-menu-open");
    const menuButton=document.querySelector(".mobile-menu");
    if(menuButton){
      menuButton.setAttribute("aria-expanded","false");
      menuButton.setAttribute("aria-label","Abrir menu");
    }
    document.querySelectorAll(".group-picker-popup.open,.interval-picker-popup.open,.student-picker-popup.open,.time-popup.open").forEach(el=>el.classList.remove("open"));
    document.querySelectorAll(".group-picker-trigger.open,.interval-picker-trigger.open,.student-picker-trigger.open").forEach(el=>{
      el.classList.remove("open");
      el.setAttribute("aria-expanded","false");
    });
  }

  function installKeyboardHelp(){
    if(keyboardInstalled) return;
    keyboardInstalled=true;
    document.addEventListener("keydown",event=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
        const search=findActiveSearch();
        if(search){
          event.preventDefault();
          search.focus({preventScroll:false});
          try{search.select();}catch(_){}
        }
        return;
      }
      if(event.key==="Escape"&&!document.querySelector("dialog[open]")) closeTransientUi();
    });
  }

  function installStructuredKeyboardNavigation(){
    if(structuredKeyboardInstalled)return;
    structuredKeyboardInstalled=true;

    const pickerConfigs=[
      [".group-picker",".group-picker-trigger",".group-picker-popup",".group-option"],
      [".interval-picker",".interval-picker-trigger",".interval-picker-popup",".interval-option"],
      [".student-picker",".student-picker-trigger",".student-picker-popup",".student-option"],
      [".time-picker",".time-trigger",".time-popup",".time-option"]
    ];

    function pickerContext(target){
      if(!(target instanceof Element))return null;
      for(const [wrapperSelector,triggerSelector,popupSelector,optionSelector] of pickerConfigs){
        const wrapper=target.closest(wrapperSelector);
        if(!wrapper)continue;
        const trigger=wrapper.querySelector(triggerSelector);
        const popup=wrapper.querySelector(popupSelector);
        if(trigger&&popup)return{wrapper,trigger,popup,optionSelector};
      }
      return null;
    }

    function availableOptions(context){
      return [...context.popup.querySelectorAll(context.optionSelector)].filter(option=>
        !option.disabled&&option.getAttribute("aria-disabled")!=="true"&&visible(option)
      );
    }

    function closePicker(context){
      context.popup.classList.remove("open");
      context.trigger.classList.remove("open");
      context.trigger.setAttribute("aria-expanded","false");
      try{context.trigger.focus({preventScroll:true})}catch(_){}
    }

    function focusOpenedOption(context,direction){
      requestAnimationFrame(()=>{
        const options=availableOptions(context);
        if(!options.length)return;
        const active=options.find(option=>option.classList.contains("active")||option.getAttribute("aria-selected")==="true");
        const target=active||(direction<0?options[options.length-1]:options[0]);
        try{target.focus({preventScroll:true})}catch(_){}
      });
    }

    document.addEventListener("keydown",event=>{
      const context=pickerContext(event.target);
      if(context){
        const onTrigger=event.target===context.trigger;
        const option=event.target.closest?.(context.optionSelector);
        const open=context.popup.classList.contains("open");

        if(onTrigger&&(event.key==="ArrowDown"||event.key==="ArrowUp")){
          event.preventDefault();
          if(!open)context.trigger.click();
          focusOpenedOption(context,event.key==="ArrowUp"?-1:1);
          return;
        }

        if(open&&event.key==="Escape"){
          event.preventDefault();
          event.stopPropagation();
          closePicker(context);
          return;
        }

        if(option&&open&&["ArrowDown","ArrowUp","Home","End"].includes(event.key)){
          const options=availableOptions(context);
          const index=options.indexOf(option);
          if(index<0||!options.length)return;
          event.preventDefault();
          let next=index;
          if(event.key==="Home")next=0;
          else if(event.key==="End")next=options.length-1;
          else next=(index+(event.key==="ArrowDown"?1:-1)+options.length)%options.length;
          try{options[next].focus({preventScroll:true})}catch(_){}
          return;
        }
      }

      const tab=event.target.closest?.(".request-tab,.computer-tab,.at-nav-item");
      if(!tab||!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
      const list=tab.closest(".request-tabs,.computer-tabs,.at-nav");
      if(!list)return;
      const tabs=[...list.querySelectorAll(".request-tab,.computer-tab,.at-nav-item")].filter(item=>!item.disabled&&visible(item));
      const index=tabs.indexOf(tab);
      if(index<0||!tabs.length)return;
      event.preventDefault();
      let next=index;
      if(event.key==="Home")next=0;
      else if(event.key==="End")next=tabs.length-1;
      else next=(index+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
      const target=tabs[next];
      try{target.focus({preventScroll:true})}catch(_){}
      target.click();
    });
  }

  function syncPickerA11y(){
    const pairs=[
      [".group-picker-trigger",".group-picker-popup",".group-option"],
      [".interval-picker-trigger",".interval-picker-popup",".interval-option"],
      [".student-picker-trigger",".student-picker-popup",".student-option"],
      [".time-trigger",".time-popup",".time-option"]
    ];
    pairs.forEach(([triggerSelector,popupSelector,optionSelector])=>{
      document.querySelectorAll(triggerSelector).forEach((trigger,index)=>{
        const wrapper=trigger.closest(".group-picker,.interval-picker,.student-picker,.time-picker")||trigger.parentElement;
        const popup=wrapper?.querySelector(popupSelector)||document.querySelectorAll(popupSelector)[index];
        trigger.setAttribute("aria-haspopup","listbox");
        trigger.setAttribute("aria-expanded",String(trigger.classList.contains("open")||popup?.classList.contains("open")));
        if(popup){
          if(!popup.id) popup.id=`prime-listbox-${triggerSelector.replace(/\W/g,"")}-${index}`;
          trigger.setAttribute("aria-controls",popup.id);
          popup.setAttribute("role","listbox");
          popup.querySelectorAll(optionSelector).forEach(option=>{
            option.setAttribute("role","option");
            option.setAttribute("aria-selected",String(option.classList.contains("active")));
          });
        }
      });
    });
  }

  function syncTabA11y(){
    [[".request-tabs",".request-tab"],[".computer-tabs",".computer-tab"]].forEach(([listSelector,tabSelector])=>{
      document.querySelectorAll(listSelector).forEach(list=>{
        list.setAttribute("role","tablist");
        list.querySelectorAll(tabSelector).forEach(tab=>{
          tab.setAttribute("role","tab");
          tab.setAttribute("aria-selected",String(tab.classList.contains("active")));
        });
      });
    });
  }

  function syncA11y(){
    const toast=document.querySelector("#toast,.toast");
    if(toast){
      toast.setAttribute("role","status"); toast.setAttribute("aria-live","polite"); toast.setAttribute("aria-atomic","true");
    }
    const loginError=document.querySelector("#loginError,.login-error");
    if(loginError){loginError.setAttribute("role","alert");loginError.setAttribute("aria-live","assertive");}
    document.querySelectorAll(".sync-pill,#syncPill").forEach(el=>{
      el.setAttribute("role","status"); el.setAttribute("aria-live","polite"); el.setAttribute("aria-atomic","true");
    });

    const menu=document.querySelector(".mobile-menu");
    const sidebar=document.querySelector(".sidebar");
    if(menu){
      menu.setAttribute("aria-haspopup","true");
      if(!menu.hasAttribute("aria-expanded")) menu.setAttribute("aria-expanded","false");
      if(sidebar){
        if(!sidebar.id) sidebar.id="controlSidebar";
        menu.setAttribute("aria-controls",sidebar.id);
      }
    }

    document.querySelectorAll("dialog").forEach(dialog=>{
      dialog.setAttribute("aria-modal","true");
      if(!dialog.hasAttribute("role")) dialog.setAttribute("role","dialog");
    });
    document.querySelectorAll("button.close").forEach(button=>{
      if(!button.getAttribute("aria-label")) button.setAttribute("aria-label","Fechar");
      if(!button.title) button.title="Fechar";
    });
    document.querySelectorAll(".header-logout").forEach(button=>{
      if(!button.getAttribute("aria-label")) button.setAttribute("aria-label","Sair da conta");
      if(!button.title) button.title="Sair da conta";
    });
    document.querySelectorAll("button[aria-label],[role='button'][aria-label]").forEach(control=>{
      const label=control.getAttribute("aria-label");
      if(label&&!control.getAttribute("title")) control.setAttribute("title",label);
    });

    syncPickerA11y();
    syncTabA11y();
  }

  function improveInputs(){
    const username=document.querySelector("#loginUsername");
    const password=document.querySelector("#loginPassword");
    if(username){username.autocomplete="username";username.autocapitalize="none";username.spellcheck=false;}
    if(password) password.autocomplete="current-password";
    ["studentPin","pickupPin"].forEach(id=>{
      const input=document.getElementById(id);
      if(input){input.inputMode="numeric";input.autocomplete="off";}
    });

    document.querySelectorAll("input,textarea,select").forEach(field=>{
      if(!field.getAttribute("aria-label")&&!field.getAttribute("aria-labelledby")){
        const labelled=field.id&&document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
        const wrapped=field.closest("label");
        if(!labelled&&!wrapped){
          const hint=String(field.placeholder||field.name||field.id||"").trim();
          if(hint) field.setAttribute("aria-label",hint.replace(/[-_]+/g," "));
        }
      }
      if(field.dataset.primeValidation==="1") return;
      field.dataset.primeValidation="1";
      field.addEventListener("blur",()=>{
        if(field.disabled) return;
        if(!field.checkValidity()) field.setAttribute("aria-invalid","true");
        else field.removeAttribute("aria-invalid");
      });
      field.addEventListener("input",()=>{if(field.checkValidity()) field.removeAttribute("aria-invalid");});
      field.addEventListener("change",()=>{if(field.checkValidity()) field.removeAttribute("aria-invalid");});
    });
  }

  function syncFormBusy(){
    document.querySelectorAll("form").forEach(form=>{
      const submit=form.querySelector('button[type="submit"],input[type="submit"]');
      const busy=!!submit&&(submit.getAttribute("aria-busy")==="true"||submit.classList?.contains("is-loading"));
      if(busy) form.setAttribute("aria-busy","true");
      else form.removeAttribute("aria-busy");
    });
  }

  function installDialogFocus(){
    if(!dialogClickInstalled){
      dialogClickInstalled=true;
      document.addEventListener("click",event=>{
        const target=event.target.closest?.("button,a,[role='button']");
        if(target&&!target.closest("dialog")) lastDialogOpener=target;
      },true);
    }

    document.querySelectorAll("dialog").forEach(dialog=>{
      if(dialog.dataset.primeDialog==="1") return;
      dialog.dataset.primeDialog="1";
      const observer=new MutationObserver(()=>{
        if(!dialog.open) return;
        requestAnimationFrame(()=>{
          if(dialog.contains(document.activeElement)) return;
          const target=dialog.querySelector("[autofocus],input:not([type='hidden']):not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not(.close):not([disabled]),button.close");
          try{target?.focus({preventScroll:true});}catch(_){}
        });
      });
      observer.observe(dialog,{attributes:true,attributeFilter:["open"]});
      dialog.addEventListener("close",()=>{
        const target=lastDialogOpener;
        if(target&&target.isConnected&&visible(target)) requestAnimationFrame(()=>{try{target.focus({preventScroll:true});}catch(_){}});
      });
    });
  }

  function syncThemeFallback(){
    const floating=document.querySelector(".control-theme-toggle-floating");
    if(!floating) return;
    const hasHeader=!!document.querySelector(".control-theme-toggle-header");
    const loginLocked=root.classList.contains("auth-locked");
    floating.style.display=loginLocked||!hasHeader?"inline-flex":"none";
  }

  function syncEverything(){
    observerQueued=false;
    installSkipLink();
    installNetworkBanner();
    syncNavigation();
    syncA11y();
    improveInputs();
    syncFormBusy();
    installDialogFocus();
    syncThemeFallback();
  }

  function queueSync(){
    if(observerQueued) return;
    observerQueued=true;
    requestAnimationFrame(syncEverything);
  }

  function start(){
    root.dataset.primeUx="3";
    installDocumentMetadata();
    installKeyboardHelp();
    installStructuredKeyboardNavigation();
    syncEverything();
    window.addEventListener("online",syncNetworkState);
    window.addEventListener("offline",syncNetworkState);

    const themeObserver=new MutationObserver(()=>{
      syncThemeColor(); syncThemeFallback(); syncNavigation();
    });
    themeObserver.observe(root,{attributes:true,attributeFilter:["data-theme","class"]});

    const uxRelevantSelector=[
      "dialog","form","input","textarea","select",
      ".nav",".sidebar",".page",".topbar-right",".top-right",
      ".request-tabs",".computer-tabs",".group-picker",".interval-picker",".student-picker",".time-picker",
      ".sync-pill","#syncPill","#toast",".toast",".header-logout",".mobile-menu",
      ".ete-portal",".ete-atestados",".at-control-main"
    ].join(",");

    function nodeMayNeedUxSync(node){
      if(!node||node.nodeType!==1)return false;
      return !!(node.matches?.(uxRelevantSelector)||node.querySelector?.(uxRelevantSelector));
    }

    function handleBodyMutations(mutations){
      const relevantAttributeTarget="dialog,form,button,input,textarea,select,.nav button,.page,.request-tab,.computer-tab,.group-picker-trigger,.interval-picker-trigger,.student-picker-trigger,.group-picker-popup,.interval-picker-popup,.student-picker-popup,.time-popup";
      for(const mutation of mutations){
        if(mutation.type==="childList"){
          for(const node of mutation.addedNodes){
            if(nodeMayNeedUxSync(node)){queueSync();return;}
          }
          for(const node of mutation.removedNodes){
            if(nodeMayNeedUxSync(node)){queueSync();return;}
          }
          continue;
        }
        if(mutation.type==="attributes"&&mutation.target.matches?.(relevantAttributeTarget)){
          queueSync();
          return;
        }
      }
    }

    const bodyObserver=new MutationObserver(handleBodyMutations);
    bodyObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","disabled","open"]});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();

/* Motion Prime — animacoes e conveniencias sem bloquear a thread principal */
(function initMotionPrime(){
  "use strict";

  const root=document.documentElement;
  const reduceMotion=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const revealSelector=[
    ".panel",".hero-stat",".mini-stat",".quick-card",
    ".request-card",".student-card",".computer-card",".computer-item",
    ".permission-card",".permission-item",".history-event",
    ".portal-card",".at-card",".at-metric",".at-form-card"
  ].join(",");
  let revealObserver=null;
  let scrollTicking=false;

  function isEditable(target){
    return !!target?.closest?.("input,textarea,select,[contenteditable='true']");
  }

  function activeSearch(){
    const scope=document.querySelector(".page.active,.at-view.active,.ete-portal-home")||document;
    for(const selector of [
      "input[type='search']","#requestSearch","#studentSearch","#permissionSearch",
      "#computerSearch","#historySearch",".request-search-wrap input",
      ".computer-search-wrap input",".search input",".toolbar input"
    ]){
      const input=scope.querySelector(selector);
      if(input&&!input.disabled&&!input.readOnly&&input.getClientRects().length)return input;
    }
    return null;
  }

  function animatePage(target){
    if(reduceMotion||!target)return;
    target.classList.remove("ui-page-enter");
    requestAnimationFrame(()=>{
      if(!target.isConnected)return;
      target.classList.add("ui-page-enter");
      window.setTimeout(()=>target.classList.remove("ui-page-enter"),340);
    });
  }

  function prepareRevealElement(element){
    if(!element||element.dataset.motionReveal==="1")return;
    element.dataset.motionReveal="1";
    if(reduceMotion){
      element.classList.add("ui-in");
      return;
    }
    element.classList.add("ui-reveal");
    revealObserver?.observe(element);
  }

  function prepareReveals(scope){
    if(!scope||((scope.nodeType!==1)&&scope!==document))return;
    if(scope!==document&&scope.matches?.(revealSelector))prepareRevealElement(scope);
    scope.querySelectorAll?.(revealSelector).forEach(prepareRevealElement);
  }

  function installRevealObserver(){
    if(reduceMotion||!("IntersectionObserver" in window))return;
    revealObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        entry.target.classList.add("ui-in");
        revealObserver.unobserve(entry.target);
      }
    },{threshold:.06,rootMargin:"0px 0px -7% 0px"});
  }

  function installScrollTop(){
    if(document.querySelector(".ui-scroll-top"))return;
    const button=document.createElement("button");
    button.type="button";
    button.className="ui-scroll-top";
    button.setAttribute("aria-label","Voltar ao topo");
    button.title="Voltar ao topo";
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
    document.body.appendChild(button);

    function scrollCandidates(){
      return [
        document.scrollingElement,
        document.querySelector(".ete-portal:not([hidden])"),
        document.querySelector(".ete-portal-module"),
        document.querySelector(".at-control-main")
      ].filter(Boolean);
    }
    function currentScrollTop(){
      let top=window.scrollY||0;
      for(const scroller of scrollCandidates()) top=Math.max(top,Number(scroller.scrollTop)||0);
      return top;
    }
    function sync(){
      scrollTicking=false;
      button.classList.toggle("is-visible",currentScrollTop()>620);
    }
    function queue(){
      if(scrollTicking)return;
      scrollTicking=true;
      requestAnimationFrame(sync);
    }
    window.addEventListener("scroll",queue,{passive:true});
    document.addEventListener("scroll",queue,{capture:true,passive:true});
    button.addEventListener("click",()=>{
      const behavior=reduceMotion?"auto":"smooth";
      window.scrollTo({top:0,behavior});
      for(const scroller of scrollCandidates()){
        if(scroller===document.scrollingElement)continue;
        try{scroller.scrollTo({top:0,behavior});}catch(_){scroller.scrollTop=0;}
      }
    });
    sync();
  }

  function handleMotionMutations(mutations){
    for(const mutation of mutations){
      mutation.addedNodes.forEach(node=>prepareReveals(node));
    }
  }

  function installPageMotion(){
    document.addEventListener("click",event=>{
      const navButton=event.target.closest?.(".nav button[data-page]");
      if(!navButton)return;
      const pageKey=navButton.dataset.page;
      requestAnimationFrame(()=>{
        const target=document.getElementById("page-"+pageKey);
        if(target?.classList.contains("active"))animatePage(target);
      });
    });
  }

  function installConvenienceKeys(){
    document.addEventListener("keydown",event=>{
      if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey)return;
      if(event.key!=="/"||isEditable(event.target))return;
      const search=activeSearch();
      if(!search)return;
      event.preventDefault();
      search.focus({preventScroll:false});
      try{search.select()}catch(_){}
    });
  }

  function start(){
    installRevealObserver();
    prepareReveals(document);
    installScrollTop();
    installConvenienceKeys();
    installPageMotion();
    root.dataset.motionReady="1";

    const observer=new MutationObserver(handleMotionMutations);
    observer.observe(document.body,{subtree:true,childList:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();

/* Product convenience — comportamentos pequenos, sem alterar regras de negócio */
(function initProductConvenience(){
  "use strict";

  const reduceMotion=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function smoothBehavior(){
    return reduceMotion?"auto":"smooth";
  }

  function installPageNavigationPolish(){
    document.addEventListener("click",event=>{
      const jump=event.target.closest?.("[data-page-jump],.nav button[data-page]");
      if(!jump)return;

      requestAnimationFrame(()=>{
        const pageKey=jump.dataset.pageJump||jump.dataset.page;
        const page=pageKey&&document.getElementById("page-"+pageKey);
        if(!page?.classList.contains("active"))return;

        if(window.scrollY>90){
          window.scrollTo({top:0,behavior:smoothBehavior()});
        }
      });
    });
  }

  function installScrollableTabPolish(){
    document.addEventListener("click",event=>{
      const tab=event.target.closest?.(".request-tab,.computer-tab,.at-nav-item");
      if(!tab)return;
      requestAnimationFrame(()=>{
        try{
          tab.scrollIntoView({behavior:smoothBehavior(),block:"nearest",inline:"nearest"});
        }catch(_){}
      });
    });
  }

  function installPressedFeedback(){
    document.addEventListener("pointerdown",event=>{
      const target=event.target.closest?.("button,.btn,[role='button']");
      if(!target||target.disabled)return;
      target.dataset.uiPressed="1";
    },{passive:true});

    const clear=event=>{
      const target=event.target.closest?.("[data-ui-pressed='1']");
      if(target)delete target.dataset.uiPressed;
    };
    document.addEventListener("pointerup",clear,{passive:true});
    document.addEventListener("pointercancel",clear,{passive:true});
  }

  function start(){
    installPageNavigationPolish();
    installScrollableTabPolish();
    installPressedFeedback();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
