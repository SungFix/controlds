(function(){
  "use strict";
  let observer=null,queued=false;
  function canManage(){try{return typeof canCreatePermission==="function"&&canCreatePermission();}catch(_){return false;}}
  function visibleList(){try{if(!Array.isArray(permissions))return[];const q=String(document.querySelector("#permissionSearch")?.value||"").toLowerCase();const f=String(document.querySelector("#permissionFilter")?.value||"all");return permissions.filter(p=>(f==="all"||p.interval===f)&&(`${p.student||""} ${p.className||""} ${p.reason||""}`).toLowerCase().includes(q));}catch(_){return[];}}
  function enhance(){queued=false;const rows=document.getElementById("permissionRows");if(!rows)return;const list=visibleList();rows.querySelectorAll(".permission-card").forEach((card,index)=>{const p=list[index],actions=card.querySelector(".permission-actions");if(!p||p.active||!canManage()||!actions||actions.querySelector("[data-delete-permission]"))return;const b=document.createElement("button");b.type="button";b.className="btn small danger";b.dataset.deletePermission=String(p.id);b.textContent="Apagar";b.title="Apagar definitivamente esta permissão cancelada";b.setAttribute("aria-label","Apagar permissão cancelada de "+String(p.student||"estudante"));actions.appendChild(b);});}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function install(){const rows=document.getElementById("permissionRows");if(!rows){setTimeout(install,250);return;}enhance();if(!observer){observer=new MutationObserver(queue);observer.observe(rows,{childList:true,subtree:true});}document.addEventListener("input",e=>{if(e.target?.id==="permissionSearch")queue();});document.addEventListener("change",e=>{if(e.target?.id==="permissionFilter")queue();});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
