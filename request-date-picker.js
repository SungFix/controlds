(function initRequestDatePicker(){
  "use strict";

  const INPUT_SELECTOR="#date";
  const MONTHS=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const WEEKDAYS=["seg","ter","qua","qui","sex","sáb","dom"];
  let input=null,trigger=null,popover=null,viewYear=0,viewMonth=0;

  function todayIso(){
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Recife",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }
  function parseIso(value){
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||""));
    return match?{year:Number(match[1]),month:Number(match[2])-1,day:Number(match[3])}:null;
  }
  function toIso(year,month,day){
    return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }
  function formatValue(value){
    const parsed=parseIso(value);
    return parsed?`${String(parsed.day).padStart(2,"0")}/${String(parsed.month+1).padStart(2,"0")}/${parsed.year}`:"Selecionar data";
  }

  function ensurePopover(){
    if(popover)return popover;
    popover=document.createElement("section");
    popover.className="request-date-popover";
    popover.hidden=true;
    popover.setAttribute("role","dialog");
    popover.setAttribute("aria-label","Selecionar data do pedido");
    popover.innerHTML=
      '<div class="request-date-head">'+
        '<button type="button" class="request-date-nav" data-request-date-prev aria-label="Mês anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>'+
        '<div class="request-date-month" aria-live="polite"></div>'+
        '<button type="button" class="request-date-nav" data-request-date-next aria-label="Próximo mês"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>'+
      '</div>'+
      '<div class="request-date-weekdays">'+WEEKDAYS.map(day=>'<span>'+day+'</span>').join("")+'</div>'+
      '<div class="request-date-grid" role="grid"></div>'+
      '<div class="request-date-foot"><span class="request-date-hint">Escolha a data do pedido</span><button type="button" class="request-date-today" data-request-date-today>Hoje</button></div>';

    popover.addEventListener("click",event=>{
      const previous=event.target.closest("[data-request-date-prev]");
      const next=event.target.closest("[data-request-date-next]");
      const todayButton=event.target.closest("[data-request-date-today]");
      const dayButton=event.target.closest("[data-request-date-value]");
      if(previous){event.preventDefault();changeMonth(-1);return;}
      if(next){event.preventDefault();changeMonth(1);return;}
      if(todayButton){event.preventDefault();setValue(todayIso());close();return;}
      if(dayButton&&!dayButton.disabled){event.preventDefault();setValue(dayButton.dataset.requestDateValue||"");close();}
    });

    document.body.appendChild(popover);
    return popover;
  }

  function changeMonth(delta){
    const date=new Date(viewYear,viewMonth+delta,1);
    viewYear=date.getFullYear();
    viewMonth=date.getMonth();
    render();
  }

  function render(){
    if(!popover||!input)return;
    const selected=parseIso(input.value);
    const today=todayIso();
    const min=String(input.min||"");
    const max=String(input.max||"");
    const monthLabel=popover.querySelector(".request-date-month");
    const grid=popover.querySelector(".request-date-grid");
    if(monthLabel)monthLabel.textContent=`${MONTHS[viewMonth]} de ${viewYear}`;
    if(!grid)return;

    const first=new Date(viewYear,viewMonth,1);
    const offset=(first.getDay()+6)%7;
    const start=new Date(viewYear,viewMonth,1-offset);
    const buttons=[];

    for(let i=0;i<42;i++){
      const date=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
      const iso=toIso(date.getFullYear(),date.getMonth(),date.getDate());
      const outside=date.getMonth()!==viewMonth;
      const isToday=iso===today;
      const isSelected=!!selected&&selected.year===date.getFullYear()&&selected.month===date.getMonth()&&selected.day===date.getDate();
      const disabled=(min&&iso<min)||(max&&iso>max);
      const classes=["request-date-day",outside?"outside":"",isToday?"today":"",isSelected?"selected":"",disabled?"disabled":""].filter(Boolean).join(" ");
      const aria=date.toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});
      buttons.push(
        '<button type="button" class="'+classes+'" data-request-date-value="'+iso+'" role="gridcell" aria-label="'+aria+'"'+
        (isToday?' aria-current="date"':'')+
        (isSelected?' aria-selected="true"':'')+
        (disabled?' disabled aria-disabled="true"':'')+
        '>'+date.getDate()+'</button>'
      );
    }
    grid.innerHTML=buttons.join("");
  }

  function setValue(value){
    if(!input)return;
    if(input.value!==value){
      input.value=value;
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    }
    syncTrigger();
  }

  function syncTrigger(){
    if(!input||!trigger)return;
    const label=trigger.querySelector(".request-date-trigger-label");
    if(label)label.textContent=formatValue(input.value);
    trigger.classList.toggle("has-value",!!input.value);
  }

  function position(){
    if(!popover||popover.hidden||!trigger)return;
    const rect=trigger.getBoundingClientRect();
    const width=popover.offsetWidth||320;
    const height=popover.offsetHeight||350;
    const margin=8;
    const viewportWidth=document.documentElement.clientWidth;
    const viewportHeight=document.documentElement.clientHeight;
    if(viewportWidth<=560)return;
    const left=Math.max(10,Math.min(rect.left,viewportWidth-width-10));
    let top=rect.bottom+margin;
    if(top+height>viewportHeight-10)top=Math.max(10,rect.top-height-margin);
    popover.style.left=left+"px";
    popover.style.top=top+"px";
  }

  function open(){
    ensurePopover();
    const parsed=parseIso(input.value)||parseIso(todayIso());
    viewYear=parsed.year;
    viewMonth=parsed.month;
    render();
    popover.hidden=false;
    trigger.setAttribute("aria-expanded","true");
    popover.style.visibility="hidden";
    requestAnimationFrame(()=>{
      position();
      popover.style.visibility="";
      const selected=popover.querySelector(".request-date-day.selected:not(:disabled)");
      const today=popover.querySelector(".request-date-day.today:not(:disabled)");
      (selected||today)?.focus({preventScroll:true});
    });
  }

  function close(){
    if(popover)popover.hidden=true;
    if(trigger)trigger.setAttribute("aria-expanded","false");
  }

  function enhance(){
    input=document.querySelector(INPUT_SELECTOR);
    if(!input||input.dataset.requestDateReady==="1")return;
    input.dataset.requestDateReady="1";
    input.classList.add("request-date-native");
    input.tabIndex=-1;
    input.setAttribute("aria-hidden","true");

    const label=input.closest("label");
    if(label)label.classList.add("request-date-field");

    trigger=document.createElement("button");
    trigger.type="button";
    trigger.id="requestDateTrigger";
    trigger.className="request-date-trigger";
    trigger.setAttribute("aria-haspopup","dialog");
    trigger.setAttribute("aria-expanded","false");
    trigger.setAttribute("aria-label","Selecionar data do pedido");
    trigger.innerHTML='<span class="request-date-trigger-label"></span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/></svg>';

    input.insertAdjacentElement("afterend",trigger);
    syncTrigger();

    trigger.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      if(popover&&!popover.hidden){close();return;}
      open();
    });

    input.addEventListener("input",syncTrigger);
    input.addEventListener("change",syncTrigger);
    input.form?.addEventListener("reset",()=>requestAnimationFrame(syncTrigger));
  }

  document.addEventListener("pointerdown",event=>{
    if(!popover||popover.hidden)return;
    if(event.target.closest?.(".request-date-popover")||event.target.closest?.(".request-date-trigger"))return;
    close();
  },true);

  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&popover&&!popover.hidden){
      event.preventDefault();
      close();
      trigger?.focus({preventScroll:true});
    }
  });

  window.addEventListener("resize",position,{passive:true});
  document.addEventListener("scroll",()=>{if(popover&&!popover.hidden)position();},true);

  function start(){enhance();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();