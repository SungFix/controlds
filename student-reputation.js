(function initStudentReputation(){
  "use strict";

  const SCHOOL_TZ="America/Recife";
  const MAX_MINUTES=16*60+40;
  let queued=false;

  function minutes(value){
    const match=String(value||"").match(/^(\d{1,2}):(\d{2})/);
    if(!match) return NaN;
    return Number(match[1])*60+Number(match[2]);
  }

  function localParts(iso){
    const date=new Date(iso);
    if(Number.isNaN(date.getTime())) return null;
    const parts=new Intl.DateTimeFormat("en-CA",{
      timeZone:SCHOOL_TZ,
      year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"
    }).formatToParts(date).reduce((acc,part)=>{ acc[part.type]=part.value; return acc; },{});
    return {
      dateKey:parts.year+"-"+parts.month+"-"+parts.day,
      minute:Number(parts.hour)*60+Number(parts.minute)
    };
  }

  function wasLate(request){
    if(!request?.returnedAt || !request?.dateKey) return false;
    const returned=localParts(request.returnedAt);
    if(!returned) return false;
    if(returned.dateKey>request.dateKey) return true;
    if(returned.dateKey<request.dateKey) return false;
    const end=minutes(request.endTime || String(request.time||"").split("–")[1]);
    if(!Number.isFinite(end)) return false;
    return returned.minute>Math.min(end+15,MAX_MINUTES);
  }

  function statsForStudent(studentId){
    const returns=(Array.isArray(data)?data:[]).filter(request=>
      String(request?.studentId||"")===String(studentId||"") && request?.returnedAt
    );
    const late=returns.filter(wasLate).length;
    const onTime=returns.length-late;
    const score=returns.length ? Math.round((onTime/returns.length)*100) : null;
    let level="Sem histórico",tone="neutral",mark="—";
    if(score!==null){
      if(score>=90){ level="Excelente"; tone="excellent"; mark="A"; }
      else if(score>=75){ level="Boa"; tone="good"; mark="B"; }
      else if(score>=50){ level="Regular"; tone="regular"; mark="C"; }
      else { level="Atenção"; tone="attention"; mark="!"; }
    }
    return {total:returns.length,onTime,late,score,level,tone,mark};
  }

  function visibleStudents(){
    const q=(document.querySelector("#studentSearch")?.value||"").toLocaleLowerCase("pt-BR");
    return [...(Array.isArray(students)?students:[])]
      .filter(student=>(student.name+" "+student.className+" "+student.course).toLocaleLowerCase("pt-BR").includes(q))
      .sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  }

  function decorate(){
    queued=false;
    const list=visibleStudents();
    document.querySelectorAll("#studentRows .student-card").forEach((card,index)=>{
      const student=list[index];
      const head=card.querySelector(".student-card-head");
      if(!student||!head) return;
      card.dataset.studentReputationId=String(student.id||"");
      head.querySelector(".student-reputation")?.remove();
      const stat=statsForStudent(student.id);
      const badge=document.createElement("div");
      badge.className="student-reputation is-"+stat.tone;
      badge.setAttribute("aria-label",stat.total?`Reputação ${stat.level}. ${stat.onTime} devoluções no prazo e ${stat.late} atrasadas.`:"Reputação sem histórico de devoluções.");
      badge.title=stat.total?`${stat.onTime} no prazo · ${stat.late} atrasada${stat.late===1?"":"s"}`:"Ainda não há devoluções registradas";
      badge.innerHTML=`<span class="student-reputation-mark" aria-hidden="true">${stat.mark}</span><span class="student-reputation-copy"><span class="student-reputation-label"><strong>${stat.level}</strong>${stat.score!==null?`<span class="student-reputation-score">${stat.score}%</span>`:""}</span><small>${stat.total?`${stat.onTime} no prazo · ${stat.late} atrasada${stat.late===1?"":"s"}`:"Sem devoluções registradas"}</small></span>`;
      head.appendChild(badge);
    });
  }

  function queue(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(decorate);
  }

  function install(){
    if(typeof renderStudents==="function" && !renderStudents.__reputationWrapped){
      const base=renderStudents;
      const wrapped=function(){ const result=base.apply(this,arguments); queue(); return result; };
      wrapped.__reputationWrapped=true;
      renderStudents=wrapped;
    }
    queue();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
  window.addEventListener("pageshow",queue);
  window.addEventListener("control-theme-change",queue);
})();
