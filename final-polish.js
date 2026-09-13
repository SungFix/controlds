(function(){
  "use strict";

  const LOADING_RE=/^(salvando|apagando|confirmando|entrando|carregando|enviando|processando)/i;
  const EMPTY_SELECTOR=".request-empty,.permission-empty,.student-empty,.computer-empty,.history-empty,.agenda-empty,.student-picker-empty";
  let queued=false;

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

(function initThemeSyncFallback(){
  "use strict";
  if(String(window.ControlTheme?.set||"").includes("startViewTransition"))return;

  const root=document.documentElement;
  const KEY="control-ds-theme";
  const DURATION=512;
  let timer=0;
  let running=false;

  if(!document.getElementById("eteThemeSyncRuntimeStyles")){
    const style=document.createElement("style");
    style.id="eteThemeSyncRuntimeStyles";
    style.textContent=`:root{--ete-theme-d:${DURATION}ms;--ete-theme-e:cubic-bezier(.22,.72,.24,1)}html.ete-theme-fallback body,html.ete-theme-fallback body *,html.ete-theme-fallback body *::before,html.ete-theme-fallback body *::after{transition-property:background-color,color,border-color,fill,stroke,outline-color!important;transition-duration:var(--ete-theme-d)!important;transition-delay:0ms!important;transition-timing-function:var(--ete-theme-e)!important}html.ete-theme-view,html.ete-theme-view body,html.ete-theme-view body *,html.ete-theme-view body *::before,html.ete-theme-view body *::after{transition:none!important}::view-transition-group(root){animation-duration:var(--ete-theme-d)!important;animation-timing-function:var(--ete-theme-e)!important}::view-transition-image-pair(root){isolation:isolate}::view-transition-old(root),::view-transition-new(root){animation-duration:var(--ete-theme-d)!important;animation-timing-function:var(--ete-theme-e)!important;animation-fill-mode:both!important;mix-blend-mode:normal;transform-origin:center center;will-change:opacity,filter}::view-transition-old(root){animation-name:eteThemeOld!important}::view-transition-new(root){animation-name:eteThemeNew!important}@keyframes eteThemeOld{0%{opacity:1;filter:brightness(1) saturate(1)}45%{opacity:.7;filter:brightness(.96) saturate(.96)}100%{opacity:0;filter:brightness(.9) saturate(.9)}}@keyframes eteThemeNew{0%{opacity:0;filter:brightness(1.1) saturate(.92)}38%{opacity:.42;filter:brightness(1.055) saturate(.96)}100%{opacity:1;filter:brightness(1) saturate(1)}}html.ete-theme-fallback::after{content:"";position:fixed;inset:0;z-index:2147483646;pointer-events:none;background:rgba(128,142,152,.06);animation:eteThemeVeil var(--ete-theme-d) var(--ete-theme-e) both}@keyframes eteThemeVeil{0%{opacity:0}38%{opacity:1}100%{opacity:0}}`;
    document.head.appendChild(style);
  }

  function current(){return root.dataset.theme==="light"?"light":"dark";}
  function apply(theme,persist){
    const next=theme==="light"?"light":"dark";
    root.dataset.theme=next;
    root.classList.toggle("theme-light",next==="light");
    root.classList.toggle("theme-dark",next==="dark");
    root.style.colorScheme=next;
    if(persist!==false){try{localStorage.setItem(KEY,next)}catch(_){}}
    const light=next==="light";
    document.querySelectorAll(".control-theme-toggle").forEach(button=>{
      button.innerHTML='<span aria-hidden="true">'+(light?'☾':'☀')+'</span><span class="theme-label">'+(light?'Tema escuro':'Tema claro')+'</span>';
      button.dataset.themeState=next;
      button.setAttribute("aria-pressed",String(light));
      button.setAttribute("aria-label",light?"Mudar para tema escuro":"Mudar para tema claro");
      button.title=light?"Mudar para tema escuro":"Mudar para tema claro";
    });
    try{window.dispatchEvent(new CustomEvent("control-theme-change",{detail:{theme:next}}))}catch(_){ }
    return next;
  }

  function set(theme,options){
    const target=theme==="light"?"light":"dark";
    const persist=!options||options.persist!==false;
    const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const animate=(!options||options.skipTransition!==true)&&target!==current()&&!reduce;
    if(target===current())return apply(target,persist);
    if(persist){try{localStorage.setItem(KEY,target)}catch(_){}}
    if(animate&&typeof document.startViewTransition==="function"&&!running){
      running=true;
      root.classList.remove("theme-transitioning","ete-theme-fallback");
      root.classList.add("ete-theme-view");
      const vt=document.startViewTransition(()=>apply(target,false));
      vt.finished.catch(()=>{}).finally(()=>{running=false;root.classList.remove("ete-theme-view")});
      return target;
    }
    if(animate){
      clearTimeout(timer);
      root.classList.remove("ete-theme-view");
      root.classList.add("ete-theme-fallback");
      void root.offsetWidth;
      apply(target,false);
      timer=setTimeout(()=>root.classList.remove("ete-theme-fallback"),DURATION+40);
    }else apply(target,false);
    return target;
  }

  function toggle(){return set(current()==="light"?"dark":"light")}
  window.ControlTheme=Object.freeze({get:current,set,toggle});

  document.addEventListener("click",event=>{
    const button=event.target.closest?.(".control-theme-toggle");
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggle();
  },true);
})();
