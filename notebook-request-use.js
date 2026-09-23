(function initNotebookRequestUse(){
  "use strict";

  let selectedNotebookId="";
  let selectedIdentifier="";
  let observer=null;
  let queued=false;
  let loading=false;

  function el(id){return document.getElementById(id);}
  function notify(message){try{if(typeof toast==="function")toast(message);else console.warn(message);}catch(_){console.warn(message);}}
  function canPickupSafe(){try{return typeof canPickup==="function"&&!!canPickup();}catch(_){return false;}}
  function pendingRequests(){
    try{return Array.isArray(data)?data.filter(request=>request&&request.status==="wait"):[];}catch(_){return[];}
  }
  function groupText(request){
    try{if(typeof requestGroupText==="function")return requestGroupText(request);}catch(_){}
    return [request?.studentClass,request?.studentCourse].filter(Boolean).join(" ").trim();
  }
  function escHtml(value){
    try{if(typeof esc==="function")return esc(value);}catch(_){}
    return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  }

  function ensureStyles(){
    if(el("notebookRequestUseStyles"))return;
    const style=document.createElement("style");
    style.id="notebookRequestUseStyles";
    style.textContent=`
      #notebookRequestUseModal{width:min(620px,calc(100% - 28px))}
      .notebook-request-use-modal{padding:22px}
      .notebook-request-use-list{display:grid;gap:9px;max-height:min(58vh,520px);overflow:auto;padding-right:2px}
      .notebook-request-use-item{width:100%;min-height:72px;padding:13px 14px;display:flex;align-items:center;justify-content:space-between;gap:14px;text-align:left;border:1px solid var(--ui-border,#2d333a);border-radius:12px;background:var(--ui-surface-2,#15181d);color:var(--ui-text,#eef1f4)}
      .notebook-request-use-item:hover,.notebook-request-use-item:focus-visible{background:var(--ui-surface-3,#1c2026);border-color:var(--ui-accent,#59636f);outline:none}
      .notebook-request-use-item strong{display:block;font-size:12px;color:inherit}
      .notebook-request-use-item span{display:block;margin-top:4px;font-size:9.5px;color:var(--ui-muted,#9da5ae);line-height:1.45}
      .notebook-request-use-badge{flex:0 0 auto;padding:6px 9px;border:1px solid #35465c;border-radius:999px;background:#161c24;color:#8ea6c8;font-size:8px;font-weight:850}
      .notebook-request-use-empty{padding:22px;border:1px dashed var(--ui-border,#2d333a);border-radius:12px;text-align:center;color:var(--ui-muted,#9da5ae);font-size:10px;line-height:1.5}
      html[data-theme="light"] .notebook-request-use-item{background:#f7f9fa;color:#1d303a}
      html[data-theme="light"] .notebook-request-use-item:hover,html[data-theme="light"] .notebook-request-use-item:focus-visible{background:#edf2f5}
      @media(max-width:600px){#notebookRequestUseModal{width:min(460px,calc(100% - 20px))}.notebook-request-use-modal{padding:18px}.notebook-request-use-item{align-items:flex-start;flex-direction:column;gap:9px}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal(){
    let dialog=el("notebookRequestUseModal");
    if(dialog)return dialog;
    ensureStyles();
    dialog=document.createElement("dialog");
    dialog.id="notebookRequestUseModal";
    dialog.setAttribute("aria-labelledby","notebookRequestUseTitle");
    dialog.innerHTML=`
      <div class="modal notebook-request-use-modal">
        <div class="modalhead">
          <div>
            <h2 id="notebookRequestUseTitle">Usar notebook no pedido</h2>
            <p id="notebookRequestUseDesc">Escolha um pedido aguardando retirada. Este fluxo é somente de retirada.</p>
          </div>
          <button type="button" class="close" data-notebook-use-close aria-label="Fechar">×</button>
        </div>
        <div id="notebookRequestUseList" class="notebook-request-use-list"></div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
    dialog.querySelector("[data-notebook-use-close]")?.addEventListener("click",()=>dialog.close());
    dialog.addEventListener("click",event=>{
      const button=event.target.closest?.("[data-notebook-use-request]");
      if(!button)return;
      event.preventDefault();
      openPickup(button.dataset.notebookUseRequest);
    });
    return dialog;
  }

  async function notebookIdentifier(notebookId){
    if(typeof sb==="undefined"||!sb)throw new Error("backend_unavailable");
    const {data:rows,error}=await sb.from("ete_notebooks")
      .select("id,code,asset_number,equipment_code,active")
      .eq("active",true);
    if(error)throw error;
    const list=Array.isArray(rows)?rows:[];
    const notebook=list.find(item=>String(item.id)===String(notebookId));
    if(!notebook)throw new Error("notebook_not_found");

    const equipment=String(notebook.equipment_code||"").trim().toUpperCase();
    if(equipment)return {identifier:equipment,label:String(notebook.code||equipment)};

    const code=String(notebook.code||"").trim().toUpperCase();
    if(code&&list.filter(item=>String(item.code||"").trim().toUpperCase()===code).length===1){
      return {identifier:code,label:code};
    }

    const asset=String(notebook.asset_number||"").trim().toUpperCase();
    if(asset&&list.filter(item=>String(item.asset_number||"").trim().toUpperCase()===asset).length===1){
      return {identifier:asset,label:code||asset};
    }

    throw new Error("ambiguous_notebook");
  }

  function renderRequests(notebookLabel){
    const list=el("notebookRequestUseList");
    if(!list)return;
    const pending=pendingRequests();
    const desc=el("notebookRequestUseDesc");
    if(desc)desc.textContent=`Notebook ${notebookLabel} · escolha um pedido aguardando retirada.`;
    if(!pending.length){
      list.innerHTML='<div class="notebook-request-use-empty"><strong>Nenhum pedido aguardando retirada.</strong><br>Crie o pedido do aluno primeiro e depois use o notebook aqui.</div>';
      return;
    }
    list.innerHTML=pending.map(request=>{
      const group=groupText(request)||"Turma não informada";
      const time=String(request.time||"").trim();
      return `<button type="button" class="notebook-request-use-item" data-notebook-use-request="${escHtml(request.id)}">
        <span><strong>${escHtml(request.student||"Aluno não informado")}</strong><span>${escHtml(group)}${time?" · "+escHtml(time):""}</span></span>
        <span class="notebook-request-use-badge">Retirada</span>
      </button>`;
    }).join("");
  }

  async function openSelector(notebookId){
    if(loading)return;
    if(!canPickupSafe()){notify("Sua conta não tem permissão para confirmar retiradas.");return;}
    loading=true;
    try{
      const resolved=await notebookIdentifier(notebookId);
      selectedNotebookId=String(notebookId);
      selectedIdentifier=resolved.identifier;
      renderRequests(resolved.label);
      ensureModal().showModal();
    }catch(error){
      console.error("Falha ao preparar retirada pelo inventário:",error);
      if(String(error?.message||error).includes("ambiguous_notebook")) notify("Este notebook não possui uma identificação única para retirada. Use o código do equipamento de 9 caracteres quando ele for informado.");
      else notify("Não foi possível preparar a retirada deste notebook.");
    }finally{loading=false;}
  }

  function openPickup(requestId){
    const request=pendingRequests().find(item=>String(item.id)===String(requestId));
    if(!request){notify("Esse pedido não está mais aguardando retirada.");return;}
    if(!selectedNotebookId||!selectedIdentifier){notify("Notebook não selecionado.");return;}

    const form=el("pickupForm");
    const codeInput=el("computerCode");
    const pinInput=el("pickupPin");
    const dialog=el("pickupModal");
    if(!form||!codeInput||!dialog){notify("Tela de retirada indisponível.");return;}

    form.dataset.id=String(request.id);
    if(el("pickupDesc"))el("pickupDesc").textContent=(request.student||"Aluno")+" · "+groupText(request);
    if(pinInput)pinInput.value="";
    codeInput.value=selectedIdentifier;
    codeInput.dispatchEvent(new Event("input",{bubbles:true}));
    ensureModal().close();
    dialog.showModal();
    try{pinInput?.focus();}catch(_){}
  }

  function syncButtons(){
    queued=false;
    if(!canPickupSafe()){
      document.querySelectorAll("[data-use-notebook-request]").forEach(button=>button.remove());
      return;
    }
    document.querySelectorAll("#computerGrid .inventory-computer-item").forEach(card=>{
      const status=String(card.querySelector(".status")?.textContent||"").trim().toLocaleLowerCase("pt-BR");
      const active=!!card.querySelector("[data-return]")||status==="em uso"||status==="em atraso";
      const foot=card.querySelector(".computer-item-foot");
      if(!foot||active)return;
      if(foot.querySelector("[data-use-notebook-request]"))return;
      const notebookId=String(card.dataset.inventoryId||"");
      if(!notebookId)return;
      const button=document.createElement("button");
      button.type="button";
      button.className="btn primary small";
      button.dataset.useNotebookRequest=notebookId;
      button.textContent="Usar no pedido";
      const danger=foot.querySelector(".delete-request,[data-inventory-delete-request]");
      if(danger)foot.insertBefore(button,danger);
      else foot.appendChild(button);
    });
  }

  function queueSync(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(syncButtons);
  }

  function start(){
    ensureModal();
    syncButtons();
    document.addEventListener("click",event=>{
      const button=event.target.closest?.("[data-use-notebook-request]");
      if(!button)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void openSelector(button.dataset.useNotebookRequest);
    },true);
    observer=new MutationObserver(queueSync);
    observer.observe(document.body,{subtree:true,childList:true});
    window.addEventListener("pageshow",queueSync);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
