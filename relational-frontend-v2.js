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
