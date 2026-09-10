(function initRegisteredStudentFlow(){
  "use strict";

  let requestSelectedStudentId="";
  let permissionSelectedStudentId="";
  let installed=false;

  function qs(selector,root){return (root||document).querySelector(selector);}
  function currentStudents(){
    try{return Array.isArray(students)?students:[];}catch(_){return [];}
  }
  function notify(message){
    if(typeof toast==="function") toast(message);
    else console.warn(message);
  }
  function friendlyError(err){
    if(typeof v46ExplainError==="function") return v46ExplainError(err);
    const message=String(err?.message||err||"");
    if(message.includes("duplicate_overlap")) return "Já existe um pedido ativo desse aluno nesse horário.";
    if(message.includes("student_not_found")) return "Aluno não encontrado. Atualize a página e tente novamente.";
    if(message.includes("forbidden")) return "Sua conta não tem permissão para esta ação.";
    return "Não foi possível concluir a ação. Tente novamente.";
  }
  function minutes(value){
    if(typeof minutesFromTime==="function") return minutesFromTime(value);
    const match=String(value||"").match(/^(\d{1,2}):(\d{2})/);
    return match?Number(match[1])*60+Number(match[2]):NaN;
  }
  function requestStudentId(){
    try{
      if(typeof selectedSavedStudentId!=="undefined" && selectedSavedStudentId) return String(selectedSavedStudentId);
    }catch(_){ }
    return String(requestSelectedStudentId||"");
  }
  function findPermissionStudentId(){
    if(permissionSelectedStudentId) return permissionSelectedStudentId;
    const name=String(qs("#permissionStudent")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const group=String(qs("#permissionClass")?.value||"").trim().toLocaleLowerCase("pt-BR");
    if(!name||!group) return "";
    const student=currentStudents().find(item=>{
      const itemName=String(item?.name||"").trim().toLocaleLowerCase("pt-BR");
      const itemGroup=[item?.className,item?.course].filter(Boolean).join(" ").trim().toLocaleLowerCase("pt-BR");
      return itemName===name && itemGroup===group;
    });
    return student?.id?String(student.id):"";
  }
  function hideLegacyInput(id){
    const input=qs("#"+id);
    if(!input) return null;
    input.required=false;
    input.removeAttribute("minlength");
    input.removeAttribute("maxlength");
    input.tabIndex=-1;
    input.setAttribute("aria-hidden","true");
    const label=input.closest("label");
    if(label){
      label.classList.add("registered-flow-legacy-field");
      label.setAttribute("aria-hidden","true");
    }
    return input;
  }
  function fullWidthLabel(id){
    const input=qs("#"+id);
    input?.closest("label")?.classList.add("registered-flow-full");
  }
  function installStyles(){
    if(qs("#registeredStudentFlowStyles")) return;
    const style=document.createElement("style");
    style.id="registeredStudentFlowStyles";
    style.textContent=`
      .registered-flow-hidden{display:none!important}
      .registered-flow-legacy-field{
        position:absolute!important;
        width:1px!important;
        height:1px!important;
        min-width:1px!important;
        min-height:1px!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        opacity:0!important;
        overflow:hidden!important;
        pointer-events:none!important;
        z-index:-1!important;
      }
      .registered-flow-legacy-field input,
      .registered-flow-legacy-field .group-picker{
        width:1px!important;
        height:1px!important;
        min-width:1px!important;
        min-height:1px!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
      }
      .registered-flow-full{grid-column:1/-1!important;width:100%!important}
      #requestForm .saved-student-box.registered-flow-official,
      #permissionForm .saved-student-box.registered-flow-official{
        margin:0!important;
        padding:15px!important;
        border-radius:14px!important;
      }
      #requestForm .registered-flow-official .saved-title,
      #permissionForm .registered-flow-official .saved-title{
        margin-bottom:9px!important;
      }
      #requestForm .registered-flow-official .saved-title strong,
      #permissionForm .registered-flow-official .saved-title strong{
        font-size:11px!important;
        letter-spacing:.01em!important;
      }
      #requestForm .registered-flow-official .saved-title small,
      #permissionForm .registered-flow-official .saved-title small,
      #requestForm .saved-student-actions,
      #permissionForm .permission-saved-student-box .student-hint{
        display:none!important;
      }
      #requestForm .student-picker-trigger,
      #permissionForm .student-picker-trigger{
        min-height:58px!important;
      }
      #requestForm .request-section-body{
        display:grid;
        gap:14px;
      }
      #pickupForm .simple-grid{
        grid-template-columns:1fr!important;
      }
      @media(max-width:620px){
        #requestForm .saved-student-box.registered-flow-official,
        #permissionForm .saved-student-box.registered-flow-official{
          padding:12px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }
  function polishSavedBox(box,trigger,titleText){
    if(!box) return;
    box.classList.add("registered-flow-official");
    const title=box.querySelector(".saved-title strong");
    if(title) title.textContent=titleText;
    const optional=box.querySelector(".saved-title small");
    if(optional) optional.hidden=true;
    if(trigger){
      trigger.setAttribute("aria-required","true");
      trigger.title="Selecionar aluno da listagem oficial";
    }
  }
  function installPickupRpcV3(){
    if(typeof v46PickupRpc!=="function" || v46PickupRpc.__registeredStudentFlow) return;
    const wrapped=async function(args={}){
      const result=await v46Rpc("ete_pickup_request_v3",{
        p_request_id:String(args.p_request_id||""),
        p_code:String(args.p_code||"")
      });
      if(result && result.ok===false) throw new Error(String(result.error||"pickup_failed"));
      return result?.request||result;
    };
    wrapped.__registeredStudentFlow=true;
    v46PickupRpc=wrapped;
  }
  function polishRequest(){
    const form=qs("#requestForm");
    if(!form) return false;

    hideLegacyInput("student");
    hideLegacyInput("studentPin");
    const groupLabel=qs("#studentGroupPicker")?.closest("label");
    if(groupLabel){
      groupLabel.classList.add("registered-flow-legacy-field");
      groupLabel.setAttribute("aria-hidden","true");
    }
    fullWidthLabel("date");

    const box=qs("#studentPicker")?.closest(".saved-student-box");
    polishSavedBox(box,qs("#studentPickerTrigger"),"Aluno");
    const pickerName=qs("#studentPickerName");
    const pickerMeta=qs("#studentPickerMeta");
    if(pickerName && !requestStudentId()) pickerName.textContent="Selecionar aluno";
    if(pickerMeta && !requestStudentId()) pickerMeta.textContent="Pesquise por nome ou turma";
    qs("#newStudentFromRequest")?.classList.add("registered-flow-hidden");

    const section=qs("#studentPicker")?.closest(".request-section");
    const description=section?.querySelector(".request-section-head p,.form-section p");
    if(description) description.textContent="Selecione um aluno da listagem oficial.";

    const list=qs("#studentPickerList");
    if(list && list.dataset.registeredFlowBound!=="1"){
      list.dataset.registeredFlowBound="1";
      list.addEventListener("click",event=>{
        const option=event.target.closest("[data-student-pick]");
        if(option) requestSelectedStudentId=String(option.dataset.studentPick||"");
      },true);
    }

    if(form.dataset.registeredFlowSubmit!=="1"){
      form.dataset.registeredFlowSubmit="1";
      form.addEventListener("reset",()=>{requestSelectedStudentId="";});
      form.addEventListener("submit",handleRequestSubmit,true);
    }
    return true;
  }
  function polishPermission(){
    const form=qs("#permissionForm");
    const picker=qs("#permissionSavedStudentPicker");
    if(!form||!picker) return false;

    hideLegacyInput("permissionStudent");
    hideLegacyInput("permissionClass");
    fullWidthLabel("permissionInterval");

    const box=picker.closest(".saved-student-box");
    polishSavedBox(box,qs("#permissionSavedStudentTrigger"),"Aluno");
    const name=qs("#permissionSavedStudentName");
    const meta=qs("#permissionSavedStudentMeta");
    if(name && !permissionSelectedStudentId) name.textContent="Selecionar aluno";
    if(meta && !permissionSelectedStudentId) meta.textContent="Pesquise por nome ou turma";

    const list=qs("#permissionSavedStudentList");
    if(list && list.dataset.registeredFlowBound!=="1"){
      list.dataset.registeredFlowBound="1";
      list.addEventListener("click",event=>{
        const option=event.target.closest("[data-permission-student-id]");
        if(option) permissionSelectedStudentId=String(option.dataset.permissionStudentId||"");
      },true);
    }

    if(form.dataset.registeredFlowSubmit!=="1"){
      form.dataset.registeredFlowSubmit="1";
      form.addEventListener("reset",()=>{permissionSelectedStudentId="";});
      form.addEventListener("submit",handlePermissionSubmit,true);
    }
    return true;
  }
  function polishPickup(){
    const form=qs("#pickupForm");
    if(!form) return false;
    hideLegacyInput("pickupPin");
    fullWidthLabel("computerCode");
    const title=qs("#pickupModalTitle");
    if(title) title.textContent="Confirmar retirada";
    if(form.dataset.registeredFlowSubmit!=="1"){
      form.dataset.registeredFlowSubmit="1";
      form.addEventListener("submit",handlePickupSubmit,true);
    }
    return true;
  }
  function setBusy(form,busy,label){
    const button=form?.querySelector('button[type="submit"]');
    if(!button) return;
    if(busy){
      if(!button.dataset.registeredFlowText) button.dataset.registeredFlowText=button.textContent||"Salvar";
      button.disabled=true;
      button.textContent=label;
    }else{
      button.disabled=false;
      button.textContent=button.dataset.registeredFlowText||button.textContent;
      delete button.dataset.registeredFlowText;
    }
  }
  async function handleRequestSubmit(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    const form=event.currentTarget;
    try{
      if(typeof canCreateRequest==="function" && !canCreateRequest()) throw new Error("forbidden");
      const studentId=requestStudentId();
      if(!studentId){notify("Selecione um aluno cadastrado.");qs("#studentPickerTrigger")?.focus();return;}
      const student=currentStudents().find(item=>String(item?.id)===studentId);
      if(!student){notify("Aluno não encontrado. Atualize a página e tente novamente.");return;}

      const start=String(typeof formState!=="undefined"?formState.start:"");
      const end=String(typeof formState!=="undefined"?formState.end:"");
      const startMin=minutes(start),endMin=minutes(end);
      const min=7*60+30,max=16*60+40;
      if(!Number.isFinite(startMin)||!Number.isFinite(endMin)||startMin<min||endMin>max||endMin<=startMin){notify("Confira o horário de retirada e devolução.");return;}
      const dateKey=String(qs("#date")?.value||"");
      const reason=String(qs("#reason")?.value||"").trim();
      if(!dateKey){notify("Informe a data do pedido.");return;}
      if(!reason){notify("Informe o motivo do pedido.");qs("#reason")?.focus();return;}

      setBusy(form,true,"Criando...");
      await v46Rpc("ete_create_request_v3",{
        p_student_id:studentId,
        p_reason:reason,
        p_start_time:start,
        p_end_time:end,
        p_date_key:dateKey
      });
      if(typeof resetRequestForm==="function") resetRequestForm(); else form.reset();
      try{qs("#requestModal")?.close();}catch(_){ }
      notify("Pedido criado e salvo.");
    }catch(err){
      console.error(err);
      notify(friendlyError(err));
    }finally{
      setBusy(form,false,"Criando...");
    }
  }
  async function handlePermissionSubmit(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    const form=event.currentTarget;
    try{
      if(typeof canCreatePermission==="function" && !canCreatePermission()) throw new Error("forbidden");
      const studentId=findPermissionStudentId();
      const manualName=String(qs("#permissionStudent")?.value||"").trim();
      const manualClass=String(qs("#permissionClass")?.value||"").trim();
      const interval=String(qs("#permissionInterval")?.value||"");
      const reason=String(qs("#permissionReason")?.value||"").trim();
      if(!studentId && (!manualName||!manualClass)){notify("Selecione um aluno cadastrado.");qs("#permissionSavedStudentTrigger")?.focus();return;}
      if(!["morning","lunch","afternoon"].includes(interval)){notify("Selecione um horário válido.");return;}
      if(!reason){notify("Informe o motivo da autorização.");qs("#permissionReason")?.focus();return;}

      setBusy(form,true,"Salvando...");
      if(studentId){
        await v46Rpc("ete_create_permission_v2",{
          p_student_id:studentId,
          p_student:"",
          p_class_name:"",
          p_interval:interval,
          p_reason:reason
        });
      }else{
        await v46Rpc("ete_create_permission",{
          p_student:manualName,
          p_class_name:manualClass,
          p_interval:interval,
          p_reason:reason
        });
      }
      form.reset();
      if(typeof setIntervalPickerValue==="function") setIntervalPickerValue("permissionInterval","morning",false);
      try{qs("#permissionModal")?.close();}catch(_){ }
      notify("Autorização registrada.");
    }catch(err){
      console.error(err);
      notify(friendlyError(err));
    }finally{
      setBusy(form,false,"Salvando...");
    }
  }
  async function handlePickupSubmit(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    const form=event.currentTarget;
    try{
      if(typeof canPickup==="function" && !canPickup()) throw new Error("forbidden");
      const requestId=String(form.dataset.id||"");
      const code=String(qs("#computerCode")?.value||"").trim();
      if(!requestId){notify("Pedido não encontrado.");return;}
      if(!/^\d{6}$/.test(code)){notify("Digite um código de notebook com 6 dígitos.");qs("#computerCode")?.focus();return;}

      setBusy(form,true,"Confirmando...");
      await v46PickupRpc({p_request_id:requestId,p_code:code});
      form.reset();
      try{qs("#pickupModal")?.close();}catch(_){ }
      notify("Retirada confirmada.");
    }catch(err){
      console.error(err);
      notify(friendlyError(err));
    }finally{
      setBusy(form,false,"Confirmando...");
    }
  }
  function install(){
    installStyles();
    installPickupRpcV3();
    const requestReady=polishRequest();
    const pickupReady=polishPickup();
    const permissionReady=polishPermission();
    if(requestReady&&pickupReady&&permissionReady){installed=true;return true;}
    return false;
  }
  function boot(){
    if(install()) return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(install()||tries>=80) clearInterval(timer);
    },50);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
  window.addEventListener("pageshow",()=>{if(!installed) boot(); else install();});
})();
