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
      button.dataset.deleteRequest=String(request.id);
      button.dataset.computerDeleteEnhanced="1";
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

    document.querySelector("#computerSearch")?.addEventListener("input",()=>setTimeout(enhance,0));
    document.querySelectorAll("[data-computer-filter]").forEach(button=>button.addEventListener("click",()=>setTimeout(enhance,0)));
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
