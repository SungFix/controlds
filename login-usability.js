(function initLoginUsability(){
  "use strict";

  const STYLE_ID="eteLoginUsabilityStyles";

  function ensureStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      body.auth-locked .login-password-wrap{position:relative;width:100%;margin-top:8px}
      body.auth-locked .login-password-wrap>#loginPassword{margin-top:0!important;padding-right:78px!important}
      body.auth-locked .login-password-toggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);min-width:60px;height:36px;padding:0 8px;border:1px solid #303943;border-radius:9px;background:#151b21;color:#aeb8c1;font:inherit;font-size:9px;font-weight:850;line-height:1;display:grid;place-items:center;cursor:pointer;box-shadow:none!important;transition:background .14s ease,border-color .14s ease,color .14s ease}
      body.auth-locked .login-password-toggle:hover{background:#1a2229;border-color:#43515e;color:#e5eaed}
      body.auth-locked .login-password-toggle:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(95,127,174,.12)!important}
      html[data-theme="light"] body.auth-locked .login-password-toggle{background:#e4e8e1;border-color:#b9c5be;color:#5f716c}
      html[data-theme="light"] body.auth-locked .login-password-toggle:hover{background:#dce3dd;border-color:#a9b9b0;color:#4f625c}
      @media(max-width:420px){body.auth-locked .login-password-toggle{right:7px;height:34px;min-width:58px}}
    `;
    document.head.appendChild(style);
  }

  function mount(){
    const username=document.getElementById("loginUsername");
    const password=document.getElementById("loginPassword");
    if(username){
      username.autocomplete="username";
      username.autocapitalize="none";
      username.spellcheck=false;
    }
    if(!password||password.dataset.usabilityReady==="1")return;
    password.dataset.usabilityReady="1";
    password.autocomplete="current-password";
    ensureStyles();

    const parent=password.parentElement;
    if(!parent)return;
    const wrap=document.createElement("div");
    wrap.className="login-password-wrap";
    parent.insertBefore(wrap,password);
    wrap.appendChild(password);

    const toggle=document.createElement("button");
    toggle.type="button";
    toggle.className="login-password-toggle";
    toggle.textContent="Mostrar";
    toggle.setAttribute("aria-label","Mostrar senha");
    toggle.setAttribute("aria-pressed","false");
    wrap.appendChild(toggle);

    toggle.addEventListener("click",()=>{
      const show=password.type==="password";
      password.type=show?"text":"password";
      toggle.textContent=show?"Ocultar":"Mostrar";
      toggle.setAttribute("aria-label",show?"Ocultar senha":"Mostrar senha");
      toggle.setAttribute("aria-pressed",String(show));
      password.focus({preventScroll:true});
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();

(function initSmoothThemeSync(){
  "use strict";

  const root=document.documentElement;
  const STORAGE_KEY="control-ds-theme";
  const DURATION=240;
  let fallbackTimer=0;
  let running=false;

  function ensureTransitionStyle(){
    if(document.getElementById("eteThemeSyncStyle"))return;
    const style=document.createElement("style");
    style.id="eteThemeSyncStyle";
    style.textContent=`
      :root{--ete-theme-sync-duration:${DURATION}ms;--ete-theme-sync-ease:cubic-bezier(.22,.72,.24,1)}
      html.ete-theme-fallback body,html.ete-theme-fallback body *,html.ete-theme-fallback body *::before,html.ete-theme-fallback body *::after{transition-property:background-color,color,border-color,fill,stroke,outline-color!important;transition-duration:var(--ete-theme-sync-duration)!important;transition-delay:0ms!important;transition-timing-function:var(--ete-theme-sync-ease)!important}
      html.ete-theme-view,html.ete-theme-view body,html.ete-theme-view body *,html.ete-theme-view body *::before,html.ete-theme-view body *::after{transition:none!important}
      ::view-transition-group(root){animation-duration:var(--ete-theme-sync-duration)!important;animation-timing-function:var(--ete-theme-sync-ease)!important}
      ::view-transition-old(root),::view-transition-new(root){animation-duration:var(--ete-theme-sync-duration)!important;animation-timing-function:var(--ete-theme-sync-ease)!important;mix-blend-mode:normal}
      ::view-transition-old(root){animation-name:ete-theme-old!important}
      ::view-transition-new(root){animation-name:ete-theme-new!important}
      @keyframes ete-theme-old{from{opacity:1}to{opacity:0}}
      @keyframes ete-theme-new{from{opacity:0}to{opacity:1}}
      @media(prefers-reduced-motion:reduce){html.ete-theme-fallback body,html.ete-theme-fallback body *,html.ete-theme-fallback body *::before,html.ete-theme-fallback body *::after{transition:none!important}::view-transition-group(root),::view-transition-old(root),::view-transition-new(root){animation-duration:0s!important}}
    `;
    document.head.appendChild(style);
  }

  function normalize(value){return value==="light"?"light":"dark";}
  function current(){return root.dataset.theme==="light"?"light":"dark";}
  function reduced(){return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;}

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
    const animate=(!options||options.skipTransition!==true)&&current()!==target&&!reduced();
    if(current()===target){apply(target,persist);return target;}
    if(persist){try{localStorage.setItem(STORAGE_KEY,target);}catch(_){}}

    if(animate&&typeof document.startViewTransition==="function"&&!running){
      running=true;
      root.classList.remove("theme-transitioning","ete-theme-fallback");
      root.classList.add("ete-theme-view");
      const transition=document.startViewTransition(()=>apply(target,false));
      transition.finished.catch(()=>{}).finally(()=>{
        running=false;
        root.classList.remove("ete-theme-view");
      });
      return target;
    }

    if(animate){
      clearTimeout(fallbackTimer);
      root.classList.remove("ete-theme-view");
      root.classList.add("ete-theme-fallback");
      void root.offsetWidth;
      apply(target,false);
      fallbackTimer=setTimeout(()=>root.classList.remove("ete-theme-fallback"),DURATION+30);
    }else apply(target,false);
    return target;
  }

  function toggleTheme(){return setTheme(current()==="light"?"dark":"light");}

  ensureTransitionStyle();
  window.ControlTheme=Object.freeze({get:current,set:setTheme,toggle:toggleTheme});

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
