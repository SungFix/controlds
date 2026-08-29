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

    // O monitor continua com acesso às áreas operacionais. A lista administrativa
    // de alunos sai apenas do menu para reduzir ruído; nenhuma função é removida.
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
