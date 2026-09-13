(function initRequestLifecyclePolish(){
  "use strict";

  function currentRequest(id){
    try{return Array.isArray(data)?data.find(item=>String(item?.id)===String(id)):null;}catch(_){return null;}
  }

  async function askReturn(request){
    const notebook=String(request?.code||"").trim();
    if(window.ControlActionModal?.confirm){
      return window.ControlActionModal.confirm({
        title:"Confirmar devolução",
        subtitle:"Confira o equipamento antes de finalizar.",
        message:`Confirmar a devolução de ${request?.student||"este aluno"}?`,
        details:[notebook?`Notebook ${notebook}`:"Notebook não identificado",String(request?.time||"Horário não informado")],
        warning:"Após confirmar, o pedido será encerrado e o notebook ficará disponível novamente.",
        variant:"info",
        confirmText:"Confirmar devolução",
        cancelText:"Voltar"
      });
    }
    return window.confirm(`Confirmar a devolução de ${request?.student||"este aluno"}?`);
  }

  window.addEventListener("click",event=>{
    const button=event.target?.closest?.("[data-return]");
    if(!button)return;
    if(button.dataset.returnConfirmed==="1"){
      delete button.dataset.returnConfirmed;
      return;
    }
    const request=currentRequest(button.dataset.return);
    if(!request||!["use","late"].includes(request.status))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    askReturn(request).then(ok=>{
      if(!ok||!button.isConnected)return;
      button.dataset.returnConfirmed="1";
      button.click();
    }).catch(error=>console.error("Falha ao confirmar devolução:",error));
  },true);
})();
