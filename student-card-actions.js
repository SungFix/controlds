(function initStudentCardActions(){
  "use strict";

  const trashIcon='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M7 7l1 13h8l1-13"/><path d="M10 11v5M14 11v5"/></svg>';
  let queued=false;

  function normalize(value){
    return String(value||"").replace(/\s+/g," ").trim().toLowerCase();
  }

  function decorateButton(button){
    if(!button || button.dataset.studentActionStyled==="1") return;

    const label=normalize(button.textContent);
    let type="";

    if(button.matches("[data-use-student]")) type="use";
    else if(button.matches("[data-edit-student]") || label==="editar" || label.startsWith("editar ")) type="edit";
    else if(button.matches("[data-delete-student]") || label==="remover" || label.startsWith("remover ")) type="delete";
    else return;

    button.dataset.studentActionStyled="1";
    button.classList.add("student-card-action","student-card-action-"+type);

    if(type==="delete"){
      button.setAttribute("aria-label","Remover aluno");
      button.setAttribute("title","Remover aluno");
      button.innerHTML=trashIcon;
    }
  }

  function apply(){
    queued=false;
    document.querySelectorAll(".student-card button,[data-use-student],[data-edit-student],[data-delete-student]").forEach(button=>{
      if(button.closest(".student-card")) decorateButton(button);
    });
  }

  function queueApply(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(apply);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",apply,{once:true});
  else apply();

  const observer=new MutationObserver(queueApply);
  function observe(){
    if(document.body) observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.body) observe();
  else document.addEventListener("DOMContentLoaded",observe,{once:true});

  window.addEventListener("pageshow",queueApply);
})();
