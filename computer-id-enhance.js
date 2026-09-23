(function(){
  "use strict";

  let pickupBusy=false;

  function normalizeCode(value){
    return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,9);
  }

  function validCode(value){
    return /^(?:\d{4}|\d{6}|[A-Z0-9]{9})$/.test(value);
  }

  function notify(message){
    if(typeof toast==="function")toast(message);
    else console.warn(message);
  }

  function explainError(error){
    const message=String(error?.message||error||"");
    if(message.includes("ambiguous_code"))return "Esta identificação pertence a mais de um notebook. Use o código do equipamento de 9 caracteres para diferenciar.";
    if(message.includes("invalid_code"))return "Notebook não encontrado. Use a etiqueta de 4 dígitos, o tombamento de 6 dígitos ou o código do equipamento de 9 caracteres.";
    if(message.includes("code_in_use"))return "Este notebook já está em uso.";
    if(message.includes("forbidden"))return "Sua conta não tem permissão para confirmar retiradas.";
    if(typeof v46ExplainError==="function")return v46ExplainError(error);
    return "Não foi possível confirmar a retirada. Verifique a conexão e tente novamente.";
  }

  async function submitPickup(form){
    if(!form||pickupBusy)return;
    const input=document.querySelector("#computerCode");
    const requestId=String(form.dataset.id||"");
    const code=normalizeCode(input?.value);

    if(!requestId){notify("Pedido não encontrado.");return;}
    if(typeof canPickup==="function"&&!canPickup()){notify("Sua conta não tem permissão para confirmar retiradas.");return;}
    if(!validCode(code)){
      notify("Use a etiqueta de 4 dígitos, o tombamento de 6 dígitos ou o código do equipamento de 9 caracteres.");
      input?.focus();
      return;
    }

    if(input)input.value=code;
    const button=form.querySelector('button[type="submit"]');
    const oldText=button?.textContent||"Confirmar";
    pickupBusy=true;
    if(button){button.disabled=true;button.textContent="Confirmando...";button.setAttribute("aria-busy","true");}

    try{
      if(typeof v46Rpc!=="function")throw new Error("backend_unavailable");
      const result=await v46Rpc("ete_pickup_request_v3",{
        p_request_id:requestId,
        p_code:code
      });
      if(result&&result.ok===false)throw new Error(String(result.error||"pickup_failed"));
      if(input)input.value="";
      const dialog=form.closest("dialog")||document.querySelector("#pickupModal");
      try{dialog?.close();}catch(_){dialog?.removeAttribute("open");}
      notify("Retirada confirmada.");
    }catch(error){
      console.error(error);
      notify(explainError(error));
    }finally{
      pickupBusy=false;
      if(button){button.disabled=false;button.textContent=oldText;button.removeAttribute("aria-busy");}
    }
  }

  // Este script carrega antes do fluxo relacional e assume somente a confirmação
  // de retirada, evitando que validadores legados rejeitem as etiquetas de 4 dígitos.
  window.addEventListener("click",event=>{
    const button=event.target?.closest?.('#pickupForm button[type="submit"]');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void submitPickup(button.form||document.querySelector("#pickupForm"));
  },true);

  window.addEventListener("submit",event=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=="pickupForm")return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void submitPickup(form);
  },true);

  function initComputerIdentifier(){
    const form=document.querySelector("#pickupForm");
    const original=document.querySelector("#computerCode");
    if(!form||!original||form.dataset.computerIdEnhanced==="1") return;
    form.dataset.computerIdEnhanced="1";

    const input=original;
    input.maxLength=9;
    input.pattern="(?:\\d{4}|\\d{6}|[A-Za-z0-9]{9})";
    input.placeholder="Etiqueta (4), tombamento (6) ou código do equipamento (9)";
    input.title="Digite a etiqueta de 4 dígitos, o tombamento de 6 dígitos ou o código do equipamento de 9 caracteres";
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
      help.style.fontSize="10.5px";
      help.style.lineHeight="1.45";
      help.textContent="Use a etiqueta de 4 dígitos. Também aceitamos tombamento de 6 dígitos e código do equipamento de 9 caracteres.";
      input.insertAdjacentElement("afterend",help);
    }

    function sanitize(){
      input.value=normalizeCode(input.value);
      const value=input.value;
      if(/^\d{4}$/.test(value)) help.textContent="Etiqueta de 4 dígitos reconhecida.";
      else if(/^\d{6}$/.test(value)) help.textContent="Tombamento de 6 dígitos reconhecido.";
      else if(/^[A-Z0-9]{9}$/.test(value)) help.textContent="Código do equipamento de 9 caracteres reconhecido.";
      else help.textContent="Use etiqueta (4 dígitos), tombamento (6 dígitos) ou código do equipamento (9 caracteres).";
    }
    input.addEventListener("input",sanitize);

    sanitize();
  }

  window.addEventListener("load",initComputerIdentifier,{once:true});
  if(document.readyState==="complete") initComputerIdentifier();
})();
