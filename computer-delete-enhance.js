(function(){
  "use strict";

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
      else alert(message);
    }catch(_){ }
  }

  async function deleteComputerRecord(request,button){
    if(!request) return;
    if(request.status!=="done"){
      notify("Confirme a devolução antes de apagar este computador.");
      return;
    }
    if(!canDelete(request)){
      notify("Sua conta não tem permissão para apagar este registro.");
      return;
    }

    const code=String(request.code||"");
    const student=String(request.student||"aluno");
    const confirmed=window.confirm(`Apagar o registro do notebook ${code}?\n\nAluno: ${student}\n\nIsso remove o pedido concluído da lista de computadores, pedidos e agenda. Esta ação não pode ser desfeita.`);
    if(!confirmed) return;

    const oldText=button.textContent;
    button.disabled=true;
    button.textContent="Apagando...";

    try{
      if(typeof v46Rpc!=="function") throw new Error("backend_unavailable");
      await v46Rpc("ete_delete_request",{p_request_id:String(request.id)});
      notify("Registro do computador apagado.");
      setTimeout(enhance,0);
    }catch(err){
      console.error("Falha ao apagar computador:",err);
      const message=String(err?.message||err||"");
      if(message.includes("request_in_use")) notify("Confirme a devolução antes de apagar este computador.");
      else if(message.includes("forbidden")) notify("Sua conta não tem permissão para apagar este registro.");
      else if(message.includes("request_not_found")) notify("Este registro já não existe mais.");
      else notify("Não foi possível apagar o computador. Tente novamente.");
      button.disabled=false;
      button.textContent=oldText;
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

      const old=foot.querySelector("[data-computer-delete-enhanced]");
      if(old) old.remove();

      if(!canDelete(request)) return;

      const button=document.createElement("button");
      button.type="button";
      button.className="btn danger small delete-request computer-delete-request";
      button.dataset.computerDeleteEnhanced="1";
      button.dataset.deleteComputerRecord=String(request.id);
      button.textContent="Apagar";
      button.title="Apagar este registro de computador devolvido";
      button.setAttribute("aria-label",`Apagar registro do notebook ${request.code||"devolvido"}`);
      button.addEventListener("click",event=>{
        event.preventDefault();
        event.stopPropagation();
        deleteComputerRecord(request,button);
      });
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

    document.querySelector("#computerSearch")?.addEventListener("input",()=>setTimeout(enhance,0));
    document.querySelectorAll("[data-computer-filter]").forEach(button=>button.addEventListener("click",()=>setTimeout(enhance,0)));
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
