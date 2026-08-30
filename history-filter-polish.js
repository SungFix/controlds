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
