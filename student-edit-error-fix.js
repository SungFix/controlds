(function fixStudentEditErrors(){
  "use strict";

  let attempts=0;

  function isNetworkError(error){
    const message=String(error?.message||error||"");
    return !navigator.onLine || /failed to fetch|networkerror|network request failed|err_network|timeout|timed out/i.test(message);
  }

  function install(){
    if(window.__eteStudentEditErrorFixInstalled)return true;
    if(typeof window.v46Rpc!=="function" || typeof window.setSyncState!=="function" || !window.sb)return false;

    const originalExplain=typeof window.v46ExplainError==="function" ? window.v46ExplainError : null;
    window.v46ExplainError=function(error){
      const message=String(error?.message||error||"");
      if(message.includes("invalid_group"))return "A turma ou o curso selecionado não é válido. Atualize a página e selecione novamente.";
      if(message.includes("student_already_exists"))return "Já existe um aluno com esse nome nessa turma e curso.";
      if(message.includes("student_not_found"))return "Aluno não encontrado. Atualize a página e tente novamente.";
      return originalExplain ? originalExplain(error) : "Não foi possível concluir a ação.";
    };

    window.v46Rpc=async function(name,args={}){
      if(!navigator.onLine){window.setSyncState("error");throw new Error("offline");}
      window.setSyncState("saving");
      const {data:result,error}=await window.sb.rpc(name,args);
      if(error){
        window.setSyncState(isNetworkError(error)?"error":"online");
        throw error;
      }
      try{
        if(typeof window.v46LoadData==="function")await window.v46LoadData(false);
        else window.setSyncState("online");
      }catch(error){
        window.setSyncState(isNetworkError(error)?"error":"online");
        throw error;
      }
      return result;
    };

    window.__eteStudentEditErrorFixInstalled=true;
    return true;
  }

  function boot(){
    if(install())return;
    attempts+=1;
    if(attempts<80)setTimeout(boot,100);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
