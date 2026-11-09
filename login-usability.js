(function initLoginUsability(){
  "use strict";

  const STYLE_ID="eteLoginUsabilityStyles";

  function ensureStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      body.auth-locked .login-password-wrap{position:relative;width:100%;min-width:0;margin-top:8px}
      body.auth-locked .login-password-wrap>#loginPassword{display:block;width:100%!important;box-sizing:border-box!important;margin-top:0!important;padding-right:90px!important}
      body.auth-locked .login-password-toggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:72px;min-width:72px;max-width:72px;height:38px;box-sizing:border-box;padding:0 6px;white-space:nowrap;border:1px solid #43515e;border-radius:9px;background:#1a2229;color:#d4dde3;font:inherit;font-size:10.5px;font-weight:820;line-height:1;display:grid;place-items:center;cursor:pointer;box-shadow:none!important;transition:background .14s ease,border-color .14s ease,color .14s ease}
      body.auth-locked .login-password-toggle:hover{background:#24313a;border-color:#5d7481;color:#f3f6f8}
      body.auth-locked .login-password-toggle:focus-visible{outline:2px solid #7895a8;outline-offset:2px;box-shadow:none!important}
      html[data-theme="light"] body.auth-locked .login-password-toggle{background:#e7eef1;border-color:#9fb4be;color:#2c414a}
      html[data-theme="light"] body.auth-locked .login-password-toggle:hover{background:#dde8ec;border-color:#879faa;color:#20323a}
      body.auth-locked #loginPassword::-ms-reveal,body.auth-locked #loginPassword::-ms-clear{display:none}
      @media(max-width:420px){body.auth-locked .login-password-toggle{right:7px;height:40px;font-size:11px}}
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
    toggle.setAttribute("aria-controls","loginPassword");
    wrap.appendChild(toggle);

    toggle.addEventListener("click",()=>{
      const show=password.type==="password";
      password.type=show?"text":"password";
      toggle.textContent=show?"Ocultar":"Mostrar";
      toggle.setAttribute("aria-label",show?"Ocultar senha":"Mostrar senha");
      toggle.setAttribute("aria-pressed",String(show));
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
