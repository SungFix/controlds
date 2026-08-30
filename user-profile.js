(function initUserProfile(){
  "use strict";

  function text(id,fallback){
    const el=document.getElementById(id);
    const value=el ? String(el.textContent||"").trim() : "";
    return value && value!=="—" ? value : fallback;
  }

  function ensureDialog(){
    let dialog=document.getElementById("userProfileDialog");
    if(dialog) return dialog;

    dialog=document.createElement("dialog");
    dialog.id="userProfileDialog";
    dialog.className="user-profile-dialog";
    dialog.setAttribute("aria-labelledby","userProfileTitle");
    dialog.innerHTML=`
      <div class="user-profile-card">
        <div class="user-profile-head">
          <strong id="userProfileTitle">Perfil</strong>
          <button class="user-profile-close" type="button" aria-label="Fechar perfil">×</button>
        </div>
        <div class="user-profile-info">
          <div class="user-profile-row">
            <span>Nome</span>
            <strong id="userProfileName">—</strong>
          </div>
          <div class="user-profile-row">
            <span>Categoria</span>
            <strong id="userProfileRole">—</strong>
          </div>
        </div>
      </div>`;

    dialog.querySelector(".user-profile-close").addEventListener("click",()=>dialog.close());
    dialog.addEventListener("click",event=>{
      if(event.target===dialog) dialog.close();
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function openProfile(){
    const name=text("headerUserName","Usuário");
    const role=text("headerUserRole","—");
    const dialog=ensureDialog();
    dialog.querySelector("#userProfileName").textContent=name;
    dialog.querySelector("#userProfileRole").textContent=role;
    if(typeof dialog.showModal==="function" && !dialog.open) dialog.showModal();
  }

  function mount(){
    const account=document.querySelector(".header-account");
    if(!account || account.dataset.profileReady==="1") return;

    account.dataset.profileReady="1";
    account.setAttribute("role","button");
    account.setAttribute("tabindex","0");
    account.setAttribute("aria-label","Abrir perfil do usuário");
    account.setAttribute("title","Ver perfil");
    account.addEventListener("click",openProfile);
    account.addEventListener("keydown",event=>{
      if(event.key==="Enter" || event.key===" "){
        event.preventDefault();
        openProfile();
      }
    });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();

  window.addEventListener("pageshow",mount);
})();
