(function initStudentRosterMode(){
  "use strict";

  function applyRosterMode(){
    const createButtons=[
      document.getElementById("newStudentBtn"),
      document.getElementById("newStudentBtn2"),
      document.getElementById("newStudentFromRequest")
    ];
    createButtons.forEach(button=>{
      if(!button)return;
      button.hidden=true;
      button.setAttribute("aria-hidden","true");
      button.tabIndex=-1;
    });

    const page=document.getElementById("page-students");
    const description=page?.querySelector(".pagehead p");
    if(description)description.textContent="Alunos importados da listagem oficial da escola e organizados por turma.";

    const savedLabel=page?.querySelector(".student-stat span");
    if(savedLabel&&savedLabel.textContent.trim()==="Alunos salvos")savedLabel.textContent="Alunos cadastrados";

    const savedHint=page?.querySelector(".student-stat small");
    if(savedHint&&savedHint.textContent.includes("cadastros disponíveis"))savedHint.textContent="listagem oficial disponível para uso no sistema";

    const studentSearch=document.getElementById("studentSearch");
    if(studentSearch)studentSearch.placeholder="Pesquisar nome, turma ou curso...";
  }

  function disableManualCreation(){
    try{
      if(typeof window.openStudentModal==="function"){
        window.openStudentModal=function(){
          if(typeof window.toast==="function")window.toast("O cadastro manual foi desativado. Os alunos vêm da listagem oficial.");
        };
      }
    }catch(_){ }
  }

  function start(){
    applyRosterMode();
    disableManualCreation();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.addEventListener("pageshow",applyRosterMode);
})();
