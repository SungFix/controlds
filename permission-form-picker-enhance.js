(function(){
  "use strict";

  const GROUPS=[
    {value:"1°A DS",course:"Desenvolvimento de Sistemas",short:"1°A"},
    {value:"1°B DS",course:"Desenvolvimento de Sistemas",short:"1°B"},
    {value:"2°A DS",course:"Desenvolvimento de Sistemas",short:"2°A"},
    {value:"2°B DS",course:"Desenvolvimento de Sistemas",short:"2°B"},
    {value:"1°A EDF",course:"Edificações",short:"1°A"},
    {value:"1°B EDF",course:"Edificações",short:"1°B"},
    {value:"2°A EDF",course:"Edificações",short:"2°A"},
    {value:"2°B EDF",course:"Edificações",short:"2°B"}
  ];

  let selectedStudentId="";
  let mounted=false;

  function qs(selector,root){return (root||document).querySelector(selector);}
  function qsa(selector,root){return [...(root||document).querySelectorAll(selector)];}

  function escapeHtml(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function initials(name){
    const parts=String(name||"").trim().split(/\s+/).filter(Boolean);
    if(!parts.length) return "AL";
    return (parts[0][0]+(parts.length>1?parts[parts.length-1][0]:"")).toUpperCase();
  }

  function getStudents(){
    try{
      if(typeof students!=="undefined" && Array.isArray(students)) return students;
    }catch(_){ }
    return [];
  }

  function studentGroup(student){
    const className=String(student?.className||"").trim();
    const course=String(student?.course||"").trim();
    if(!course) return className;
    if(className.toLocaleLowerCase("pt-BR").endsWith(course.toLocaleLowerCase("pt-BR"))) return className;
    return (className+" "+course).trim();
  }

  function groupInfo(value){
    const exact=GROUPS.find(item=>item.value===value);
    if(exact) return exact;
    const raw=String(value||"").trim();
    const match=raw.match(/^(.*?)(?:\s+(DS|EDF))$/i);
    if(match){
      const code=match[2].toUpperCase();
      return {value:raw,short:match[1].trim(),course:code==="DS"?"Desenvolvimento de Sistemas":"Edificações"};
    }
    return {value:raw,short:raw||"Escolher turma",course:raw?"Turma selecionada":"Clique para escolher a turma"};
  }

  function setNativeValue(input,value){
    if(!input) return;
    input.value=value||"";
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  }

  function renderStudentList(query){
    const list=qs("#permissionSavedStudentList");
    if(!list) return;
    const q=String(query||"").trim().toLocaleLowerCase("pt-BR");
    const items=[...getStudents()]
      .filter(student=>{
        const hay=(String(student.name||"")+" "+String(student.className||"")+" "+String(student.course||"")).toLocaleLowerCase("pt-BR");
        return !q || hay.includes(q);
      })
      .sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"pt-BR"));

    list.innerHTML=items.length?items.map(student=>{
      const active=String(student.id)===String(selectedStudentId)?" active":"";
      return `<button type="button" class="student-option${active}" data-permission-student-id="${escapeHtml(student.id)}">
        <span class="student-option-avatar">${escapeHtml(initials(student.name))}</span>
        <span class="student-option-copy">
          <strong>${escapeHtml(student.name)}</strong>
          <small>${escapeHtml(studentGroup(student))}</small>
        </span>
      </button>`;
    }).join(""):`<div class="student-picker-empty">Nenhum aluno encontrado.</div>`;
  }

  function updateStudentTrigger(){
    const name=qs("#permissionSavedStudentName");
    const meta=qs("#permissionSavedStudentMeta");
    const student=getStudents().find(item=>String(item.id)===String(selectedStudentId));
    if(!student){
      selectedStudentId="";
      if(name) name.textContent="Escolher aluno salvo";
      if(meta) meta.textContent="Clique para procurar um aluno cadastrado";
      return;
    }
    if(name) name.textContent=student.name||"Aluno";
    if(meta) meta.textContent=studentGroup(student)||"Turma não informada";
  }

  function openStudentPicker(){
    const popup=qs("#permissionSavedStudentPopup");
    const trigger=qs("#permissionSavedStudentTrigger");
    if(!popup||!trigger) return;
    closeGroupPicker();
    popup.classList.add("open");
    trigger.classList.add("open");
    trigger.setAttribute("aria-expanded","true");
    const search=qs("#permissionSavedStudentSearch");
    if(search){
      search.value="";
      renderStudentList("");
      setTimeout(()=>search.focus(),0);
    }
  }

  function closeStudentPicker(){
    const popup=qs("#permissionSavedStudentPopup");
    const trigger=qs("#permissionSavedStudentTrigger");
    popup?.classList.remove("open");
    trigger?.classList.remove("open");
    trigger?.setAttribute("aria-expanded","false");
  }

  function selectStudent(id){
    const student=getStudents().find(item=>String(item.id)===String(id));
    if(!student) return;
    selectedStudentId=String(student.id);
    setNativeValue(qs("#permissionStudent"),student.name||"");
    setGroup(studentGroup(student));
    updateStudentTrigger();
    renderStudentList("");
    closeStudentPicker();
  }

  function renderGroupOptions(){
    const popup=qs("#permissionClassPopup");
    if(!popup) return;
    const sections=[
      ["Desenvolvimento de Sistemas · DS",GROUPS.filter(g=>g.value.endsWith(" DS"))],
      ["Edificações · EDF",GROUPS.filter(g=>g.value.endsWith(" EDF"))]
    ];
    popup.innerHTML=sections.map(([title,items])=>`<div class="group-course">
      <div class="group-course-title">${escapeHtml(title)}</div>
      <div class="group-options-grid">
        ${items.map(item=>`<button type="button" class="group-option" data-permission-group="${escapeHtml(item.value)}"><span>${escapeHtml(item.value)}</span><small>${escapeHtml(item.short.replace("°","º"))} ano · ${escapeHtml(item.value.includes("A ")?"A":"B")}</small></button>`).join("")}
      </div>
    </div>`).join("");
  }

  function updateGroupTrigger(value){
    const info=groupInfo(value);
    const badge=qs("#permissionClassBadge");
    const label=qs("#permissionClassLabel");
    const course=qs("#permissionClassCourse");
    if(badge) badge.textContent=info.short||"—";
    if(label) label.textContent=info.value||"Escolher turma";
    if(course) course.textContent=info.course||"Clique para escolher a turma";
    qsa("[data-permission-group]").forEach(button=>button.classList.toggle("active",button.dataset.permissionGroup===value));
  }

  function setGroup(value){
    const input=qs("#permissionClass");
    setNativeValue(input,value||"");
    updateGroupTrigger(value||"");
  }

  function openGroupPicker(){
    const popup=qs("#permissionClassPopup");
    const trigger=qs("#permissionClassTrigger");
    if(!popup||!trigger) return;
    closeStudentPicker();
    popup.classList.add("open");
    trigger.classList.add("open");
    trigger.setAttribute("aria-expanded","true");
  }

  function closeGroupPicker(){
    const popup=qs("#permissionClassPopup");
    const trigger=qs("#permissionClassTrigger");
    popup?.classList.remove("open");
    trigger?.classList.remove("open");
    trigger?.setAttribute("aria-expanded","false");
  }

  function resetEnhancement(){
    selectedStudentId="";
    updateStudentTrigger();
    renderStudentList("");
    const input=qs("#permissionClass");
    updateGroupTrigger(input?.value||"");
    closeStudentPicker();
    closeGroupPicker();
  }

  function buildUi(){
    const form=qs("#permissionForm");
    const studentInput=qs("#permissionStudent");
    const classInput=qs("#permissionClass");
    if(!form||!studentInput||!classInput||form.dataset.permissionPickerEnhanced==="1") return false;

    const grid=studentInput.closest(".simple-grid");
    const studentLabel=studentInput.closest("label");
    const classLabel=classInput.closest("label");
    if(!grid||!studentLabel||!classLabel) return false;

    const saved=document.createElement("div");
    saved.className="saved-student-box permission-saved-student-box full";
    saved.innerHTML=`
      <div class="saved-title">
        <strong>Usar aluno já cadastrado</strong>
        <small>opcional</small>
      </div>
      <div class="student-picker" id="permissionSavedStudentPicker">
        <button type="button" class="student-picker-trigger" id="permissionSavedStudentTrigger" aria-haspopup="listbox" aria-expanded="false">
          <div class="student-picker-main">
            <strong id="permissionSavedStudentName">Escolher aluno salvo</strong>
            <small id="permissionSavedStudentMeta">Clique para procurar um aluno cadastrado</small>
          </div>
          <span class="student-picker-chevron"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg></span>
        </button>
        <div class="student-picker-popup" id="permissionSavedStudentPopup">
          <div class="student-picker-search-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
            <input id="permissionSavedStudentSearch" class="student-picker-search" type="search" placeholder="Pesquisar aluno, turma ou curso..." autocomplete="off">
          </div>
          <div class="student-picker-list" id="permissionSavedStudentList" role="listbox"></div>
        </div>
      </div>
      <div class="student-hint">Ao escolher um aluno, o nome e a turma são preenchidos automaticamente.</div>`;
    grid.insertBefore(saved,studentLabel);

    const originalText=[...classLabel.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
    if(originalText) originalText.textContent="Turma / Sala\n";

    classInput.classList.add("permission-original-class-input");
    classInput.setAttribute("aria-hidden","true");
    classInput.tabIndex=-1;

    const picker=document.createElement("div");
    picker.className="group-picker permission-class-picker";
    picker.id="permissionClassPicker";
    picker.innerHTML=`
      <button type="button" class="group-picker-trigger" id="permissionClassTrigger" aria-haspopup="listbox" aria-expanded="false">
        <div class="group-picker-value">
          <span class="group-picker-badge" id="permissionClassBadge">—</span>
          <span class="group-picker-copy">
            <strong id="permissionClassLabel">Escolher turma</strong>
            <small id="permissionClassCourse">Clique para escolher a turma</small>
          </span>
        </div>
        <span class="group-picker-chevron"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg></span>
      </button>
      <div class="group-picker-popup" id="permissionClassPopup" role="listbox"></div>`;
    classLabel.appendChild(picker);
    renderGroupOptions();
    updateGroupTrigger(classInput.value||"");
    renderStudentList("");

    qs("#permissionSavedStudentTrigger")?.addEventListener("click",event=>{
      event.preventDefault(); event.stopPropagation();
      qs("#permissionSavedStudentPopup")?.classList.contains("open")?closeStudentPicker():openStudentPicker();
    });

    qs("#permissionSavedStudentSearch")?.addEventListener("input",event=>renderStudentList(event.target.value));

    qs("#permissionSavedStudentList")?.addEventListener("click",event=>{
      const option=event.target.closest("[data-permission-student-id]");
      if(!option) return;
      event.preventDefault();
      selectStudent(option.dataset.permissionStudentId);
    });

    qs("#permissionClassTrigger")?.addEventListener("click",event=>{
      event.preventDefault(); event.stopPropagation();
      qs("#permissionClassPopup")?.classList.contains("open")?closeGroupPicker():openGroupPicker();
    });

    qs("#permissionClassPopup")?.addEventListener("click",event=>{
      const option=event.target.closest("[data-permission-group]");
      if(!option) return;
      event.preventDefault();
      setGroup(option.dataset.permissionGroup);
      closeGroupPicker();
    });

    studentInput.addEventListener("input",()=>{
      const selected=getStudents().find(item=>String(item.id)===String(selectedStudentId));
      if(selected && String(studentInput.value).trim()!==String(selected.name||"").trim()){
        selectedStudentId="";
        updateStudentTrigger();
        renderStudentList(qs("#permissionSavedStudentSearch")?.value||"");
      }
    });

    classInput.addEventListener("invalid",event=>{
      event.preventDefault();
      qs("#permissionClassTrigger")?.focus();
      qs("#permissionClassPicker")?.classList.add("permission-picker-invalid");
    });
    classInput.addEventListener("change",()=>qs("#permissionClassPicker")?.classList.remove("permission-picker-invalid"));

    form.addEventListener("reset",()=>setTimeout(resetEnhancement,0));

    document.addEventListener("click",event=>{
      if(!event.target.closest("#permissionSavedStudentPicker")) closeStudentPicker();
      if(!event.target.closest("#permissionClassPicker")) closeGroupPicker();
    });

    document.addEventListener("keydown",event=>{
      if(event.key!=="Escape") return;
      closeStudentPicker();
      closeGroupPicker();
    });

    const modal=qs("#permissionModal");
    if(modal){
      const observer=new MutationObserver(()=>{
        if(modal.open) setTimeout(()=>{
          renderStudentList("");
          updateStudentTrigger();
          updateGroupTrigger(classInput.value||"");
        },0);
        else {closeStudentPicker();closeGroupPicker();}
      });
      observer.observe(modal,{attributes:true,attributeFilter:["open"]});
    }

    form.dataset.permissionPickerEnhanced="1";
    return true;
  }

  function start(){
    if(mounted) return;
    if(buildUi()){
      mounted=true;
      return;
    }
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(buildUi()||tries>=30){
        if(qs("#permissionForm")?.dataset.permissionPickerEnhanced==="1") mounted=true;
        clearInterval(timer);
      }
    },150);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
