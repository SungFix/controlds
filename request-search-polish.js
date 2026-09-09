(function requestSearchPolish(){
  "use strict";

  function clean(){
    document.querySelectorAll('#page-requests .request-search-wrap').forEach(function(search){
      search.querySelectorAll('.request-search-icon').forEach(function(icon){ icon.remove(); });
      search.dataset.searchPolishReady='1';
    });
  }

  let queued=false;
  function queue(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(function(){queued=false;clean();});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',clean,{once:true});
  else clean();
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',queue);
})();
