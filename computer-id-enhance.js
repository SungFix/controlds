(function(){
  "use strict";

  function initComputerIdentifier(){
    const form=document.querySelector("#pickupForm");
    const original=document.querySelector("#computerCode");
    if(!form||!original||form.dataset.computerIdEnhanced==="1") return;
    form.dataset.computerIdEnhanced="1";

    // Mantém o mesmo nó e aceita as três identificações cadastradas no inventário.
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
      input.value=input.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,9);
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
