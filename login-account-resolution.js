(function initLoginAccountResolution(){
  "use strict";

  function normalize(value){return String(value||"").trim().toLowerCase();}
  function validUsername(value){return /^[a-z0-9._-]{2,64}$/.test(value);}

  function install(){
    try{
      const explicit=window.ETE_CONFIG?.authEmails||{};
      authEmailForUsername=function(username){
        const name=normalize(username);
        if(!validUsername(name))return"";
        const configured=String(explicit[name]||"").trim().toLowerCase();
        return configured||`${name}@email.com`;
      };
      usernameFromEmail=function(email){
        const value=normalize(email);
        const entries=Object.entries(explicit);
        const found=entries.find(([,configured])=>normalize(configured)===value);
        if(found)return found[0];
        if(!value.endsWith("@email.com"))return"";
        const name=value.slice(0,-"@email.com".length);
        return validUsername(name)?name:"";
      };
      return true;
    }catch(_){return false;}
  }

  let tries=0;
  if(install())return;
  const timer=setInterval(()=>{tries++;if(install()||tries>=100)clearInterval(timer);},50);
})();
