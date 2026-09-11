(function initRequestCreatorLabel(){
  "use strict";

  const STYLE_ID="requestCreatorLabelStyles";
  let installed=false;

  function esc(value){
    return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
  }

  function creatorName(request){
    return String(request?.requestedByLabel||request?.requestedBy||"").trim();
  }

  function creatorMarkup(request){
    const name=creatorName(request);
    if(!name)return"";
    const safe=esc(name);
    return '<span class="request-creator-name" title="Criado por '+safe+'" aria-label="Criado por '+safe+'"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M6 20c.4-4 2.4-6 6-6s5.6 2 6 6"/></svg><span>'+safe+'</span></span>';
  }

  function installStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      .request-card .request-idline{flex-wrap:wrap!important}
      .request-card .request-creator-name{
        display:inline-flex;
        align-items:center;
        gap:4px;
        min-width:0;
        max-width:150px;
        margin-left:2px;
        padding-left:8px;
        border-left:1px solid var(--ui-border,#303740);
        color:#939da6;
        font-size:8.5px;
        font-weight:760;
        line-height:1.15;
        white-space:nowrap;
      }
      .request-card .request-creator-name svg{
        width:11px;
        height:11px;
        flex:0 0 11px;
        fill:none;
        stroke:currentColor;
        stroke-width:1.8;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      .request-card .request-creator-name span{
        min-width:0;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      html[data-theme="light"] .request-card .request-creator-name{
        border-left-color:#cfd9df;
        color:#5a6d77;
      }
      @media(max-width:620px){
        .request-card .request-creator-name{max-width:120px}
      }
    `;
    document.head.appendChild(style);
  }

  function decorateHtml(html,request){
    const marker=creatorMarkup(request);
    const text=String(html||"");
    if(!marker||text.includes("request-creator-name"))return text;
    return text.replace(/(<span class="request-subid">[^<]*<\/span>)/,"$1"+marker);
  }

  function decorateExisting(){
    let requests=[];
    try{requests=Array.isArray(data)?data:[];}catch(_){requests=[];}
    if(!requests.length)return;
    document.querySelectorAll(".request-card").forEach(card=>{
      if(card.querySelector(".request-creator-name"))return;
      const idNode=card.querySelector(".request-subid");
      if(!idNode)return;
      const suffix=String(idNode.textContent||"").trim().replace(/^#/,"");
      if(!suffix)return;
      const request=requests.find(item=>String(item?.id||"").slice(-6)===suffix);
      const name=creatorName(request);
      if(!name)return;
      const wrapper=document.createElement("span");
      wrapper.innerHTML=creatorMarkup(request);
      const label=wrapper.firstElementChild;
      if(label)idNode.insertAdjacentElement("afterend",label);
    });
  }

  function install(){
    installStyles();
    const original=globalThis.rowHTML;
    if(typeof original!=="function")return false;
    if(original.__requestCreatorLabelInstalled){installed=true;decorateExisting();return true;}
    const wrapped=function(request,actions=true){
      return decorateHtml(original.call(this,request,actions),request);
    };
    wrapped.__requestCreatorLabelInstalled=true;
    wrapped.__requestCreatorLabelOriginal=original;
    globalThis.rowHTML=wrapped;
    installed=true;
    decorateExisting();
    return true;
  }

  function boot(){
    if(install())return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(install()||attempts>=20)clearInterval(timer);
    },100);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
  window.addEventListener("load",()=>{if(installed)decorateExisting();},{once:true});

  window.RequestCreatorLabel=Object.freeze({refresh:decorateExisting});
})();
