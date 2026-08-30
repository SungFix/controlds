(function initRequestSortPolish(){
  "use strict";

  function mount(){
    const select=document.getElementById("requestSort");
    if(!select || select.dataset.requestSortPolished==="1") return;

    select.dataset.requestSortPolished="1";

    const shell=document.createElement("div");
    shell.className="request-sort-shell";

    const trigger=document.createElement("button");
    trigger.type="button";
    trigger.className="request-sort-trigger";
    trigger.setAttribute("aria-haspopup","listbox");
    trigger.setAttribute("aria-expanded","false");
    trigger.innerHTML='<span class="request-sort-label"></span><span class="request-sort-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"/></svg></span>';

    const menu=document.createElement("div");
    menu.className="request-sort-menu";
    menu.setAttribute("role","listbox");
    menu.hidden=true;

    select.parentNode.insertBefore(shell,select);
    shell.appendChild(select);
    shell.appendChild(trigger);
    shell.appendChild(menu);

    function labelFor(value){
      const option=Array.from(select.options).find(item=>item.value===value);
      return option ? option.textContent.trim() : "Ordenar";
    }

    function sync(){
      trigger.querySelector(".request-sort-label").textContent=labelFor(select.value);
      menu.querySelectorAll(".request-sort-option").forEach(button=>{
        const selected=button.dataset.value===select.value;
        button.classList.toggle("is-selected",selected);
        button.setAttribute("aria-selected",String(selected));
      });
    }

    function close(){
      menu.hidden=true;
      trigger.setAttribute("aria-expanded","false");
    }

    function open(){
      menu.hidden=false;
      trigger.setAttribute("aria-expanded","true");
      const active=menu.querySelector(".is-selected") || menu.querySelector(".request-sort-option");
      requestAnimationFrame(()=>active?.focus());
    }

    Array.from(select.options).forEach(option=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="request-sort-option";
      button.dataset.value=option.value;
      button.setAttribute("role","option");
      button.textContent=option.textContent;
      button.addEventListener("click",()=>{
        if(select.value!==option.value){
          select.value=option.value;
          select.dispatchEvent(new Event("change",{bubbles:true}));
        }
        sync();
        close();
        trigger.focus();
      });
      menu.appendChild(button);
    });

    trigger.addEventListener("click",event=>{
      event.stopPropagation();
      menu.hidden ? open() : close();
    });

    trigger.addEventListener("keydown",event=>{
      if(event.key==="ArrowDown" || event.key==="ArrowUp"){
        event.preventDefault();
        if(menu.hidden) open();
      }
    });

    menu.addEventListener("keydown",event=>{
      const options=Array.from(menu.querySelectorAll(".request-sort-option"));
      const index=options.indexOf(document.activeElement);
      if(event.key==="Escape"){
        event.preventDefault();
        close();
        trigger.focus();
      }else if(event.key==="ArrowDown"){
        event.preventDefault();
        options[(index+1+options.length)%options.length]?.focus();
      }else if(event.key==="ArrowUp"){
        event.preventDefault();
        options[(index-1+options.length)%options.length]?.focus();
      }
    });

    document.addEventListener("click",event=>{
      if(!shell.contains(event.target)) close();
    });

    select.addEventListener("change",sync);
    sync();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
  window.addEventListener("pageshow",mount);
})();
