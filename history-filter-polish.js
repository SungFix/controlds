(function initHistoryFilterPolish(){
  "use strict";

  function mount(){
    const select=document.getElementById("historyFilter");
    if(!select || select.dataset.polishedHistoryFilter==="1") return;
    select.dataset.polishedHistoryFilter="1";

    const shell=document.createElement("div");
    shell.className="history-filter-shell";
    select.parentNode.insertBefore(shell,select);
    shell.appendChild(select);

    const trigger=document.createElement("button");
    trigger.type="button";
    trigger.className="history-filter-trigger";
    trigger.setAttribute("aria-haspopup","listbox");
    trigger.setAttribute("aria-expanded","false");
    trigger.innerHTML='<span class="history-filter-label"></span><span class="history-filter-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"/></svg></span>';

    const menu=document.createElement("div");
    menu.className="history-filter-menu";
    menu.setAttribute("role","listbox");
    menu.hidden=true;

    Array.from(select.options).forEach(function(option){
      const button=document.createElement("button");
      button.type="button";
      button.className="history-filter-option";
      button.dataset.value=option.value;
      button.setAttribute("role","option");
      button.textContent=option.textContent;
      menu.appendChild(button);
    });

    shell.appendChild(trigger);
    shell.appendChild(menu);

    function sync(){
      const selected=select.options[select.selectedIndex];
      trigger.querySelector(".history-filter-label").textContent=selected ? selected.textContent : "Todos os eventos";
      menu.querySelectorAll(".history-filter-option").forEach(function(button){
        const active=button.dataset.value===select.value;
        button.classList.toggle("is-selected",active);
        button.setAttribute("aria-selected",String(active));
      });
    }

    function close(){
      menu.hidden=true;
      trigger.setAttribute("aria-expanded","false");
    }

    function toggle(){
      const willOpen=menu.hidden;
      menu.hidden=!willOpen;
      trigger.setAttribute("aria-expanded",String(willOpen));
    }

    trigger.addEventListener("click",function(event){
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });

    menu.addEventListener("click",function(event){
      const option=event.target.closest(".history-filter-option");
      if(!option) return;
      select.value=option.dataset.value;
      select.dispatchEvent(new Event("change",{bubbles:true}));
      sync();
      close();
      trigger.focus();
    });

    select.addEventListener("change",sync);
    document.addEventListener("click",function(event){
      if(!shell.contains(event.target)) close();
    });
    document.addEventListener("keydown",function(event){
      if(event.key==="Escape" && !menu.hidden){
        close();
        trigger.focus();
      }
    });

    sync();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();

(function initIndividualHistoryDelete(){
  "use strict";

  function getVisibleHistory(){
    if(typeof history==="undefined" || !Array.isArray(history)) return [];
    const search=document.getElementById("historySearch");
    const filterSelect=document.getElementById("historyFilter");
    const q=(search?.value || "").toLowerCase();
    const filter=filterSelect?.value || "all";
    const label=typeof historyTypeLabel==="function" ? historyTypeLabel : function(type){return String(type || "");};

    const list=history.filter(function(item){
      const matchFilter=filter==="all" || item.type===filter;
      const hay=(String(item.text || "")+" "+String(item.detail || "")+" "+label(item.type)).toLowerCase();
      return matchFilter && hay.includes(q);
    });

    return list.slice().sort(function(a,b){
      const av=Date.parse(a.atISO || "") || 0;
      const bv=Date.parse(b.atISO || "") || 0;
      return typeof historyNewestFirst==="undefined" || historyNewestFirst ? bv-av : av-bv;
    });
  }

  function makeDeleteButton(id){
    const button=document.createElement("button");
    button.type="button";
    button.className="history-delete-one";
    button.dataset.historyDeleteId=id;
    button.setAttribute("aria-label","Apagar este evento do histórico");
    button.title="Apagar este evento";
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/><path d="M10 11v5M14 11v5"/></svg>';
    return button;
  }

  function decorate(){
    const rows=document.getElementById("historyRows");
    if(!rows) return;

    const allowed=typeof canClearHistory==="function" && canClearHistory();
    const items=getVisibleHistory();
    const events=Array.from(rows.querySelectorAll(".history-event"));

    events.forEach(function(event,index){
      event.querySelectorAll(".history-delete-one").forEach(function(button){button.remove();});
      if(!allowed) return;
      const item=items[index];
      if(!item?.id) return;
      const side=event.querySelector(".history-side");
      if(!side) return;
      event.dataset.historyId=item.id;
      side.appendChild(makeDeleteButton(item.id));
    });
  }

  async function reloadAndCheck(id){
    if(typeof v46LoadData!=="function") return null;
    try{
      await v46LoadData(false);
      return !history.some(function(entry){return entry.id===id;});
    }catch(_){
      return null;
    }
  }

  async function askDelete(item){
    const description=String(item?.text || "este evento");
    try{
      if(window.ControlActionModal?.confirm){
        return await window.ControlActionModal.confirm({
          title:"Apagar evento",
          subtitle:"Somente este item será removido do histórico.",
          message:description,
          warning:"Essa ação não pode ser desfeita.",
          variant:"warning",
          confirmText:"Apagar evento",
          cancelText:"Manter evento"
        });
      }
    }catch(error){
      console.warn("Falha ao abrir confirmação do histórico:",error);
    }
    return window.confirm('Apagar somente este evento do histórico?\n\n"'+description+'"');
  }

  async function removeOne(id,button){
    if(typeof canClearHistory!=="function" || !canClearHistory()){
      if(typeof toast==="function") toast("Seu perfil não pode apagar o histórico.");
      return;
    }
    if(typeof history==="undefined" || !Array.isArray(history)) return;

    const item=history.find(function(entry){return entry.id===id;});
    if(!item){
      if(typeof toast==="function") toast("Este evento não foi encontrado.");
      if(typeof renderHistory==="function") renderHistory();
      return;
    }

    if(!(await askDelete(item))) return;

    if(button){button.disabled=true;button.classList.add("is-loading");button.setAttribute("aria-busy","true");}

    try{
      if(typeof v46Rpc!=="function") throw new Error("RPC V46 indisponível.");
      const removed=await v46Rpc("ete_delete_history_event",{p_history_id:String(id)});
      if(removed!==true) throw new Error("Evento não encontrado no Supabase.");
      if(typeof toast==="function") toast("Evento removido do histórico.");
    }catch(error){
      const reallyRemoved=await reloadAndCheck(id);
      if(reallyRemoved===true){
        if(typeof toast==="function") toast("Evento removido do histórico.");
        return;
      }
      if(typeof toast==="function") toast("Não foi possível apagar o evento.");
      console.error("Falha ao apagar evento individual do histórico:",error);
      if(button){button.disabled=false;button.classList.remove("is-loading");button.removeAttribute("aria-busy");}
    }
  }

  function mountDelete(){
    const rows=document.getElementById("historyRows");
    if(!rows || rows.dataset.individualDeleteMounted==="1") return;
    rows.dataset.individualDeleteMounted="1";

    rows.addEventListener("click",function(event){
      const button=event.target.closest(".history-delete-one");
      if(!button || !rows.contains(button)) return;
      event.preventDefault();
      event.stopPropagation();
      removeOne(button.dataset.historyDeleteId,button);
    });

    const observer=new MutationObserver(function(){decorate();});
    observer.observe(rows,{childList:true});
    decorate();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mountDelete,{once:true});
  else mountDelete();
})();
