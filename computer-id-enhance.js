(function(){
  "use strict";

  function initComputerIdentifier(){
    const form=document.querySelector("#pickupForm");
    const original=document.querySelector("#computerCode");
    if(!form||!original||form.dataset.computerIdEnhanced==="1") return;
    form.dataset.computerIdEnhanced="1";

    // Clona o campo para remover a regra antiga que cortava o valor em 6 dígitos.
    const input=original.cloneNode(true);
    original.replaceWith(input);
    input.maxLength=9;
    input.pattern="(?:\\d{6}|\\d{9})";
    input.placeholder="6 dígitos (nº geral) ou 9 dígitos (nº de série)";
    input.title="Digite o número geral de 6 dígitos ou o número de série de 9 dígitos";
    input.setAttribute("aria-describedby","computerCodeHelp");

    const label=input.closest("label");
    if(label){
      for(const node of label.childNodes){
        if(node.nodeType===Node.TEXT_NODE && node.textContent.trim()){
          node.textContent="Identificação do notebook\n        ";
          break;
        }
      }
    }

    let help=document.querySelector("#computerCodeHelp");
    if(!help){
      help=document.createElement("small");
      help.id="computerCodeHelp";
      help.style.display="block";
      help.style.marginTop="7px";
      help.style.color="var(--muted, #8f98a2)";
      help.style.fontSize="9px";
      help.style.lineHeight="1.45";
      help.textContent="Use o número geral (6 dígitos). Se o notebook não tiver esse número, use o número de série (9 dígitos).";
      input.insertAdjacentElement("afterend",help);
    }

    function sanitize(){
      input.value=input.value.replace(/\D/g,"").slice(0,9);
      const len=input.value.length;
      if(len===6) help.textContent="Número geral de 6 dígitos reconhecido.";
      else if(len===9) help.textContent="Número de série de 9 dígitos reconhecido.";
      else help.textContent="Use o número geral (6 dígitos) ou o número de série (9 dígitos).";
    }
    input.addEventListener("input",sanitize);

    const submit=form.querySelector('button[type="submit"]');
    if(!submit) return;
    submit.type="button";

    async function confirmPickup(){
      if(submit.disabled) return;
      const pin=document.querySelector("#pickupPin")?.value.trim()||"";
      const code=input.value.trim();
      const requestId=String(form.dataset.id||"");

      if(typeof canPickup==="function" && !canPickup()){
        if(typeof toast==="function") toast("Somente Monitor ou ADM pode confirmar a retirada.");
        return;
      }
      if(!/^\d{4,8}$/.test(pin)){
        if(typeof toast==="function") toast("Digite o PIN do aluno (4 a 8 números).");
        return;
      }
      if(!/^(?:\d{6}|\d{9})$/.test(code)){
        if(typeof toast==="function") toast("Digite o número geral de 6 dígitos ou o número de série de 9 dígitos.");
        input.focus();
        return;
      }
      if(!requestId){
        if(typeof toast==="function") toast("Pedido não encontrado.");
        return;
      }

      const oldText=submit.textContent;
      submit.disabled=true;
      submit.textContent="Confirmando...";
      try{
        if(typeof v46PickupRpc!=="function") throw new Error("pickup_unavailable");
        await v46PickupRpc({p_request_id:requestId,p_pin:pin,p_code:code});
        const pinInput=document.querySelector("#pickupPin");
        if(pinInput) pinInput.value="";
        input.value="";
        help.textContent="Use o número geral (6 dígitos) ou o número de série (9 dígitos).";
        try{document.querySelector("#pickupModal")?.close();}catch(_){}
        if(typeof toast==="function") toast("Retirada confirmada.");
      }catch(err){
        console.error(err);
        const message=typeof v46ExplainError==="function" ? v46ExplainError(err) : "Não foi possível confirmar a retirada.";
        if(typeof toast==="function") toast(message);
      }finally{
        submit.disabled=false;
        submit.textContent=oldText;
      }
    }

    submit.addEventListener("click",confirmPickup);
    form.addEventListener("keydown",function(event){
      if(event.key==="Enter" && event.target.matches("input")){
        event.preventDefault();
        confirmPickup();
      }
    });
  }

  window.addEventListener("load",initComputerIdentifier,{once:true});
  if(document.readyState==="complete") initComputerIdentifier();
})();
