(function initNotebookInventoryView(){
  "use strict";

  const LOCATION_LABELS={
    lab_movel_1:"Laboratório Móvel 1",
    lab_movel_2:"Laboratório Móvel 2",
    sala_normal:"Sala normal"
  };
  const LOCATION_ORDER={lab_movel_1:1,lab_movel_2:2,sala_normal:3};
  const DEVICE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M10 19h4"/><path d="M8 16.5h8"/><path d="M9.5 19.5h5"/></svg>';

  let inventory=[];
  let relationByRequest=new Map();
  let loaded=false;
  let loading=null;
  let loadError="";
  let channel=null;
  let reloadTimer=0;
  let overrideInstalled=false;
  let deleteBusy=new Set();

  function client(){
    try{return typeof sb!=="undefined"?sb:null;}catch(_){return null;}
  }

  function authenticated(){
    try{return !!currentUser&&!document.documentElement.classList.contains("auth-locked");}catch(_){return false;}
  }

  function escapeHtml(value){
    try{if(typeof esc==="function")return esc(value);}catch(_){}
    return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  }

  function requestGroup(request){
    try{if(typeof requestGroupText==="function")return requestGroupText(request);}catch(_){}
    return [request?.studentClass,request?.studentCourse].filter(Boolean).join(" ").trim();
  }

  function requestList(){
    try{return Array.isArray(data)?data.filter(item=>item&&item.code):[];}catch(_){return[];}
  }

  function locationLabel(value){
    return LOCATION_LABELS[String(value||"")]||String(value||"Local não informado");
  }

  function normalizeNotebook(row){
    return {
      id:String(row?.id||""),
      code:String(row?.code||"").trim(),
      assetNumber:String(row?.asset_number||"").trim(),
      equipmentCode:String(row?.equipment_code||"").trim(),
      location:String(row?.location||"").trim(),
      provisionalReference:String(row?.provisional_reference||"").trim(),
      active:row?.active!==false
    };
  }

  function matchesIdentifier(notebook,input){
    const value=String(input||"").trim().toUpperCase();
    if(!value)return false;
    return [notebook.code,notebook.assetNumber,notebook.equipmentCode]
      .some(item=>String(item||"").trim().toUpperCase()===value);
  }

  function uniqueNotebookByIdentifier(input){
    const matches=inventory.filter(notebook=>matchesIdentifier(notebook,input));
    return matches.length===1?matches[0]:null;
  }

  function notebookIdForRequest(request){
    const related=relationByRequest.get(String(request?.id||""));
    if(related)return related;
    return uniqueNotebookByIdentifier(request?.code)?.id||"";
  }

  function requestsByNotebook(){
    const map=new Map();
    requestList().forEach(request=>{
      const notebookId=notebookIdForRequest(request);
      if(!notebookId)return;
      const list=map.get(notebookId)||[];
      list.push(request);
      map.set(notebookId,list);
    });
    return map;
  }

  function latestRequest(list){
    if(!Array.isArray(list)||!list.length)return null;
    return list.find(request=>["use","late"].includes(request.status))||list[0]||null;
  }

  function statusMeta(request){
    if(!request)return {key:"available",label:"Disponível"};
    if(request.status==="late")return {key:"late",label:"Em atraso"};
    if(request.status==="use")return {key:"use",label:"Em uso"};
    return {key:"done",label:"Concluído"};
  }

  function canDeleteRequestSafe(request){
    if(!request||request.status!=="done")return false;
    try{return typeof canDeleteRequest==="function"&&!!canDeleteRequest(request);}catch(_){return false;}
  }

  function canReturnSafe(){
    try{return typeof canReturn==="function"&&!!canReturn();}catch(_){return false;}
  }

  function ensureStyles(){
    if(document.getElementById("notebookInventoryViewStyles"))return;
    const style=document.createElement("style");
    style.id="notebookInventoryViewStyles";
    style.textContent=`
      .inventory-computer-item{overflow:hidden;border:1px solid #2a3037;border-radius:17px;background:linear-gradient(180deg,#15181c,#111317);transition:.14s ease}
      .inventory-computer-item:hover{border-color:#384049;transform:translateY(-1px)}
      .inventory-status-available{color:#9bb8a4;background:#142019;border-color:#31483a}
      .inventory-meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
      .inventory-meta-grid .computer-meta-box{min-width:0}
      .inventory-meta-grid .computer-meta-box strong{overflow-wrap:anywhere}
      .inventory-request-grid{margin-top:8px}
      .inventory-provisional{display:inline-flex;margin-top:7px;padding:4px 7px;border:1px solid #4b4230;border-radius:999px;background:#201c14;color:#c9ad72;font-size:8px;font-weight:800}
      html[data-theme="light"] .inventory-computer-item,html.theme-light .inventory-computer-item{background:#fff;border-color:#d7e0e5}
      html[data-theme="light"] .inventory-computer-item:hover,html.theme-light .inventory-computer-item:hover{border-color:#bccbd3}
      html[data-theme="light"] .inventory-status-available,html.theme-light .inventory-status-available{color:#527660;background:#edf5ef;border-color:#cadfd0}
      html[data-theme="light"] .inventory-provisional,html.theme-light .inventory-provisional{background:#f7f0df;border-color:#e3d2aa;color:#846f42}
      @media(max-width:820px){.inventory-meta-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:540px){.inventory-meta-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function updatePageCopy(){
    const total=document.querySelector("#computerTotal");
    const small=total?.closest?.(".computer-stat")?.querySelector("small");
    if(small)small.textContent="notebooks cadastrados no inventário";
    const search=document.querySelector("#computerSearch");
    if(search)search.placeholder="Pesquisar etiqueta, tombamento, código, aluno ou local...";
  }

  function renderLoading(){
    updatePageCopy();
    if(document.querySelector("#computerTotal"))document.querySelector("#computerTotal").textContent=loaded?String(inventory.length):"…";
    const grid=document.querySelector("#computerGrid");
    if(!grid)return;
    grid.innerHTML=`<div class="computer-empty"><strong>${loadError?"Inventário indisponível":"Carregando inventário"}</strong>${loadError?escapeHtml(loadError):"Buscando os notebooks cadastrados no banco de dados."}</div>`;
    const label=document.querySelector("#computerResultsLabel");
    if(label)label.textContent=loadError?"Não foi possível carregar o inventário":"Carregando notebooks...";
  }

  function inventoryViewRows(){
    const q=String(document.querySelector("#computerSearch")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const filter=typeof currentComputerFilter!=="undefined"?currentComputerFilter:"all";
    const requestMap=requestsByNotebook();

    let list=inventory.map(notebook=>{
      const requests=requestMap.get(notebook.id)||[];
      const request=latestRequest(requests);
      return {notebook,request,requests,status:statusMeta(request)};
    });

    list=list.filter(item=>{
      const {notebook,request,status}=item;
      const filterOk=filter==="all" || (filter==="use" ? ["use","late"].includes(status.key) : status.key===filter);
      if(!filterOk)return false;
      if(!q)return true;
      const hay=[
        notebook.code,notebook.assetNumber,notebook.equipmentCode,notebook.provisionalReference,
        locationLabel(notebook.location),request?.student,requestGroup(request),request?.time
      ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
      return hay.includes(q);
    });

    list.sort((a,b)=>{
      const aUse=["use","late"].includes(a.status.key),bUse=["use","late"].includes(b.status.key);
      if(aUse!==bUse)return aUse?-1:1;
      const loc=(LOCATION_ORDER[a.notebook.location]||99)-(LOCATION_ORDER[b.notebook.location]||99);
      if(loc)return loc;
      return String(a.notebook.code).localeCompare(String(b.notebook.code),"pt-BR",{numeric:true});
    });
    return list;
  }

  function renderInventory(){
    ensureStyles();
    updatePageCopy();
    if(!loaded){renderLoading();return;}

    const allRequests=requestList();
    const requestMap=requestsByNotebook();
    const usingCount=inventory.reduce((total,notebook)=>{
      const request=latestRequest(requestMap.get(notebook.id)||[]);
      return total+(["use","late"].includes(request?.status)?1:0);
    },0);
    const returnedCount=allRequests.filter(request=>request.status==="done").length;

    const totalNode=document.querySelector("#computerTotal");
    const usingNode=document.querySelector("#computerUsing");
    const returnedNode=document.querySelector("#computerReturned");
    if(totalNode)totalNode.textContent=String(inventory.length);
    if(usingNode)usingNode.textContent=String(usingCount);
    if(returnedNode)returnedNode.textContent=String(returnedCount);

    const list=inventoryViewRows();
    const results=document.querySelector("#computerResultsLabel");
    if(results)results.textContent=list.length+" notebook"+(list.length===1?"":"s")+" exibido"+(list.length===1?"":"s");

    const grid=document.querySelector("#computerGrid");
    if(!grid)return;
    grid.innerHTML=list.length?list.map(({notebook,request,status})=>{
      const active=["use","late"].includes(status.key);
      const asset=notebook.assetNumber||"Não informado";
      const equipment=notebook.equipmentCode||"Não informado";
      const requestGroupTextValue=request?requestGroup(request):"—";
      const requestTime=request?.time||"—";
      const ownerLabel=active?"Com quem está":(request?"Último usuário":"Situação");
      const ownerValue=request?.student||"Sem uso registrado";
      const provisional=notebook.provisionalReference&&!notebook.assetNumber
        ? `<span class="inventory-provisional">Referência provisória: ${escapeHtml(notebook.provisionalReference)}</span>`:"";
      const action=active&&canReturnSafe()
        ? `<button class="btn primary small" data-return="${escapeHtml(request.id)}">Confirmar devolução</button>`
        : (!active&&canDeleteRequestSafe(request)
          ? `<button class="btn danger small delete-request" data-inventory-delete-request="${escapeHtml(request.id)}">Apagar registro de uso</button>`
          : "");
      const note=active
        ? (status.key==="late"?"Devolução em atraso.":"Aguardando a devolução do equipamento.")
        : (request?"Equipamento disponível. Último uso já foi concluído.":"Equipamento disponível para retirada.");

      return `
        <article class="inventory-computer-item" data-inventory-id="${escapeHtml(notebook.id)}" data-request-id="${escapeHtml(request?.id||"")}">
          <div class="computer-item-head">
            <div class="computer-identity">
              <div class="computer-device-icon">${DEVICE_ICON}</div>
              <div class="computer-code-wrap">
                <span>Etiqueta do notebook</span>
                <strong>${escapeHtml(notebook.code)}</strong>
                ${provisional}
              </div>
            </div>
            <span class="status ${status.key==="available"?"inventory-status-available":status.key}">${escapeHtml(status.label)}</span>
          </div>

          <div class="computer-item-body">
            <div class="computer-owner">
              <span>${escapeHtml(ownerLabel)}</span>
              <strong>${escapeHtml(ownerValue)}</strong>
            </div>

            <div class="inventory-meta-grid">
              <div class="computer-meta-box"><span>Tombamento</span><strong>${escapeHtml(asset)}</strong></div>
              <div class="computer-meta-box"><span>Código do equipamento</span><strong>${escapeHtml(equipment)}</strong></div>
              <div class="computer-meta-box"><span>Local</span><strong>${escapeHtml(locationLabel(notebook.location))}</strong></div>
            </div>

            ${request?`<div class="computer-meta-grid inventory-request-grid">
              <div class="computer-meta-box"><span>Turma / Curso</span><strong>${escapeHtml(requestGroupTextValue)}</strong></div>
              <div class="computer-meta-box"><span>Horário</span><strong>${escapeHtml(requestTime)}</strong></div>
            </div>`:""}
          </div>

          <div class="computer-item-foot">
            <div class="computer-state-note">${escapeHtml(note)}</div>
            ${action}
          </div>
        </article>`;
    }).join(""):`<div class="computer-empty"><strong>Nenhum notebook encontrado</strong>Ajuste a pesquisa ou escolha outro filtro.</div>`;
  }

  async function loadInventory(){
    if(loading)return loading;
    const c=client();
    if(!c||!authenticated())return false;
    loading=(async()=>{
      const [notebooksResult,relationsResult]=await Promise.all([
        c.from("ete_notebooks").select("id,code,asset_number,equipment_code,location,provisional_reference,active").eq("active",true),
        c.from("ete_requests").select("id,notebook_id")
      ]);
      if(notebooksResult.error)throw notebooksResult.error;
      if(relationsResult.error)throw relationsResult.error;
      inventory=(notebooksResult.data||[]).map(normalizeNotebook);
      relationByRequest=new Map((relationsResult.data||[]).map(row=>[String(row.id),String(row.notebook_id||"")]));
      loaded=true;
      loadError="";
      installRealtime();
      renderInventory();
      return true;
    })().catch(error=>{
      console.error("Falha ao carregar inventário de notebooks:",error);
      loaded=false;
      loadError="Verifique a conexão e tente novamente.";
      renderLoading();
      return false;
    }).finally(()=>{loading=null;});
    return loading;
  }

  function scheduleReload(){
    clearTimeout(reloadTimer);
    reloadTimer=setTimeout(()=>{if(authenticated())loadInventory();},220);
  }

  function installRealtime(){
    if(channel)return;
    const c=client();
    if(!c?.channel)return;
    try{
      channel=c.channel("control-ds-notebook-inventory-"+Math.random().toString(36).slice(2))
        .on("postgres_changes",{event:"*",schema:"public",table:"ete_notebooks"},scheduleReload)
        .on("postgres_changes",{event:"*",schema:"public",table:"ete_requests"},scheduleReload)
        .subscribe();
    }catch(error){console.warn("Realtime do inventário indisponível:",error);}
  }

  function removeRealtime(){
    if(!channel)return;
    try{client()?.removeChannel(channel);}catch(_){}
    channel=null;
  }

  async function deleteUsage(requestId,button){
    const id=String(requestId||"");
    if(!id||deleteBusy.has(id))return;
    const request=requestList().find(item=>String(item?.id)===id);
    if(!canDeleteRequestSafe(request))return;

    let confirmed=true;
    if(window.ControlActionModal?.confirm){
      confirmed=await window.ControlActionModal.confirm({
        title:"Apagar registro de uso",
        subtitle:"O notebook continuará cadastrado no inventário.",
        message:`Deseja apagar apenas o registro concluído de ${request.student||"este aluno"}?`,
        warning:"O cadastro físico do notebook não será removido.",
        confirmText:"Apagar registro",
        cancelText:"Cancelar"
      });
    }else confirmed=window.confirm("Apagar este registro de uso concluído?");
    if(!confirmed)return;

    deleteBusy.add(id);
    const old=button?.textContent||"Apagar registro de uso";
    if(button){button.disabled=true;button.textContent="Apagando...";}
    try{
      if(typeof v46Rpc!=="function")throw new Error("backend_unavailable");
      await v46Rpc("ete_delete_request",{p_request_id:id});
      try{if(typeof toast==="function")toast("Registro de uso apagado. O notebook continua no inventário.");}catch(_){}
      await loadInventory();
    }catch(error){
      console.error("Falha ao apagar registro de uso:",error);
      try{if(typeof toast==="function")toast("Não foi possível apagar o registro de uso.");}catch(_){}
    }finally{
      deleteBusy.delete(id);
      if(button?.isConnected){button.disabled=false;button.textContent=old;}
    }
  }

  function installOverride(){
    if(overrideInstalled)return true;
    try{
      if(typeof renderComputers!=="function")return false;
      const replacement=function(){renderInventory();};
      replacement.__inventoryView=true;
      renderComputers=replacement;
      overrideInstalled=true;
      renderInventory();
      return true;
    }catch(_){return false;}
  }

  function bindPageEvents(){
    const grid=document.querySelector("#computerGrid");
    if(grid&&grid.dataset.inventoryViewBound!=="1"){
      grid.dataset.inventoryViewBound="1";
      grid.addEventListener("click",event=>{
        const button=event.target.closest?.("[data-inventory-delete-request]");
        if(!button)return;
        event.preventDefault();
        event.stopImmediatePropagation();
        void deleteUsage(button.dataset.inventoryDeleteRequest,button);
      },true);
    }
  }

  function start(){
    ensureStyles();
    updatePageCopy();
    bindPageEvents();
    installOverride();
    if(authenticated())void loadInventory();

    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      bindPageEvents();
      const ready=installOverride();
      if(authenticated()&&!loaded&&!loading)void loadInventory();
      if((ready&&loaded)||tries>=80)clearInterval(timer);
    },100);

    const authObserver=new MutationObserver(()=>{
      if(authenticated()){
        installOverride();
        void loadInventory();
      }else{
        removeRealtime();
        loaded=false;
        inventory=[];
        relationByRequest.clear();
      }
    });
    authObserver.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});

    window.addEventListener("pageshow",()=>{if(authenticated())void loadInventory();});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.ETENotebookInventoryView=Object.freeze({reload:loadInventory,render:renderInventory});
})();
