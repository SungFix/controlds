(function(){
  "use strict";

  let selectedStudentId=null;
  let bypassOriginal=false;

  function el(id){ return document.getElementById(id); }

  function ensureModal(){
    if(el("studentUseChoiceModal")) return el("studentUseChoiceModal");

    const dialog=document.createElement("dialog");
    dialog.id="studentUseChoiceModal";
    dialog.setAttribute("aria-labelledby","studentUseChoiceTitle");
    dialog.innerHTML=`
      <div class="modal student-use-choice-modal">
        <div class="modalhead">
          <div>
            <h2 id="studentUseChoiceTitle">Usar aluno em</h2>
            <p>Escolha o tipo de solicitação que deseja criar com os dados deste aluno.</p>
          </div>
          <button type="button" class="close" data-student-use-close aria-label="Fechar">×</button>
        </div>
        <div class="student-use-choice-options">
          <button type="button" class="student-use-choice-option" data-student-use-target="requests">
            <strong>Pedido de notebook</strong>
            <span>Abrir solicitação de uso de notebook</span>
          </button>
          <button type="button" class="student-use-choice-option" data-student-use-target="permissions">
            <strong>Autorização / Permissão</strong>
            <span>Abrir autorização de entrada com o aluno preenchido</span>
          </button>
        </div>
      </div>`;

    const style=document.createElement("style");
    style.id="studentUseChoiceStyles";
    style.textContent=`
      #studentUseChoiceModal{
        width:min(520px,calc(100% - 28px));
        border-color:var(--ui-border-strong,#373d45);
        background:var(--ui-surface,#101216);
      }
      .student-use-choice-modal{padding:22px}
      .student-use-choice-modal .modalhead{margin-bottom:14px}
      .student-use-choice-modal .modalhead h2{font-size:24px}
      .student-use-choice-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .student-use-choice-option{
        min-height:94px;
        padding:15px;
        display:flex;
        flex-direction:column;
        align-items:flex-start;
        justify-content:center;
        gap:6px;
        text-align:left;
        border:1px solid var(--ui-border,#2d333a);
        border-radius:12px;
        background:var(--ui-surface-2,#15181d);
        color:var(--ui-text,#eef1f4);
        box-shadow:none;
        transition:background .14s ease,border-color .14s ease,transform .14s ease,box-shadow .14s ease;
      }
      .student-use-choice-option strong{font-size:14px;line-height:1.25;color:inherit}
      .student-use-choice-option span{font-size:12px;line-height:1.4;font-weight:650;color:var(--ui-muted,#9da5ae)}
      .student-use-choice-option:hover,
      .student-use-choice-option:focus-visible{
        background:var(--ui-surface-3,#1c2026);
        border-color:var(--ui-accent,#59636f);
        transform:translateY(-1px);
        box-shadow:0 8px 22px rgba(0,0,0,.16);
        outline:none;
      }
      .student-use-choice-option:active{
        transform:translateY(0);
        border-color:var(--ui-border-strong,#49515b);
        background:var(--ui-surface-3,#1c2026);
      }
      html[data-theme="light"] .student-use-choice-option{
        background:var(--ui-surface-2,#f3f6f8);
        color:var(--ui-text,#1d303a);
      }
      html[data-theme="light"] .student-use-choice-option:hover,
      html[data-theme="light"] .student-use-choice-option:focus-visible{
        background:var(--ui-surface-3,#e8eef2);
      }
      @media(max-width:600px){
        #studentUseChoiceModal{width:min(440px,calc(100% - 20px))}
        .student-use-choice-modal{padding:18px}
        .student-use-choice-options{grid-template-columns:1fr}
        .student-use-choice-option{min-height:82px;padding:14px}
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(dialog);

    dialog.addEventListener("click",event=>{
      if(event.target===dialog) dialog.close();
    });
    dialog.querySelector("[data-student-use-close]")?.addEventListener("click",()=>dialog.close());
    dialog.querySelectorAll("[data-student-use-target]").forEach(button=>{
      button.addEventListener("click",()=>chooseTarget(button.dataset.studentUseTarget));
    });

    return dialog;
  }

  function currentStudent(){
    try{
      return students.find(student=>String(student.id)===String(selectedStudentId)) || null;
    }catch(_){
      return null;
    }
  }

  function openRequest(student){
    if(typeof canCreateRequest==="function" && !canCreateRequest()){
      if(typeof toast==="function") toast("Seu perfil não pode criar pedidos.");
      return;
    }
    if(typeof goPage==="function") goPage("requests");
    if(typeof resetRequestForm==="function") resetRequestForm();
    if(typeof populateSavedStudentSelect==="function") populateSavedStudentSelect(student.id);
    if(typeof useSavedStudent==="function") useSavedStudent(student.id);
    el("requestModal")?.showModal();
  }

  function openPermission(student){
    if(typeof canCreatePermission==="function" && !canCreatePermission()){
      if(typeof toast==="function") toast("Seu perfil não pode criar permissões.");
      return;
    }
    if(typeof goPage==="function") goPage("permissions");
    const form=el("permissionForm");
    if(form) form.reset();
    if(typeof setIntervalPickerValue==="function") setIntervalPickerValue("permissionInterval","morning",false);

    const name=String(student.name||student.student||"").trim();
    const group=[String(student.className||"").trim(),String(student.course||"").trim()].filter(Boolean).join(" ");
    if(el("permissionStudent")) el("permissionStudent").value=name;
    if(el("permissionClass")) el("permissionClass").value=group;
    el("permissionModal")?.showModal();
  }

  function chooseTarget(target){
    const student=currentStudent();
    el("studentUseChoiceModal")?.close();
    if(!student){
      if(typeof toast==="function") toast("Aluno não encontrado.");
      return;
    }
    if(target==="permissions") openPermission(student);
    else openRequest(student);
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-use-student]");
    if(!button || bypassOriginal) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selectedStudentId=button.dataset.useStudent;
    ensureModal().showModal();
  },true);

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",ensureModal,{once:true});
  else ensureModal();
})();
