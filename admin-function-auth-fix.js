(function installAdminFunctionAuthFix(){
  "use strict";

  if(window.__eteAdminFunctionAuthFixInstalled)return;
  window.__eteAdminFunctionAuthFixInstalled=true;

  const nativeFetch=window.fetch.bind(window);
  const functionPath="/functions/v1/admin-user-management";

  function requestUrl(input){
    try{
      if(typeof input==="string")return input;
      if(input instanceof URL)return input.href;
      if(input&&typeof input.url==="string")return input.url;
    }catch(_){}
    return "";
  }

  async function currentSession(){
    try{
      const client=typeof initSupabase==="function"?initSupabase():null;
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

  window.fetch=async function(input,init){
    const url=requestUrl(input);
    if(!url.includes(functionPath))return nativeFetch(input,init);

    const session=await currentSession();
    const headers=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));
    const publishableKey=String(window.ETE_CONFIG?.supabasePublishableKey||"");

    if(publishableKey&&!headers.has("apikey"))headers.set("apikey",publishableKey);
    if(session?.access_token)headers.set("Authorization",`Bearer ${session.access_token}`);

    const nextInit={...(init||{}),headers};
    if(input instanceof Request)return nativeFetch(new Request(input,nextInit));
    return nativeFetch(input,nextInit);
  };
})();
