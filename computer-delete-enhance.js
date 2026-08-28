(function(){
  "use strict";

  const deletingIds=new Set();

  function currentList(){
    try{
      const all=(typeof data!=="undefined" && Array.isArray(data)) ? data.filter(r=>r && r.code) : [];
      const q=String(document.querySelector("#computerSearch")?.value||"").toLowerCase();
      const filter=(typeof currentComputerFilter!=="undefined" ? currentComputerFilter : "all");
      const list=all.filter(r=>{
        const filterOk=filter==="all" || (filter==="use" ? ["use","late"].includes(r.status) : r.status===filter);
        let group="";
        try{ group=typeof requestGroupText==="function" ? requestGroupText(r) : ((r.studentClass||"")+" "+(r.studentCourse||"")); }catch(_){ }
        const hay=(String(r.code||"")+" "+String(r.student||"")+" "+String(group||"")+" "+String(r.time||"")).toLowerCase();
        return filterOk && hay.includes(q);
      });
      return [...list].sort((a,b)=>{
        if(["use","late"].includes(a.status) && !["use","late"].includes(b.status)) return -1;
        if(["use","late"].includes(b.status) && !["use","late"].includes(a.status)) return 1;
        return Number(b.id)-Number(a.id);
      });
    }catch(_){
      return [];
    }
  }

  function findRequest(id){
    try{
      return (typeof data!=="undefined" && Array.isArray(data))
        ? data.find(r=>String(r?.id)===String(id)) || null
        : null;
    }catch(_){
      return null;
    }
  }

  function canDelete(request){
    if(!request || request.status!=="done") return false;
    try{
      return typeof canDeleteRequest==="function" ? !!canDeleteRequest(request) : false;
    }catch(_){
      return false;
    }
  }

  function notify(message){
    try{
      if(typeof toast==="function") toast(message);
      else if(window.ControlActionModal) window.ControlActionModal.notice({message});
      else console.warn(message);
    }catch(_){ }
  }

  async function askDelete(request){
    if(!window.ControlActionModal){
      notify("O sistema de confirmação ainda está carregando. Tente novamente.");
      return false;
    }
    return window.ControlActionModal.confirm({
      title:"Apagar computador devolvido",
      subtitle:"O registro do notebook será removido do sistema.",
      message:`Deseja apagar o registro do notebook ${request.code||"sem código"} de ${request.student||"aluno"}?`,
      details:["Lista de computadores","Lista de pedidos","Agenda"],
      warning:"Essa ação não pode ser desfeita.",
      confirmText:"Apagar registro"
    });
  }

  async function deleteComputerRecord(id,button){
    const request=findRequest(id);
    if(!request){
      notify("Este registro já não existe mais.");
      return;
    }
    if(request.status!=="done"){
      notify("Confirme a devolução antes de apagar este computador.");
      return;
    }
    if(!canDelete(request)){
      notify("Sua conta não tem permissão para apagar este registro.");
      return;
    }
    if(deletingIds.has(String(id))) return;

    const confirmed=await askDelete(request);
    if(!confirmed) return;

    deletingIds.add(String(id));
    const oldText=button.textContent;
    button.disabled=true;
    button.textContent="Apagando...";

    try{
      if(typeof v46Rpc!=="function") throw new Error("backend_unavailable");
      await v46Rpc("ete_delete_request",{p_request_id:String(id)});
      notify("Registro do computador apagado.");
    }catch(err){
      console.error("Falha ao apagar computador:",err);
      const message=String(err?.message||err||"");
      if(message.includes("request_in_use")) notify("Confirme a devolução antes de apagar este computador.");
      else if(message.includes("forbidden")) notify("Sua conta não tem permissão para apagar este registro.");
      else if(message.includes("request_not_found")) notify("Este registro já não existe mais.");
      else notify("Não foi possível apagar o computador. Tente novamente.");
      if(button.isConnected){
        button.disabled=false;
        button.textContent=oldText;
      }
    }finally{
      deletingIds.delete(String(id));
    }
  }

  function enhance(){
    const grid=document.querySelector("#computerGrid");
    if(!grid) return;

    const list=currentList();
    const cards=[...grid.querySelectorAll(".computer-item")];

    cards.forEach((card,index)=>{
      const request=list[index];
      const foot=card.querySelector(".computer-item-foot");
      if(!request||!foot) return;

      let button=foot.querySelector("[data-delete-computer-record]");

      if(!canDelete(request)){
        if(button) button.remove();
        return;
      }

      const id=String(request.id);
      if(button && button.dataset.deleteComputerRecord===id){
        button.disabled=deletingIds.has(id);
        return;
      }

      if(button) button.remove();
      button=document.createElement("button");
      button.type="button";
      button.className="btn danger small delete-request computer-delete-request";
      button.dataset.deleteComputerRecord=id;
      button.textContent="Apagar";
      button.title="Apagar este registro de computador devolvido";
      button.setAttribute("aria-label",`Apagar registro do notebook ${request.code||"devolvido"}`);
      foot.appendChild(button);
    });
  }

  function start(){
    const grid=document.querySelector("#computerGrid");
    if(!grid){
      setTimeout(start,250);
      return;
    }

    enhance();

    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      requestAnimationFrame(()=>{
        queued=false;
        enhance();
      });
    });
    observer.observe(grid,{childList:true,subtree:true});

    grid.addEventListener("click",event=>{
      const button=event.target.closest?.("[data-delete-computer-record]");
      if(!button || !grid.contains(button)) return;
      event.preventDefault();
      event.stopPropagation();
      const id=String(button.dataset.deleteComputerRecord||"");
      if(id) deleteComputerRecord(id,button);
    },true);

    document.querySelector("#computerSearch")?.addEventListener("input",()=>setTimeout(enhance,0));
    document.querySelectorAll("[data-computer-filter]").forEach(button=>button.addEventListener("click",()=>setTimeout(enhance,0)));
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
