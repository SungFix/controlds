(function initAtestadosRoomTrigger(){
  "use strict";

  function enhancePicker(picker){
    if(!picker||picker.dataset.triggerReady==="1")return;
    const groups=picker.querySelector(".at-room-groups");
    if(!groups)return;
    picker.dataset.triggerReady="1";

    const trigger=document.createElement("button");
    trigger.type="button";
    trigger.className="at-room-trigger";
    trigger.setAttribute("aria-expanded","false");
    trigger.setAttribute("aria-haspopup","listbox");
    trigger.innerHTML='<span class="at-room-trigger-label">Selecione a turma</span><span class="at-room-trigger-arrow" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m5.5 7.5 4.5 4.5 4.5-4.5"/></svg></span>';
    groups.before(trigger);
    groups.setAttribute("role","listbox");
    groups.setAttribute("aria-label","Turmas disponíveis");

    picker.querySelectorAll('.at-room-option').forEach(function(option){option.setAttribute("role","option");});

    const label=trigger.querySelector(".at-room-trigger-label");
    function close(){picker.classList.remove("open");trigger.setAttribute("aria-expanded","false");}
    function open(){picker.classList.add("open");trigger.setAttribute("aria-expanded","true");}
    function sync(){
      const selected=picker.querySelector('input[name="atClass"]:checked');
      picker.querySelectorAll('.at-room-option').forEach(function(option){
        const input=option.querySelector('input[name="atClass"]');
        option.setAttribute("aria-selected",input&&input.checked?"true":"false");
      });
      if(selected){label.textContent=selected.value;trigger.classList.add("has-value");}
      else{label.textContent="Selecione a turma";trigger.classList.remove("has-value");}
    }

    trigger.addEventListener("click",function(){picker.classList.contains("open")?close():open();});
    picker.addEventListener("change",function(event){if(event.target.matches('input[name="atClass"]')){sync();close();trigger.focus();}});
    document.addEventListener("click",function(event){if(!picker.isConnected)return;if(!picker.contains(event.target))close();});
    document.addEventListener("keydown",function(event){if(!picker.isConnected)return;if(event.key==="Escape"&&picker.classList.contains("open")){close();trigger.focus();}});
    sync();
  }

  function scan(){document.querySelectorAll(".at-room-picker").forEach(enhancePicker);}
  const observer=new MutationObserver(scan);
  function start(){scan();observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
