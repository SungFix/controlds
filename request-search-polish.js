(function requestSearchPolish(){
  "use strict";

  function clean(scope=document){
    const roots=[];
    if(scope instanceof Element&&scope.matches(".request-search-wrap"))roots.push(scope);
    scope.querySelectorAll?.("#page-requests .request-search-wrap,.request-search-wrap").forEach(search=>roots.push(search));
    roots.forEach(search=>{
      if(!search.closest("#page-requests"))return;
      search.querySelectorAll(".request-search-icon").forEach(icon=>icon.remove());
      search.dataset.searchPolishReady="1";
    });
  }

  let queued=false;
  function queue(scope){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;clean(scope||document)});
  }

  function start(){
    clean();
    const page=document.getElementById("page-requests");
    if(!page)return;
    const observer=new MutationObserver(records=>{
      for(const record of records){
        for(const node of record.addedNodes){
          if(!(node instanceof Element))continue;
          if(node.matches(".request-search-icon,.request-search-wrap")||node.querySelector(".request-search-icon,.request-search-wrap")){
            queue(page);
            return;
          }
        }
      }
    });
    observer.observe(page,{childList:true,subtree:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
  window.addEventListener("pageshow",()=>queue(document.getElementById("page-requests")||document));
})();
