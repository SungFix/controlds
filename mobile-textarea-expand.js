(function(){
  "use strict";

  const SELECTOR="#reason, #permissionReason";

  function icon(){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5"/><path d="M3 3l6 6"/><path d="M16 21h5v-5"/><path d="m21 21-6-6"/></svg>';
  }

  function enhance(textarea){
    if(!textarea || textarea.dataset.mobileExpandEnhanced==="1") return;
    textarea.dataset.mobileExpandEnhanced="1";

    const wrap=document.createElement("div");
    wrap.className="mobile-textarea-expand-wrap";
    textarea.parentNode.insertBefore(wrap,textarea);
    wrap.appendChild(textarea);

    const button=document.createElement("button");
    button.type="button";
    button.className="mobile-textarea-expand-btn";
    button.innerHTML=icon();
    button.setAttribute("aria-label","Aumentar campo de texto");
    button.setAttribute("aria-expanded","false");
    button.title="Aumentar campo";
    wrap.appendChild(button);

    button.addEventListener("click",function(event){
      event.preventDefault();
      const expanded=wrap.classList.toggle("is-expanded");
      button.setAttribute("aria-expanded",String(expanded));
      button.setAttribute("aria-label",expanded?"Diminuir campo de texto":"Aumentar campo de texto");
      button.title=expanded?"Diminuir campo":"Aumentar campo";
      if(expanded) textarea.focus({preventScroll:true});
    });

    const form=textarea.closest("form");
    form?.addEventListener("reset",function(){
      wrap.classList.remove("is-expanded");
      button.setAttribute("aria-expanded","false");
      button.setAttribute("aria-label","Aumentar campo de texto");
      button.title="Aumentar campo";
    });
  }

  function mount(){
    document.querySelectorAll(SELECTOR).forEach(enhance);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
