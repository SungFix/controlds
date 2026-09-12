(function initRelationalFrontendV2(){
  "use strict";

  let installed=false;
  let tries=0;

  function text(value){
    return String(value||"").trim().toLocaleLowerCase("pt-BR");
  }

  function currentStudents(){
    try{
      return Array.isArray(students) ? students : [];
    }catch(_){
      return [];
    }
  }

  function requestStudentId(args){
    let selectedId="";
    try{ selectedId=String(selectedSavedStudentId||""); }catch(_){ }
    if(!selectedId) return null;

    const student=currentStudents().find(item=>String(item?.id)===selectedId);
    if(!student) return null;

    const sameName=text(student.name)===text(args?.p_student_name);
    const sameClass=text(student.className)===text(args?.p_student_class);
    const sameCourse=text(student.course)===text(args?.p_student_course);
    return sameName && sameClass && sameCourse ? selectedId : null;
  }

  function permissionStudentId(args){
    const wantedName=text(args?.p_student);
    const wantedGroup=text(args?.p_class_name);
    if(!wantedName || !wantedGroup) return null;

    const student=currentStudents().find(item=>
      text(item?.name)===wantedName &&
      text([item?.className,item?.course].filter(Boolean).join(" "))===wantedGroup
    );
    return student?.id ? String(student.id) : null;
  }

  function patchMappers(){
    try{
      if(typeof v46MapRequest==="function" && !v46MapRequest.__relationalV2){
        const base=v46MapRequest;
        const wrapped=function(row){
          const mapped=base(row);
          mapped.classId=row?.class_id||null;
          mapped.notebookId=row?.notebook_id||null;
          return mapped;
        };
        wrapped.__relationalV2=true;
        v46MapRequest=wrapped;
      }

      if(typeof v46MapStudent==="function" && !v46MapStudent.__relationalV2){
        const base=v46MapStudent;
        const wrapped=function(row){
          const mapped=base(row);
          mapped.classId=row?.class_id||null;
          return mapped;
        };
        wrapped.__relationalV2=true;
        v46MapStudent=wrapped;
      }

      if(typeof v46MapPermission==="function" && !v46MapPermission.__relationalV2){
        const base=v46MapPermission;
        const wrapped=function(row){
          const mapped=base(row);
          mapped.studentId=row?.student_id||null;
          mapped.classId=row?.class_id||null;
          return mapped;
        };
        wrapped.__relationalV2=true;
        v46MapPermission=wrapped;
      }
    }catch(err){
      console.warn("Não foi possível anexar metadados relacionais ao front:",err);
    }
  }

  function install(){
    if(installed) return true;
    if(typeof v46Rpc!=="function") return false;

    patchMappers();

    if(v46Rpc.__relationalFrontendV2){
      installed=true;
      return true;
    }

    const baseRpc=v46Rpc;
    const wrappedRpc=async function(name,args={}){
      if(name==="ete_create_request"){
        return baseRpc("ete_create_request_v2",{
          ...args,
          p_student_id:requestStudentId(args)
        });
      }

      if(name==="ete_create_permission"){
        return baseRpc("ete_create_permission_v2",{
          ...args,
          p_student_id:permissionStudentId(args)
        });
      }

      return baseRpc(name,args);
    };

    wrappedRpc.__relationalFrontendV2=true;
    wrappedRpc.__baseRpc=baseRpc;
    v46Rpc=wrappedRpc;
    installed=true;

    window.ETERelationalFrontend=Object.freeze({
      version:2,
      active:true
    });
    return true;
  }

  function boot(){
    if(install()) return;
    const timer=setInterval(()=>{
      tries++;
      if(install() || tries>=100) clearInterval(timer);
    },50);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
  window.addEventListener("pageshow",install);
})();

(function initAgendaCancelWaitingRequest(){
  "use strict";

  let installed=false;
  let tries=0;

  function currentRequests(){
    try{
      return Array.isArray(data) ? data : [];
    }catch(_){
      return [];
    }
  }

  function currentAuthId(){
    try{
      return String(v46AuthUser?.id||"");
    }catch(_){
      return "";
    }
  }

  function canCancel(request){
    try{
      if(!request || !currentUser) return false;
      if(["adm","professor"].includes(String(currentUser.role||""))) return true;
      return String(request.requestedById||"")===currentAuthId();
    }catch(_){
      return false;
    }
  }

  function mountButtons(){
    document.querySelectorAll("#agendaRows [data-cancel-pickup]").forEach(button=>button.remove());

    document.querySelectorAll("#agendaRows [data-pickup]").forEach(pickupButton=>{
      const actions=pickupButton.parentElement;
      const id=String(pickupButton.dataset.pickup||"");
      if(!actions || !id || actions.querySelector("[data-cancel-waiting-request]")) return;

      const request=currentRequests().find(item=>String(item?.id)===id);
      if(!request || request.status!=="wait" || !canCancel(request)) return;

      const button=document.createElement("button");
      button.type="button";
      button.className="btn secondary small";
      button.dataset.cancelWaitingRequest=id;
      button.textContent="Cancelar pedido";
      button.title="Cancelar este pedido antes da retirada";
      actions.insertBefore(button,pickupButton);
    });
  }

  async function handleCancel(button){
    const id=String(button.dataset.cancelWaitingRequest||"");
    const request=currentRequests().find(item=>String(item?.id)===id);

    if(!request) throw new Error("request_not_found");
    if(request.status!=="wait") throw new Error("invalid_status");
    if(!canCancel(request)) throw new Error("forbidden");

    if(!confirm(`Cancelar o pedido de ${request.student}?\n\nO pedido será removido da Agenda sem registrar retirada do notebook.`)) return;

    const oldText=button.textContent;
    button.disabled=true;
    button.textContent="Cancelando...";

    try{
      await v46Rpc("ete_cancel_waiting_request",{p_request_id:id});
      if(typeof toast==="function") toast("Pedido cancelado antes da retirada.");
    }catch(err){
      console.error(err);
      const message=typeof v46ExplainError==="function"
        ? v46ExplainError(err)
        : "Não foi possível cancelar o pedido.";
      if(typeof toast==="function") toast(message);
    }finally{
      if(button.isConnected){
        button.disabled=false;
        button.textContent=oldText;
      }
    }
  }

  function install(){
    if(installed) return true;
    if(typeof renderAgenda!=="function" || typeof v46Rpc!=="function") return false;

    const baseRenderAgenda=renderAgenda;
    const wrappedRenderAgenda=function(){
      const result=baseRenderAgenda.apply(this,arguments);
      mountButtons();
      return result;
    };
    wrappedRenderAgenda.__agendaCancelWaitingRequest=true;
    renderAgenda=wrappedRenderAgenda;

    document.addEventListener("click",event=>{
      const button=event.target.closest?.("[data-cancel-waiting-request]");
      if(!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      handleCancel(button).catch(err=>{
        console.error(err);
        const message=typeof v46ExplainError==="function"
          ? v46ExplainError(err)
          : "Não foi possível cancelar o pedido.";
        if(typeof toast==="function") toast(message);
      });
    },true);

    installed=true;
    mountButtons();
    return true;
  }

  function boot(){
    if(install()) return;
    const timer=setInterval(()=>{
      tries++;
      if(install() || tries>=100) clearInterval(timer);
    },50);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
  window.addEventListener("pageshow",()=>{ if(installed) mountButtons(); else install(); });
})();
