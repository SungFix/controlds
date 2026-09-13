(function initAtestadosOptionalLoader(){
  "use strict";

  let loading=null;
  let observer=null;

  function ensureStyle(id,href){
    let link=document.getElementById(id);
    if(!link){
      link=document.createElement("link");
      link.id=id;
      link.rel="stylesheet";
      link.href=href;
      document.head.appendChild(link);
    }else if(link.getAttribute("href")!==href){
      link.href=href;
    }
  }

  function ensureScript(id,src){
    return new Promise((resolve,reject)=>{
      let script=document.getElementById(id);
      if(script){
        if(script.dataset.loaded==="1"||script.readyState==="complete"||script.getAttribute("src")===src&&script.dataset.loading!=="1")return resolve();
        script.addEventListener("load",resolve,{once:true});
        script.addEventListener("error",reject,{once:true});
        return;
      }
      script=document.createElement("script");
      script.id=id;
      script.src=src;
      script.async=false;
      script.dataset.loading="1";
      script.addEventListener("load",()=>{script.dataset.loading="0";script.dataset.loaded="1";resolve();},{once:true});
      script.addEventListener("error",reject,{once:true});
      document.head.appendChild(script);
    });
  }

  async function loadOptional(){
    if(loading)return loading;
    loading=(async()=>{
      ensureStyle("controlAtestadosImageUploadStyles","atestados-image-upload.css?v=2");
      await ensureScript("controlAtestadosImageRangeFixScript","atestados-image-range-fix.js?v=1");
      await ensureScript("controlAtestadosImageUploadScript","atestados-image-upload.js?v=2");
      await ensureScript("controlAtestadosImageAccessFixScript","atestados-image-access-fix.js?v=1");
      await ensureScript("controlAtestadosActionPolishScript","atestados-action-polish.js?v=1");
      await ensureScript("controlAtestadosEditScript","atestados-edit.js?v=1");
    })().catch(error=>{
      console.error("Falha ao carregar recursos opcionais do Atestados:",error);
      loading=null;
    });
    return loading;
  }

  function check(){
    const module=document.querySelector("#eteAtestadosRoot .ete-atestados");
    if(module){
      loadOptional();
      observer?.disconnect();
      observer=null;
    }
  }

  function start(){
    check();
    if(observer||!document.body)return;
    observer=new MutationObserver(check);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
