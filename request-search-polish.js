(function requestSearchPolish(){
  "use strict";

  function enhance(){
    document.querySelectorAll('#page-requests .request-toolbar .search').forEach(function(search){
      if(search.dataset.searchPolishReady==='1') return;
      const input=search.querySelector('input');
      if(!input) return;
      search.dataset.searchPolishReady='1';
      const icon=document.createElement('span');
      icon.className='request-search-icon';
      icon.setAttribute('aria-hidden','true');
      icon.innerHTML='<svg viewBox="0 0 24 24" focusable="false"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg>';
      search.insertBefore(icon,input);
    });
  }

  let queued=false;
  function queue(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(function(){queued=false;enhance();});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhance,{once:true});
  else enhance();
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',queue);
})();
