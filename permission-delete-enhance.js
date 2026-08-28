(function(){
  "use strict";

  let observer=null;
  let queued=false;

  function canManagePermissions(){
    try{
      return typeof canCreatePermission==="function" && canCreatePermission();
    }catch(_){
      return false;
    }
  }

  function visiblePermissionList(){
    try{
      if(!Array.isArray(permissions)) return [];
      const q=String(document.querySelector("#permissionSearch")?.value||"").toLowerCase();
      const filter=String(document.querySelector("#permissionFilter")?.value||"all");
      return permissions.filter(p=>{
        const filterOk=filter==="all" || p.interval===filter;
        const hay=(String(p.student||"")+" "+String(p.className||"")+" "+String(p.reason||"")).toLowerCase();
        return filterOk && hay.includes(q);
      });
    }catch(_){
      return [];
    }
  }

  function ensureDeleteButton(card,permission){
    if(!card || !permission || permission.active || !canManagePermissions()) return;
    const actions=card.querySelector(".permission-actions");
    if(!actions || actions.querySelector("[data-delete-permission]")) return;

    const button=document.createElement("button");
    button.type="button";
    button.className="btn small danger";
    button.dataset.deletePermission=String(permission.id);
    button.textContent="Apagar";
    button.title="Apagar definitivamente esta permissão cancelada";
    button.setAttribute("aria-label","Apagar permissão cancelada de "+String(permission.student||"estudante"));
    actions.appendChild(button);
  }

  function enhanceCards(){
    queued=false;
    const rows=document.getElementById("permissionRows");
    if(!rows) return;
    const list=visiblePermissionList();
    rows.querySelectorAll(".permission-card").forEach((card,index)=>{
      ensureDeleteButton(card,list[index]);
    });
  }

  function queueEnhance(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(enhanceCards);
  }

  function ensureDeleteDialog(){
    let dialog=document.getElementById("deletePermissionModal");
    if(dialog) return dialog;

    dialog=document.createElement("dialog");
    dialog.id="deletePermissionModal";
    dialog.setAttribute("aria-labelledby","deletePermissionModalTitle");
    dialog.innerHTML=`
      <form method="dialog" class="modal">
        <div class="modalhead">
          <div>
            <h2 id="deletePermissionModalTitle">Apagar permissão cancelada</h2>
            <p>Essa ação remove a permissão definitivamente.</p>
          </div>
          <button type="submit" class="close" value="cancel" aria-label="Fechar">×</button>
        </div>
        <div class="exit-confirm-note clean" id="deletePermissionSummary"></div>
        <div class="modalactions">
          <button type="submit" class="btn secondary" value="cancel">Voltar</button>
          <button type="submit" class="btn danger" value="delete">Apagar definitivamente</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  function askDelete(permission){
    return new Promise(resolve=>{
      const dialog=ensureDeleteDialog();
      const summary=dialog.querySelector("#deletePermissionSummary");
      if(summary){
        summary.innerHTML="<strong>"+escapeHtml(permission.student||"Estudante")+"</strong><br>"+
          escapeHtml(permission.className||"")+" · "+escapeHtml(typeof permissionIntervalName==="function"?permissionIntervalName(permission.interval):permission.interval||"");
      }
      const onClose=()=>{
        dialog.removeEventListener("close",onClose);
        resolve(dialog.returnValue==="delete");
      };
      dialog.addEventListener("close",onClose);
      try{dialog.showModal();}catch(_){resolve(window.confirm("Apagar esta permissão cancelada definitivamente?"));}
    });
  }

  function escapeHtml(value){
    return String(value||"").replace(/[&<>\"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  }

  async function handleDelete(button){
    const id=String(button?.dataset?.deletePermission||"");
    if(!id) return;
    if(!canManagePermissions()){
      try{toast("Sua conta não tem permissão para apagar esta permissão.");}catch(_){}
      return;
    }

    let permission=null;
    try{permission=Array.isArray(permissions)?permissions.find(p=>String(p.id)===id):null;}catch(_){}
    if(!permission){
      try{toast("Permissão não encontrada. Atualize a página e tente novamente.");}catch(_){}
      return;
    }
    if(permission.active){
      try{toast("Cancele a permissão antes de apagá-la.");}catch(_){}
      return;
    }

    const confirmed=await askDelete(permission);
    if(!confirmed) return;

    const oldText=button.textContent;
    button.disabled=true;
    button.textContent="Apagando...";
    try{
      if(typeof v46Rpc!=="function") throw new Error("backend_unavailable");
      await v46Rpc("ete_delete_permission",{p_permission_id:id});
      try{toast("Permissão apagada definitivamente.");}catch(_){}
      queueEnhance();
    }catch(err){
      console.error("Falha ao apagar permissão:",err);
      const message=String(err?.message||err||"");
      try{
        if(message.includes("permission_must_be_cancelled")) toast("Cancele a permissão antes de apagá-la.");
        else if(message.includes("forbidden")) toast("Sua conta não tem permissão para apagar esta permissão.");
        else if(message.includes("permission_not_found")) toast("Essa permissão já não existe mais.");
        else toast("Não foi possível apagar a permissão. Tente novamente.");
      }catch(_){}
      button.disabled=false;
      button.textContent=oldText;
    }
  }

  function install(){
    const rows=document.getElementById("permissionRows");
    if(!rows){setTimeout(install,250);return;}

    enhanceCards();
    if(!observer){
      observer=new MutationObserver(queueEnhance);
      observer.observe(rows,{childList:true,subtree:true});
    }

    document.addEventListener("input",event=>{
      if(event.target?.id==="permissionSearch") queueEnhance();
    });
    document.addEventListener("change",event=>{
      if(event.target?.id==="permissionFilter") queueEnhance();
    });
    document.addEventListener("click",event=>{
      const button=event.target.closest?.("[data-delete-permission]");
      if(!button) return;
      event.preventDefault();
      event.stopPropagation();
      handleDelete(button);
    });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();

(function loadComputerDeleteEnhancement(){
  "use strict";
  function load(){
    if(document.getElementById("controlComputerDeleteEnhanceScript")) return;
    const script=document.createElement("script");
    script.id="controlComputerDeleteEnhanceScript";
    script.src="computer-delete-enhance.js?v=1";
    script.async=false;
    document.head.appendChild(script);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",load,{once:true});
  else load();
})();
