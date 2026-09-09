(function simplifyNavigation(){
  "use strict";

  const NAV_LABELS = {
    home: "Início",
    agenda: "Agenda",
    permissions: "Autorizações",
    requests: "Solicitações",
    students: "Alunos",
    computers: "Notebooks",
    history: "Histórico"
  };

  const PAGE_TITLES = {
    home: "Início",
    permissions: "Autorizações",
    requests: "Solicitações",
    computers: "Notebooks"
  };

  function setButtonLabel(button, label){
    if (!button || !label) return;
    const icon = button.querySelector(".navicon");
    if (!icon) return;
    [...button.childNodes].forEach(function(node){
      if (node !== icon && node.nodeType === Node.TEXT_NODE) node.remove();
    });
    button.appendChild(document.createTextNode(label));
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function roleFromHeader(){
    const role = (document.querySelector("#headerUserRole")?.textContent || "").trim().toLowerCase();
    if (role.includes("monitor")) return "monitor";
    if (role.includes("diretor")) return "diretor";
    if (role.includes("administr")) return "adm";
    return "";
  }

  function applyProfileNavigation(){
    const role = roleFromHeader();
    const students = document.querySelector('[data-page="students"]');
    if (students) students.classList.toggle("role-hidden", role === "monitor");
  }

  function applyLabels(){
    document.querySelectorAll(".nav [data-page]").forEach(function(button){
      setButtonLabel(button, NAV_LABELS[button.dataset.page]);
    });

    Object.entries(PAGE_TITLES).forEach(function(entry){
      const page = entry[0];
      const label = entry[1];
      const heading = document.querySelector("#page-" + page + " .pagehead h1");
      if (heading) heading.textContent = label;
    });

    document.querySelectorAll('[data-page-jump="computers"]').forEach(function(button){
      if ((button.textContent || "").trim() === "Ver") return;
      if ((button.textContent || "").includes("Comput")) button.textContent = "Ver notebooks";
    });
  }

  function applyNavigation(){
    applyLabels();
    applyProfileNavigation();
  }

  let queued = false;
  function queueApply(){
    if (queued) return;
    queued = true;
    requestAnimationFrame(function(){
      queued = false;
      applyNavigation();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){
      applyNavigation();
      const headerRole = document.querySelector("#headerUserRole");
      if (headerRole) new MutationObserver(queueApply).observe(headerRole, {childList:true,subtree:true,characterData:true});
    }, {once:true});
  } else {
    applyNavigation();
    const headerRole = document.querySelector("#headerUserRole");
    if (headerRole) new MutationObserver(queueApply).observe(headerRole, {childList:true,subtree:true,characterData:true});
  }

  window.addEventListener("pageshow", queueApply);
})();

(function extendSchoolGroups(){
  "use strict";

  const EXTRA_GROUPS = [
    {value:"3°A EDF", label:"3°A EDF", detail:"3º ano · A", course:"Edificações"},
    {value:"3°B EDF", label:"3°B EDF", detail:"3º ano · B", course:"Edificações"},
    {value:"3°GTU", label:"3°GTU", detail:"3º ano", course:"Gestão de Turismo"}
  ];

  function addOptions(){
    document.querySelectorAll(".group-picker-popup").forEach(function(popup){
      if (popup.dataset.extraSchoolGroups === "1") return;
      const target = popup.querySelector("[data-group-target]")?.dataset.groupTarget;
      if (!target) return;
      const courses = popup.querySelectorAll(".group-course");
      const edf = [...courses].find(section => (section.querySelector(".group-course-title")?.textContent || "").includes("EDF"));
      const edfGrid = edf?.querySelector(".group-options-grid");
      if (edfGrid) {
        EXTRA_GROUPS.slice(0,2).forEach(function(group){
          const button = document.createElement("button");
          button.type = "button";
          button.className = "group-option";
          button.dataset.groupTarget = target;
          button.dataset.groupValue = group.value;
          button.innerHTML = "<span>"+group.label+"</span><small>"+group.detail+"</small>";
          edfGrid.appendChild(button);
        });
      }
      const gtu = document.createElement("div");
      gtu.className = "group-course";
      gtu.innerHTML = '<div class="group-course-title">Gestão de Turismo · GTU</div><div class="group-options-grid"><button type="button" class="group-option" data-group-target="'+target+'" data-group-value="3°GTU"><span>3°GTU</span><small>3º ano</small></button></div>';
      popup.appendChild(gtu);
      popup.dataset.extraSchoolGroups = "1";
    });
  }

  if (typeof window.parseStudentGroup === "function" || typeof parseStudentGroup === "function") {
    parseStudentGroup = function(group){
      const text = String(group||"").trim().toUpperCase().replace(/º/g,"°");
      const gtu = text.match(/^3\s*°?\s*GTU$/);
      if (gtu) return {className:"3°",course:"GTU"};
      const m = text.match(/^([123])\s*°?\s*([AB])\s+(DS|EDF)$/);
      return {className:m?(m[1]+"°"+m[2]):"1°A",course:m?m[3]:"DS"};
    };
  }

  if (typeof groupCourseName === "function") {
    groupCourseName = function(value){
      const text=String(value||"").toUpperCase();
      if(text.endsWith("EDF")) return "Edificações";
      if(text.endsWith("GTU")) return "Gestão de Turismo";
      return "Desenvolvimento de Sistemas";
    };
  }

  if (typeof setGroupPickerValue === "function") {
    setGroupPickerValue = function(hiddenId,value){
      const allowed=["1°A DS","1°B DS","2°A DS","2°B DS","1°A EDF","1°B EDF","2°A EDF","2°B EDF","3°A EDF","3°B EDF","3°GTU"];
      const safe=allowed.includes(value)?value:"1°A DS";
      const input=document.getElementById(hiddenId);
      if(input)input.value=safe;
      const badge=document.getElementById(hiddenId+"Badge");
      const label=document.getElementById(hiddenId+"Label");
      const course=document.getElementById(hiddenId+"Course");
      if(badge)badge.textContent=safe==="3°GTU"?"3°":safe.split(/\s+/)[0];
      if(label)label.textContent=safe;
      if(course)course.textContent=groupCourseName(safe);
      document.querySelectorAll('[data-group-target="'+hiddenId+'"]').forEach(function(btn){btn.classList.toggle("active",btn.dataset.groupValue===safe);});
      if(hiddenId==="studentGroup" && typeof updateRequestSummary==="function")updateRequestSummary();
    };
  }

  addOptions();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addOptions,{once:true});
})();
