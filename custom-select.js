(function initETECustomSelects(){
  "use strict";

  const registry=new Map();
  let openState=null;
  let menu=null;
  let menuId="";
  let uid=0;
  let scanQueued=false;

  const chevronSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg>';
  const checkSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>';

  function esc(value){
    return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  }

  function ensureMenu(){
    if(menu&&document.body.contains(menu))return menu;
    menu=document.createElement("div");
    menu.className="ete-select-menu";
    menuId="eteSelectMenu";
    menu.id=menuId;
    menu.setAttribute("role","listbox");
    document.body.appendChild(menu);

    menu.addEventListener("click",event=>{
      const optionButton=event.target.closest(".ete-select-option");
      if(!optionButton||optionButton.disabled||!openState)return;
      const index=Number(optionButton.dataset.index);
      choose(openState,index,true);
    });

    menu.addEventListener("keydown",event=>{
      if(!openState)return;
      const options=[...menu.querySelectorAll(".ete-select-option:not(:disabled)")];
      const current=options.indexOf(document.activeElement);
      if(event.key==="ArrowDown"||event.key==="ArrowUp"){
        event.preventDefault();
        if(!options.length)return;
        const delta=event.key==="ArrowDown"?1:-1;
        const next=current<0?0:(current+delta+options.length)%options.length;
        options[next].focus();
        setActive(options[next]);
      }else if(event.key==="Home"||event.key==="End"){
        event.preventDefault();
        if(!options.length)return;
        const target=event.key==="Home"?options[0]:options[options.length-1];
        target.focus();
        setActive(target);
      }else if(event.key==="Escape"){
        event.preventDefault();
        close(true);
      }else if(event.key==="Tab"){
        close(false);
      }
    });
    return menu;
  }

  function optionEntries(select){
    const entries=[];
    [...select.children].forEach(child=>{
      if(child.tagName==="OPTGROUP"){
        entries.push({group:true,label:child.label||""});
        [...child.children].forEach(option=>entries.push({group:false,option,index:[...select.options].indexOf(option)}));
      }else if(child.tagName==="OPTION"){
        entries.push({group:false,option:child,index:[...select.options].indexOf(child)});
      }
    });
    return entries;
  }

  function selectedText(select){
    const option=select.options[select.selectedIndex];
    return option?option.textContent.trim():"Selecionar";
  }

  function sync(state){
    if(!state||!state.select.isConnected)return;
    const {select,button,value}=state;
    value.textContent=selectedText(select);
    button.disabled=!!select.disabled;
    state.shell.classList.toggle("is-disabled",!!select.disabled);
    button.setAttribute("aria-disabled",String(!!select.disabled));
    if(openState===state)renderMenu(state,false);
  }

  function syncAll(){
    registry.forEach(sync);
  }

  function renderMenu(state,focusSelected){
    const m=ensureMenu();
    const {select}=state;
    const selected=select.selectedIndex;
    const html=[];
    optionEntries(select).forEach(entry=>{
      if(entry.group){
        html.push('<div class="ete-select-group">'+esc(entry.label)+'</div>');
        return;
      }
      const option=entry.option;
      const isSelected=entry.index===selected;
      html.push(
        '<button type="button" class="ete-select-option'+(isSelected?' is-selected':'')+'" role="option" aria-selected="'+String(isSelected)+'" data-index="'+entry.index+'"'+(option.disabled?' disabled':'')+'>'+
          '<span class="ete-select-option-label">'+esc(option.textContent.trim())+'</span>'+
          '<span class="ete-select-check" aria-hidden="true">'+checkSvg+'</span>'+
        '</button>'
      );
    });
    m.innerHTML=html.join("");
    if(focusSelected){
      requestAnimationFrame(()=>{
        const selectedButton=m.querySelector('.ete-select-option.is-selected:not(:disabled)')||m.querySelector('.ete-select-option:not(:disabled)');
        if(selectedButton){selectedButton.focus({preventScroll:true});setActive(selectedButton);selectedButton.scrollIntoView({block:"nearest"});}
      });
    }
  }

  function setActive(button){
    if(!menu)return;
    menu.querySelectorAll(".ete-select-option.is-active").forEach(node=>node.classList.remove("is-active"));
    button?.classList.add("is-active");
  }

  function positionMenu(){
    if(!openState||!menu)return;
    const rect=openState.button.getBoundingClientRect();
    const viewportH=window.innerHeight||document.documentElement.clientHeight;
    const viewportW=window.innerWidth||document.documentElement.clientWidth;
    const gap=6;
    const side=8;
    const maxWidth=Math.max(180,viewportW-side*2);
    const width=Math.min(maxWidth,Math.max(rect.width,180));

    menu.style.width=width+"px";
    menu.style.left=Math.max(side,Math.min(rect.left,viewportW-width-side))+"px";
    menu.style.top="0px";
    menu.style.bottom="auto";
    menu.style.maxHeight="min(320px, calc(100vh - 28px))";

    const desired=Math.min(menu.scrollHeight,320);
    const below=viewportH-rect.bottom-gap-side;
    const above=rect.top-gap-side;
    if(below<Math.min(180,desired)&&above>below){
      const height=Math.min(desired,Math.max(120,above));
      menu.style.maxHeight=height+"px";
      menu.style.top=Math.max(side,rect.top-gap-height)+"px";
    }else{
      const height=Math.min(desired,Math.max(120,below));
      menu.style.maxHeight=height+"px";
      menu.style.top=Math.min(viewportH-side-height,rect.bottom+gap)+"px";
    }
  }

  function open(state,focusSelected){
    if(!state||state.select.disabled)return;
    if(openState&&openState!==state)close(false);
    openState=state;
    const m=ensureMenu();
    renderMenu(state,false);
    m.classList.add("is-open");
    state.shell.classList.add("is-open");
    state.button.setAttribute("aria-expanded","true");
    positionMenu();
    if(focusSelected){
      requestAnimationFrame(()=>{
        const target=m.querySelector('.ete-select-option.is-selected:not(:disabled)')||m.querySelector('.ete-select-option:not(:disabled)');
        if(target){target.focus({preventScroll:true});setActive(target);target.scrollIntoView({block:"nearest"});}
      });
    }
  }

  function close(returnFocus){
    if(!openState)return;
    const state=openState;
    openState=null;
    state.shell.classList.remove("is-open");
    state.button.setAttribute("aria-expanded","false");
    if(menu){menu.classList.remove("is-open");menu.innerHTML="";}
    if(returnFocus&&state.button.isConnected)state.button.focus({preventScroll:true});
  }

  function choose(state,index,returnFocus){
    const {select}=state;
    const option=select.options[index];
    if(!option||option.disabled)return;
    const changed=select.selectedIndex!==index;
    select.selectedIndex=index;
    sync(state);
    if(changed){
      select.dispatchEvent(new Event("input",{bubbles:true}));
      select.dispatchEvent(new Event("change",{bubbles:true}));
    }
    close(returnFocus);
  }

  function widthMode(select,shell){
    const classes=[...select.classList].join(" ");
    shell.dataset.selectClass=classes;
    const rect=select.getBoundingClientRect();
    const parentRect=select.parentElement?.getBoundingClientRect?.();
    const isFixed=rect.width>0&&parentRect?.width>0&&rect.width<parentRect.width-10;
    if(isFixed){
      shell.classList.add("is-fixed");
      if(!select.classList.contains("filter-select"))shell.style.width=Math.round(rect.width)+"px";
    }else{
      shell.classList.add("is-fill");
    }
  }

  function enhance(select){
    if(!(select instanceof HTMLSelectElement)||registry.has(select)||select.multiple||Number(select.size)>1||select.dataset.nativeSelect==="true")return;
    const id=++uid;
    const shell=document.createElement("span");
    shell.className="ete-select";
    widthMode(select,shell);

    const button=document.createElement("button");
    button.type="button";
    button.className="ete-select-trigger";
    button.id="eteSelectTrigger"+id;
    button.setAttribute("aria-haspopup","listbox");
    button.setAttribute("aria-expanded","false");
    button.setAttribute("aria-controls",menuId||"eteSelectMenu");

    const value=document.createElement("span");
    value.className="ete-select-value";
    const chevron=document.createElement("span");
    chevron.className="ete-select-chevron";
    chevron.setAttribute("aria-hidden","true");
    chevron.innerHTML=chevronSvg;
    button.append(value,chevron);

    select.parentNode.insertBefore(shell,select);
    shell.append(select,button);
    select.classList.add("ete-native-select");
    select.tabIndex=-1;
    select.setAttribute("aria-hidden","true");

    const state={select,shell,button,value,observer:null};
    registry.set(select,state);
    sync(state);

    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      if(openState===state)close(false);else open(state,false);
    });
    button.addEventListener("keydown",event=>{
      if(event.key==="ArrowDown"||event.key==="ArrowUp"||event.key==="Enter"||event.key===" "){
        event.preventDefault();
        if(openState!==state)open(state,true);
      }else if(event.key==="Escape"&&openState===state){
        event.preventDefault();close(true);
      }
    });
    select.addEventListener("change",()=>sync(state));
    select.addEventListener("input",()=>sync(state));
    select.addEventListener("focus",()=>button.focus({preventScroll:true}));

    state.observer=new MutationObserver(()=>sync(state));
    state.observer.observe(select,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["disabled","selected","label"]});
  }

  function scan(root){
    scanQueued=false;
    const scope=root&&root.querySelectorAll?root:document;
    if(scope instanceof HTMLSelectElement)enhance(scope);
    scope.querySelectorAll?.("select").forEach(enhance);
  }

  function queueScan(){
    if(scanQueued)return;
    scanQueued=true;
    requestAnimationFrame(()=>scan(document));
  }

  function install(){
    ensureMenu();
    scan(document);
    const observer=new MutationObserver(mutations=>{
      let needs=false;
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(node.nodeType===1&&(node.matches?.("select")||node.querySelector?.("select"))){needs=true;break;}
        }
        if(needs)break;
      }
      if(needs)queueScan();
    });
    observer.observe(document.body,{childList:true,subtree:true});

    document.addEventListener("pointerdown",event=>{
      if(!openState)return;
      if(openState.shell.contains(event.target)||menu?.contains(event.target))return;
      close(false);
    },true);
    document.addEventListener("reset",()=>setTimeout(syncAll,0),true);
    document.addEventListener("click",()=>setTimeout(syncAll,0),false);
    window.addEventListener("resize",()=>{if(openState)positionMenu()},{passive:true});
    window.addEventListener("scroll",()=>{if(openState)positionMenu()},{passive:true,capture:true});
    window.addEventListener("control-theme-change",()=>{if(openState)positionMenu()});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();

  window.ETECustomSelect=Object.freeze({sync:syncAll,scan:queueScan,close:()=>close(false)});
})();
