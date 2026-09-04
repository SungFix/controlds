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
    trigger.innerHTML='<span class="at-room-trigger-label">Selecione a turma</span><span class="at-room-trigger-arrow" aria-hidden="true">⌄</span>';
    groups.before(trigger);

    const label=trigger.querySelector(".at-room-trigger-label");
    function close(){picker.classList.remove("open");trigger.setAttribute("aria-expanded","false");}
    function open(){picker.classList.add("open");trigger.setAttribute("aria-expanded","true");}
    function sync(){
      const selected=picker.querySelector('input[name="atClass"]:checked');
      if(selected){label.textContent=selected.value;trigger.classList.add("has-value");}
      else{label.textContent="Selecione a turma";trigger.classList.remove("has-value");}
    }

    trigger.addEventListener("click",function(){picker.classList.contains("open")?close():open();});
    picker.addEventListener("change",function(event){if(event.target.matches('input[name="atClass"]')){sync();close();}});
    document.addEventListener("click",function(event){if(!picker.isConnected)return;if(!picker.contains(event.target))close();});
    sync();
  }

  function scan(){document.querySelectorAll(".at-room-picker").forEach(enhancePicker);}
  const observer=new MutationObserver(scan);
  function start(){scan();observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
