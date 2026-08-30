(function(){
  "use strict";

  const SELECTOR="#reason, #permissionReason";

  function icon(expanded){
    if(expanded){
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v6"/><path d="m8 7 4 4 4-4"/><path d="M12 21v-6"/><path d="m8 17 4-4 4 4"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11V3"/><path d="m8 7 4-4 4 4"/><path d="M12 13v8"/><path d="m8 17 4 4 4-4"/></svg>';
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
    button.innerHTML=icon(false);
    button.setAttribute("aria-label","Aumentar altura do campo de texto");
    button.setAttribute("aria-expanded","false");
    button.title="Aumentar altura";
    wrap.appendChild(button);

    button.addEventListener("click",function(event){
      event.preventDefault();
      const expanded=wrap.classList.toggle("is-expanded");
      button.innerHTML=icon(expanded);
      button.setAttribute("aria-expanded",String(expanded));
      button.setAttribute("aria-label",expanded?"Diminuir altura do campo de texto":"Aumentar altura do campo de texto");
      button.title=expanded?"Diminuir altura":"Aumentar altura";
      if(expanded) textarea.focus({preventScroll:true});
    });

    const form=textarea.closest("form");
    form?.addEventListener("reset",function(){
      wrap.classList.remove("is-expanded");
      button.innerHTML=icon(false);
      button.setAttribute("aria-expanded","false");
      button.setAttribute("aria-label","Aumentar altura do campo de texto");
      button.title="Aumentar altura";
    });
  }

  function mount(){
    document.querySelectorAll(SELECTOR).forEach(enhance);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
