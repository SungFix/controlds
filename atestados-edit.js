(function initAtestadosEdit(){
  "use strict";

  const TABLE="ete_atestados_justified_absences";
  const BUCKET="atestados-images";
  const MAX_BYTES=6*1024*1024;
  const TYPES={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/heic":"heic","image/heif":"heif"};
  let scanQueued=false;

  function client(){try{return typeof sb!=="undefined"?sb:null;}catch(_){return null;}}
  function role(){try{return String(currentUser?.role||"").toLowerCase();}catch(_){return"";}}
  function canEdit(){return ["adm","diretor","vice_diretor"].includes(role());}
  function todayIso(){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Recife",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const map=Object.fromEntries(parts.map(part=>[part.type,part.value]));return `${map.year}-${map.month}-${map.day}`;}
  function setStatus(text,error){const el=document.querySelector(".ete-atestados #atStatus");if(!el)return;el.textContent=text;el.classList.toggle("error",!!error);el.dataset.state=error?"error":"loading";}
  function reasonLabel(input){return input.closest(".at-reason-option")?.querySelector("strong")?.textContent?.trim()||input.value;}
  function uuidish(){try{return crypto.randomUUID();}catch(_){return Date.now().toString(36)+Math.random().toString(36).slice(2);}}

  function ensureStyles(){
    if(document.getElementById("atRecordEditStyles"))return;
    const style=document.createElement("style");
    style.id="atRecordEditStyles";
    style.textContent=`
      .ete-atestados .at-record-edit-button{min-height:28px;padding:0 9px;border:1px solid #35414b;border-radius:8px;background:#151c22;color:#aab8c3;font:inherit;font-size:8px;font-weight:850;cursor:pointer;white-space:nowrap}
      .ete-atestados .at-record-edit-button:hover{background:#1a232a;border-color:#465662;color:#e6ecef}
      .ete-atestados .at-edit-note{grid-column:1/-1;padding:10px 12px;border:1px solid #34414a;border-radius:10px;background:#121a20;color:#8796a1;font-size:8.5px;line-height:1.5}
      .ete-atestados .at-edit-note strong{color:#c5d0d6}
      html[data-theme="light"] .ete-atestados .at-record-edit-button{background:#e7ebe5;border-color:#bdc8c0;color:#5d7069}
      html[data-theme="light"] .ete-atestados .at-record-edit-button:hover{background:#dde5df;border-color:#acbdb2;color:#4f625c}
      html[data-theme="light"] .ete-atestados .at-edit-note{background:#e7ebe5;border-color:#c1cbc3;color:#687872}
      html[data-theme="light"] .ete-atestados .at-edit-note strong{color:#4f615b}
    `;
    document.head.appendChild(style);
  }

  function decorate(){
    if(!canEdit())return;
    ensureStyles();
    document.querySelectorAll(".ete-atestados [data-at-delete]").forEach(deleteButton=>{
      const actions=deleteButton.parentElement;
      const id=String(deleteButton.dataset.atDelete||"");
      if(!actions||!id||actions.querySelector("[data-at-edit-record]"))return;
      const button=document.createElement("button");
      button.type="button";
      button.className="at-record-edit-button";
      button.dataset.atEditRecord=id;
      button.textContent="Editar";
      button.setAttribute("aria-label","Editar este registro de falta justificada");
      actions.insertBefore(button,actions.firstChild);
    });
  }

  function queueScan(){if(scanQueued)return;scanQueued=true;requestAnimationFrame(()=>{scanQueued=false;decorate();});}

  async function fetchRecord(id){
    const c=client();if(!c)throw new Error("Supabase indisponível");
    const {data,error}=await c.from(TABLE).select("*").eq("id",id).single();
    if(error||!data)throw error||new Error("Registro não encontrado");
    return data;
  }

  function findStudent(record){
    try{
      if(!Array.isArray(students))return null;
      if(record.student_id){const exact=students.find(item=>String(item?.id)===String(record.student_id));if(exact)return exact;}
      const name=String(record.student_name||"").trim().toLocaleLowerCase("pt-BR");
      return students.find(item=>String(item?.name||"").trim().toLocaleLowerCase("pt-BR")===name)||null;
    }catch(_){return null;}
  }

  async function openEdit(id){
    if(!canEdit())return;
    setStatus("Carregando registro...");
    try{
      const record=await fetchRecord(id);
      const student=findStudent(record);
      if(!student){setStatus("O aluno deste registro não está mais cadastrado. Não é possível editar com segurança.",true);return;}

      document.querySelector('.ete-atestados [data-at-tab="new"]')?.click();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const form=document.querySelector(".ete-atestados #atForm");
      if(!form)throw new Error("Formulário indisponível");

      const trigger=form.querySelector(".at-student-trigger");
      trigger?.click();
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const option=[...form.querySelectorAll("[data-at-student-id]")].find(node=>String(node.dataset.atStudentId)===String(student.id));
      if(!option)throw new Error("Aluno não disponível no seletor");
      option.click();

      const start=form.querySelector("#atDate"),end=form.querySelector("#atEndDate");
      if(start){start.value=String(record.absence_date||"");start.dispatchEvent(new Event("change",{bubbles:true}));}
      if(end){end.value=String(record.absence_end_date||record.absence_date||"");end.dispatchEvent(new Event("change",{bubbles:true}));}

      const scope=String(record.absence_scope||"full_day");
      const scopeInput=form.querySelector(`input[name="atAbsenceScope"][value="${scope}"]`);
      if(scopeInput&&!scopeInput.disabled){scopeInput.checked=true;scopeInput.dispatchEvent(new Event("change",{bubbles:true}));}
      if(scope==="partial"){
        const startTime=form.querySelector("#atStartTime"),endTime=form.querySelector("#atEndTime");
        if(startTime)startTime.value=String(record.absence_start_time||"").slice(0,5);
        if(endTime)endTime.value=String(record.absence_end_time||"").slice(0,5);
      }

      const codes=Array.isArray(record.reason_codes)?record.reason_codes:[];
      form.querySelectorAll('input[name="atReason"]').forEach(input=>{input.checked=codes.includes(input.value);input.dispatchEvent(new Event("change",{bubbles:true}));});
      const note=form.querySelector("#atReasonNote"),project=form.querySelector("#atProject");
      if(note)note.value=String(record.reason_note||"");
      if(project)project.value=String(record.project_name||"");

      form.dataset.atEditId=String(record.id);
      form.dataset.atOriginalImagePath=String(record.image_path||"");
      const submit=form.querySelector('button[type="submit"]');
      if(submit)submit.textContent="Salvar alterações";
      const intro=document.querySelector(".ete-atestados .at-form-intro h2");
      if(intro)intro.textContent="Editar falta justificada";
      const noteBox=document.createElement("div");
      noteBox.className="at-edit-note";
      noteBox.innerHTML=record.image_path?"<strong>Imagem atual preservada.</strong> Se você não escolher outra imagem, o anexo existente continuará no registro.":"<strong>Modo de edição.</strong> Revise os dados e salve apenas o que precisar corrigir.";
      form.querySelector(".at-image-upload-field")?.before(noteBox)||form.querySelector(".at-form-actions")?.before(noteBox);
      setStatus("Editando registro",false);
    }catch(error){
      console.error("Atestados: falha ao abrir edição",error);
      setStatus("Não foi possível abrir este registro para edição.",true);
    }
  }

  function validateForm(form){
    if(!form.reportValidity())return null;
    const selectedClass=form.querySelector('input[name="atClass"]:checked');
    const student=String(form.querySelector("#atStudent")?.value||"").trim();
    const reasons=[...form.querySelectorAll('input[name="atReason"]:checked')];
    if(!student||!selectedClass){setStatus("Selecione um aluno cadastrado.",true);return null;}
    if(!reasons.length){setStatus("Selecione uma justificativa.",true);return null;}
    const absenceStart=String(form.querySelector("#atDate")?.value||"");
    const absenceEnd=String(form.querySelector("#atEndDate")?.value||absenceStart);
    const limit=todayIso();
    if(!absenceStart||!absenceEnd){setStatus("Informe a data inicial e final.",true);return null;}
    if(absenceEnd<absenceStart){setStatus("A data final não pode ser anterior à inicial.",true);return null;}
    if(absenceStart>limit||absenceEnd>limit){setStatus("Não é possível registrar faltas em datas futuras.",true);return null;}
    const scope=form.querySelector('input[name="atAbsenceScope"]:checked')?.value||"full_day";
    if(absenceEnd>absenceStart&&scope==="partial"){setStatus("Horário específico só pode ser usado em uma falta de um único dia.",true);return null;}
    const startTime=scope==="partial"?String(form.querySelector("#atStartTime")?.value||""):null;
    const endTime=scope==="partial"?String(form.querySelector("#atEndTime")?.value||""):null;
    if(scope==="partial"&&(!startTime||!endTime||endTime<=startTime)){setStatus("Confira o horário da falta.",true);return null;}
    const codes=reasons.map(input=>input.value);
    const projectName=codes.includes("projeto")?String(form.querySelector("#atProject")?.value||"").trim():null;
    const reasonNote=codes.includes("outro")?String(form.querySelector("#atReasonNote")?.value||"").trim():null;
    if(codes.includes("projeto")&&!projectName){setStatus("Informe o nome do projeto.",true);return null;}
    if(codes.includes("outro")&&!reasonNote){setStatus("Detalhe Outros/Casos Omissos.",true);return null;}
    const labels=reasons.map(reasonLabel);
    const readable=labels.map(label=>label==="Outros/Casos Omissos"&&reasonNote?label+": "+reasonNote:label).join(" · ");
    return {student_name:student,class_name:selectedClass.value,reason:readable,reason_codes:codes,reason_note:reasonNote||null,project_name:projectName||null,absence_date:absenceStart,absence_end_date:absenceEnd,absence_scope:scope,absence_start_time:startTime||null,absence_end_time:endTime||null};
  }

  async function uploadReplacement(file){
    if(!file)return"";
    if(!TYPES[file.type])throw new Error("Use uma imagem JPG, PNG, WEBP ou HEIC.");
    if(file.size>MAX_BYTES)throw new Error("A imagem deve ter no máximo 6 MB.");
    const c=client();
    let uid="";try{uid=String(currentUser?.userId||v46AuthUser?.id||"");}catch(_){}
    if(!uid)throw new Error("Sessão inválida para enviar a imagem.");
    const path=uid+"/"+new Date().getFullYear()+"/"+Date.now()+"-"+uuidish()+"."+TYPES[file.type];
    const {error}=await c.storage.from(BUCKET).upload(path,file,{cacheControl:"3600",contentType:file.type,upsert:false});
    if(error)throw error;
    return path;
  }

  async function removeImage(path){if(!path)return;try{await client()?.storage?.from(BUCKET).remove([path]);}catch(_){} }

  async function saveEdit(event,form){
    event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();
    const id=String(form.dataset.atEditId||"");
    if(!id||!canEdit())return;
    const payload=validateForm(form);if(!payload)return;
    const button=form.querySelector('button[type="submit"]');
    const oldText=button?.textContent||"Salvar alterações";
    if(button){button.disabled=true;button.setAttribute("aria-busy","true");button.textContent="Salvando...";}
    let newImage="";
    try{
      const file=form.querySelector("#atImage")?.files?.[0]||null;
      if(file){if(button)button.textContent="Enviando imagem...";newImage=await uploadReplacement(file);payload.image_path=newImage;if(button)button.textContent="Salvando...";}
      const c=client();if(!c)throw new Error("Supabase indisponível");
      const {error}=await c.from(TABLE).update(payload).eq("id",id);
      if(error)throw error;
      const oldImage=String(form.dataset.atOriginalImagePath||"");
      if(newImage&&oldImage&&oldImage!==newImage)await removeImage(oldImage);
      setStatus("Atualizado",false);
      const root=document.querySelector("#eteAtestadosRoot");
      if(root&&window.ETEAtestados){window.ETEAtestados.unmount();window.ETEAtestados.mount(root);requestAnimationFrame(()=>root.querySelector('[data-at-tab="records"]')?.click());}
    }catch(error){
      if(newImage)await removeImage(newImage);
      console.error("Atestados: falha ao editar registro",error);
      setStatus(String(error?.message||"").startsWith("Use uma imagem")||String(error?.message||"").includes("6 MB")?error.message:"Não foi possível salvar as alterações.",true);
    }finally{
      if(button?.isConnected){button.disabled=false;button.removeAttribute("aria-busy");button.textContent=oldText;}
    }
  }

  window.addEventListener("click",event=>{
    const button=event.target?.closest?.(".ete-atestados [data-at-edit-record]");
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();
    openEdit(String(button.dataset.atEditRecord||""));
  },true);

  window.addEventListener("submit",event=>{
    const form=event.target?.closest?.(".ete-atestados #atForm");
    if(!form?.dataset.atEditId)return;
    saveEdit(event,form);
  },true);

  function start(){ensureStyles();decorate();const observer=new MutationObserver(queueScan);observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
