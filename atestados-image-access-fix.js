(function initAtestadosImageAccessFix(){
  "use strict";

  const TABLE="ete_atestados_justified_absences";
  let timer=0;

  function client(){try{return typeof sb!=="undefined"?sb:null;}catch(_){return null;}}
  function fmtDate(value){if(!value)return"—";return new Date(value+"T12:00:00").toLocaleDateString("pt-BR");}
  function rangeText(row){const start=String(row.absence_date||"");const end=String(row.absence_end_date||start);return start===end?fmtDate(start):fmtDate(start)+" a "+fmtDate(end);}

  function rowIdentity(tr){
    return {
      student:tr.querySelector(".at-student-cell strong")?.textContent?.trim()||"",
      className:tr.querySelector(".at-badge")?.textContent?.trim()||"",
      date:tr.querySelector(".at-date-range-text")?.textContent?.trim()||""
    };
  }

  async function scan(){
    const tableRows=[...document.querySelectorAll(".ete-atestados .at-table tbody tr")];
    const pending=tableRows.filter(tr=>tr.dataset.atImageAccessChecked!=="1");
    if(!pending.length)return;

    const c=client();
    if(!c)return;
    const {data,error}=await c.from(TABLE).select("id,student_name,class_name,absence_date,absence_end_date,image_path").not("image_path","is",null);
    if(error)return;
    const records=(data||[]).filter(item=>item.image_path);

    pending.forEach(tr=>{
      tr.dataset.atImageAccessChecked="1";
      if(tr.querySelector("[data-at-image-view]"))return;
      const identity=rowIdentity(tr);
      const match=records.find(item=>
        String(item.student_name||"").trim()===identity.student&&
        String(item.class_name||"").trim()===identity.className&&
        rangeText(item)===identity.date
      );
      if(!match)return;

      const button=document.createElement("button");
      button.type="button";
      button.className="at-image-view-button";
      button.dataset.atImageView=String(match.image_path);
      button.textContent="Ver imagem";
      button.setAttribute("aria-label","Ver imagem anexada ao atestado de "+identity.student);

      const deleteButton=tr.querySelector("[data-at-delete]");
      if(deleteButton)deleteButton.before(button);
      else{
        const cell=tr.lastElementChild;
        if(cell)cell.appendChild(button);
      }
    });
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(()=>scan().catch(()=>{}),140);}

  function start(){
    schedule();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
