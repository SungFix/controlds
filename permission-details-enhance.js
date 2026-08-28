(function(){
  "use strict";

  function sameText(a,b){
    return String(a||"").trim().localeCompare(String(b||"").trim(),"pt-BR",{sensitivity:"base"})===0;
  }

  function formatConfirmedAt(value){
    const raw=String(value||"").trim();
    if(!raw) return "";
    const date=new Date(raw);
    if(Number.isNaN(date.getTime())) return raw;

    const parts=new Intl.DateTimeFormat("pt-BR",{
      timeZone:"America/Recife",
      day:"2-digit",
      month:"2-digit",
      year:"numeric",
      hour:"2-digit",
      minute:"2-digit",
      hour12:false
    }).formatToParts(date);

    const get=type=>parts.find(p=>p.type===type)?.value||"";
    return `${get("day")}/${get("month")}/${get("year")} às ${get("hour")}:${get("minute")}`;
  }

  function enhanceProof(proof){
    if(!proof || proof.dataset.permissionDetailsEnhanced==="1") return;

    const label=proof.querySelector("span");
    const strong=proof.querySelector("strong");
    if(!strong) return;

    const text=String(strong.textContent||"").trim();
    const pieces=text.split("·").map(x=>x.trim()).filter(Boolean);
    const hasDate=pieces.length>=3 && !Number.isNaN(new Date(pieces.slice(2).join(" · ")).getTime());
    if(!hasDate) return;

    const role=pieces[0]||"";
    const name=pieces[1]||"";
    const rawDate=pieces.slice(2).join(" · ");
    const responsible=role && name
      ? (sameText(role,name) ? role : `${name} • ${role}`)
      : (name||role||"Responsável");

    if(label) label.textContent="Saída confirmada";
    strong.textContent=`${responsible}\n${formatConfirmedAt(rawDate)}`;
    proof.classList.add("enhanced-exit-proof");
    proof.dataset.permissionDetailsEnhanced="1";
  }

  function enhanceAll(){
    document.querySelectorAll("#permissionRows .exit-proof").forEach(enhanceProof);
  }

  function start(){
    enhanceAll();
    const rows=document.getElementById("permissionRows");
    if(!rows) return;

    let queued=false;
    const observer=new MutationObserver(function(){
      if(queued) return;
      queued=true;
      requestAnimationFrame(function(){
        queued=false;
        enhanceAll();
      });
    });
    observer.observe(rows,{childList:true,subtree:true});
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",start,{once:true});
  }else{
    start();
  }
})();
