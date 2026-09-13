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

(function initGuaranteedThemeTransition(){
  "use strict";

  const root=document.documentElement;
  const KEY="control-ds-theme";
  const DURATION=512;
  const HALF=DURATION/2;
  const MID_OPACITY=.72;
  const EASING="cubic-bezier(.4,0,.2,1)";
  let running=false;
  let activeAnimations=[];

  if(!document.getElementById("eteGuaranteedThemeStyles")){
    const style=document.createElement("style");
    style.id="eteGuaranteedThemeStyles";
    style.textContent=`
      html.ete-theme-guaranteed body *,
      html.ete-theme-guaranteed body *::before,
      html.ete-theme-guaranteed body *::after{
        transition:none!important;
      }
      html.ete-theme-guaranteed body{
        transform:translateZ(0);
        will-change:opacity;
        filter:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function current(){
    return root.dataset.theme==="light"?"light":"dark";
  }

  function updateButtons(){
    const light=current()==="light";
    document.querySelectorAll(".control-theme-toggle").forEach(button=>{
      button.innerHTML='<span aria-hidden="true">'+(light?'☾':'☀')+'</span><span class="theme-label">'+(light?'Tema escuro':'Tema claro')+'</span>';
      button.dataset.themeState=light?"light":"dark";
      button.setAttribute("aria-pressed",String(light));
      button.setAttribute("aria-label",light?"Mudar para tema escuro":"Mudar para tema claro");
      button.title=light?"Mudar para tema escuro":"Mudar para tema claro";
    });
  }

  function apply(theme,persist){
    const next=theme==="light"?"light":"dark";
    root.dataset.theme=next;
    root.classList.toggle("theme-light",next==="light");
    root.classList.toggle("theme-dark",next==="dark");
    root.style.colorScheme=next;
    if(persist!==false){
      try{localStorage.setItem(KEY,next)}catch(_){ }
    }
    updateButtons();
    try{window.dispatchEvent(new CustomEvent("control-theme-change",{detail:{theme:next}}))}catch(_){ }
    return next;
  }

  function cancelActiveAnimations(){
    activeAnimations.forEach(animation=>{
      try{animation.cancel()}catch(_){ }
    });
    activeAnimations=[];
  }

  async function animateTheme(target,persist){
    if(running||target===current()){
      if(target===current())apply(target,persist);
      return target;
    }

    const body=document.body;
    if(!body||typeof body.animate!=="function"){
      return apply(target,persist);
    }

    running=true;
    cancelActiveAnimations();
    root.classList.remove("theme-transitioning","theme-view-transitioning","ete-theme-view","ete-theme-fallback");
    root.classList.add("ete-theme-guaranteed");

    if(persist!==false){
      try{localStorage.setItem(KEY,target)}catch(_){ }
    }

    const outgoing=body.animate([
      {opacity:1},
      {opacity:MID_OPACITY}
    ],{
      duration:HALF,
      easing:EASING,
      fill:"forwards"
    });
    activeAnimations.push(outgoing);

    try{await outgoing.finished}catch(_){ }

    apply(target,false);

    const incoming=body.animate([
      {opacity:MID_OPACITY},
      {opacity:1}
    ],{
      duration:HALF,
      easing:EASING,
      fill:"forwards"
    });
    activeAnimations.push(incoming);

    try{await incoming.finished}catch(_){ }

    cancelActiveAnimations();
    root.classList.remove("ete-theme-guaranteed");
    running=false;
    return target;
  }

  function setTheme(theme,options){
    const target=theme==="light"?"light":"dark";
    const persist=!options||options.persist!==false;
    const skip=!!(options&&options.skipTransition===true);

    if(skip||target===current()){
      return apply(target,persist);
    }

    animateTheme(target,persist);
    return target;
  }

  function toggleTheme(){
    return setTheme(current()==="light"?"dark":"light");
  }

  window.ControlTheme=Object.freeze({
    get:current,
    set:setTheme,
    toggle:toggleTheme
  });

  window.addEventListener("click",event=>{
    const button=event.target.closest?.(".control-theme-toggle");
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleTheme();
  },true);

  window.addEventListener("storage",event=>{
    if(event.key!==KEY)return;
    if(event.newValue==="light"||event.newValue==="dark")setTheme(event.newValue,{persist:false});
  });

  updateButtons();
})();
