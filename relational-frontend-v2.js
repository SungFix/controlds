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

(function initAgendaCancelPickup(){
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

  function mountButtons(){
    if(typeof canPickup!=="function" || !canPickup()) return;
    document.querySelectorAll("#agendaRows [data-return]").forEach(returnButton=>{
      const actions=returnButton.parentElement;
      if(!actions || actions.querySelector("[data-cancel-pickup]")) return;
      const id=String(returnButton.dataset.return||"");
      if(!id) return;

      const request=currentRequests().find(item=>String(item?.id)===id);
      if(!request || !["use","late"].includes(request.status)) return;

      const button=document.createElement("button");
      button.type="button";
      button.className="btn secondary small";
      button.dataset.cancelPickup=id;
      button.textContent="Cancelar retirada";
      button.title="Desfazer a retirada e liberar o notebook";
      actions.insertBefore(button,returnButton);
    });
  }

  async function handleCancel(button){
    if(typeof canPickup!=="function" || !canPickup()) throw new Error("forbidden");

    const id=String(button.dataset.cancelPickup||"");
    const request=currentRequests().find(item=>String(item?.id)===id);
    if(!request) throw new Error("request_not_found");
    if(!["use","late"].includes(request.status)) throw new Error("invalid_status");

    const notebook=request.code ? `Notebook ${request.code}` : "O notebook";
    if(!confirm(`Cancelar a retirada de ${request.student}?\n\n${notebook} será liberado e o pedido voltará para aguardando retirada.`)) return;

    const oldText=button.textContent;
    button.disabled=true;
    button.textContent="Cancelando...";
    try{
      await v46Rpc("ete_cancel_pickup_request",{p_request_id:id});
      if(typeof toast==="function") toast("Retirada cancelada. O pedido voltou a aguardar retirada.");
    }catch(err){
      console.error(err);
      const message=typeof v46ExplainError==="function"
        ? v46ExplainError(err)
        : "Não foi possível cancelar a retirada.";
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
    wrappedRenderAgenda.__agendaCancelPickup=true;
    renderAgenda=wrappedRenderAgenda;

    document.addEventListener("click",event=>{
      const button=event.target.closest?.("[data-cancel-pickup]");
      if(!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      handleCancel(button).catch(err=>{
        console.error(err);
        const message=typeof v46ExplainError==="function"
          ? v46ExplainError(err)
          : "Não foi possível cancelar a retirada.";
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
