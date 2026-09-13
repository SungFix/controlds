(function(){
  "use strict";

  const LOADING_RE=/^(salvando|apagando|confirmando|entrando|carregando|enviando|processando)/i;
  const EMPTY_SELECTOR=".request-empty,.permission-empty,.student-empty,.computer-empty,.history-empty,.agenda-empty,.student-picker-empty";
  let queued=false;
  let headObserver=null;

  function ensureLightPaletteLast(){
    let palette=document.getElementById("eteLightFixedPaletteStyles");
    if(!palette){
      palette=document.createElement("link");
      palette.id="eteLightFixedPaletteStyles";
      palette.rel="stylesheet";
      document.head.appendChild(palette);
    }
    if(palette.getAttribute("href")!=="theme-light-fixed-palette.css?v=5") palette.href="theme-light-fixed-palette.css?v=5";

    let lock=document.getElementById("eteLightSandLockStyles");
    if(!lock){
      lock=document.createElement("link");
      lock.id="eteLightSandLockStyles";
      lock.rel="stylesheet";
      document.head.appendChild(lock);
    }
    if(lock.getAttribute("href")!=="theme-light-sand-lock.css?v=2") lock.href="theme-light-sand-lock.css?v=2";

    let hardLock=document.getElementById("eteLightSandHardLockStyles");
    if(!hardLock){
      hardLock=document.createElement("link");
      hardLock.id="eteLightSandHardLockStyles";
      hardLock.rel="stylesheet";
      document.head.appendChild(hardLock);
    }
    if(hardLock.getAttribute("href")!=="theme-light-sand-hardlock.css?v=1") hardLock.href="theme-light-sand-hardlock.css?v=1";

    let finalLock=document.getElementById("eteLightSandFinalStyles");
    if(!finalLock){
      finalLock=document.createElement("link");
      finalLock.id="eteLightSandFinalStyles";
      finalLock.rel="stylesheet";
      document.head.appendChild(finalLock);
    }
    if(finalLock.getAttribute("href")!=="theme-light-sand-final.css?v=1") finalLock.href="theme-light-sand-final.css?v=1";

    document.head.appendChild(palette);
    document.head.appendChild(lock);
    document.head.appendChild(hardLock);
    document.head.appendChild(finalLock);
  }

  function watchLateStyles(){
    if(headObserver||!document.head)return;
    headObserver=new MutationObserver(records=>{
      let stylesheetAdded=false;
      for(const record of records){
        for(const node of record.addedNodes){
          if(node instanceof HTMLLinkElement&&node.rel==="stylesheet"&&!['eteLightFixedPaletteStyles','eteLightSandLockStyles','eteLightSandHardLockStyles','eteLightSandFinalStyles'].includes(node.id)){
            stylesheetAdded=true;
            break;
          }
        }
        if(stylesheetAdded)break;
      }
      if(stylesheetAdded) requestAnimationFrame(ensureLightPaletteLast);
    });
    headObserver.observe(document.head,{childList:true});
  }

  function ensureGlobalSelectAssets(){
    const historySelect=document.getElementById("historyFilter");
    if(historySelect)historySelect.dataset.nativeSelect="true";

    if(!document.getElementById("eteCustomSelectStyles")){
      const link=document.createElement("link");
      link.id="eteCustomSelectStyles";
      link.rel="stylesheet";
      link.href="custom-select.css?v=1";
      document.head.appendChild(link);
    }
    if(!document.getElementById("eteSelectMatteStyles")){
      const matte=document.createElement("link");
      matte.id="eteSelectMatteStyles";
      matte.rel="stylesheet";
      matte.href="select-matte.css?v=1";
      document.head.appendChild(matte);
    }
    ensureLightPaletteLast();
    watchLateStyles();
    if(!document.getElementById("eteCustomSelectScript")){
      const script=document.createElement("script");
      script.id="eteCustomSelectScript";
      script.src="custom-select.js?v=1";
      script.defer=true;
      document.head.appendChild(script);
    }
  }

  function syncButton(button){
    if(!(button instanceof HTMLButtonElement)) return;
    const text=String(button.textContent||"").trim();
    const loading=button.disabled&&LOADING_RE.test(text);
    button.classList.toggle("is-loading",loading);
    if(loading) button.setAttribute("aria-busy","true");
    else button.removeAttribute("aria-busy");

    if(button.matches("[data-delete-student],[data-delete-request],[data-delete-permission],[data-delete-computer-record],#clearHistoryButton")){
      button.classList.add("danger");
      if(!button.title) button.title="Ação permanente";
    }
  }

  function syncEmptyState(el){
    if(!(el instanceof HTMLElement)) return;
    el.setAttribute("role","status");
    el.setAttribute("aria-live","polite");
    el.setAttribute("aria-atomic","true");
  }

  function syncFields(){
    document.querySelectorAll("#agendaSearch,#permissionSearch,#requestSearch,#studentSearch,#computerSearch,#historySearch,#studentPickerSearch").forEach(input=>{
      if(input instanceof HTMLInputElement){
        input.setAttribute("enterkeyhint","search");
        input.setAttribute("autocapitalize","none");
      }
    });
  }

  function sync(){
    queued=false;
    document.querySelectorAll("button").forEach(syncButton);
    document.querySelectorAll(EMPTY_SELECTOR).forEach(syncEmptyState);
    syncFields();
  }

  function queue(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(sync);
  }

  function start(){
    document.documentElement.dataset.finalPolish="1";
    setTimeout(ensureGlobalSelectAssets,0);
    sync();
    const observer=new MutationObserver(queue);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["disabled","class"]});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();

(function initEpochThemeInteractionGuard(){
  "use strict";

  const root=document.documentElement;
  let metaSyncQueued=false;

  function syncThemeMeta(){
    metaSyncQueued=false;
    const light=root.dataset.theme==="light";
    let scheme=document.querySelector('meta[name="color-scheme"]');
    if(!scheme){
      scheme=document.createElement("meta");
      scheme.name="color-scheme";
      document.head.appendChild(scheme);
    }
    scheme.content="dark light";

    let meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){
      meta=document.createElement("meta");
      meta.name="theme-color";
      document.head.appendChild(meta);
    }
    meta.content=light?"#f8efe2":"#090b0e";
  }

  function queueThemeMeta(){
    if(metaSyncQueued)return;
    metaSyncQueued=true;
    queueMicrotask(syncThemeMeta);
  }

  window.addEventListener("click",event=>{
    const button=event.target.closest?.(".control-theme-toggle");
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try{window.ControlTheme?.toggle();}catch(_){ }
  },true);

  const observer=new MutationObserver(queueThemeMeta);
  observer.observe(root,{attributes:true,attributeFilter:["data-theme"]});
  window.addEventListener("control-theme-change",queueThemeMeta);
  syncThemeMeta();
})();