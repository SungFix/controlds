(function initPortalAdmin(){
  "use strict";

  const FUNCTION_NAME="admin-user-management";
  let panel=null;
  let resetModal=null;
  let users=[];
  let targetUser=null;
  let observerQueued=false;

  function getCurrentUser(){
    try{if(typeof currentUser!=="undefined"&&currentUser)return currentUser;}catch(_){}
    return null;
  }

  function isAdmin(){
    const user=getCurrentUser();
    return String(user?.username||"").trim().toLowerCase()==="adm"&&String(user?.role||"")==="adm";
  }

  function getClient(){
    try{
      if(typeof initSupabase==="function")return initSupabase();
      if(typeof sb!=="undefined"&&sb)return sb;
    }catch(_){}
    return null;
  }

  function friendlyError(code){
    const map={
      unauthorized:"Sua sessão expirou. Entre novamente.",
      forbidden:"Sua conta não possui autorização para esta área.",
      invalid_user:"Usuário inválido.",
      user_not_found:"Usuário não encontrado.",
      password_too_short:"A nova senha precisa ter pelo menos 8 caracteres.",
      password_too_long:"A nova senha é muito longa.",
      password_update_failed:"Não foi possível alterar a senha. Tente uma senha diferente.",
      password_updated_audit_failed:"A senha foi alterada, mas houve falha ao registrar a auditoria. Não repita a operação agora.",
      rate_limited:"Muitas alterações em pouco tempo. Aguarde um minuto e tente novamente.",
      user_list_failed:"Não foi possível carregar os usuários.",
      rate_check_failed:"Não foi possível validar o limite de segurança.",
      server_configuration_error:"A função administrativa não está configurada corretamente.",
      invalid_action:"Ação administrativa inválida."
    };
    return map[code]||"Não foi possível concluir a operação.";
  }

  async function invokeAdmin(body){
    const client=getClient();
    if(!client)throw new Error("client_unavailable");
    const{data,error}=await client.functions.invoke(FUNCTION_NAME,{body});
    if(error){
      let code="request_failed";
      try{
        const response=error.context;
        if(response&&typeof response.clone==="function"){
          const payload=await response.clone().json();
          if(payload?.error)code=String(payload.error);
        }
      }catch(_){}
      const err=new Error(code);
      err.code=code;
      throw err;
    }
    if(!data?.ok){
      const code=String(data?.error||"request_failed");
      const err=new Error(code);
      err.code=code;
      err.passwordUpdated=!!data?.password_updated;
      throw err;
    }
    return data;
  }

  function ensureEntryStyles(){
    if(document.getElementById("eteAdminEntryStyles"))return;
    const style=document.createElement("style");
    style.id="eteAdminEntryStyles";
    style.textContent=`
      .ete-control-admin-button{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:7px!important;
        min-height:48px!important;
        padding:0 14px!important;
        border-color:#38434e!important;
        background:#15191e!important;
        color:#dfe5ea!important;
        white-space:nowrap!important;
      }
      .ete-control-admin-button:hover{
        background:#1d232a!important;
        border-color:#52606e!important;
      }
      .ete-control-admin-button .ete-config-icon{
        font-size:15px!important;
        line-height:1!important;
      }
      .ete-control-admin-button .ete-config-label{
        font-size:10px!important;
        font-weight:850!important;
      }
      html[data-theme="light"] .ete-control-admin-button{
        background:#f7fafc!important;
        border-color:#cad6de!important;
        color:#324b5d!important;
      }
      @media(max-width:820px){
        .ete-control-admin-button{
          width:40px!important;
          min-width:40px!important;
          min-height:40px!important;
          padding:0!important;
          border-radius:10px!important;
        }
        .ete-control-admin-button .ete-config-label{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePortalButton(admin){
    const actions=document.querySelector("#eteCentralPortal .ete-portal-actions");
    let button=document.getElementById("etePortalAdminButton");
    if(!actions||!admin){
      button?.remove();
      return;
    }
    if(button)return;
    button=document.createElement("button");
    button.type="button";
    button.id="etePortalAdminButton";
    button.className="ete-portal-admin-button";
    button.textContent="Administração";
    button.title="Abrir configurações administrativas";
    button.addEventListener("click",openPanel);
    const themeButton=actions.querySelector("#etePortalTheme");
    actions.insertBefore(button,themeButton||actions.firstChild);
  }

  function ensureControlConfigButton(admin){
    const actions=document.querySelector(".topbar .topbar-right");
    let button=document.getElementById("eteControlAdminConfigButton");
    if(!actions||!admin){
      button?.remove();
      return;
    }
    if(button)return;
    button=document.createElement("button");
    button.type="button";
    button.id="eteControlAdminConfigButton";
    button.className="btn secondary small ete-control-admin-button";
    button.setAttribute("aria-label","Abrir configurações administrativas");
    button.title="Configurações administrativas";
    button.innerHTML='<span class="ete-config-icon" aria-hidden="true">⚙</span><span class="ete-config-label">Config</span>';
    button.addEventListener("click",openPanel);
    const account=actions.querySelector(".header-account");
    actions.insertBefore(button,account||actions.querySelector("#logoutBtn")||actions.firstChild);
  }

  function ensureAdminButtons(){
    ensureEntryStyles();
    const admin=isAdmin();
    ensurePortalButton(admin);
    ensureControlConfigButton(admin);
    if(!admin&&panel&&!panel.hidden)closePanel();
  }

  function roleLabel(role){
    const value=String(role||"");
    if(value==="adm")return"Administrador";
    if(value==="diretor")return"Diretor";
    if(value==="professor")return"Professor";
    if(value==="monitor")return"Monitor";
    return value||"Sem função";
  }

  function escapeHtml(value){
    return String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }

  function buildPanel(){
    if(panel||!document.body)return panel;
    panel=document.createElement("section");
    panel.id="etePortalAdminPanel";
    panel.className="ete-admin-layer";
    panel.hidden=true;
    panel.setAttribute("aria-label","Configurações administrativas");
    panel.innerHTML=`
      <div class="ete-admin-shell">
        <header class="ete-admin-topbar">
          <div>
            <span class="ete-admin-kicker">Portal ETE</span>
            <h1>Configurações administrativas</h1>
            <p>Gerencie usuários e credenciais com validação segura no Supabase.</p>
          </div>
          <button type="button" class="ete-admin-close" data-admin-close aria-label="Fechar">×</button>
        </header>
        <div class="ete-admin-toolbar">
          <label class="ete-admin-search">
            <span>Buscar usuário</span>
            <input type="search" id="eteAdminSearch" placeholder="Nome ou usuário" autocomplete="off">
          </label>
          <button type="button" class="ete-admin-refresh" data-admin-refresh>Atualizar</button>
        </div>
        <div class="ete-admin-notice" id="eteAdminNotice" hidden></div>
        <div class="ete-admin-list" id="eteAdminUserList"><div class="ete-admin-loading">Carregando usuários...</div></div>
      </div>`;
    panel.addEventListener("click",event=>{
      if(event.target.closest("[data-admin-close]")){closePanel();return;}
      if(event.target.closest("[data-admin-refresh]")){loadUsers();return;}
      const resetButton=event.target.closest("[data-admin-reset]");
      if(resetButton){
        const id=String(resetButton.dataset.adminReset||"");
        const user=users.find(item=>String(item.user_id)===id);
        if(user)openReset(user);
      }
    });
    panel.querySelector("#eteAdminSearch")?.addEventListener("input",renderUsers);
    document.body.appendChild(panel);
    return panel;
  }

  function buildResetModal(){
    if(resetModal||!document.body)return resetModal;
    resetModal=document.createElement("div");
    resetModal.id="eteAdminResetModal";
    resetModal.className="ete-admin-modal-layer";
    resetModal.hidden=true;
    resetModal.innerHTML=`
      <section class="ete-admin-modal" role="dialog" aria-modal="true" aria-labelledby="eteAdminResetTitle">
        <button type="button" class="ete-admin-modal-close" data-reset-close aria-label="Fechar">×</button>
        <span class="ete-admin-kicker">Credenciais</span>
        <h2 id="eteAdminResetTitle">Redefinir senha</h2>
        <p class="ete-admin-target" id="eteAdminResetTarget"></p>
        <div class="ete-admin-self-warning" id="eteAdminSelfWarning" hidden>Você está alterando a senha da conta administrativa principal.</div>
        <form id="eteAdminResetForm" novalidate>
          <label class="ete-admin-field">
            <span>Nova senha</span>
            <div class="ete-admin-password-wrap">
              <input type="password" id="eteAdminNewPassword" minlength="8" maxlength="128" autocomplete="new-password" required>
              <button type="button" class="ete-admin-show-password" data-toggle-password="eteAdminNewPassword">Mostrar</button>
            </div>
          </label>
          <div class="ete-admin-strength" id="eteAdminStrength">Use pelo menos 8 caracteres.</div>
          <label class="ete-admin-field">
            <span>Confirmar nova senha</span>
            <div class="ete-admin-password-wrap">
              <input type="password" id="eteAdminConfirmPassword" minlength="8" maxlength="128" autocomplete="new-password" required>
              <button type="button" class="ete-admin-show-password" data-toggle-password="eteAdminConfirmPassword">Mostrar</button>
            </div>
          </label>
          <div class="ete-admin-form-error" id="eteAdminFormError" hidden></div>
          <div class="ete-admin-modal-actions">
            <button type="button" class="ete-admin-cancel" data-reset-close>Cancelar</button>
            <button type="submit" class="ete-admin-save" id="eteAdminSavePassword">Salvar nova senha</button>
          </div>
        </form>
      </section>`;
    resetModal.addEventListener("click",event=>{
      if(event.target===resetModal||event.target.closest("[data-reset-close]")){closeReset();return;}
      const toggle=event.target.closest("[data-toggle-password]");
      if(toggle){
        const input=document.getElementById(toggle.dataset.togglePassword||"");
        if(input){
          const show=input.type==="password";
          input.type=show?"text":"password";
          toggle.textContent=show?"Ocultar":"Mostrar";
        }
      }
    });
    resetModal.querySelector("#eteAdminNewPassword")?.addEventListener("input",updateStrength);
    resetModal.querySelector("#eteAdminResetForm")?.addEventListener("submit",submitReset);
    document.body.appendChild(resetModal);
    return resetModal;
  }

  function setNotice(message,type){
    buildPanel();
    const node=panel.querySelector("#eteAdminNotice");
    if(!node)return;
    if(!message){node.hidden=true;node.textContent="";node.dataset.type="";return;}
    node.hidden=false;
    node.textContent=message;
    node.dataset.type=type||"info";
  }

  async function openPanel(){
    if(!isAdmin())return;
    buildPanel();
    panel.hidden=false;
    document.body.classList.add("ete-admin-open");
    await loadUsers();
  }

  function closePanel(){
    if(panel)panel.hidden=true;
    document.body.classList.remove("ete-admin-open");
    closeReset();
  }

  async function loadUsers(){
    if(!isAdmin())return;
    buildPanel();
    const list=panel.querySelector("#eteAdminUserList");
    if(list)list.innerHTML='<div class="ete-admin-loading">Carregando usuários...</div>';
    setNotice("","");
    try{
      const data=await invokeAdmin({action:"list_users"});
      users=Array.isArray(data.users)?data.users:[];
      renderUsers();
    }catch(err){
      users=[];
      if(list)list.innerHTML='<div class="ete-admin-empty">Não foi possível carregar os usuários.</div>';
      setNotice(friendlyError(err?.code||err?.message),"error");
    }
  }

  function renderUsers(){
    if(!panel)return;
    const list=panel.querySelector("#eteAdminUserList");
    if(!list)return;
    const search=String(panel.querySelector("#eteAdminSearch")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const filtered=users.filter(user=>{
      if(!search)return true;
      return `${user.display_name||""} ${user.username||""} ${user.role||""}`.toLocaleLowerCase("pt-BR").includes(search);
    });
    if(!filtered.length){list.innerHTML='<div class="ete-admin-empty">Nenhum usuário encontrado.</div>';return;}
    list.innerHTML=filtered.map(user=>{
      const category=user.category?` · ${escapeHtml(user.category)}`:"";
      const self=String(user.username||"").toLowerCase()==="adm"?'<span class="ete-admin-you">Conta principal</span>':"";
      return `<article class="ete-admin-user-card">
        <div class="ete-admin-user-main">
          <div class="ete-admin-avatar">${escapeHtml(String(user.display_name||user.username||"U").slice(0,1).toUpperCase())}</div>
          <div>
            <div class="ete-admin-user-title"><strong>${escapeHtml(user.display_name||user.username||"Usuário")}</strong>${self}</div>
            <span>@${escapeHtml(user.username||"")}</span>
            <small>${escapeHtml(roleLabel(user.role))}${category}</small>
          </div>
        </div>
        <button type="button" class="ete-admin-reset-button" data-admin-reset="${escapeHtml(user.user_id)}">Redefinir senha</button>
      </article>`;
    }).join("");
  }

  function openReset(user){
    if(!isAdmin())return;
    targetUser=user;
    buildResetModal();
    const name=user.display_name||user.username||"Usuário";
    resetModal.querySelector("#eteAdminResetTarget").textContent=`${name} (@${user.username||""})`;
    resetModal.querySelector("#eteAdminSelfWarning").hidden=String(user.username||"").toLowerCase()!=="adm";
    const pass=resetModal.querySelector("#eteAdminNewPassword");
    const confirm=resetModal.querySelector("#eteAdminConfirmPassword");
    if(pass){pass.value="";pass.type="password";}
    if(confirm){confirm.value="";confirm.type="password";}
    resetModal.querySelectorAll("[data-toggle-password]").forEach(button=>button.textContent="Mostrar");
    const error=resetModal.querySelector("#eteAdminFormError");
    if(error){error.hidden=true;error.textContent="";}
    updateStrength();
    resetModal.hidden=false;
    document.body.classList.add("ete-admin-modal-open");
    setTimeout(()=>pass?.focus(),0);
  }

  function closeReset(){
    if(resetModal){
      resetModal.hidden=true;
      const pass=resetModal.querySelector("#eteAdminNewPassword");
      const confirm=resetModal.querySelector("#eteAdminConfirmPassword");
      if(pass)pass.value="";
      if(confirm)confirm.value="";
    }
    targetUser=null;
    document.body.classList.remove("ete-admin-modal-open");
  }

  function strengthFor(password){
    if(!password)return{label:"Use pelo menos 8 caracteres.",level:"none"};
    if(password.length<8)return{label:`Faltam ${8-password.length} caractere(s).`,level:"weak"};
    let score=0;
    if(password.length>=8)score++;
    if(password.length>=12)score++;
    if(/[a-z]/.test(password)&&/[A-Z]/.test(password))score++;
    if(/\d/.test(password))score++;
    if(/[^A-Za-z0-9]/.test(password))score++;
    if(score>=4)return{label:"Senha forte",level:"strong"};
    if(score>=3)return{label:"Senha média",level:"medium"};
    return{label:"Senha fraca",level:"weak"};
  }

  function updateStrength(){
    if(!resetModal)return;
    const password=String(resetModal.querySelector("#eteAdminNewPassword")?.value||"");
    const state=strengthFor(password);
    const node=resetModal.querySelector("#eteAdminStrength");
    if(node){node.textContent=state.label;node.dataset.level=state.level;}
  }

  async function submitReset(event){
    event.preventDefault();
    if(!isAdmin()||!targetUser)return;
    const password=String(resetModal.querySelector("#eteAdminNewPassword")?.value||"");
    const confirmation=String(resetModal.querySelector("#eteAdminConfirmPassword")?.value||"");
    const errorNode=resetModal.querySelector("#eteAdminFormError");
    const submit=resetModal.querySelector("#eteAdminSavePassword");
    const showError=message=>{if(errorNode){errorNode.hidden=false;errorNode.textContent=message;}};
    if(errorNode){errorNode.hidden=true;errorNode.textContent="";}
    if(password.length<8){showError("A senha precisa ter pelo menos 8 caracteres.");return;}
    if(password.length>128){showError("A senha é muito longa.");return;}
    if(password!==confirmation){showError("As senhas digitadas não são iguais.");return;}

    const targetName=targetUser.display_name||targetUser.username||"este usuário";
    const self=String(targetUser.username||"").toLowerCase()==="adm";
    const message=self
      ?`Você está alterando a senha da conta administrativa principal (${targetName}). Deseja continuar?`
      :`Tem certeza de que deseja redefinir a senha de ${targetName}?`;
    if(!window.confirm(message))return;

    const oldText=submit?.textContent||"Salvar nova senha";
    if(submit){submit.disabled=true;submit.textContent="Salvando...";}
    try{
      await invokeAdmin({action:"reset_password",user_id:targetUser.user_id,new_password:password});
      closeReset();
      setNotice(`Senha de ${targetName} redefinida com sucesso.`,"success");
    }catch(err){
      if(err?.passwordUpdated){
        showError("A senha foi alterada, mas houve falha na auditoria. Não envie novamente agora.");
      }else{
        showError(friendlyError(err?.code||err?.message));
      }
    }finally{
      if(submit){submit.disabled=false;submit.textContent=oldText;}
    }
  }

  function install(){
    ensureAdminButtons();
    if(!document.body)return;
    const observer=new MutationObserver(()=>{
      if(observerQueued)return;
      observerQueued=true;
      requestAnimationFrame(()=>{observerQueued=false;ensureAdminButtons();});
    });
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener("pageshow",ensureAdminButtons);
    document.addEventListener("keydown",event=>{
      if(event.key!=="Escape")return;
      if(resetModal&&!resetModal.hidden){closeReset();return;}
      if(panel&&!panel.hidden)closePanel();
    });
    setTimeout(ensureAdminButtons,80);
    setTimeout(ensureAdminButtons,300);
    setTimeout(ensureAdminButtons,800);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();

  window.ETEPortalAdmin=Object.freeze({
    open:openPanel,
    close:closePanel,
    refresh:loadUsers
  });
})();
