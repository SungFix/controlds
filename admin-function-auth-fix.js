(function installAdminFunctionAuthFix(){
  "use strict";

  const FUNCTION_NAME="admin-user-management";
  const directFetch=window.fetch.bind(window);
  let installing=false;

  async function currentSession(client){
    try{
      if(!client?.auth)return null;
      let result=await client.auth.getSession();
      let session=result?.data?.session||null;
      if(result?.error||!session)return null;

      const expiresAt=Number(session.expires_at||0)*1000;
      if(expiresAt&&expiresAt-Date.now()<60000){
        const refreshed=await client.auth.refreshSession();
        if(!refreshed?.error&&refreshed?.data?.session)session=refreshed.data.session;
      }
      return session;
    }catch(_){
      return null;
    }
  }

  function getClient(){
    try{
      if(typeof initSupabase==="function")return initSupabase();
      if(typeof sb!=="undefined"&&sb)return sb;
    }catch(_){}
    return null;
  }

  function install(){
    if(installing)return;
    installing=true;
    try{
      const client=getClient();
      const functions=client?.functions;
      if(!functions||typeof functions.invoke!=="function")return;
      if(functions.__eteAdminAuthPatchedV2)return;

      const originalInvoke=functions.invoke.bind(functions);
      functions.invoke=async function(name,options){
        if(String(name)!==FUNCTION_NAME)return originalInvoke(name,options);

        const session=await currentSession(client);
        const accessToken=String(session?.access_token||"");
        const cfg=window.ETE_CONFIG||{};
        const supabaseUrl=String(cfg.supabaseUrl||"").replace(/\/$/,"");
        const publishableKey=String(cfg.supabasePublishableKey||"");

        if(!accessToken||!supabaseUrl||!publishableKey){
          const error=new Error("admin_session_unavailable");
          error.context=null;
          return{data:null,error};
        }

        try{
          const response=await directFetch(`${supabaseUrl}/functions/v1/${FUNCTION_NAME}`,{
            method:"POST",
            mode:"cors",
            credentials:"omit",
            cache:"no-store",
            headers:{
              "Content-Type":"application/json",
              "apikey":publishableKey,
              "Authorization":`Bearer ${accessToken}`
            },
            body:JSON.stringify(options?.body||{})
          });

          if(!response.ok){
            const error=new Error(`Edge Function returned ${response.status}`);
            error.context=response;
            return{data:null,error};
          }

          let data=null;
          try{data=await response.json();}
          catch(_){data=null;}
          return{data,error:null};
        }catch(fetchError){
          const error=fetchError instanceof Error?fetchError:new Error("admin_request_failed");
          error.context=null;
          return{data:null,error};
        }
      };

      Object.defineProperty(functions,"__eteAdminAuthPatchedV2",{
        value:true,
        configurable:false,
        enumerable:false,
        writable:false
      });
    }finally{
      installing=false;
    }
  }

  install();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  window.addEventListener("pageshow",install);
  setTimeout(install,50);
  setTimeout(install,250);
  setTimeout(install,800);
})();
