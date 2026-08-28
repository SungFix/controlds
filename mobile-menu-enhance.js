(function(){
  function enhanceMobileMenu(){
    const root=document.documentElement;
    const body=document.body;
    const sidebar=document.querySelector('.sidebar');
    const menuButton=document.querySelector('.mobile-menu');
    if(!sidebar||!menuButton) return;
    if(menuButton.dataset.mobileEnhanced==='1') return;
    menuButton.dataset.mobileEnhanced='1';

    let backdrop=document.querySelector('.mobile-menu-backdrop');
    if(!backdrop){
      backdrop=document.createElement('div');
      backdrop.className='mobile-menu-backdrop';
      backdrop.setAttribute('aria-hidden','true');
      document.body.appendChild(backdrop);
    }

    const menuIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    const closeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

    function isMobile(){return window.matchMedia('(max-width:820px)').matches;}
    function isOpen(){return root.classList.contains('mobile-menu-open');}
    function syncButton(){
      const open=isOpen();
      menuButton.innerHTML=open?closeIcon:menuIcon;
      menuButton.setAttribute('aria-expanded',String(open));
      menuButton.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
      menuButton.title=open?'Fechar menu':'Abrir menu';
    }
    function openMenu(){
      if(!isMobile()) return;
      root.classList.add('mobile-menu-open');
      body.classList.add('mobile-menu-open');
      syncButton();
    }
    function closeMenu(){
      root.classList.remove('mobile-menu-open');
      body.classList.remove('mobile-menu-open');
      syncButton();
    }
    function toggleMenu(ev){
      if(!isMobile()) return;
      ev.preventDefault();
      ev.stopPropagation();
      isOpen()?closeMenu():openMenu();
    }

    menuButton.addEventListener('click',toggleMenu,true);
    backdrop.addEventListener('click',closeMenu);
    backdrop.addEventListener('touchend',function(ev){ev.preventDefault();closeMenu();},{passive:false});

    document.addEventListener('click',function(ev){
      if(!isMobile()||!isOpen()) return;
      if(sidebar.contains(ev.target)||menuButton.contains(ev.target)) return;
      closeMenu();
    });

    sidebar.addEventListener('click',function(ev){
      const navButton=ev.target.closest('.nav button');
      if(navButton&&isMobile()) closeMenu();
    });

    window.addEventListener('resize',function(){
      if(!isMobile()) closeMenu();
      else syncButton();
    });

    syncButton();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',enhanceMobileMenu,{once:true});
  }else{
    enhanceMobileMenu();
  }
})();
