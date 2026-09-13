(function initAtestadosActionPolish(){
  "use strict";

  let scanQueued=false;

  function syncDateMinimum(){
    const form=document.querySelector(".ete-atestados #atForm");
    const start=form?.querySelector("#atDate");
    const end=form?.querySelector("#atEndDate");
    if(!start||!end)return;
    end.min=start.value||"";
    if(start.value&&end.value&&end.value<start.value){
      end.value=start.value;
      end.dispatchEvent(new Event("change",{bubbles:true}));
    }
  }

  function enhanceForm(){
    const form=document.querySelector(".ete-atestados #atForm");
    if(!form||form.dataset.atActionPolish==="1")return;
    form.dataset.atActionPolish="1";
    const start=form.querySelector("#atDate");
    const end=form.querySelector("#atEndDate");
    start?.addEventListener("change",syncDateMinimum);
    end?.addEventListener("change",syncDateMinimum);
    syncDateMinimum();
  }

  function scan(){scanQueued=false;enhanceForm();}
  function queueScan(){if(scanQueued)return;scanQueued=true;requestAnimationFrame(scan);}

  async function askDelete(button){
    const row=button.closest("tr");
    const name=row?.querySelector(".at-student-cell strong")?.textContent?.trim()||"este registro";
    if(window.ControlActionModal?.confirm){
      return window.ControlActionModal.confirm({
        title:"Excluir falta justificada",
        subtitle:"O registro será removido do Atestados.",
        message:`Deseja excluir o registro de ${name}?`,
        warning:"Essa ação não pode ser desfeita.",
        confirmText:"Excluir registro",
        cancelText:"Manter registro"
      });
    }
    return window.confirm(`Excluir o registro de ${name}?`);
  }

  window.addEventListener("click",event=>{
    const button=event.target?.closest?.(".ete-atestados [data-at-delete]");
    if(!button)return;
    if(button.dataset.atDeleteConfirmed==="1"){
      delete button.dataset.atDeleteConfirmed;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    askDelete(button).then(ok=>{
      if(!ok||!button.isConnected)return;
      button.dataset.atDeleteConfirmed="1";
      button.click();
    }).catch(error=>console.error("Falha ao confirmar exclusão do atestado:",error));
  },true);

  function start(){
    scan();
    const observer=new MutationObserver(queueScan);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
