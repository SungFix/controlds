(function(){
  "use strict";

  const busy=new Set();
  let resolver=null;
  let lastFocus=null;

  function ensureModal(){
    let dialog=document.getElementById("controlActionModal");
    if(dialog) return dialog;
    dialog=document.createElement("dialog");
    dialog.id="controlActionModal";
    dialog.setAttribute("aria-labelledby","controlActionTitle");
    dialog.setAttribute("aria-describedby","controlActionMessage");
    dialog.innerHTML=`<section class="control-action-card">
      <header class="control-action-head">
        <div class="control-action-icon" id="controlActionIcon" aria-hidden="true">!</div>
        <div class="control-action-copy"><h2 id="controlActionTitle">Confirmar ação</h2><p id="controlActionSubtitle">Revise antes de continuar.</p></div>
        <button class="control-action-close" id="controlActionClose" type="button" aria-label="Fechar">×</button>
      </header>
      <div class="control-action-body">
        <p class="control-action-message" id="controlActionMessage"></p>
        <div class="control-action-details" id="controlActionDetails" hidden></div>
        <div class="control-action-warning" id="controlActionWarning" hidden></div>
      </div>
      <footer class="control-action-foot">
        <button class="btn secondary" id="controlActionCancel" type="button">Cancelar</button>
        <button class="btn danger control-action-confirm" id="controlActionConfirm" type="button">Confirmar</button>
      </footer>
    </section>`;
    document.body.appendChild(dialog);

    const close=result=>{
      if(!dialog.open) return;
      dialog.returnValue=result?"confirm":"cancel";
      dialog.close();
    };
    dialog.querySelector("#controlActionConfirm").addEventListener("click",()=>close(true));
    dialog.querySelector("#controlActionCancel").addEventListener("click",()=>close(false));
    dialog.querySelector("#controlActionClose").addEventListener("click",()=>close(false));
    dialog.addEventListener("cancel",event=>{event.preventDefault();close(false);});
    dialog.addEventListener("click",event=>{if(event.target===dialog)close(false);});
    dialog.addEventListener("close",()=>{
      const fn=resolver; resolver=null;
      if(fn) fn(dialog.returnValue==="confirm");
      const target=lastFocus; lastFocus=null;
      if(target?.isConnected) setTimeout(()=>{try{target.focus({preventScroll:true});}catch(_){}},0);
    });
    return dialog;
  }

  function fillList(box,items){
    box.replaceChildren();
    if(!items?.length){box.hidden=true;return;}
    box.hidden=false;
    const label=document.createElement("div");
    label.textContent="Esta ação afeta:";
    box.appendChild(label);
    const ul=document.createElement("ul");
    items.forEach(item=>{const li=document.createElement("li");li.textContent=String(item);ul.appendChild(li);});
    box.appendChild(ul);
  }

  async function confirmAction(options={}){
    const dialog=ensureModal();
    if(dialog.open){try{dialog.close();}catch(_){}}
    const title=dialog.querySelector("#controlActionTitle");
    const subtitle=dialog.querySelector("#controlActionSubtitle");
    const message=dialog.querySelector("#controlActionMessage");
    const details=dialog.querySelector("#controlActionDetails");
    const warning=dialog.querySelector("#controlActionWarning");
    const icon=dialog.querySelector("#controlActionIcon");
    const confirm=dialog.querySelector("#controlActionConfirm");
    const cancel=dialog.querySelector("#controlActionCancel");

    title.textContent=options.title||"Confirmar ação";
    subtitle.textContent=options.subtitle||"Revise antes de continuar.";
    message.textContent=options.message||"Tem certeza que deseja continuar?";
    fillList(details,options.details||[]);
    warning.hidden=!options.warning;
    warning.textContent=options.warning||"";
    confirm.textContent=options.confirmText||"Confirmar";
    cancel.textContent=options.cancelText||"Cancelar";
    icon.className="control-action-icon"+(options.variant==="warning"?" warning":options.variant==="info"?" info":"");
    icon.textContent=options.variant==="info"?"i":"!";
    confirm.className="btn control-action-confirm "+(options.variant==="warning"?"warning":"danger");
    dialog.returnValue="cancel";
    lastFocus=document.activeElement;

    return new Promise(resolve=>{
      resolver=resolve;
      try{dialog.showModal();setTimeout(()=>confirm.focus(),0);}catch(_){resolver=null;resolve(false);}
    });
  }

  async function notice(options={}){
    return confirmAction({
      title:options.title||"Aviso",
      subtitle:options.subtitle||"Informação do sistema",
      message:options.message||"",
      details:options.details||[],
      variant:"info",
      confirmText:options.confirmText||"Entendi",
      cancelText:"Fechar"
    });
  }

  function notify(message){
    try{if(typeof toast==="function"){toast(message);return;}}catch(_){}
    notice({message});
  }

  function getStudent(id){try{return typeof students!=="undefined"&&Array.isArray(students)?students.find(x=>String(x?.id)===String(id)):null;}catch(_){return null;}}
  function getRequest(id){try{return typeof data!=="undefined"&&Array.isArray(data)?data.find(x=>String(x?.id)===String(id)):null;}catch(_){return null;}}
  function getPermission(id){try{return typeof permissions!=="undefined"&&Array.isArray(permissions)?permissions.find(x=>String(x?.id)===String(id)):null;}catch(_){return null;}}
  function mayManageStudents(){try{return typeof canManageStudents==="function"&&canManageStudents();}catch(_){return false;}}
  function mayDeleteRequest(r){try{return typeof canDeleteRequest==="function"&&canDeleteRequest(r);}catch(_){return false;}}
  function mayManagePermissions(){try{return typeof canCreatePermission==="function"&&canCreatePermission();}catch(_){return false;}}

  async function runRpc(name,args){
    if(typeof v46Rpc!=="function") throw new Error("backend_unavailable");
    return v46Rpc(name,args);
  }

  async function handleStudent(button,id){
    const student=getStudent(id);
    if(!student){notify("Aluno não encontrado. Atualize a página e tente novamente.");return;}
    if(!mayManageStudents()){notify("Sua conta não tem permissão para remover alunos.");return;}
    const ok=await confirmAction({
      title:"Remover aluno",
      subtitle:"O aluno e os dados ligados serão excluídos.",
      message:`Tem certeza que deseja remover ${student.name}?`,
      details:["Pedidos do aluno","PINs ligados aos pedidos","Permissões de entrada","Histórico relacionado"],
      warning:"Essa ação não pode ser desfeita.",
      confirmText:"Apagar aluno"
    });
    if(!ok)return;
    await execute(button,"student:"+id,async()=>{await runRpc("ete_delete_student",{p_student_id:String(id)});notify("Aluno e dados ligados removidos.");});
  }

  async function handleRequest(button,id,computerMode){
    const request=getRequest(id);
    if(!request){notify("Este registro já não existe mais.");return;}
    if(["use","late"].includes(request.status)){notify("Confirme a devolução do notebook antes de apagar este registro.");return;}
    if(computerMode&&request.status!=="done"){notify("Confirme a devolução antes de apagar este computador.");return;}
    if(!mayDeleteRequest(request)){notify("Sua conta não tem permissão para apagar este registro.");return;}
    const code=String(request.code||"").trim();
    const ok=await confirmAction({
      title:computerMode?"Apagar computador devolvido":"Apagar pedido",
      subtitle:computerMode?"O registro do notebook será removido do sistema.":"O pedido será removido do sistema.",
      message:computerMode?`Deseja apagar o registro do notebook ${code||"sem código"} de ${request.student}?`:`Deseja apagar o pedido de ${request.student}?`,
      details:computerMode?["Lista de computadores","Lista de pedidos","Agenda"]:["Agenda","Lista de pedidos","Registro de computador ligado ao pedido"],
      warning:"Essa ação não pode ser desfeita.",
      confirmText:computerMode?"Apagar registro":"Apagar pedido"
    });
    if(!ok)return;
    await execute(button,(computerMode?"computer:":"request:")+id,async()=>{await runRpc("ete_delete_request",{p_request_id:String(id)});notify(computerMode?"Registro do computador apagado.":"Pedido apagado.");});
  }

  async function handlePermission(button,id){
    const permission=getPermission(id);
    if(!permission){notify("Permissão não encontrada. Atualize a página e tente novamente.");return;}
    if(permission.active){notify("Cancele a permissão antes de apagá-la.");return;}
    if(!mayManagePermissions()){notify("Sua conta não tem permissão para apagar esta permissão.");return;}
    const ok=await confirmAction({
      title:"Apagar permissão",
      subtitle:"A permissão cancelada será removida definitivamente.",
      message:`Deseja apagar a permissão de ${permission.student}?`,
      details:[String(permission.className||"Turma não informada"),"Registro da permissão cancelada"],
      warning:"Essa ação não pode ser desfeita.",
      confirmText:"Apagar permissão"
    });
    if(!ok)return;
    await execute(button,"permission:"+id,async()=>{await runRpc("ete_delete_permission",{p_permission_id:String(id)});notify("Permissão apagada definitivamente.");});
  }

  async function execute(button,key,operation){
    if(busy.has(key))return;
    busy.add(key);
    const old=button?.textContent||"";
    if(button){button.disabled=true;button.textContent="Apagando...";}
    try{await operation();}
    catch(err){
      console.error("Falha em ação destrutiva:",err);
      const msg=String(err?.message||err||"");
      if(msg.includes("request_in_use"))notify("Confirme a devolução antes de apagar.");
      else if(msg.includes("forbidden"))notify("Sua conta não tem permissão para esta ação.");
      else if(msg.includes("not_found"))notify("O registro já não existe mais.");
      else notify("Não foi possível concluir a ação. Tente novamente.");
    }finally{
      busy.delete(key);
      if(button?.isConnected){button.disabled=false;button.textContent=old;}
    }
  }

  function interceptedButton(target){
    if(!(target instanceof Element))return null;
    return target.closest("[data-delete-student],[data-delete-request],[data-delete-permission],[data-delete-computer-record]");
  }

  window.addEventListener("click",event=>{
    const button=interceptedButton(event.target);
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    if(button.dataset.deleteStudent)handleStudent(button,String(button.dataset.deleteStudent));
    else if(button.dataset.deleteComputerRecord)handleRequest(button,String(button.dataset.deleteComputerRecord),true);
    else if(button.dataset.deletePermission)handlePermission(button,String(button.dataset.deletePermission));
    else if(button.dataset.deleteRequest)handleRequest(button,String(button.dataset.deleteRequest),false);
  },true);

  window.ControlActionModal=Object.freeze({confirm:confirmAction,notice});
})();
