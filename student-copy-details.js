/* Copia apenas os campos exibidos nos detalhes do aluno.
   Não consulta campos ocultos, banco de dados nem informações privadas adicionais. */
(function initStudentDetailCopy(){
  "use strict";

  const rowsId="studentRows";
  let updateQueued=false;

  function text(node){
    return String(node?.textContent||"").replace(/\s+/g," ").trim();
  }

  function present(value){
    return value && !["—","-","não informado","nao informado","n/d"].includes(value.toLocaleLowerCase("pt-BR"));
  }

  function buildCopyText(card){
    if(!card) return "";
    const name=text(card.querySelector(".student-card-title strong"));
    if(!present(name))return "";

    const data=[["Nome",name]];
    const heading=text(card.querySelector(".student-card-title small"));
    const [group,course]=heading.split(/\s*[·•]\s*/).map(value=>value.trim());
    if(present(group))data.push(["Turma",group]);
    if(present(course))data.push(["Curso",course]);

    for(const field of card.querySelectorAll(".student-card-body .student-meta")){
      const label=text(field.querySelector("span")).toLocaleLowerCase("pt-BR");
      const value=text(field.querySelector("strong"));
      if(!present(value))continue;
      if(label==="matrícula"||label==="matricula"){
        data.push(["Matrícula",value]);
      }else if(label==="cpf"){
        // CPF só poderá ser copiado se já estiver visível nos detalhes da tela.
        data.push(["CPF",value]);
      }else if(label==="turma"&&!data.some(([key])=>key==="Turma")){
        data.push(["Turma",value]);
      }else if(label==="curso"&&!data.some(([key])=>key==="Curso")){
        data.push(["Curso",value]);
      }
    }

    return data.map(([key,value])=>key+": "+value).join("\n");
  }

  async function writeClipboard(value){
    if(navigator.clipboard?.writeText){
      try{
        await navigator.clipboard.writeText(value);
        return true;
      }catch(_){}
    }
    const area=document.createElement("textarea");
    area.value=value;
    area.setAttribute("aria-hidden","true");
    area.setAttribute("readonly","");
    area.style.cssText="position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0";
    const previous=document.activeElement;
    document.body.appendChild(area);
    try{
      area.focus();
      area.select();
      return !!document.execCommand?.("copy");
    }finally{
      area.remove();
      if(previous?.isConnected)previous.focus({preventScroll:true});
    }
  }

  function decorate(){
    updateQueued=false;
    const rows=document.getElementById(rowsId);
    if(!rows)return;
    rows.querySelectorAll(".student-card").forEach(card=>{
      if(card.querySelector("[data-copy-student-details]"))return;
      const foot=card.querySelector(".student-card-foot");
      if(!foot)return;
      const button=document.createElement("button");
      button.type="button";
      button.className="btn small student-copy-details";
      button.dataset.copyStudentDetails="1";
      button.textContent="Copiar dados";
      button.title="Copiar as informações disponíveis deste aluno";
      button.setAttribute("aria-label","Copiar dados de "+(text(card.querySelector(".student-card-title strong"))||"aluno"));
      const actions=foot.querySelector(".v46-student-actions");
      if(actions)foot.insertBefore(button,actions);
      else foot.appendChild(button);
    });
  }

  function queueDecorate(){
    if(updateQueued)return;
    updateQueued=true;
    requestAnimationFrame(decorate);
  }

  async function onClick(event){
    const button=event.target.closest?.("[data-copy-student-details]");
    if(!button)return;
    const rows=document.getElementById(rowsId);
    if(!rows?.contains(button))return;
    event.preventDefault();
    event.stopPropagation();

    const page=document.getElementById("page-students");
    if(document.body.classList.contains("auth-locked")||
       document.body.classList.contains("portal-open")||
       !page?.classList.contains("active"))return;

    const details=buildCopyText(button.closest(".student-card"));
    if(!details)return;

    button.disabled=true;
    const original=button.textContent;
    try{
      if(!await writeClipboard(details))throw new Error("clipboard-unavailable");
      button.textContent="Copiado!";
      button.setAttribute("aria-label","Dados copiados");
    }catch(_){
      button.textContent="Não copiado";
      button.setAttribute("aria-label","Não foi possível copiar os dados");
    }finally{
      setTimeout(()=>{
        if(!button.isConnected)return;
        button.textContent=original;
        button.setAttribute("aria-label",button.title);
        button.disabled=false;
      },1600);
    }
  }

  function install(){
    const rows=document.getElementById(rowsId);
    if(!rows)return;
    rows.addEventListener("click",onClick);
    queueDecorate();
    window.addEventListener("student-roster-rendered",queueDecorate);
    window.addEventListener("student-list-updated",queueDecorate);
    window.addEventListener("pageshow",queueDecorate);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
