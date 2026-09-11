(function installAdminFunctionAuthFix(){
  "use strict";

  const FUNCTION_NAME="admin-user-management";
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
      if(functions.__eteAdminAuthPatched)return;

      const originalInvoke=functions.invoke.bind(functions);
      functions.invoke=async function(name,options){
        if(String(name)!==FUNCTION_NAME)return originalInvoke(name,options);

        const session=await currentSession(client);
        const accessToken=String(session?.access_token||"");
        const nextOptions={...(options||{})};
        const headers={...(nextOptions.headers||{})};

        if(accessToken)headers.Authorization=`Bearer ${accessToken}`;
        nextOptions.headers=headers;
        return originalInvoke(name,nextOptions);
      };

      Object.defineProperty(functions,"__eteAdminAuthPatched",{
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
