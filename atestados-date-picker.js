(function initAtestadosDatePicker(){
  "use strict";

  const ROOT_SELECTOR="#eteAtestadosRoot";
  const MONTHS=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const WEEKDAYS=["seg","ter","qua","qui","sex","sáb","dom"];
  let activeInput=null;
  let activeTrigger=null;
  let popover=null;
  let viewYear=0;
  let viewMonth=0;
  let scanQueued=false;

  function todayIso(){
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Recife",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function parseIso(value){
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||""));
    if(!match)return null;
    return {year:Number(match[1]),month:Number(match[2])-1,day:Number(match[3])};
  }

  function toIso(year,month,day){
    return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }

  function formatValue(value){
    const parsed=parseIso(value);
    if(!parsed)return "Selecionar data";
    return `${String(parsed.day).padStart(2,"0")}/${String(parsed.month+1).padStart(2,"0")}/${parsed.year}`;
  }

  function ensurePopover(){
    if(popover)return popover;
    popover=document.createElement("section");
    popover.className="at-date-popover";
    popover.hidden=true;
    popover.setAttribute("role","dialog");
    popover.setAttribute("aria-label","Selecionar data da falta");
    popover.innerHTML='<div class="at-date-head"><button type="button" class="at-date-nav" data-at-date-prev aria-label="Mês anterior"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button><div class="at-date-month" aria-live="polite"></div><button type="button" class="at-date-nav" data-at-date-next aria-label="Próximo mês"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button></div><div class="at-date-weekdays">'+WEEKDAYS.map(day=>'<span>'+day+'</span>').join("")+'</div><div class="at-date-grid" role="grid"></div><div class="at-date-foot"><span class="at-date-hint">Escolha o dia da falta</span><button type="button" class="at-date-today" data-at-date-today>Hoje</button></div>';
    popover.addEventListener("click",function(event){
      const previous=event.target.closest("[data-at-date-prev]");
      const next=event.target.closest("[data-at-date-next]");
      const todayButton=event.target.closest("[data-at-date-today]");
      const dayButton=event.target.closest("[data-at-date-value]");
      if(previous){event.preventDefault();changeMonth(-1);return;}
      if(next){event.preventDefault();changeMonth(1);return;}
      if(todayButton){event.preventDefault();const value=todayIso();setValue(value);const parsed=parseIso(value);viewYear=parsed.year;viewMonth=parsed.month;render();close();return;}
      if(dayButton){event.preventDefault();setValue(dayButton.dataset.atDateValue||"");close();}
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
    if(!popover)return;
    const selected=parseIso(activeInput?.value);
    const today=todayIso();
    const monthLabel=popover.querySelector(".at-date-month");
    const grid=popover.querySelector(".at-date-grid");
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
      const classes=["at-date-day",outside?"outside":"",isToday?"today":"",isSelected?"selected":""].filter(Boolean).join(" ");
      buttons.push('<button type="button" class="'+classes+'" data-at-date-value="'+iso+'" role="gridcell" aria-label="'+date.toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})+'"'+(isToday?' aria-current="date"':'')+(isSelected?' aria-selected="true"':'')+'>'+date.getDate()+'</button>');
    }
    grid.innerHTML=buttons.join("");
  }

  function setValue(value){
    if(!activeInput)return;
    if(activeInput.value!==value){
      activeInput.value=value;
      activeInput.dispatchEvent(new Event("input",{bubbles:true}));
      activeInput.dispatchEvent(new Event("change",{bubbles:true}));
    }
    syncTrigger();
  }

  function syncTrigger(){
    if(!activeInput||!activeTrigger)return;
    const label=activeTrigger.querySelector(".at-date-trigger-label");
    if(label)label.textContent=formatValue(activeInput.value);
    activeTrigger.classList.toggle("has-value",!!activeInput.value);
  }

  function position(){
    if(!popover||popover.hidden||!activeTrigger)return;
    const rect=activeTrigger.getBoundingClientRect();
    const width=popover.offsetWidth||320;
    const height=popover.offsetHeight||350;
    const margin=8;
    const viewportWidth=document.documentElement.clientWidth;
    const viewportHeight=document.documentElement.clientHeight;
    if(viewportWidth<=560)return;
    let left=Math.max(10,Math.min(rect.left,viewportWidth-width-10));
    let top=rect.bottom+margin;
    if(top+height>viewportHeight-10)top=Math.max(10,rect.top-height-margin);
    popover.style.left=left+"px";
    popover.style.top=top+"px";
  }

  function open(input,trigger){
    ensurePopover();
    activeInput=input;
    activeTrigger=trigger;
    const parsed=parseIso(input.value)||parseIso(todayIso());
    viewYear=parsed.year;
    viewMonth=parsed.month;
    render();
    popover.hidden=false;
    trigger.setAttribute("aria-expanded","true");
    popover.style.visibility="hidden";
    requestAnimationFrame(function(){position();popover.style.visibility="";});
  }

  function close(){
    if(popover)popover.hidden=true;
    if(activeTrigger)activeTrigger.setAttribute("aria-expanded","false");
  }

  function enhance(input){
    if(!input)return;
    if(input.dataset.atDateReady==="1"){
      activeInput=input;
      activeTrigger=input.parentElement?.querySelector(".at-date-trigger")||null;
      syncTrigger();
      return;
    }
    input.dataset.atDateReady="1";
    input.classList.add("at-date-native");
    input.tabIndex=-1;
    input.setAttribute("aria-hidden","true");
    const field=input.closest(".at-field");
    if(field)field.classList.add("at-date-field");
    const label=field?.querySelector('label[for="atDate"]');
    if(label)label.setAttribute("for","atDateTrigger");

    const trigger=document.createElement("button");
    trigger.type="button";
    trigger.id="atDateTrigger";
    trigger.className="at-date-trigger";
    trigger.setAttribute("aria-haspopup","dialog");
    trigger.setAttribute("aria-expanded","false");
    trigger.innerHTML='<span class="at-date-trigger-label"></span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/></svg>';
    input.insertAdjacentElement("afterend",trigger);
    activeInput=input;
    activeTrigger=trigger;
    syncTrigger();

    trigger.addEventListener("click",function(event){
      event.preventDefault();
      event.stopPropagation();
      if(popover&&!popover.hidden&&activeTrigger===trigger){close();return;}
      open(input,trigger);
    });
    input.addEventListener("change",function(){activeInput=input;activeTrigger=trigger;syncTrigger();});
  }

  function scan(){
    scanQueued=false;
    const root=document.querySelector(ROOT_SELECTOR);
    const input=root?.querySelector("#atDate");
    if(!input){
      if(activeInput&&!activeInput.isConnected)close();
      return;
    }
    enhance(input);
  }

  function queueScan(){
    if(scanQueued)return;
    scanQueued=true;
    requestAnimationFrame(scan);
  }

  document.addEventListener("pointerdown",function(event){
    if(!popover||popover.hidden)return;
    if(event.target.closest?.(".at-date-popover")||event.target.closest?.(".at-date-trigger"))return;
    close();
  },true);
  document.addEventListener("keydown",function(event){if(event.key==="Escape")close();});
  window.addEventListener("resize",position);
  document.addEventListener("scroll",function(){if(popover&&!popover.hidden)position();},true);

  function start(){
    scan();
    const root=document.querySelector(ROOT_SELECTOR);
    if(root){
      const observer=new MutationObserver(queueScan);
      observer.observe(root,{childList:true,subtree:true});
    }
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
