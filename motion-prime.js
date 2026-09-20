(function initMotionPrime(){
  "use strict";

  const root=document.documentElement;
  const reduceMotion=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealSelector=[
    ".panel",".hero-stat",".mini-stat",".quick-card",
    ".request-card",".student-card",".computer-card",".computer-item",
    ".permission-card",".permission-item",".history-event",
    ".portal-card",".at-card",".at-metric",".at-form-card"
  ].join(",");
  const activationSelector=".page,.at-view,.ete-portal-home";
  let revealObserver=null;
  let scrollTicking=false;

  function isEditable(target){
    return !!target?.closest?.("input,textarea,select,[contenteditable='true']");
  }

  function activeSearch(){
    const scope=document.querySelector(".page.active,.at-view.active,.ete-portal-home")||document;
    const selectors=[
      "input[type='search']","#requestSearch","#studentSearch","#permissionSearch",
      "#computerSearch","#historySearch",".request-search-wrap input",
      ".computer-search-wrap input",".search input",".toolbar input"
    ];
    for(const selector of selectors){
      const input=scope.querySelector(selector);
      if(input&&!input.disabled&&!input.readOnly&&input.getClientRects().length) return input;
    }
    return null;
  }

  function animatePage(target){
    if(reduceMotion||!target)return;
    target.classList.remove("ui-page-enter");
    void target.offsetWidth;
    target.classList.add("ui-page-enter");
    window.setTimeout(()=>target.classList.remove("ui-page-enter"),340);
  }

  function prepareRevealElement(element){
    if(!element||element.dataset.motionReveal==="1")return;
    element.dataset.motionReveal="1";
    if(reduceMotion){
      element.classList.add("ui-in");
      return;
    }
    element.classList.add("ui-reveal");
    revealObserver?.observe(element);
  }

  function prepareReveals(scope){
    if(!scope||scope.nodeType!==1&&scope!==document)return;
    if(scope!==document&&scope.matches?.(revealSelector))prepareRevealElement(scope);
    scope.querySelectorAll?.(revealSelector).forEach(prepareRevealElement);
  }

  function installRevealObserver(){
    if(reduceMotion||!("IntersectionObserver" in window))return;
    revealObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        entry.target.classList.add("ui-in");
        revealObserver.unobserve(entry.target);
      }
    },{threshold:.06,rootMargin:"0px 0px -7% 0px"});
  }

  function installScrollTop(){
    if(document.querySelector(".ui-scroll-top"))return;
    const button=document.createElement("button");
    button.type="button";
    button.className="ui-scroll-top";
    button.setAttribute("aria-label","Voltar ao topo");
    button.title="Voltar ao topo";
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
    document.body.appendChild(button);

    function sync(){
      scrollTicking=false;
      button.classList.toggle("is-visible",window.scrollY>620);
    }
    function queue(){
      if(scrollTicking)return;
      scrollTicking=true;
      requestAnimationFrame(sync);
    }
    window.addEventListener("scroll",queue,{passive:true});
    button.addEventListener("click",()=>{
      window.scrollTo({top:0,behavior:reduceMotion?"auto":"smooth"});
    });
    sync();
  }

  function handleMutations(mutations){
    for(const mutation of mutations){
      if(mutation.type==="childList"){
        mutation.addedNodes.forEach(node=>prepareReveals(node));
        continue;
      }
      const target=mutation.target;
      if(!target.matches?.(activationSelector))continue;
      const active=target.classList.contains("active")||target.classList.contains("module-open")||target.matches(".ete-portal-home");
      if(active)animatePage(target);
    }
  }

  function installConvenienceKeys(){
    document.addEventListener("keydown",event=>{
      if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey)return;
      if(event.key!=="/"||isEditable(event.target))return;
      const search=activeSearch();
      if(!search)return;
      event.preventDefault();
      search.focus({preventScroll:false});
      try{search.select();}catch(_){}
    });
  }

  function start(){
    installRevealObserver();
    prepareReveals(document);
    installScrollTop();
    installConvenienceKeys();
    root.dataset.motionReady="1";

    const observer=new MutationObserver(handleMutations);
    observer.observe(document.body,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:["class"]
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();