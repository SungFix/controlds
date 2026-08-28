(function(){
  "use strict";

  try{
    if(typeof ROLE_MAP!=="undefined" && ROLE_MAP.ronaldo){
      ROLE_MAP.ronaldo.role="professor";
      ROLE_MAP.ronaldo.roleLabel="Professor";
      ROLE_MAP.ronaldo.displayName="Ronaldo";
    }
  }catch(_){}

  try{
    if(typeof v46RoleLabel==="function"){
      v46RoleLabel=function(role){
        const value=String(role||"").toLowerCase();
        if(value==="adm") return "Administrador";
        if(value==="diretor") return "Diretor";
        if(value==="vice_diretor" || value==="vice-diretor") return "Vice-Diretor";
        if(value==="professor") return "Professor";
        if(value==="monitor") return "Monitor";
        return String(role||"Usuário");
      };
    }
  }catch(_){}
})();
