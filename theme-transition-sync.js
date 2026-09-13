(function initSynchronizedThemeTransition(){
  "use strict";

  const root=document.documentElement;
  const STORAGE_KEY="control-ds-theme";
  const DURATION=240;
  let fallbackTimer=0;
  let running=false;

  function normalize(value){return value==="light"?"light":"dark";}
  function current(){return root.dataset.theme==="light"?"light":"dark";}
  function reduceMotion(){return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;}

  function updateButtons(){
    const light=current()==="light";
    document.querySelectorAll(".control-theme-toggle").forEach(button=>{
      const state=light?"light":"dark";
      if(button.dataset.themeState!==state){
        button.innerHTML='<span aria-hidden="true">'+(light?'☾':'☀')+'</span><span class="theme-label">'+(light?'Tema escuro':'Tema claro')+'</span>';
        button.dataset.themeState=state;
      }
      button.setAttribute("aria-pressed",String(light));
      button.setAttribute("aria-label",light?"Mudar para tema escuro":"Mudar para tema claro");
      button.title=light?"Mudar para tema escuro":"Mudar para tema claro";
    });
  }

  function apply(theme,persist){
    const next=normalize(theme);
    root.dataset.theme=next;
    root.classList.toggle("theme-light",next==="light");
    root.classList.toggle("theme-dark",next==="dark");
    root.style.colorScheme=next;
    if(persist!==false){try{localStorage.setItem(STORAGE_KEY,next);}catch(_){}}
    updateButtons();
    try{window.dispatchEvent(new CustomEvent("control-theme-change",{detail:{theme:next}}));}catch(_){ }
    return next;
  }

  function setTheme(theme,options){
    const target=normalize(theme);
    const persist=!options||options.persist!==false;
    const animate=(!options||options.skipTransition!==true)&&current()!==target&&!reduceMotion();
    if(current()===target){apply(target,persist);return target;}

    if(persist){try{localStorage.setItem(STORAGE_KEY,target);}catch(_){}}

    if(animate&&typeof document.startViewTransition==="function"&&!running){
      running=true;
      root.classList.remove("theme-transitioning");
      root.classList.add("theme-view-transitioning");
      const transition=document.startViewTransition(()=>apply(target,false));
      transition.finished.catch(()=>{}).finally(()=>{
        running=false;
        root.classList.remove("theme-view-transitioning");
      });
      return target;
    }

    if(animate){
      clearTimeout(fallbackTimer);
      root.classList.remove("theme-view-transitioning");
      root.classList.add("theme-transitioning");
      void root.offsetWidth;
      apply(target,false);
      fallbackTimer=setTimeout(()=>root.classList.remove("theme-transitioning"),DURATION+40);
    }else apply(target,false);
    return target;
  }

  function toggleTheme(){return setTheme(current()==="light"?"dark":"light");}

  window.ControlTheme=Object.freeze({get:current,set:setTheme,toggle:toggleTheme});

  /* Os botões criados pelo config.js possuem um listener antigo fechado em escopo.
     Interceptamos somente esses botões para evitar duas trocas no mesmo clique. */
  document.addEventListener("click",event=>{
    const button=event.target.closest?.(".control-theme-toggle");
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleTheme();
  },true);

  window.addEventListener("storage",event=>{
    if(event.key!==STORAGE_KEY)return;
    if(event.newValue==="light"||event.newValue==="dark")setTheme(event.newValue,{persist:false});
  });

  updateButtons();
})();
