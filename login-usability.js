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
