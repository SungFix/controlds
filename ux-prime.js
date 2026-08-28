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
    addMeta("theme-color",light?"#eef2f5":"#090b0e","controlThemeColor");
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

  function syncPickerA11y(){
    const pairs=[
      [".group-picker-trigger",".group-picker-popup",".group-option"],
      [".interval-picker-trigger",".interval-picker-popup",".interval-option"],
      [".student-picker-trigger",".student-picker-popup",".student-option"]
    ];
    pairs.forEach(([triggerSelector,popupSelector,optionSelector])=>{
      document.querySelectorAll(triggerSelector).forEach((trigger,index)=>{
        const wrapper=trigger.closest(".group-picker,.interval-picker,.student-picker")||trigger.parentElement;
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
      if(submit) form.setAttribute("aria-busy",String(!!submit.disabled));
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
    root.dataset.primeUx="2";
    installDocumentMetadata();
    installKeyboardHelp();
    syncEverything();
    window.addEventListener("online",syncNetworkState);
    window.addEventListener("offline",syncNetworkState);

    const themeObserver=new MutationObserver(()=>{
      syncThemeColor(); syncThemeFallback(); syncNavigation();
    });
    themeObserver.observe(root,{attributes:true,attributeFilter:["data-theme","class"]});

    const bodyObserver=new MutationObserver(queueSync);
    bodyObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","disabled","open"]});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
