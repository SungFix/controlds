(function initStudentCollapsibleList(){
  "use strict";

  let openId="";
  let scanQueued=false;
  let observer=null;

  function rows(){return document.getElementById("studentRows");}

  function studentId(card,index){
    const current=String(card?.dataset?.studentId||"");
    if(current)return current;
    try{
      const list=Array.isArray(students)?students:[];
      return String(list[index]?.id||"");
    }catch(_){return "";}
  }

  function isInteractive(target){
    return !!target.closest?.("button,a,input,select,textarea,label,[role='button']:not(.student-card-head)");
  }

  function setCardState(card,expanded){
    if(!card)return;
    const head=card.querySelector(".student-card-head");
    card.classList.toggle("is-open",expanded);
    if(head)head.setAttribute("aria-expanded",String(expanded));
  }

  function closeOthers(except){
    rows()?.querySelectorAll(".student-card.is-open").forEach(card=>{
      if(card!==except)setCardState(card,false);
    });
  }

  function toggleCard(card){
    if(!card||card.hidden)return;
    const id=String(card.dataset.studentId||"");
    const next=!card.classList.contains("is-open");
    closeOthers(next?card:null);
    setCardState(card,next);
    openId=next?id:"";
  }

  function decorateCard(card,index){
    if(!card)return;
    const id=studentId(card,index);
    if(id)card.dataset.studentId=id;
    card.classList.add("student-collapsible-row");

    const head=card.querySelector(".student-card-head");
    if(!head)return;
    head.setAttribute("role","button");
    head.setAttribute("tabindex","0");
    head.setAttribute("aria-expanded","false");
    const name=card.querySelector(".student-card-title strong")?.textContent?.trim()||"aluno";
    head.setAttribute("aria-label","Ver informações de "+name);

    if(!head.querySelector(".student-row-chevron")){
      const chevron=document.createElement("span");
      chevron.className="student-row-chevron";
      chevron.setAttribute("aria-hidden","true");
      chevron.innerHTML='<svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"/></svg>';
      head.appendChild(chevron);
    }

    setCardState(card,!!id&&id===openId&&!card.hidden);
  }

  function scan(){
    scanQueued=false;
    const container=rows();
    if(!container)return;
    const cards=[...container.querySelectorAll(".student-card")];
    cards.forEach(decorateCard);
    if(openId&&!cards.some(card=>String(card.dataset.studentId||"")===openId&&!card.hidden)){
      openId="";
      cards.forEach(card=>setCardState(card,false));
    }
  }

  function queueScan(){
    if(scanQueued)return;
    scanQueued=true;
    requestAnimationFrame(scan);
  }

  function mount(){
    const container=rows();
    if(!container){setTimeout(mount,120);return;}
    if(container.dataset.collapsibleListMounted==="1"){queueScan();return;}
    container.dataset.collapsibleListMounted="1";

    container.addEventListener("click",event=>{
      const head=event.target.closest?.(".student-card-head");
      if(!head||!container.contains(head)||isInteractive(event.target))return;
      event.preventDefault();
      toggleCard(head.closest(".student-card"));
    });

    container.addEventListener("keydown",event=>{
      if(event.key!=="Enter"&&event.key!==" ")return;
      const head=event.target.closest?.(".student-card-head");
      if(!head||event.target!==head)return;
      event.preventDefault();
      toggleCard(head.closest(".student-card"));
    });

    observer=new MutationObserver(queueScan);
    observer.observe(container,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","data-student-id"]});
    window.addEventListener("student-list-updated",queueScan);
    window.addEventListener("control-theme-change",queueScan);
    queueScan();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
