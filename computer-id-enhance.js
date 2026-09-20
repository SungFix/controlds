(function(){
  "use strict";

  function initComputerIdentifier(){
    const form=document.querySelector("#pickupForm");
    const original=document.querySelector("#computerCode");
    if(!form||!original||form.dataset.computerIdEnhanced==="1") return;
    form.dataset.computerIdEnhanced="1";

    // Mantém o mesmo nó: apenas atualiza a validação visual para o padrão atual.
    const input=original;
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
      help.style.fontSize="10.5px";
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

    sanitize();

  }

  window.addEventListener("load",initComputerIdentifier,{once:true});
  if(document.readyState==="complete") initComputerIdentifier();
})();
