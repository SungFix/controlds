(function initUserProfile(){
  "use strict";

  function text(id,fallback){
    const el=document.getElementById(id);
    const value=el ? String(el.textContent||"").trim() : "";
    return value && value!=="—" ? value : fallback;
  }

  function ensurePopover(){
    let popover=document.getElementById("userProfilePopover");
    if(popover) return popover;

    popover=document.createElement("div");
    popover.id="userProfilePopover";
    popover.className="user-profile-popover";
    popover.setAttribute("role","dialog");
    popover.setAttribute("aria-label","Perfil do usuário");
    popover.hidden=true;
    popover.innerHTML=`
      <div class="user-profile-info">
        <div class="user-profile-row">
          <span>Nome</span>
          <strong id="userProfileName">—</strong>
        </div>
        <div class="user-profile-row">
          <span>Categoria</span>
          <strong id="userProfileRole">—</strong>
        </div>
      </div>`;

    document.body.appendChild(popover);
    return popover;
  }

  function positionPopover(account,popover){
    const rect=account.getBoundingClientRect();
    const gap=8;
    const viewportGap=10;
    const width=Math.min(260,window.innerWidth-(viewportGap*2));
    let left=rect.right-width;
    left=Math.max(viewportGap,Math.min(left,window.innerWidth-width-viewportGap));

    popover.style.width=width+"px";
    popover.style.left=Math.round(left)+"px";
    popover.style.top=Math.round(rect.bottom+gap)+"px";
  }

  function closeProfile(){
    const account=document.querySelector(".header-account");
    const popover=document.getElementById("userProfilePopover");
    if(!popover || popover.hidden) return;
    popover.hidden=true;
    if(account) account.setAttribute("aria-expanded","false");
  }

  function toggleProfile(event){
    if(event) event.stopPropagation();
    const account=document.querySelector(".header-account");
    if(!account) return;

    const popover=ensurePopover();
    if(!popover.hidden){
      closeProfile();
      return;
    }

    popover.querySelector("#userProfileName").textContent=text("headerUserName","Usuário");
    popover.querySelector("#userProfileRole").textContent=text("headerUserRole","—");
    popover.hidden=false;
    positionPopover(account,popover);
    account.setAttribute("aria-expanded","true");
  }

  function mount(){
    const account=document.querySelector(".header-account");
    if(!account || account.dataset.profileReady==="1") return;

    account.dataset.profileReady="1";
    account.setAttribute("role","button");
    account.setAttribute("tabindex","0");
    account.setAttribute("aria-label","Abrir perfil do usuário");
    account.setAttribute("aria-haspopup","dialog");
    account.setAttribute("aria-expanded","false");
    account.setAttribute("title","Ver perfil");
    account.addEventListener("click",toggleProfile);
    account.addEventListener("keydown",event=>{
      if(event.key==="Enter" || event.key===" "){
        event.preventDefault();
        toggleProfile(event);
      }else if(event.key==="Escape"){
        closeProfile();
      }
    });

    document.addEventListener("click",event=>{
      const popover=document.getElementById("userProfilePopover");
      if(!popover || popover.hidden) return;
      if(account.contains(event.target) || popover.contains(event.target)) return;
      closeProfile();
    });

    window.addEventListener("resize",()=>{
      const popover=document.getElementById("userProfilePopover");
      if(popover && !popover.hidden) positionPopover(account,popover);
    });
    window.addEventListener("scroll",()=>{
      const popover=document.getElementById("userProfilePopover");
      if(popover && !popover.hidden) positionPopover(account,popover);
    },true);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();

  window.addEventListener("pageshow",mount);
})();
