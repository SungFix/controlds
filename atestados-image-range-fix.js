(function initAtestadosImageRangeFix(){
  "use strict";

  const TABLE="ete_atestados_justified_absences";
  let patched=false;
  let tries=0;

  function todayIso(){
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Recife",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function status(message,error){
    const node=document.querySelector(".ete-atestados #atStatus");
    if(!node)return;
    node.textContent=message;
    node.classList.toggle("error",!!error);
    node.dataset.state=error?"error":"loading";
  }

  function imageForm(event){
    const form=event.target?.closest?.(".ete-atestados #atForm");
    if(!form||!form.querySelector("#atImage")?.files?.[0])return null;
    return form;
  }

  function validateRange(form){
    const start=String(form.querySelector("#atDate")?.value||"");
    const end=String(form.querySelector("#atEndDate")?.value||start);
    const limit=todayIso();
    if(!start||!end)return"Informe a data inicial e final.";
    if(end<start)return"A data final não pode ser anterior à inicial.";
    if(start>limit||end>limit)return"Não é possível registrar faltas em datas futuras.";
    const scope=form.querySelector('input[name="atAbsenceScope"]:checked')?.value||"full_day";
    if(end>start&&scope==="partial")return"Horário específico só pode ser usado em uma falta de um único dia.";
    return"";
  }

  function onSubmit(event){
    const form=imageForm(event);
    if(!form)return;
    const message=validateRange(form);
    if(!message)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    status(message,true);
  }

  function patchClient(){
    if(patched)return true;
    let client=null;
    try{client=typeof sb!=="undefined"?sb:null;}catch(_){}
    if(!client||typeof client.from!=="function")return false;

    const originalFrom=client.from.bind(client);
    client.from=function(table){
      const builder=originalFrom(table);
      if(table!==TABLE||!builder||typeof builder.insert!=="function")return builder;

      const originalInsert=builder.insert.bind(builder);
      builder.insert=function(values,options){
        let next=values;
        const form=document.querySelector(".ete-atestados #atForm");
        const fixRow=row=>{
          if(!row||typeof row!=="object"||!row.image_path||row.absence_end_date)return row;
          const start=String(row.absence_date||form?.querySelector("#atDate")?.value||"");
          const end=String(form?.querySelector("#atEndDate")?.value||start);
          return {...row,absence_date:start,absence_end_date:end};
        };
        if(Array.isArray(values))next=values.map(fixRow);
        else next=fixRow(values);
        return originalInsert(next,options);
      };
      return builder;
    };

    patched=true;
    return true;
  }

  function boot(){
    patchClient();
    document.addEventListener("submit",onSubmit,true);
    const timer=setInterval(()=>{
      tries++;
      if(patchClient()||tries>=100)clearInterval(timer);
    },50);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
