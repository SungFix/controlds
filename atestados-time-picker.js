(function initAtestadosTimePicker(){
  "use strict";

  const HOURS=Array.from({length:24},(_,i)=>String(i).padStart(2,"0"));
  const MINUTES=Array.from({length:60},(_,i)=>String(i).padStart(2,"0"));

  function closeAll(except){
    document.querySelectorAll(".at-time-custom.open").forEach(function(picker){
      if(picker===except)return;
      picker.classList.remove("open");
      picker.querySelector(".at-time-trigger")?.setAttribute("aria-expanded","false");
    });
  }

  function optionList(values,part){
    return values.map(function(value){
      return '<button type="button" class="at-time-option" data-at-time-part="'+part+'" data-at-time-value="'+value+'" role="option" aria-selected="false">'+value+'</button>';
    }).join("");
  }

  function updateUI(input,wrapper){
    const value=String(input.value||"");
    const valid=/^\d{2}:\d{2}$/.test(value);
    if(valid){
      const parts=value.split(":");
      wrapper.dataset.hour=parts[0];
      wrapper.dataset.minute=parts[1];
    }else if(!wrapper.dataset.partialSelection){
      wrapper.dataset.hour="";
      wrapper.dataset.minute="";
    }

    const hour=wrapper.dataset.hour||"";
    const minute=wrapper.dataset.minute||"";
    const triggerLabel=wrapper.querySelector(".at-time-trigger-value");
    const preview=wrapper.querySelector(".at-time-preview");
    const hasValue=/^\d{2}:\d{2}$/.test(input.value||"");

    if(triggerLabel)triggerLabel.textContent=hasValue?input.value:"Selecionar horário";
    if(preview)preview.textContent=(hour||"--")+":"+(minute||"--");
    wrapper.querySelector(".at-time-trigger")?.classList.toggle("has-value",hasValue);

    wrapper.querySelectorAll(".at-time-option").forEach(function(button){
      const selected=(button.dataset.atTimePart==="hour"?hour:minute)===button.dataset.atTimeValue;
      button.classList.toggle("selected",selected);
      button.setAttribute("aria-selected",String(selected));
    });
  }

  function setPart(input,wrapper,part,value){
    wrapper.dataset.partialSelection="1";
    if(part==="hour")wrapper.dataset.hour=value;
    else wrapper.dataset.minute=value;
    const hour=wrapper.dataset.hour||"";
    const minute=wrapper.dataset.minute||"";
    if(hour&&minute){
      input.value=hour+":"+minute;
      wrapper.dataset.partialSelection="";
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    }
    updateUI(input,wrapper);
  }

  function centerSelection(wrapper){
    requestAnimationFrame(function(){
      ["hour","minute"].forEach(function(part){
        const selected=wrapper.querySelector('.at-time-option[data-at-time-part="'+part+'"].selected');
        const fallback=wrapper.querySelector('.at-time-option[data-at-time-part="'+part+'"][data-at-time-value="'+(part==="hour"?"07":"00")+'"]');
        (selected||fallback)?.scrollIntoView({block:"center"});
      });
    });
  }

  function enhance(input){
    if(!input||input.dataset.atCustomTime==="1")return;
    input.dataset.atCustomTime="1";
    const originalType=input.type;
    if(originalType!=="time")return;

    const wrapper=document.createElement("div");
    wrapper.className="at-time-custom";
    input.parentNode.insertBefore(wrapper,input);
    wrapper.appendChild(input);
    input.type="hidden";
    input.classList.add("at-time-source");

    wrapper.insertAdjacentHTML("beforeend",
      '<button type="button" class="at-time-trigger" aria-expanded="false" aria-haspopup="dialog">'
      +'<span class="at-time-trigger-main"><span class="at-time-clock" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg></span><span class="at-time-trigger-value">Selecionar horário</span></span>'
      +'<span class="at-time-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"/></svg></span>'
      +'</button>'
      +'<div class="at-time-popover" role="dialog" aria-label="Selecionar horário">'
      +'<div class="at-time-popover-head"><div><span>Horário</span><strong class="at-time-preview">--:--</strong></div><button type="button" class="at-time-clear">Limpar</button></div>'
      +'<div class="at-time-columns">'
      +'<section class="at-time-column"><span class="at-time-column-title">Hora</span><div class="at-time-options" role="listbox" aria-label="Horas">'+optionList(HOURS,"hour")+'</div></section>'
      +'<section class="at-time-column"><span class="at-time-column-title">Minuto</span><div class="at-time-options" role="listbox" aria-label="Minutos">'+optionList(MINUTES,"minute")+'</div></section>'
      +'</div>'
      +'<div class="at-time-popover-foot"><small>Selecione hora e minuto</small><button type="button" class="at-time-done">Concluir</button></div>'
      +'</div>'
    );

    const trigger=wrapper.querySelector(".at-time-trigger");
    const popover=wrapper.querySelector(".at-time-popover");

    function open(){
      closeAll(wrapper);
      wrapper.classList.add("open");
      trigger.setAttribute("aria-expanded","true");
      centerSelection(wrapper);
    }
    function close(){
      wrapper.classList.remove("open");
      trigger.setAttribute("aria-expanded","false");
    }

    trigger.addEventListener("click",function(event){
      event.preventDefault();
      event.stopPropagation();
      wrapper.classList.contains("open")?close():open();
    });

    popover.addEventListener("click",function(event){
      event.stopPropagation();
      const option=event.target.closest(".at-time-option");
      if(option){
        setPart(input,wrapper,option.dataset.atTimePart,option.dataset.atTimeValue);
        return;
      }
      if(event.target.closest(".at-time-clear")){
        input.value="";
        wrapper.dataset.hour="";
        wrapper.dataset.minute="";
        wrapper.dataset.partialSelection="";
        input.dispatchEvent(new Event("change",{bubbles:true}));
        updateUI(input,wrapper);
        return;
      }
      if(event.target.closest(".at-time-done")){
        if(input.value)close();
      }
    });

    updateUI(input,wrapper);
  }

  function syncAll(){
    document.querySelectorAll('.ete-atestados input[type="time"],.ete-atestados input.at-time-source').forEach(function(input){
      if(input.type==="time")enhance(input);
      const wrapper=input.closest(".at-time-custom");
      if(wrapper&&!input.value&&!wrapper.dataset.partialSelection){
        wrapper.dataset.hour="";
        wrapper.dataset.minute="";
        updateUI(input,wrapper);
      }
    });
  }

  document.addEventListener("click",function(event){
    if(!event.target.closest?.(".at-time-custom"))closeAll();
  },true);
  document.addEventListener("keydown",function(event){if(event.key==="Escape")closeAll();});
  document.addEventListener("change",function(event){
    if(event.target.matches?.('input[name="atAbsenceScope"]'))setTimeout(syncAll,0);
  });

  const observer=new MutationObserver(syncAll);
  function start(){
    syncAll();
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
