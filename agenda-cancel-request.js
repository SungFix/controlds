(function initAgendaCancelRequest(){
  "use strict";

  let installed=false;
  let tries=0;

  function currentRequests(){
    try{
      return Array.isArray(data) ? data : [];
    }catch(_){
      return [];
    }
  }

  function currentAuthId(){
    try{
      return String(v46AuthUser?.id||"");
    }catch(_){
      return "";
    }
  }

  function canCancel(request){
    try{
      if(!request || !currentUser) return false;
      if(["adm","professor"].includes(String(currentUser.role||""))) return true;
      return String(request.requestedById||"")===currentAuthId();
    }catch(_){
      return false;
    }
  }

  function removeWrongPostPickupButton(){
    document.querySelectorAll("#agendaRows [data-cancel-pickup]").forEach(button=>button.remove());
  }

  function mountButtons(){
    removeWrongPostPickupButton();

    document.querySelectorAll("#agendaRows [data-pickup]").forEach(pickupButton=>{
      const id=String(pickupButton.dataset.pickup||"");
      const actions=pickupButton.parentElement;
      if(!id || !actions || actions.querySelector("[data-cancel-waiting-request]")) return;

      const request=currentRequests().find(item=>String(item?.id)===id);
      if(!request || request.status!=="wait" || !canCancel(request)) return;

      const button=document.createElement("button");
      button.type="button";
      button.className="btn secondary small";
      button.dataset.cancelWaitingRequest=id;
      button.textContent="Cancelar pedido";
      button.title="Cancelar este pedido antes da retirada";
      actions.insertBefore(button,pickupButton);
    });
  }

  async function cancelRequest(button){
    const id=String(button.dataset.cancelWaitingRequest||"");
    const request=currentRequests().find(item=>String(item?.id)===id);

    if(!request) throw new Error("request_not_found");
    if(request.status!=="wait") throw new Error("invalid_status");
    if(!canCancel(request)) throw new Error("forbidden");

    const confirmed=confirm(
      `Cancelar o pedido de ${request.student}?\n\n`+
      `O pedido será removido da Agenda sem registrar retirada do notebook.`
    );
    if(!confirmed) return;

    const oldText=button.textContent;
    button.disabled=true;
    button.textContent="Cancelando...";

    try{
      await v46Rpc("ete_cancel_waiting_request",{p_request_id:id});
      if(typeof toast==="function") toast("Pedido cancelado antes da retirada.");
    }catch(err){
      console.error(err);
      const message=typeof v46ExplainError==="function"
        ? v46ExplainError(err)
        : "Não foi possível cancelar o pedido.";
      if(typeof toast==="function") toast(message);
    }finally{
      if(button.isConnected){
        button.disabled=false;
        button.textContent=oldText;
      }
    }
  }

  function install(){
    if(installed) return true;
    if(typeof renderAgenda!=="function" || typeof v46Rpc!=="function") return false;

    const baseRenderAgenda=renderAgenda;
    const wrappedRenderAgenda=function(){
      const result=baseRenderAgenda.apply(this,arguments);
      mountButtons();
      return result;
    };
    wrappedRenderAgenda.__agendaCancelWaitingRequest=true;
    renderAgenda=wrappedRenderAgenda;

    document.addEventListener("click",event=>{
      const button=event.target.closest?.("[data-cancel-waiting-request]");
      if(!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      cancelRequest(button).catch(err=>{
        console.error(err);
        const message=typeof v46ExplainError==="function"
          ? v46ExplainError(err)
          : "Não foi possível cancelar o pedido.";
        if(typeof toast==="function") toast(message);
      });
    },true);

    installed=true;
    mountButtons();
    return true;
  }

  function boot(){
    if(install()) return;
    const timer=setInterval(()=>{
      tries++;
      if(install() || tries>=120) clearInterval(timer);
    },50);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();

  window.addEventListener("pageshow",()=>{
    if(installed) mountButtons();
    else install();
  });
})();
