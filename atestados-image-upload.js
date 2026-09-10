(function initAtestadosImageUpload(){
  "use strict";

  const TABLE="ete_atestados_justified_absences";
  const BUCKET="atestados-images";
  const MAX_BYTES=6*1024*1024;
  const TYPES={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/heic":"heic","image/heif":"heif"};
  let scanQueued=false,previewUrl="",attachmentTimer=0;

  function client(){try{return typeof sb!=="undefined"?sb:null;}catch(_){return null;}}
  function currentUserId(){try{return String(currentUser?.userId||v46AuthUser?.id||"").trim();}catch(_){return"";}}
  function setStatus(text,error){
    const el=document.querySelector(".ete-atestados #atStatus");
    if(!el)return;
    el.textContent=text;
    el.classList.toggle("error",!!error);
    el.dataset.state=error?"error":(text==="Atualizado"?"ok":"loading");
  }
  function fmtBytes(bytes){return bytes<1048576?Math.max(1,Math.round(bytes/1024))+" KB":(bytes/1048576).toFixed(1).replace(".0","")+" MB";}
  function validate(file){
    if(!file)return"";
    if(!TYPES[file.type])return"Use uma imagem JPG, PNG, WEBP ou HEIC.";
    if(file.size>MAX_BYTES)return"A imagem deve ter no máximo 6 MB.";
    return"";
  }
  function revokePreview(){if(previewUrl){try{URL.revokeObjectURL(previewUrl);}catch(_){}previewUrl="";}}
  function clearPreview(form){
    revokePreview();
    const input=form?.querySelector("#atImage");
    const preview=form?.querySelector(".at-image-preview");
    const img=form?.querySelector(".at-image-preview img");
    const help=form?.querySelector(".at-image-upload-help");
    if(input)input.value="";
    if(preview)preview.hidden=true;
    if(img){img.removeAttribute("src");img.hidden=false;}
    if(help){help.textContent="JPG, PNG, WEBP ou HEIC · até 6 MB";help.classList.remove("error");}
  }
  function onFile(form){
    const input=form.querySelector("#atImage"),file=input?.files?.[0]||null;
    const preview=form.querySelector(".at-image-preview"),img=preview?.querySelector("img");
    const name=preview?.querySelector(".at-image-preview-name"),size=preview?.querySelector(".at-image-preview-size");
    const help=form.querySelector(".at-image-upload-help");
    revokePreview();
    if(!file){clearPreview(form);return;}
    const message=validate(file);
    if(message){input.value="";if(preview)preview.hidden=true;if(help){help.textContent=message;help.classList.add("error");}return;}
    if(name)name.textContent=file.name||"Imagem selecionada";
    if(size)size.textContent=fmtBytes(file.size);
    if(help){help.textContent="Imagem pronta para anexar ao registro.";help.classList.remove("error");}
    if(img){previewUrl=URL.createObjectURL(file);img.src=previewUrl;img.hidden=false;img.onerror=()=>{img.hidden=true;};}
    if(preview)preview.hidden=false;
  }
  function uploadField(){
    const wrap=document.createElement("section");
    wrap.className="at-image-upload-field";
    wrap.innerHTML='<div class="at-image-upload-head"><div><strong>Imagem do atestado</strong><small>Anexe uma foto ou digitalização do documento</small></div><span>Opcional</span></div><label class="at-image-drop" for="atImage"><span class="at-image-drop-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V5m0 0-4 4m4-4 4 4M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/></svg></span><span class="at-image-drop-copy"><strong>Adicionar imagem do atestado</strong><small>Toque ou clique para escolher uma imagem</small></span><span class="at-image-drop-action">Escolher imagem</span></label><input id="atImage" class="at-image-native" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"><small class="at-image-upload-help">JPG, PNG, WEBP ou HEIC · até 6 MB</small><div class="at-image-preview" hidden><div class="at-image-preview-thumb"><img alt="Prévia da imagem selecionada"></div><div class="at-image-preview-copy"><strong class="at-image-preview-name">Imagem selecionada</strong><small class="at-image-preview-size"></small></div><button type="button" class="at-image-remove">Remover</button></div>';
    return wrap;
  }
  function enhanceForm(form){
    if(!form||form.dataset.atImageUploadReady==="1")return;
    const actions=form.querySelector(".at-form-actions");
    if(!actions)return;
    form.dataset.atImageUploadReady="1";
    const field=uploadField();
    actions.before(field);
    field.querySelector("#atImage")?.addEventListener("change",()=>onFile(form));
    field.querySelector(".at-image-remove")?.addEventListener("click",()=>clearPreview(form));
  }
  function scan(){
    scanQueued=false;
    const form=document.querySelector(".ete-atestados #atForm");
    if(form)enhanceForm(form);
    scheduleAttachmentScan();
  }
  function queueScan(){if(scanQueued)return;scanQueued=true;requestAnimationFrame(scan);}

  function selectedReasonLabel(input){return input.closest(".at-reason-option")?.querySelector("strong")?.textContent?.trim()||input.value;}
  function uuidish(){try{return crypto.randomUUID();}catch(_){return Date.now().toString(36)+Math.random().toString(36).slice(2);}}
  async function authId(c){
    const known=currentUserId();
    if(known)return known;
    if(!c?.auth?.getUser)return"";
    const {data,error}=await c.auth.getUser();
    if(error)throw error;
    return String(data?.user?.id||"");
  }
  async function uploadFile(c,file){
    const uid=await authId(c);
    if(!uid)throw new Error("Sessão inválida para enviar a imagem.");
    const ext=TYPES[file.type],year=new Date().getFullYear();
    const path=uid+"/"+year+"/"+Date.now()+"-"+uuidish()+"."+ext;
    const {error}=await c.storage.from(BUCKET).upload(path,file,{cacheControl:"3600",contentType:file.type,upsert:false});
    if(error)throw error;
    return path;
  }
  async function removeFile(c,path){
    if(!path||!c?.storage)return;
    try{await c.storage.from(BUCKET).remove([path]);}catch(_){}
  }
  function rebuildToRecords(){
    const target=document.querySelector("#eteAtestadosRoot");
    if(!target||!window.ETEAtestados)return;
    try{window.ETEAtestados.unmount();window.ETEAtestados.mount(target);}catch(error){console.error("Atestados: falha ao atualizar após upload",error);return;}
    requestAnimationFrame(()=>target.querySelector('[data-at-tab="records"]')?.click());
  }
  async function saveWithImage(event,form,file){
    const c=client();
    if(!c?.storage){setStatus("Supabase indisponível",true);return;}
    if(!form.reportValidity())return;
    const student=form.querySelector("#atStudent")?.value.trim()||"";
    const selectedClass=form.querySelector('input[name="atClass"]:checked');
    if(!student||!selectedClass){setStatus("Selecione um aluno cadastrado",true);return;}
    const reasonInputs=[...form.querySelectorAll('input[name="atReason"]:checked')];
    if(!reasonInputs.length){setStatus("Selecione uma justificativa",true);return;}
    const scope=form.querySelector('input[name="atAbsenceScope"]:checked')?.value||"full_day";
    const start=scope==="partial"?form.querySelector("#atStartTime")?.value||"":null;
    const end=scope==="partial"?form.querySelector("#atEndTime")?.value||"":null;
    if(scope==="partial"&&(!start||!end||end<=start)){setStatus("Confira o horário da falta",true);return;}
    const codes=reasonInputs.map(input=>input.value);
    const projectName=codes.includes("projeto")?form.querySelector("#atProject")?.value.trim()||"":null;
    const reasonNote=codes.includes("outro")?form.querySelector("#atReasonNote")?.value.trim()||"":null;
    if(codes.includes("projeto")&&!projectName){setStatus("Informe o nome do projeto",true);return;}
    if(codes.includes("outro")&&!reasonNote){setStatus("Detalhe Outros/Casos Omissos",true);return;}
    const labels=reasonInputs.map(selectedReasonLabel);
    const readable=labels.map(label=>label==="Outros/Casos Omissos"&&reasonNote?label+": "+reasonNote:label).join(" · ");
    const button=form.querySelector('button[type="submit"]');
    if(button){button.disabled=true;button.setAttribute("aria-busy","true");button.textContent="Enviando imagem...";}
    let path="";
    try{
      path=await uploadFile(c,file);
      if(button)button.textContent="Salvando...";
      const payload={student_name:student,class_name:selectedClass.value,reason:readable,reason_codes:codes,reason_note:reasonNote||null,project_name:projectName||null,absence_date:form.querySelector("#atDate")?.value,absence_scope:scope,absence_start_time:start||null,absence_end_time:end||null,image_path:path};
      const {error}=await c.from(TABLE).insert(payload);
      if(error){await removeFile(c,path);throw error;}
      revokePreview();
      setStatus("Atualizado",false);
      rebuildToRecords();
    }catch(error){console.error("Atestados: falha ao salvar imagem",error);setStatus("Não foi possível salvar a imagem",true);}
    finally{if(button?.isConnected){button.disabled=false;button.removeAttribute("aria-busy");button.textContent="Salvar falta justificada";}}
  }
  function onSubmitCapture(event){
    const form=event.target?.closest?.(".ete-atestados #atForm");
    if(!form)return;
    const file=form.querySelector("#atImage")?.files?.[0]||null;
    if(!file)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const message=validate(file);
    if(message){setStatus(message,true);return;}
    saveWithImage(event,form,file);
  }

  async function openImage(path){
    const c=client();if(!c?.storage)return;
    setStatus("Abrindo imagem...");
    try{
      const {data,error}=await c.storage.from(BUCKET).createSignedUrl(path,120);
      if(error||!data?.signedUrl)throw error||new Error("URL temporária indisponível");
      let dialog=document.querySelector("#atImageViewerAddon");
      if(!dialog){dialog=document.createElement("dialog");dialog.id="atImageViewerAddon";dialog.className="at-image-viewer-addon";dialog.innerHTML='<div class="at-image-viewer-head"><strong>Imagem do atestado</strong><button type="button" aria-label="Fechar">×</button></div><div class="at-image-viewer-body"><img alt="Imagem anexada ao atestado"><a class="at-btn" target="_blank" rel="noopener">Abrir em nova aba</a></div>';document.body.appendChild(dialog);dialog.querySelector("button")?.addEventListener("click",()=>dialog.close());}
      dialog.querySelector("img").src=data.signedUrl;dialog.querySelector("a").href=data.signedUrl;dialog.showModal();setStatus("Atualizado",false);
    }catch(error){console.error("Atestados: falha ao abrir imagem",error);setStatus("Não foi possível abrir a imagem",true);}
  }
  async function refreshAttachmentButtons(){
    const rows=[...new Set([...document.querySelectorAll(".ete-atestados [data-at-delete]")].map(button=>button.closest("tr")).filter(Boolean))].filter(tr=>tr.dataset.atImageChecked!=="1");
    if(!rows.length)return;
    rows.forEach(tr=>tr.dataset.atImageChecked="1");
    const ids=rows.map(tr=>tr.querySelector("[data-at-delete]")?.dataset.atDelete).filter(Boolean);
    const c=client();if(!ids.length||!c)return;
    let q;try{q=c.from(TABLE).select("id,image_path");}catch(_){return;}
    if(typeof q?.in!=="function")return;
    const {data,error}=await q.in("id",ids);if(error)return;
    const map=new Map((data||[]).map(item=>[String(item.id),item.image_path]));
    rows.forEach(tr=>{const del=tr.querySelector("[data-at-delete]");const path=map.get(String(del?.dataset.atDelete));if(!path)return;const button=document.createElement("button");button.type="button";button.className="at-image-view-button";button.dataset.atImageView=path;button.textContent="Ver imagem";button.setAttribute("aria-label","Ver imagem anexada");del.before(button);});
  }
  function scheduleAttachmentScan(){clearTimeout(attachmentTimer);attachmentTimer=setTimeout(()=>refreshAttachmentButtons().catch(()=>{}),120);}
  async function cleanupAfterDelete(id,path){
    await new Promise(resolve=>setTimeout(resolve,650));
    const c=client();if(!c||!path)return;
    try{const q=c.from(TABLE).select("id").eq?.("id",id);if(!q||typeof q.maybeSingle!=="function")return;const {data,error}=await q.maybeSingle();if(!error&&!data)await removeFile(c,path);}catch(_){}
  }
  function onClickCapture(event){
    const view=event.target.closest?.("[data-at-image-view]");
    if(view){event.preventDefault();event.stopPropagation();openImage(view.dataset.atImageView);return;}
    const del=event.target.closest?.(".ete-atestados [data-at-delete]");
    if(del){const path=del.parentElement?.querySelector("[data-at-image-view]")?.dataset.atImageView;if(path)cleanupAfterDelete(del.dataset.atDelete,path);}
  }

  function start(){
    queueScan();
    document.addEventListener("submit",onSubmitCapture,true);
    document.addEventListener("click",onClickCapture,true);
    const observer=new MutationObserver(queueScan);
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
