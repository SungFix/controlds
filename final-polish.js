(function(){
  "use strict";

  const LOADING_RE=/^(salvando|apagando|confirmando|entrando|carregando|enviando|processando)/i;
  const EMPTY_SELECTOR=".request-empty,.permission-empty,.student-empty,.computer-empty,.history-empty,.agenda-empty,.student-picker-empty";
  let queued=false;

  function syncButton(button){
    if(!(button instanceof HTMLButtonElement)) return;
    const text=String(button.textContent||"").trim();
    const loading=button.disabled&&LOADING_RE.test(text);
    button.classList.toggle("is-loading",loading);
    if(loading) button.setAttribute("aria-busy","true");
    else button.removeAttribute("aria-busy");

    if(button.matches("[data-delete-student],[data-delete-request],[data-delete-permission],[data-delete-computer-record],#clearHistoryButton")){
      button.classList.add("danger");
      if(!button.title) button.title="Ação permanente";
    }
  }

  function syncEmptyState(el){
    if(!(el instanceof HTMLElement)) return;
    el.setAttribute("role","status");
    el.setAttribute("aria-live","polite");
    el.setAttribute("aria-atomic","true");
  }

  function syncFields(){
    document.querySelectorAll("#agendaSearch,#permissionSearch,#requestSearch,#studentSearch,#computerSearch,#historySearch,#studentPickerSearch").forEach(input=>{
      if(input instanceof HTMLInputElement){
        input.setAttribute("enterkeyhint","search");
        input.setAttribute("autocapitalize","none");
      }
    });
  }

  function sync(){
    queued=false;
    document.querySelectorAll("button").forEach(syncButton);
    document.querySelectorAll(EMPTY_SELECTOR).forEach(syncEmptyState);
    syncFields();
  }

  function queue(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(sync);
  }

  function start(){
    document.documentElement.dataset.finalPolish="1";
    sync();
    const observer=new MutationObserver(queue);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["disabled","class"]});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
