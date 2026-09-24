(function initNotebookHistoryPolish(){
  "use strict";

  let pendingRequestId="";
  let deleting=false;

  function el(id){return document.getElementById(id);}
  function notify(message){
    try{if(typeof toast==="function")toast(message);else console.warn(message);}catch(_){console.warn(message);}
  }
  function requests(){
    try{return Array.isArray(data)?data.filter(Boolean):[];}catch(_){return[];}
  }
  function requestById(id){
    const key=String(id||"");
    return requests().find(item=>String(item?.id||"")===key)||null;
  }
  function groupText(request){
    try{if(typeof requestGroupText==="function")return requestGroupText(request);}catch(_){}
    return [request?.studentClass,request?.studentCourse].filter(Boolean).join(" ").trim();
  }
  function formatDate(value){
    const raw=String(value||"").trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw||"Não informado";
    const [year,month,day]=raw.split("-");
    return `${day}/${month}/${year}`;
  }
  function canDelete(request){
    if(!request||request.status!=="done")return false;
    try{return typeof canDeleteRequest==="function"&&!!canDeleteRequest(request);}catch(_){return false;}
  }

  function ensureStyles(){
    if(el("notebookHistoryPolishStyles"))return;
    const style=document.createElement("style");
    style.id="notebookHistoryPolishStyles";
    style.textContent=`
      #computerGrid .inventory-computer-item{
        border-radius:20px;border-color:#303843;background:linear-gradient(180deg,#171b20 0%,#11151a 100%);
        box-shadow:0 14px 36px rgba(0,0,0,.18);transform:none;overflow:hidden
      }
      #computerGrid .inventory-computer-item:hover{border-color:#46515e;transform:translateY(-1px);box-shadow:0 18px 42px rgba(0,0,0,.23)}
      #computerGrid .inventory-computer-item .computer-item-head{padding:17px 18px 15px;background:linear-gradient(180deg,rgba(255,255,255,.018),transparent);border-bottom-color:#29313a}
      #computerGrid .inventory-computer-item .computer-device-icon{width:44px;height:44px;border-radius:13px;background:#1b2229;border-color:#35404a}
      #computerGrid .inventory-computer-item .computer-code-wrap>span{font-size:9px;letter-spacing:.09em;color:#a9b6c4}
      #computerGrid .inventory-computer-item .computer-code-wrap>strong{font-size:22px;letter-spacing:.045em;line-height:1.1}
      #computerGrid .inventory-status-available{padding:7px 11px;border-radius:999px;font-size:9px;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
      #computerGrid .inventory-computer-item .computer-item-body{padding:15px 18px 16px}
      #computerGrid .inventory-computer-item .computer-owner{padding:0 0 13px;margin-bottom:0;border:0;background:transparent}
      #computerGrid .inventory-computer-item .computer-owner span{font-size:9px;letter-spacing:.08em;color:#91a0af}
      #computerGrid .inventory-computer-item .computer-owner strong{margin-top:5px;font-size:12px;color:#f4f7f9}
      #computerGrid .inventory-meta-grid{gap:9px;margin-top:0}
      #computerGrid .inventory-request-grid{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:9px}
      #computerGrid .inventory-computer-item .computer-meta-box{min-height:66px;padding:11px 12px;border:1px solid #313b45;border-radius:13px;background:rgba(20,26,32,.78);display:flex;flex-direction:column;justify-content:center}
      #computerGrid .inventory-computer-item .computer-meta-box span{font-size:8.5px;letter-spacing:.075em;color:#91a0af}
      #computerGrid .inventory-computer-item .computer-meta-box strong{margin-top:5px;font-size:10.5px;line-height:1.35;color:#eef3f6;overflow-wrap:anywhere}
      #computerGrid .inventory-computer-item .computer-item-foot{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:9px;padding:13px 18px;background:rgba(8,11,14,.25);border-top:1px solid #29313a}
      #computerGrid .inventory-computer-item .computer-state-note{min-width:0;font-size:9.5px;line-height:1.45;color:#a7b2bd}
      #computerGrid .inventory-computer-item .computer-item-foot .btn{min-height:39px;padding:8px 13px;border-radius:11px;white-space:nowrap}
      #computerGrid .inventory-computer-item [data-use-notebook-request]{border-color:#455466;background:#222a33;color:#f3f6f8}
      #computerGrid .inventory-computer-item [data-use-notebook-request]:hover{background:#2a3440;border-color:#596a7d}
      #computerGrid .inventory-computer-item [data-inventory-delete-request]{background:rgba(116,38,49,.11);border-color:#64333c;color:#efa3ac}
      #computerGrid .inventory-computer-item [data-inventory-delete-request]:hover{background:rgba(142,45,58,.18);border-color:#7a3d48;color:#ffc0c7}

      #notebookHistoryDeleteModal{width:min(600px,calc(100% - 28px))}
      .notebook-history-delete-modal{padding:24px}
      .notebook-history-delete-modal .modalhead{margin-bottom:15px}
      .notebook-history-delete-modal .modalhead h2{font-size:24px}
      .notebook-history-delete-lead{margin:0 0 14px;color:var(--ui-muted,#9da5ae);font-size:11px;line-height:1.55}
      .notebook-history-delete-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .notebook-history-delete-cell{min-height:72px;padding:12px 13px;border:1px solid var(--ui-border,#303943);border-radius:13px;background:var(--ui-surface-2,#151a20)}
      .notebook-history-delete-cell span{display:block;color:var(--ui-muted,#91a0af);font-size:8.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      .notebook-history-delete-cell strong{display:block;margin-top:6px;color:var(--ui-text,#f1f5f7);font-size:11px;line-height:1.45;overflow-wrap:anywhere}
      .notebook-history-delete-warning{margin-top:13px;padding:12px 13px;border:1px solid #61343d;border-radius:12px;background:rgba(122,43,55,.12);color:#eab0b7;font-size:10px;line-height:1.55}
      .notebook-history-delete-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:17px;padding-top:15px;border-top:1px solid var(--ui-border,#2d333a)}
      .notebook-history-delete-confirm{border-color:#783d48!important;background:#4a232b!important;color:#ffd4d8!important}
      .notebook-history-delete-confirm:hover{background:#592a34!important;border-color:#91505c!important}

      html[data-theme="light"] #computerGrid .inventory-computer-item{background:#fff;border-color:#d5dfe5;box-shadow:0 12px 30px rgba(57,75,88,.09)}
      html[data-theme="light"] #computerGrid .inventory-computer-item:hover{border-color:#b9c8d1;box-shadow:0 16px 34px rgba(57,75,88,.13)}
      html[data-theme="light"] #computerGrid .inventory-computer-item .computer-item-head{border-bottom-color:#dce5ea}
      html[data-theme="light"] #computerGrid .inventory-computer-item .computer-device-icon{background:#f1f5f7;border-color:#d5e0e6}
      html[data-theme="light"] #computerGrid .inventory-computer-item .computer-owner strong{color:#19303c}
      html[data-theme="light"] #computerGrid .inventory-computer-item .computer-meta-box{background:#f7f9fa;border-color:#d8e2e7}
      html[data-theme="light"] #computerGrid .inventory-computer-item .computer-meta-box strong{color:#1f3742}
      html[data-theme="light"] #computerGrid .inventory-computer-item .computer-item-foot{background:#f8fafb;border-top-color:#dce5ea}
      html[data-theme="light"] #computerGrid .inventory-computer-item [data-use-notebook-request]{background:#edf2f5;border-color:#c5d2d9;color:#213946}
      html[data-theme="light"] #computerGrid .inventory-computer-item [data-inventory-delete-request]{background:#fff5f6;border-color:#e6c2c7;color:#9d4853}
      html[data-theme="light"] .notebook-history-delete-cell{background:#f7f9fa;border-color:#d6e0e5}
      html[data-theme="light"] .notebook-history-delete-cell strong{color:#203844}
      html[data-theme="light"] .notebook-history-delete-warning{background:#fff5f6;border-color:#e7c4c9;color:#8f4650}

      @media(max-width:760px){
        #computerGrid .inventory-computer-item .computer-item-foot{grid-template-columns:1fr 1fr}
        #computerGrid .inventory-computer-item .computer-state-note{grid-column:1/-1}
      }
      @media(max-width:600px){
        #notebookHistoryDeleteModal{width:min(460px,calc(100% - 20px))}
        .notebook-history-delete-modal{padding:18px}
        #computerGrid .inventory-meta-grid,#computerGrid .inventory-request-grid{grid-template-columns:1fr}
        #computerGrid .inventory-computer-item .computer-item-head{padding:15px}
        #computerGrid .inventory-computer-item .computer-item-body{padding:14px 15px 15px}
        #computerGrid .inventory-computer-item .computer-item-foot{display:flex;flex-direction:column;align-items:stretch;padding:13px 15px}
        #computerGrid .inventory-computer-item .computer-item-foot .btn{width:100%}
        .notebook-history-delete-grid{grid-template-columns:1fr}
        .notebook-history-delete-actions{flex-direction:column-reverse}
        .notebook-history-delete-actions .btn{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureModal(){
    let dialog=el("notebookHistoryDeleteModal");
    if(dialog)return dialog;
    ensureStyles();
    dialog=document.createElement("dialog");
    dialog.id="notebookHistoryDeleteModal";
    dialog.setAttribute("aria-labelledby","notebookHistoryDeleteTitle");
    dialog.innerHTML=`
      <form class="modal notebook-history-delete-modal" id="notebookHistoryDeleteForm">
        <div class="modalhead">
          <div>
            <h2 id="notebookHistoryDeleteTitle">Apagar registro de uso</h2>
            <p>Confirme o pedido específico que será removido.</p>
          </div>
          <button type="button" class="close" data-notebook-history-close aria-label="Fechar">×</button>
        </div>
        <p class="notebook-history-delete-lead">Somente este uso concluído será apagado. O notebook continuará cadastrado e os outros pedidos permanecerão intactos.</p>
        <div class="notebook-history-delete-grid">
          <div class="notebook-history-delete-cell"><span>Notebook</span><strong id="notebookHistoryDeleteNotebook">—</strong></div>
          <div class="notebook-history-delete-cell"><span>Aluno</span><strong id="notebookHistoryDeleteStudent">—</strong></div>
          <div class="notebook-history-delete-cell"><span>Turma / Curso</span><strong id="notebookHistoryDeleteGroup">—</strong></div>
          <div class="notebook-history-delete-cell"><span>Data e horário</span><strong id="notebookHistoryDeleteWhen">—</strong></div>
        </div>
        <div class="notebook-history-delete-warning">Esta ação remove o pedido concluído selecionado e os eventos do Histórico vinculados somente a ele. Não apaga o notebook nem o histórico dos outros pedidos.</div>
        <div class="notebook-history-delete-actions">
          <button type="button" class="btn secondary" data-notebook-history-close>Cancelar</button>
          <button type="submit" class="btn danger notebook-history-delete-confirm">Apagar este registro</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);
    dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
    dialog.querySelectorAll("[data-notebook-history-close]").forEach(button=>button.addEventListener("click",()=>dialog.close()));
    dialog.addEventListener("close",()=>{if(!deleting)pendingRequestId="";});
    el("notebookHistoryDeleteForm")?.addEventListener("submit",event=>{
      event.preventDefault();
      void confirmDelete();
    });
    return dialog;
  }

  function openDelete(requestId,button){
    const request=requestById(requestId);
    if(!request){notify("Pedido não encontrado.");return;}
    if(!canDelete(request)){notify("Sua conta não pode apagar este registro concluído.");return;}

    const card=button?.closest?.(".inventory-computer-item");
    const notebook=String(card?.querySelector?.(".computer-code-wrap strong")?.textContent||request.code||"—").trim();
    const group=groupText(request)||"Não informado";
    const when=[formatDate(request.dateKey),String(request.time||"").trim()].filter(Boolean).join(" · ");

    pendingRequestId=String(request.id);
    ensureModal();
    if(el("notebookHistoryDeleteNotebook"))el("notebookHistoryDeleteNotebook").textContent=notebook||"—";
    if(el("notebookHistoryDeleteStudent"))el("notebookHistoryDeleteStudent").textContent=request.student||"Aluno não informado";
    if(el("notebookHistoryDeleteGroup"))el("notebookHistoryDeleteGroup").textContent=group;
    if(el("notebookHistoryDeleteWhen"))el("notebookHistoryDeleteWhen").textContent=when||"Não informado";
    el("notebookHistoryDeleteModal")?.showModal();
  }

  async function confirmDelete(){
    if(deleting)return;
    const request=requestById(pendingRequestId);
    if(!request||!canDelete(request)){
      notify("Este registro não pode mais ser apagado.");
      try{el("notebookHistoryDeleteModal")?.close();}catch(_){}
      return;
    }
    if(typeof v46Rpc!=="function"){
      notify("Não foi possível acessar o banco de dados.");
      return;
    }

    const form=el("notebookHistoryDeleteForm");
    const button=form?.querySelector('button[type="submit"]');
    const oldText=button?.textContent||"Apagar este registro";
    deleting=true;
    if(button){button.disabled=true;button.textContent="Apagando...";button.setAttribute("aria-busy","true");}
    try{
      const result=await v46Rpc("ete_delete_request_history",{p_request_id:String(request.id)});
      if(result&&result.ok===false)throw new Error(String(result.error||"delete_failed"));
      pendingRequestId="";
      try{el("notebookHistoryDeleteModal")?.close();}catch(_){}
      notify("Registro específico apagado do histórico. O notebook continua no inventário.");
    }catch(error){
      console.error("Falha ao apagar registro específico de notebook:",error);
      const message=String(error?.message||error||"");
      if(message.includes("invalid_status"))notify("Somente usos concluídos podem ser apagados por esta opção.");
      else if(message.includes("forbidden"))notify("Sua conta não tem permissão para apagar este registro.");
      else if(message.includes("request_not_found"))notify("Este pedido já não existe.");
      else notify("Não foi possível apagar este registro. Tente novamente.");
    }finally{
      deleting=false;
      if(button){button.disabled=false;button.textContent=oldText;button.removeAttribute("aria-busy");}
    }
  }

  function start(){
    ensureStyles();
    ensureModal();
    window.addEventListener("click",event=>{
      const button=event.target?.closest?.("[data-inventory-delete-request]");
      if(!button)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openDelete(button.dataset.inventoryDeleteRequest,button);
    },true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
