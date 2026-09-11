(function initPortalAdmin(){
  "use strict";

  const FUNCTION_NAME="admin-user-management";
  const CAPABILITIES=Object.freeze([
    {key:"control_ds_access",label:"Acesso ao Control Ds",description:"Permite entrar no módulo Control Ds pelo Portal ETE."},
    {key:"atestados_access",label:"Acesso ao Atestados",description:"Permite entrar no módulo de atestados pelo Portal ETE."},
    {key:"can_create_requests",label:"Criar pedidos",description:"Permite criar novos pedidos de notebook."},
    {key:"can_manage_students",label:"Gerenciar alunos",description:"Cadastrar, editar e remover alunos no Control Ds."},
    {key:"can_manage_permissions",label:"Gerenciar permissões",description:"Criar, cancelar, restaurar e apagar permissões."},
    {key:"can_confirm_exits",label:"Confirmar saídas",description:"Registrar a confirmação de saída de um aluno."},
    {key:"can_pickup_notebooks",label:"Confirmar retirada",description:"Confirmar a retirada de notebooks nos pedidos."},
    {key:"can_return_notebooks",label:"Confirmar devolução",description:"Confirmar a devolução de notebooks em uso."},
    {key:"can_clear_history",label:"Apagar histórico",description:"Permite limpar o histórico do Control Ds."}
  ]);

  const CAPABILITY_LABELS=Object.freeze(Object.fromEntries(CAPABILITIES.map(item=>[item.key,item.label])));

  let panel=null;
  let resetModal=null;
  let permissionsModal=null;
  let users=[];
  let activity=[];
  let targetUser=null;
  let permissionTarget=null;
  let activeTab="overview";
  let observerQueued=false;
  let loadingUsers=false;
  let loadingActivity=false;

  function getCurrentUser(){
    try{if(typeof currentUser!=="undefined"&&currentUser)return currentUser;}catch(_){}
    return null;
  }

  function isAdmin(){
    const user=getCurrentUser();
    return String(user?.username||"").trim().toLowerCase()==="adm"&&String(user?.role||"").trim().toLowerCase()==="adm";
  }

  function getClient(){
    try{
      if(typeof initSupabase==="function")return initSupabase();
      if(typeof sb!=="undefined"&&sb)return sb;
    }catch(_){}
    return null;
  }

  function ensureV2Styles(){
    let link=document.getElementById("etePortalAdminV2Styles");
    if(link)return;
    link=document.createElement("link");
    link.id="etePortalAdminV2Styles";
    link.rel="stylesheet";
    link.href="portal-admin-v2.css?v=1";
    document.head.appendChild(link);
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
      activity_list_failed:"Não foi possível carregar a atividade administrativa.",
      invalid_permissions:"As permissões enviadas são inválidas.",
      permissions_load_failed:"Não foi possível carregar as permissões deste usuário.",
      permissions_update_failed:"Não foi possível salvar as permissões.",
      rate_check_failed:"Não foi possível validar o limite de segurança.",
      server_configuration_error:"A função administrativa não está configurada corretamente.",
      admin_session_unavailable:"Sua sessão administrativa não está disponível. Entre novamente.",
      invalid_action:"Ação administrativa inválida."
    };
    return map[code]||"Não foi possível concluir a operação.";
  }

  async function currentSession(client){
    if(!client?.auth)return null;
    let result=await client.auth.getSession();
    let session=result?.data?.session||null;
    if(result?.error||!session)return null;
    const expiresAt=Number(session.expires_at||0)*1000;
    if(expiresAt&&expiresAt-Date.now()<60000){
      const refreshed=await client.auth.refreshSession();
      if(!refreshed?.error&&refreshed?.data?.session)session=refreshed.data.session;
    }
    return session;
  }

  async function invokeAdmin(body){
    const client=getClient();
    if(!client)throw Object.assign(new Error("client_unavailable"),{code:"client_unavailable"});
    const session=await currentSession(client);
    const cfg=window.ETE_CONFIG||{};
    const supabaseUrl=String(cfg.supabaseUrl||"").replace(/\/$/,"");
    const publishableKey=String(cfg.supabasePublishableKey||"");
    if(!session?.access_token||!supabaseUrl||!publishableKey){
      throw Object.assign(new Error("admin_session_unavailable"),{code:"admin_session_unavailable"});
    }

    let response;
    try{
      response=await fetch(`${supabaseUrl}/functions/v1/${FUNCTION_NAME}`,{
        method:"POST",
        mode:"cors",
        credentials:"omit",
        cache:"no-store",
        headers:{
          "Content-Type":"application/json",
          "apikey":publishableKey,
          "Authorization":`Bearer ${session.access_token}`
        },
        body:JSON.stringify(body||{})
      });
    }catch(_){
      throw Object.assign(new Error("request_failed"),{code:"request_failed"});
    }

    let data=null;
    try{data=await response.json();}catch(_){}
    if(!response.ok||!data?.ok){
      const code=String(data?.error||"request_failed");
      const err=Object.assign(new Error(code),{code,passwordUpdated:!!data?.password_updated});
      throw err;
    }
    return data;
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

  function ensurePortalButton(){
    const portal=document.getElementById("eteCentralPortal");
    let button=document.getElementById("etePortalAdminButton");
    if(!portal||!isAdmin()){
      button?.remove();
      return;
    }
    if(button)return;
    const actions=portal.querySelector(".ete-portal-actions");
    if(!actions)return;
    button=document.createElement("button");
    button.type="button";
    button.id="etePortalAdminButton";
    button.className="ete-portal-admin-button";
    button.textContent="Administração";
    button.title="Administração";
    button.setAttribute("aria-label","Administração");
    button.addEventListener("click",openPanel);
    actions.insertBefore(button,actions.firstChild);
  }

  function buildPanel(){
    if(panel||!document.body)return panel;
    ensureV2Styles();
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
            <p>Controle usuários, permissões, credenciais e auditoria do Portal ETE.</p>
          </div>
          <button type="button" class="ete-admin-close" data-admin-close aria-label="Fechar">×</button>
        </header>

        <nav class="ete-admin-tabs" aria-label="Seções administrativas">
          <button type="button" class="ete-admin-tab active" data-admin-tab="overview">Visão geral</button>
          <button type="button" class="ete-admin-tab" data-admin-tab="users">Usuários</button>
          <button type="button" class="ete-admin-tab" data-admin-tab="activity">Atividade</button>
          <button type="button" class="ete-admin-tab" data-admin-tab="security">Segurança</button>
        </nav>

        <div class="ete-admin-notice" id="eteAdminNotice" hidden></div>

        <section class="ete-admin-view" data-admin-view="overview">
          <div class="ete-admin-view-head"><div><h2>Visão geral</h2><p>Resumo das permissões e do uso administrativo.</p></div><button type="button" class="ete-admin-refresh" data-admin-refresh>Atualizar</button></div>
          <div class="ete-admin-overview-grid" id="eteAdminOverviewGrid"><div class="ete-admin-loading">Carregando resumo...</div></div>
          <div class="ete-admin-overview-note"><strong>Permissões centralizadas no Supabase.</strong> Alterações feitas aqui passam a controlar o Portal ETE e as principais ações do Control Ds no backend.</div>
        </section>

        <section class="ete-admin-view" data-admin-view="users" hidden>
          <div class="ete-admin-view-head"><div><h2>Usuários</h2><p>Libere módulos, ações do Control Ds e redefina senhas.</p></div></div>
          <div class="ete-admin-toolbar-v2">
            <label class="ete-admin-search"><span>Buscar usuário</span><input type="search" id="eteAdminSearch" placeholder="Nome ou usuário" autocomplete="off"></label>
            <button type="button" class="ete-admin-refresh" data-admin-refresh>Atualizar</button>
          </div>
          <div class="ete-admin-list" id="eteAdminUserList"><div class="ete-admin-loading">Carregando usuários...</div></div>
        </section>

        <section class="ete-admin-view" data-admin-view="activity" hidden>
          <div class="ete-admin-view-head"><div><h2>Atividade administrativa</h2><p>Registro das mudanças feitas pelo administrador, sem armazenar senhas.</p></div><button type="button" class="ete-admin-refresh" data-admin-refresh>Atualizar</button></div>
          <div class="ete-admin-activity" id="eteAdminActivity"><div class="ete-admin-loading">Carregando atividade...</div></div>
        </section>

        <section class="ete-admin-view" data-admin-view="security" hidden>
          <div class="ete-admin-view-head"><div><h2>Segurança</h2><p>Proteções aplicadas às configurações administrativas.</p></div></div>
          <div class="ete-admin-security-grid" id="eteAdminSecurityGrid"></div>
        </section>
      </div>`;

    panel.addEventListener("click",event=>{
      if(event.target.closest("[data-admin-close]")){closePanel();return;}
      const tab=event.target.closest("[data-admin-tab]");
      if(tab){setTab(String(tab.dataset.adminTab||"overview"));return;}
      if(event.target.closest("[data-admin-refresh]")){refreshCurrentTab();return;}
      const resetButton=event.target.closest("[data-admin-reset]");
      if(resetButton){
        const user=users.find(item=>String(item.user_id)===String(resetButton.dataset.adminReset||""));
        if(user)openReset(user);
        return;
      }
      const permissionsButton=event.target.closest("[data-admin-permissions]");
      if(permissionsButton){
        const user=users.find(item=>String(item.user_id)===String(permissionsButton.dataset.adminPermissions||""));
        if(user)openPermissions(user);
        return;
      }
      if(event.target.closest("[data-admin-self-password]")){
        const self=users.find(item=>String(item.username||"").toLowerCase()==="adm");
        if(self)openReset(self);
      }
    });

    panel.querySelector("#eteAdminSearch")?.addEventListener("input",renderUsers);
    document.body.appendChild(panel);
    renderSecurity();
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
          <label class="ete-admin-field"><span>Nova senha</span><div class="ete-admin-password-wrap"><input type="password" id="eteAdminNewPassword" minlength="8" maxlength="128" autocomplete="new-password" required><button type="button" class="ete-admin-show-password" data-toggle-password="eteAdminNewPassword">Mostrar</button></div></label>
          <div class="ete-admin-strength" id="eteAdminStrength">Use pelo menos 8 caracteres.</div>
          <label class="ete-admin-field"><span>Confirmar nova senha</span><div class="ete-admin-password-wrap"><input type="password" id="eteAdminConfirmPassword" minlength="8" maxlength="128" autocomplete="new-password" required><button type="button" class="ete-admin-show-password" data-toggle-password="eteAdminConfirmPassword">Mostrar</button></div></label>
          <div class="ete-admin-form-error" id="eteAdminFormError" hidden></div>
          <div class="ete-admin-modal-actions"><button type="button" class="ete-admin-cancel" data-reset-close>Cancelar</button><button type="submit" class="ete-admin-save" id="eteAdminSavePassword">Salvar nova senha</button></div>
        </form>
      </section>`;
    resetModal.addEventListener("click",event=>{
      if(event.target===resetModal||event.target.closest("[data-reset-close]")){closeReset();return;}
      const toggle=event.target.closest("[data-toggle-password]");
      if(toggle){
        const input=document.getElementById(toggle.dataset.togglePassword||"");
        if(input){const show=input.type==="password";input.type=show?"text":"password";toggle.textContent=show?"Ocultar":"Mostrar";}
      }
    });
    resetModal.querySelector("#eteAdminNewPassword")?.addEventListener("input",updateStrength);
    resetModal.querySelector("#eteAdminResetForm")?.addEventListener("submit",submitReset);
    document.body.appendChild(resetModal);
    return resetModal;
  }

  function buildPermissionsModal(){
    if(permissionsModal||!document.body)return permissionsModal;
    permissionsModal=document.createElement("div");
    permissionsModal.id="eteAdminPermissionsModal";
    permissionsModal.className="ete-admin-modal-layer";
    permissionsModal.hidden=true;
    permissionsModal.innerHTML=`
      <section class="ete-admin-modal ete-admin-permission-modal" role="dialog" aria-modal="true" aria-labelledby="eteAdminPermissionsTitle">
        <button type="button" class="ete-admin-modal-close" data-permissions-close aria-label="Fechar">×</button>
        <span class="ete-admin-kicker">Acesso e capacidades</span>
        <h2 id="eteAdminPermissionsTitle">Permissões do usuário</h2>
        <p class="ete-admin-target" id="eteAdminPermissionsTarget"></p>
        <p class="ete-admin-permission-intro">Desative um módulo para bloquear sua entrada. As ações do Control Ds também são validadas no Supabase.</p>
        <form id="eteAdminPermissionsForm">
          <div class="ete-admin-permission-list" id="eteAdminPermissionList"></div>
          <div class="ete-admin-form-error" id="eteAdminPermissionsError" hidden></div>
          <div class="ete-admin-modal-actions"><button type="button" class="ete-admin-cancel" data-permissions-close>Cancelar</button><button type="submit" class="ete-admin-save" id="eteAdminSavePermissions">Salvar permissões</button></div>
        </form>
      </section>`;
    permissionsModal.addEventListener("click",event=>{if(event.target===permissionsModal||event.target.closest("[data-permissions-close]"))closePermissions();});
    permissionsModal.querySelector("#eteAdminPermissionsForm")?.addEventListener("submit",submitPermissions);
    document.body.appendChild(permissionsModal);
    return permissionsModal;
  }

  function setNotice(message,type){
    buildPanel();
    const node=panel.querySelector("#eteAdminNotice");
    if(!node)return;
    if(!message){node.hidden=true;node.textContent="";node.dataset.type="";return;}
    node.hidden=false;node.textContent=message;node.dataset.type=type||"info";
  }

  function setTab(name){
    activeTab=["overview","users","activity","security"].includes(name)?name:"overview";
    buildPanel();
    panel.querySelectorAll("[data-admin-tab]").forEach(button=>button.classList.toggle("active",button.dataset.adminTab===activeTab));
    panel.querySelectorAll("[data-admin-view]").forEach(view=>view.hidden=view.dataset.adminView!==activeTab);
    if(activeTab==="activity"&&!activity.length&&!loadingActivity)loadActivity().catch(()=>{});
    if(activeTab==="users"&&!users.length&&!loadingUsers)loadUsers().catch(()=>{});
  }

  async function openPanel(){
    if(!isAdmin())return;
    buildPanel();
    panel.hidden=false;
    document.body.classList.add("ete-admin-open");
    setTab(activeTab);
    setNotice("","");
    await Promise.allSettled([loadUsers(true),loadActivity(true)]);
  }

  function closePanel(){
    if(panel)panel.hidden=true;
    document.body.classList.remove("ete-admin-open");
    closeReset();
    closePermissions();
  }

  async function refreshCurrentTab(){
    setNotice("","");
    if(activeTab==="activity")await loadActivity();
    else if(activeTab==="security"){renderSecurity();await loadUsers(true);}
    else await Promise.allSettled([loadUsers(),activeTab==="overview"?loadActivity(true):Promise.resolve()]);
  }

  async function loadUsers(silent){
    if(loadingUsers)return;
    loadingUsers=true;
    const list=panel?.querySelector("#eteAdminUserList");
    if(list&&!silent)list.innerHTML='<div class="ete-admin-loading">Carregando usuários...</div>';
    try{
      const data=await invokeAdmin({action:"list_users"});
      users=Array.isArray(data.users)?data.users:[];
      renderUsers();
      renderOverview();
      renderSecurity();
    }catch(err){
      if(!silent&&list)list.innerHTML='<div class="ete-admin-empty">Não foi possível carregar os usuários.</div>';
      setNotice(friendlyError(err?.code||err?.message),"error");
    }finally{loadingUsers=false;}
  }

  async function loadActivity(silent){
    if(loadingActivity)return;
    loadingActivity=true;
    const node=panel?.querySelector("#eteAdminActivity");
    if(node&&!silent)node.innerHTML='<div class="ete-admin-loading">Carregando atividade...</div>';
    try{
      const data=await invokeAdmin({action:"list_activity"});
      activity=Array.isArray(data.activity)?data.activity:[];
      renderActivity();
      renderOverview();
    }catch(err){
      if(!silent&&node)node.innerHTML='<div class="ete-admin-empty">Não foi possível carregar a atividade.</div>';
      if(!silent)setNotice(friendlyError(err?.code||err?.message),"error");
    }finally{loadingActivity=false;}
  }

  function capability(user,key){return !!user?.capabilities?.[key];}

  function renderOverview(){
    if(!panel)return;
    const node=panel.querySelector("#eteAdminOverviewGrid");
    if(!node)return;
    const total=users.length;
    const control=users.filter(user=>capability(user,"control_ds_access")).length;
    const atestados=users.filter(user=>capability(user,"atestados_access")).length;
    const creators=users.filter(user=>capability(user,"can_create_requests")).length;
    node.innerHTML=`
      <article class="ete-admin-stat"><span>Usuários cadastrados</span><strong>${total}</strong><small>Perfis vinculados ao Supabase Auth</small></article>
      <article class="ete-admin-stat"><span>Control Ds</span><strong>${control}</strong><small>Contas com acesso liberado</small></article>
      <article class="ete-admin-stat"><span>Atestados</span><strong>${atestados}</strong><small>Contas com acesso liberado</small></article>
      <article class="ete-admin-stat"><span>Criam pedidos</span><strong>${creators}</strong><small>Contas autorizadas no backend</small></article>`;
  }

  function renderUsers(){
    if(!panel)return;
    const list=panel.querySelector("#eteAdminUserList");
    if(!list)return;
    const search=String(panel.querySelector("#eteAdminSearch")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const filtered=users.filter(user=>!search||`${user.display_name||""} ${user.username||""} ${user.role||""}`.toLocaleLowerCase("pt-BR").includes(search));
    if(!filtered.length){list.innerHTML='<div class="ete-admin-empty">Nenhum usuário encontrado.</div>';return;}
    list.innerHTML=filtered.map(user=>{
      const category=user.category?` · ${escapeHtml(user.category)}`:"";
      const self=String(user.username||"").toLowerCase()==="adm"?'<span class="ete-admin-you">Conta principal</span>':"";
      const control=capability(user,"control_ds_access");
      const atestados=capability(user,"atestados_access");
      const requests=capability(user,"can_create_requests");
      return `<article class="ete-admin-user-card">
        <div class="ete-admin-user-main">
          <div class="ete-admin-avatar">${escapeHtml(String(user.display_name||user.username||"U").slice(0,1).toUpperCase())}</div>
          <div>
            <div class="ete-admin-user-title"><strong>${escapeHtml(user.display_name||user.username||"Usuário")}</strong>${self}</div>
            <span>@${escapeHtml(user.username||"")}</span>
            <small>${escapeHtml(roleLabel(user.role))}${category}</small>
            <div class="ete-admin-cap-summary"><span class="ete-admin-cap-badge ${control?"on":"off"}">Control Ds ${control?"✓":"×"}</span><span class="ete-admin-cap-badge ${atestados?"on":"off"}">Atestados ${atestados?"✓":"×"}</span><span class="ete-admin-cap-badge ${requests?"on":"off"}">Pedidos ${requests?"✓":"×"}</span></div>
          </div>
        </div>
        <div class="ete-admin-user-actions"><button type="button" class="ete-admin-permissions-button" data-admin-permissions="${escapeHtml(user.user_id)}">Permissões</button><button type="button" class="ete-admin-reset-button" data-admin-reset="${escapeHtml(user.user_id)}">Redefinir senha</button></div>
      </article>`;
    }).join("");
  }

  function formatDate(value){
    if(!value)return"";
    try{return new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Recife",day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}catch(_){return String(value);}
  }

  function activityTitle(item){
    if(item.action==="password_reset_by_admin")return"Senha redefinida";
    if(item.action==="permissions_updated_by_admin")return"Permissões alteradas";
    return String(item.action||"Ação administrativa").replaceAll("_"," ");
  }

  function renderActivity(){
    if(!panel)return;
    const node=panel.querySelector("#eteAdminActivity");
    if(!node)return;
    if(!activity.length){node.innerHTML='<div class="ete-admin-empty">Nenhuma atividade administrativa registrada ainda.</div>';return;}
    node.innerHTML=activity.map(item=>{
      const actor=item.actor?.display_name||item.actor?.username||"Administrador";
      const target=item.target?.display_name||item.target?.username||"Usuário";
      const changes=item.details?.changed&&typeof item.details.changed==="object"?Object.entries(item.details.changed):[];
      const changedMarkup=changes.length?`<div class="ete-admin-change-list">${changes.map(([key,value])=>`<span class="ete-admin-change">${escapeHtml(CAPABILITY_LABELS[key]||key)}: ${value?.to?"ligado":"desligado"}</span>`).join("")}</div>`:"";
      const detail=item.action==="password_reset_by_admin"?`${actor} redefiniu a senha de ${target}.`:`${actor} alterou as permissões de ${target}.`;
      return `<article class="ete-admin-activity-item"><div class="ete-admin-activity-icon">${item.action==="password_reset_by_admin"?"⌁":"⚙"}</div><div class="ete-admin-activity-copy"><strong>${escapeHtml(activityTitle(item))}</strong><span>${escapeHtml(detail)}</span>${changedMarkup}</div><time>${escapeHtml(formatDate(item.created_at))}</time></article>`;
    }).join("");
  }

  function renderSecurity(){
    if(!panel)return;
    const node=panel.querySelector("#eteAdminSecurityGrid");
    if(!node)return;
    node.innerHTML=`
      <article class="ete-admin-security-card"><div class="head"><strong>Validação administrativa</strong><span class="ete-admin-security-state">Ativa</span></div><p>O servidor confirma o JWT e exige username <b>adm</b> + role <b>adm</b> antes de qualquer ação administrativa.</p></article>
      <article class="ete-admin-security-card"><div class="head"><strong>Permissões no backend</strong><span class="ete-admin-security-state">Ativas</span></div><p>Criação de pedidos, alunos, permissões, retiradas, devoluções e limpeza de histórico usam as capacidades salvas no Supabase.</p></article>
      <article class="ete-admin-security-card"><div class="head"><strong>Auditoria</strong><span class="ete-admin-security-state">Ativa</span></div><p>Trocas de senha e alterações de permissão são registradas sem guardar senha, hash ou credencial.</p></article>
      <article class="ete-admin-security-card"><div class="head"><strong>Conta ADM</strong><span class="ete-admin-security-state">Protegida</span></div><p>Redefinições de senha são limitadas e executadas apenas na Edge Function. A chave service_role não vai para o navegador.</p><button type="button" class="ete-admin-security-action" data-admin-self-password>Alterar minha senha</button></article>`;
  }

  function openPermissions(user){
    if(!isAdmin())return;
    permissionTarget=user;
    buildPermissionsModal();
    const name=user.display_name||user.username||"Usuário";
    permissionsModal.querySelector("#eteAdminPermissionsTarget").textContent=`${name} (@${user.username||""})`;
    const caps=user.capabilities||{};
    permissionsModal.querySelector("#eteAdminPermissionList").innerHTML=CAPABILITIES.map(item=>`
      <label class="ete-admin-toggle">
        <span class="ete-admin-toggle-copy"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.description)}</small></span>
        <span class="ete-admin-switch"><input type="checkbox" data-capability="${escapeHtml(item.key)}" ${caps[item.key]?"checked":""}><span class="ete-admin-switch-track"></span></span>
      </label>`).join("");
    const error=permissionsModal.querySelector("#eteAdminPermissionsError");if(error){error.hidden=true;error.textContent="";}
    permissionsModal.hidden=false;
    document.body.classList.add("ete-admin-modal-open");
  }

  function closePermissions(){
    if(permissionsModal)permissionsModal.hidden=true;
    permissionTarget=null;
    if(!resetModal||resetModal.hidden)document.body.classList.remove("ete-admin-modal-open");
  }

  async function submitPermissions(event){
    event.preventDefault();
    if(!isAdmin()||!permissionTarget)return;
    const submit=permissionsModal.querySelector("#eteAdminSavePermissions");
    const errorNode=permissionsModal.querySelector("#eteAdminPermissionsError");
    if(errorNode){errorNode.hidden=true;errorNode.textContent="";}
    const patch={};
    permissionsModal.querySelectorAll("[data-capability]").forEach(input=>{patch[input.dataset.capability]=!!input.checked;});
    const name=permissionTarget.display_name||permissionTarget.username||"este usuário";
    if(!window.confirm(`Salvar as novas permissões de ${name}?`))return;
    const oldText=submit?.textContent||"Salvar permissões";
    if(submit){submit.disabled=true;submit.textContent="Salvando...";}
    try{
      const result=await invokeAdmin({action:"update_permissions",user_id:permissionTarget.user_id,permissions:patch});
      permissionTarget.capabilities=result.capabilities||patch;
      const local=users.find(item=>String(item.user_id)===String(permissionTarget.user_id));
      if(local)local.capabilities=permissionTarget.capabilities;
      closePermissions();
      renderUsers();renderOverview();
      setNotice(`Permissões de ${name} atualizadas com sucesso.`,"success");
      try{
        const currentId=String(getCurrentUser()?.userId||"");
        if(currentId&&currentId===String(permissionTarget?.user_id||""))await window.ETEPermissions?.refresh?.();
      }catch(_){}
      loadActivity(true).catch(()=>{});
    }catch(err){
      if(errorNode){errorNode.hidden=false;errorNode.textContent=friendlyError(err?.code||err?.message);}
    }finally{if(submit){submit.disabled=false;submit.textContent=oldText;}}
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
    const error=resetModal.querySelector("#eteAdminFormError");if(error){error.hidden=true;error.textContent="";}
    updateStrength();
    resetModal.hidden=false;
    document.body.classList.add("ete-admin-modal-open");
    setTimeout(()=>pass?.focus(),0);
  }

  function closeReset(){
    if(resetModal){resetModal.hidden=true;const pass=resetModal.querySelector("#eteAdminNewPassword");const confirm=resetModal.querySelector("#eteAdminConfirmPassword");if(pass)pass.value="";if(confirm)confirm.value="";}
    targetUser=null;
    if(!permissionsModal||permissionsModal.hidden)document.body.classList.remove("ete-admin-modal-open");
  }

  function strengthFor(password){
    if(!password)return{label:"Use pelo menos 8 caracteres.",level:"none"};
    if(password.length<8)return{label:`Faltam ${8-password.length} caractere(s).`,level:"weak"};
    let score=0;if(password.length>=8)score++;if(password.length>=12)score++;if(/[a-z]/.test(password)&&/[A-Z]/.test(password))score++;if(/\d/.test(password))score++;if(/[^A-Za-z0-9]/.test(password))score++;
    if(score>=4)return{label:"Senha forte",level:"strong"};if(score>=3)return{label:"Senha média",level:"medium"};return{label:"Senha fraca",level:"weak"};
  }

  function updateStrength(){
    if(!resetModal)return;const password=String(resetModal.querySelector("#eteAdminNewPassword")?.value||"");const state=strengthFor(password);const node=resetModal.querySelector("#eteAdminStrength");if(node){node.textContent=state.label;node.dataset.level=state.level;}
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
    const message=self?`Você está alterando a senha da conta administrativa principal (${targetName}). Deseja continuar?`:`Tem certeza de que deseja redefinir a senha de ${targetName}?`;
    if(!window.confirm(message))return;
    const oldText=submit?.textContent||"Salvar nova senha";if(submit){submit.disabled=true;submit.textContent="Salvando...";}
    try{
      await invokeAdmin({action:"reset_password",user_id:targetUser.user_id,new_password:password});
      closeReset();setNotice(`Senha de ${targetName} redefinida com sucesso.`,"success");loadActivity(true).catch(()=>{});
    }catch(err){if(err?.passwordUpdated)showError("A senha foi alterada, mas houve falha na auditoria. Não envie novamente agora.");else showError(friendlyError(err?.code||err?.message));}
    finally{if(submit){submit.disabled=false;submit.textContent=oldText;}}
  }

  function ensureAdminUI(){
    ensureV2Styles();
    ensurePortalButton();
    if(!isAdmin()&&panel&&!panel.hidden)closePanel();
  }

  function install(){
    ensureAdminUI();
    if(!document.body)return;
    const observer=new MutationObserver(()=>{
      if(observerQueued)return;observerQueued=true;requestAnimationFrame(()=>{observerQueued=false;ensureAdminUI();});
    });
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener("pageshow",ensureAdminUI);
    document.addEventListener("keydown",event=>{
      if(event.key!=="Escape")return;
      if(permissionsModal&&!permissionsModal.hidden){closePermissions();return;}
      if(resetModal&&!resetModal.hidden){closeReset();return;}
      if(panel&&!panel.hidden)closePanel();
    });
    setTimeout(ensureAdminUI,80);setTimeout(ensureAdminUI,300);setTimeout(ensureAdminUI,800);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();

  window.ETEPortalAdmin=Object.freeze({open:openPanel,close:closePanel,refresh:refreshCurrentTab});
})();
