(function initStudentListOrganizer(){
  "use strict";

  const state={course:"all",year:"all",room:"all",sort:"az",limit:"40"};
  let mounted=false;
  let applyQueued=false;

  function norm(value){return String(value||"").trim().toLocaleLowerCase("pt-BR")}
  function collate(a,b){return String(a||"").localeCompare(String(b||""),"pt-BR",{sensitivity:"base"})}
  function yearOf(student){const m=String(student?.className||"").match(/^([123])°/);return m?m[1]:""}
  function roomOf(student){
    if(String(student?.course||"").toUpperCase()==="GTU")return "GTU";
    const c=String(student?.className||"").toUpperCase();
    if(c.includes("A"))return "A";
    if(c.includes("B"))return "B";
    return "";
  }
  function recentValue(student){
    const value=Date.parse(student?.lastUsed||"");
    return Number.isFinite(value)?value:0;
  }

  function baseStudents(){
    const search=norm(document.getElementById("studentSearch")?.value);
    const source=Array.isArray(students)?students:[];
    return [...source]
      .filter(student=>norm(`${student?.name||""} ${student?.className||""} ${student?.course||""}`).includes(search))
      .sort((a,b)=>collate(a?.name,b?.name));
  }

  function ensureManagementActions(card,student){
    if(typeof canManageStudents!=="function"||!canManageStudents())return;
    const foot=card.querySelector(".student-card-foot");
    if(!foot)return;
    let actions=foot.querySelector(".v46-student-actions");
    if(!actions){
      actions=document.createElement("div");
      actions.className="row-actions v46-student-actions";
      const useButton=foot.querySelector("[data-use-student]");
      if(useButton)actions.append(useButton);
      foot.append(actions);
    }
    if(!actions.querySelector(`[data-edit-student="${CSS.escape(String(student.id))}"]`)){
      const edit=document.createElement("button");
      edit.type="button";
      edit.className="btn small secondary";
      edit.dataset.editStudent=String(student.id);
      edit.textContent="Editar";
      edit.title="Editar nome, turma ou curso";
      actions.append(edit);
    }
    if(!actions.querySelector(`[data-delete-student="${CSS.escape(String(student.id))}"]`)){
      const remove=document.createElement("button");
      remove.type="button";
      remove.className="btn small danger";
      remove.dataset.deleteStudent=String(student.id);
      remove.textContent="Remover";
      remove.title="Remover aluno e todos os dados ligados";
      actions.append(remove);
    }
  }

  function buildMappedCards(){
    const source=baseStudents();
    const byId=new Map(source.map(student=>[String(student.id||""),student]));
    const cards=[...document.querySelectorAll("#studentRows .student-card")];
    return cards.map((card,index)=>{
      const currentId=String(card.dataset.studentId||"");
      const student=(currentId&&byId.get(currentId))||source[index];
      if(student){
        card.dataset.studentId=String(student.id||"");
        card.dataset.studentCourse=String(student.course||"");
        card.dataset.studentYear=yearOf(student);
        card.dataset.studentRoom=roomOf(student);
        ensureManagementActions(card,student);
      }
      return {card,student};
    }).filter(item=>item.student);
  }

  function isMatch(student){
    if(state.course!=="all"&&String(student.course||"").toUpperCase()!==state.course)return false;
    if(state.year!=="all"&&yearOf(student)!==state.year)return false;
    if(state.room!=="all"&&roomOf(student)!==state.room)return false;
    return true;
  }

  function sortItems(items){
    const sorted=[...items];
    if(state.sort==="za")sorted.sort((a,b)=>collate(b.student.name,a.student.name));
    else if(state.sort==="recent")sorted.sort((a,b)=>recentValue(b.student)-recentValue(a.student)||collate(a.student.name,b.student.name));
    else sorted.sort((a,b)=>collate(a.student.name,b.student.name));
    return sorted;
  }

  function filterCount(){
    let count=0;
    if(state.course!=="all")count++;
    if(state.year!=="all")count++;
    if(state.room!=="all")count++;
    if(state.sort!=="az")count++;
    if(state.limit!=="40")count++;
    return count;
  }

  function updateFilterBadge(){
    const badge=document.querySelector(".student-filter-badge");
    const count=filterCount();
    if(!badge)return;
    badge.hidden=count===0;
    badge.textContent=String(count);
  }

  function updateStatus(visible,totalFiltered,totalRoster){
    const count=document.getElementById("studentListCount");
    const hint=document.getElementById("studentListScrollHint");
    if(count)count.innerHTML=`Exibindo <strong>${visible}</strong> de <strong>${totalFiltered}</strong> resultado${totalFiltered===1?"":"s"} · ${totalRoster} alunos no total`;
    const rows=document.getElementById("studentRows");
    if(hint)hint.textContent=rows&&rows.scrollHeight>rows.clientHeight?"Role dentro da lista para ver mais":"";
  }

  function apply(){
    applyQueued=false;
    const rows=document.getElementById("studentRows");
    if(!rows)return;

    const mapped=buildMappedCards();
    mapped.forEach(({card})=>{card.hidden=true;card.style.order=""});

    const filtered=sortItems(mapped.filter(({student})=>isMatch(student)));
    const limit=state.limit==="all"?filtered.length:Number(state.limit||40);
    const visible=filtered.slice(0,limit);
    visible.forEach(({card},index)=>{
      card.hidden=false;
      card.style.order=String(index);
      rows.appendChild(card);
    });

    updateFilterBadge();
    updateStatus(visible.length,filtered.length,Array.isArray(students)?students.length:0);

    try{window.dispatchEvent(new CustomEvent("student-list-updated",{detail:{visible:visible.length,filtered:filtered.length}}))}catch(_){ }
  }

  function queueApply(){
    if(applyQueued)return;
    applyQueued=true;
    requestAnimationFrame(apply);
  }

  function closePopover(){
    const pop=document.getElementById("studentFilterPopover");
    const button=document.getElementById("studentFilterButton");
    if(pop)pop.classList.remove("is-open");
    if(button)button.setAttribute("aria-expanded","false");
  }

  function togglePopover(){
    const pop=document.getElementById("studentFilterPopover");
    const button=document.getElementById("studentFilterButton");
    if(!pop||!button)return;
    const open=!pop.classList.contains("is-open");
    pop.classList.toggle("is-open",open);
    button.setAttribute("aria-expanded",String(open));
  }

  function resetFilters(){
    Object.assign(state,{course:"all",year:"all",room:"all",sort:"az",limit:"40"});
    document.querySelectorAll("[data-student-filter]").forEach(select=>{
      const key=select.dataset.studentFilter;
      if(key in state)select.value=state[key];
    });
    const rows=document.getElementById("studentRows");
    if(rows)rows.scrollTop=0;
    queueApply();
  }

  function mountControls(){
    if(mounted)return;
    const toolbar=document.querySelector("#page-students .student-toolbar");
    const search=document.getElementById("studentSearch");
    const rows=document.getElementById("studentRows");
    if(!toolbar||!search||!rows)return;

    ["newStudentBtn","newStudentBtn2","newStudentFromRequest"].forEach(id=>{
      const button=document.getElementById(id);
      if(!button)return;
      button.hidden=true;
      button.classList.add("role-hidden");
      button.setAttribute("aria-hidden","true");
      button.tabIndex=-1;
    });

    const page=document.getElementById("page-students");
    const description=page?.querySelector(".pagehead p");
    if(description)description.textContent="Consulte a listagem oficial de alunos, filtre por turma e encontre rapidamente quem você precisa.";

    const wrap=document.createElement("div");
    wrap.className="student-filter-wrap";
    wrap.innerHTML=`
      <button type="button" class="student-filter-button" id="studentFilterButton" aria-expanded="false" aria-controls="studentFilterPopover">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
        <span class="student-filter-label">Filtros</span>
        <span class="student-filter-badge" hidden>0</span>
      </button>
      <div class="student-filter-popover" id="studentFilterPopover" role="dialog" aria-label="Filtros de alunos">
        <div class="student-filter-head"><div><strong>Filtrar alunos</strong><small>Combine os filtros para reduzir a lista.</small></div></div>
        <div class="student-filter-grid">
          <label class="student-filter-field">Curso
            <select data-student-filter="course"><option value="all">Todos</option><option value="DS">DS</option><option value="EDF">EDF</option><option value="GTU">GTU</option></select>
          </label>
          <label class="student-filter-field">Turma / ano
            <select data-student-filter="year"><option value="all">Todas</option><option value="1">1º ano</option><option value="2">2º ano</option><option value="3">3º ano</option></select>
          </label>
          <label class="student-filter-field">Sala
            <select data-student-filter="room"><option value="all">Todas</option><option value="A">Sala A</option><option value="B">Sala B</option><option value="GTU">GTU</option></select>
          </label>
          <label class="student-filter-field">Ordem
            <select data-student-filter="sort"><option value="az">A → Z</option><option value="za">Z → A</option><option value="recent">Recentes</option></select>
          </label>
          <label class="student-filter-field">Número de registros
            <select data-student-filter="limit"><option value="20">20</option><option value="40" selected>40</option><option value="80">80</option><option value="all">Todos</option></select>
          </label>
        </div>
        <div class="student-filter-footer"><button type="button" class="student-filter-reset" id="studentFilterReset">Limpar filtros</button><small>“Recentes” considera o último uso registrado.</small></div>
      </div>`;
    toolbar.append(wrap);

    const status=document.createElement("div");
    status.className="student-list-status";
    status.innerHTML='<span id="studentListCount"></span><span class="student-list-scroll-hint" id="studentListScrollHint"></span>';
    toolbar.insertAdjacentElement("afterend",status);

    document.getElementById("studentFilterButton")?.addEventListener("click",event=>{event.stopPropagation();togglePopover()});
    document.getElementById("studentFilterPopover")?.addEventListener("click",event=>event.stopPropagation());
    document.getElementById("studentFilterReset")?.addEventListener("click",resetFilters);
    document.querySelectorAll("[data-student-filter]").forEach(select=>select.addEventListener("change",()=>{
      const key=select.dataset.studentFilter;
      if(key in state)state[key]=select.value;
      rows.scrollTop=0;
      queueApply();
    }));
    search.addEventListener("input",()=>requestAnimationFrame(queueApply));
    document.addEventListener("click",closePopover);
    document.addEventListener("keydown",event=>{if(event.key==="Escape")closePopover()});

    mounted=true;
  }

  function wrapRender(){
    if(typeof renderStudents!=="function"||renderStudents.__studentOrganizerWrapped)return;
    const base=renderStudents;
    const wrapped=function(){
      const result=base.apply(this,arguments);
      queueApply();
      return result;
    };
    wrapped.__studentOrganizerWrapped=true;
    renderStudents=wrapped;
  }

  function install(){
    mountControls();
    wrapRender();
    queueApply();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
  window.addEventListener("pageshow",queueApply);
  window.addEventListener("control-theme-change",queueApply);
})();
