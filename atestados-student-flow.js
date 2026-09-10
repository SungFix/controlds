(function initAtestadosRegisteredStudentFlow(){
  "use strict";

  const STYLE_ID="atRegisteredStudentFlowStyles";
  const VALID_ROOMS=new Set(["1º DS A","1º DS B","2º DS A","2º DS B","1º EDF A","1º EDF B","2º EDF A","2º EDF B","3º EDF A","3º EDF B","3º GTU"]);
  let scanQueued=false;

  function currentStudents(){
    try{
      return Array.isArray(students)
        ? students.filter(item=>item&&item.id!=null&&String(item.name||"").trim())
        : [];
    }catch(_){return [];}
  }

  function normalizeText(value){return String(value||"").trim().toLocaleLowerCase("pt-BR");}

  function studentRoom(student){
    const course=String(student?.course||"").trim().toUpperCase();
    const className=String(student?.className||"").replace(/º/g,"°").replace(/\s+/g,"").trim().toUpperCase();
    if(course==="GTU"||className.includes("GTU"))return "3º GTU";
    let match=className.match(/^([123])°?([AB])$/);
    if(match&&(course==="DS"||course==="EDF"))return `${match[1]}º ${course} ${match[2]}`;
    match=className.match(/^([123])°?(DS|EDF)([AB])$/);
    if(match)return `${match[1]}º ${match[2]} ${match[3]}`;
    return "";
  }

  function studentMeta(student){
    const className=String(student?.className||"").replace(/º/g,"°").trim();
    const course=String(student?.course||"").trim().toUpperCase();
    return [className,course].filter(Boolean).join(" · ")||"Turma não informada";
  }

  function initials(name){
    return String(name||"?").trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()||"").join("")||"?";
  }

  function ensureStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      .ete-atestados #atForm.at-student-flow-active>.at-student-legacy{display:none!important}
      .at-app-content .at-form-card{max-width:none!important;width:100%!important}
      .ete-atestados #atForm.at-student-flow-active{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-auto-flow:row dense!important;align-items:start!important;width:100%!important}
      .ete-atestados #atForm.at-student-flow-active>.at-student-flow-picker{grid-column:1/-1!important}
      .ete-atestados #atForm.at-student-flow-active>.at-field:has(#atDate),
      .ete-atestados #atForm.at-student-flow-active>.at-field:has(.at-choice-grid){grid-column:auto!important}
      .ete-atestados #atForm.at-student-flow-active>.at-time-grid,
      .ete-atestados #atForm.at-student-flow-active>.at-reason-picker,
      .ete-atestados #atForm.at-student-flow-active>.at-dependent-field,
      .ete-atestados #atForm.at-student-flow-active>.at-form-actions{grid-column:1/-1!important}
      .ete-atestados #atForm.at-student-flow-active>.at-form-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:12px!important;width:100%!important}
      .ete-atestados #atForm.at-student-flow-active>.at-form-actions .at-btn{width:100%!important;margin:0!important}
      .at-student-flow-picker{display:grid;gap:6px;min-width:0;position:relative;z-index:18}
      .at-student-flow-picker>label{color:#919aa4;font-size:8.5px;font-weight:850}
      .at-student-trigger-wrap{position:relative;min-width:0}
      .at-student-trigger{width:100%;min-height:58px;padding:9px 15px;border:1px solid #333941;border-radius:13px;background:#101216;color:#eef1f4;display:flex;align-items:center;justify-content:space-between;gap:12px;font:inherit;text-align:left;cursor:pointer;transition:border-color .14s ease,background .14s ease,box-shadow .14s ease}
      .at-student-trigger:hover,.at-student-trigger[aria-expanded="true"]{border-color:#555e69;background:#14181d;box-shadow:0 0 0 3px rgba(125,135,146,.09)}
      .at-student-trigger-copy{display:grid;gap:4px;min-width:0}
      .at-student-trigger-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eef1f4;font-size:11px;line-height:1.2}
      .at-student-trigger-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#717b84;font-size:8.7px;font-weight:700}
      .at-student-trigger-arrow{width:18px;height:18px;flex:0 0 18px;display:grid;place-items:center;color:#8093a1;transition:transform .18s ease}
      .at-student-trigger-arrow:before{content:"⌄";font-size:18px;line-height:1;transform:translateY(-2px)}
      .at-student-trigger[aria-expanded="true"] .at-student-trigger-arrow{transform:rotate(180deg)}
      .at-student-panel{position:absolute;left:0;right:0;top:calc(100% + 7px);z-index:45;border:1px solid #333941;border-radius:13px;background:#101216;box-shadow:0 20px 52px rgba(0,0,0,.46);overflow:hidden;transform-origin:top center;animation:atStudentReveal .2s cubic-bezier(.22,.8,.32,1) both}
      .at-student-panel[hidden]{display:none!important}
      .at-student-search-box{padding:9px;border-bottom:1px solid #252b31;background:#111419}
      .at-student-search-box input{width:100%!important;min-height:44px!important;margin:0!important}
      .at-student-options{max-height:300px;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:7px}
      .at-student-option{min-width:0;min-height:58px;padding:9px 10px;border:1px solid transparent;border-radius:10px;background:transparent;color:#dfe4e8;display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;align-items:center;font:inherit;text-align:left;cursor:pointer;transition:background .12s ease,border-color .12s ease,transform .12s ease}
      .at-student-option:hover,.at-student-option:focus-visible{background:#181d22;border-color:#303841;outline:none;transform:translateY(-1px)}
      .at-student-avatar{width:34px;height:34px;display:grid;place-items:center;border:1px solid #303941;border-radius:10px;background:#15191e;color:#aab4bc;font-size:8.7px;font-weight:900}
      .at-student-option-copy{min-width:0;display:grid;gap:3px}
      .at-student-option-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eef2f4;font-size:10px}
      .at-student-option-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#737e87;font-size:8.3px}
      .at-student-empty{grid-column:1/-1;min-height:84px;padding:18px;display:grid;place-items:center;text-align:center;color:#77828b;font-size:9px}
      .at-student-help{color:#65717a;font-size:8px;line-height:1.4}
      .at-student-help.error{color:#d98d95}
      html[data-theme="light"] .at-student-trigger{background:#fff;border-color:#cad7de;color:#22323b}
      html[data-theme="light"] .at-student-trigger:hover,html[data-theme="light"] .at-student-trigger[aria-expanded="true"]{background:#f8fbfc;border-color:#7897ad;box-shadow:0 0 0 3px rgba(120,151,173,.09)}
      html[data-theme="light"] .at-student-trigger-copy strong{color:#22323b}
      html[data-theme="light"] .at-student-trigger-copy small{color:#687b86}
      html[data-theme="light"] .at-student-panel{background:#fff;border-color:#cedbe2;box-shadow:0 18px 38px rgba(42,62,74,.14)}
      html[data-theme="light"] .at-student-search-box{background:#f8fafb;border-color:#e4ebee}
      html[data-theme="light"] .at-student-option{color:#50636e}
      html[data-theme="light"] .at-student-option:hover,html[data-theme="light"] .at-student-option:focus-visible{background:#f2f6f8;border-color:#d9e3e8}
      html[data-theme="light"] .at-student-avatar{background:#eef4f7;border-color:#cfdae0;color:#4d687a}
      html[data-theme="light"] .at-student-option-copy strong{color:#243640}
      html[data-theme="light"] .at-student-option-copy small{color:#6b7b84}
      @keyframes atStudentReveal{from{opacity:0;transform:translateY(-8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
      @media(max-width:900px){
        .ete-atestados #atForm.at-student-flow-active{grid-template-columns:1fr!important}
        .ete-atestados #atForm.at-student-flow-active>.at-field:has(#atDate),
        .ete-atestados #atForm.at-student-flow-active>.at-field:has(.at-choice-grid),
        .ete-atestados #atForm.at-student-flow-active>.at-student-flow-picker,
        .ete-atestados #atForm.at-student-flow-active>.at-time-grid,
        .ete-atestados #atForm.at-student-flow-active>.at-reason-picker,
        .ete-atestados #atForm.at-student-flow-active>.at-dependent-field,
        .ete-atestados #atForm.at-student-flow-active>.at-form-actions{grid-column:1!important}
      }
      @media(max-width:700px){.at-student-options{grid-template-columns:1fr}}
      @media(max-width:520px){
        .ete-atestados #atForm.at-student-flow-active>.at-form-actions{grid-template-columns:1fr!important}
        .at-student-trigger{min-height:54px;padding:8px 12px}
        .at-student-panel{left:-2px;right:-2px}
      }
      @media(prefers-reduced-motion:reduce){.at-student-panel{animation:none!important}.at-student-trigger-arrow{transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function closePicker(picker){
    if(!picker)return;
    const panel=picker.querySelector(".at-student-panel");
    const trigger=picker.querySelector(".at-student-trigger");
    picker.classList.remove("open");
    if(panel)panel.hidden=true;
    if(trigger)trigger.setAttribute("aria-expanded","false");
  }

  function buildOption(student){
    const button=document.createElement("button");
    button.type="button";
    button.className="at-student-option";
    button.dataset.atStudentId=String(student.id);

    const avatar=document.createElement("span");
    avatar.className="at-student-avatar";
    avatar.textContent=initials(student.name);

    const copy=document.createElement("span");
    copy.className="at-student-option-copy";
    const name=document.createElement("strong");
    name.textContent=String(student.name||"").trim();
    const meta=document.createElement("small");
    meta.textContent=studentMeta(student);
    copy.append(name,meta);
    button.append(avatar,copy);
    return button;
  }

  function enhanceForm(form){
    if(!form||form.dataset.atStudentFlowReady==="1")return;
    const legacyInput=form.querySelector("#atStudent");
    const legacyField=legacyInput?.closest(".at-field");
    const roomPicker=form.querySelector(".at-room-picker");
    if(!legacyInput||!legacyField||!roomPicker)return;

    form.dataset.atStudentFlowReady="1";
    form.classList.add("at-student-flow-active");
    legacyInput.required=false;
    legacyInput.tabIndex=-1;
    legacyInput.setAttribute("aria-hidden","true");
    legacyField.classList.add("at-student-legacy");
    legacyField.setAttribute("aria-hidden","true");
    roomPicker.classList.add("at-student-legacy");
    roomPicker.setAttribute("aria-hidden","true");
    form.querySelectorAll('input[name="atClass"]').forEach(input=>{input.required=false;input.tabIndex=-1;});

    const picker=document.createElement("div");
    picker.className="at-student-flow-picker";
    picker.innerHTML='<label>Aluno</label><div class="at-student-trigger-wrap"><button type="button" class="at-student-trigger" aria-expanded="false" aria-haspopup="listbox"><span class="at-student-trigger-copy"><strong>Selecionar aluno</strong><small>Pesquise por nome ou turma</small></span><span class="at-student-trigger-arrow" aria-hidden="true"></span></button><div class="at-student-panel" hidden><div class="at-student-search-box"><input class="at-input at-student-search" type="search" autocomplete="off" placeholder="Buscar por nome ou turma" aria-label="Buscar aluno cadastrado"></div><div class="at-student-options" role="listbox"></div></div></div><small class="at-student-help">Nome e turma serão preenchidos automaticamente.</small>';
    legacyField.before(picker);

    const trigger=picker.querySelector(".at-student-trigger");
    const panel=picker.querySelector(".at-student-panel");
    const search=picker.querySelector(".at-student-search");
    const options=picker.querySelector(".at-student-options");
    const selectedName=picker.querySelector(".at-student-trigger-copy strong");
    const selectedMeta=picker.querySelector(".at-student-trigger-copy small");
    const help=picker.querySelector(".at-student-help");

    function listStudents(query){
      const q=normalizeText(query);
      const list=currentStudents().filter(student=>{
        if(!q)return true;
        return normalizeText([student.name,student.className,student.course,studentRoom(student)].join(" ")).includes(q);
      }).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"pt-BR",{sensitivity:"base"}));
      options.textContent="";
      if(!list.length){
        const empty=document.createElement("div");
        empty.className="at-student-empty";
        empty.textContent=currentStudents().length?"Nenhum aluno encontrado.":"Nenhum aluno cadastrado disponível.";
        options.appendChild(empty);
        return;
      }
      list.forEach(student=>options.appendChild(buildOption(student)));
    }

    function open(){
      document.querySelectorAll(".at-student-flow-picker.open").forEach(other=>{if(other!==picker)closePicker(other);});
      panel.hidden=false;
      picker.classList.add("open");
      trigger.setAttribute("aria-expanded","true");
      listStudents(search.value);
      requestAnimationFrame(()=>search.focus());
    }

    trigger.addEventListener("click",event=>{
      event.preventDefault();
      picker.classList.contains("open")?closePicker(picker):open();
    });
    search.addEventListener("input",()=>listStudents(search.value));
    options.addEventListener("click",event=>{
      const option=event.target.closest("[data-at-student-id]");
      if(!option)return;
      const student=currentStudents().find(item=>String(item.id)===String(option.dataset.atStudentId));
      if(!student)return;
      const room=studentRoom(student);
      const roomInput=[...form.querySelectorAll('input[name="atClass"]')].find(input=>input.value===room);
      if(!room||!VALID_ROOMS.has(room)||!roomInput){
        help.textContent="A turma cadastrada desse aluno não está disponível no Atestados.";
        help.classList.add("error");
        return;
      }

      form.dataset.atSelectedStudentId=String(student.id);
      legacyInput.value=String(student.name||"").trim();
      form.querySelectorAll('input[name="atClass"]').forEach(input=>{input.checked=input===roomInput;});
      roomInput.dispatchEvent(new Event("change",{bubbles:true}));
      selectedName.textContent=String(student.name||"").trim();
      selectedMeta.textContent=studentMeta(student);
      trigger.classList.add("has-value");
      help.textContent="Aluno selecionado. A turma foi preenchida automaticamente.";
      help.classList.remove("error");
      search.value="";
      closePicker(picker);
    });

    form.addEventListener("submit",event=>{
      if(form.dataset.atSelectedStudentId)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      help.textContent="Selecione um aluno cadastrado antes de salvar.";
      help.classList.add("error");
      trigger.focus();
    },true);

    listStudents("");
  }

  function scan(){
    ensureStyles();
    document.querySelectorAll(".ete-atestados #atForm").forEach(enhanceForm);
  }

  function queueScan(){
    if(scanQueued)return;
    scanQueued=true;
    requestAnimationFrame(()=>{scanQueued=false;scan();});
  }

  document.addEventListener("click",event=>{
    document.querySelectorAll(".at-student-flow-picker.open").forEach(picker=>{if(!picker.contains(event.target))closePicker(picker);});
  },true);
  document.addEventListener("keydown",event=>{
    if(event.key!=="Escape")return;
    document.querySelectorAll(".at-student-flow-picker.open").forEach(closePicker);
  });

  const observer=new MutationObserver(records=>{
    if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1)))queueScan();
  });

  function start(){
    scan();
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
  window.addEventListener("pageshow",queueScan);
})();
