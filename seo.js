(function initControlDsSeo(){
  "use strict";

  const head = document.head;
  if (!head) return;

  document.title = "Control Ds | Controle de Notebooks ETE";

  function ensureMeta(name, content, property){
    const selector = property ? 'meta[property="' + name + '"]' : 'meta[name="' + name + '"]';
    let meta = head.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute(property ? "property" : "name", name);
      head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }

  function ensureLink(rel, href){
    let link = head.querySelector('link[rel="' + rel + '"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      head.appendChild(link);
    }
    link.href = href;
  }

  const canonical = "https://sungfix.github.io/ete-controle-notebooks/";
  const description = "Control Ds é o sistema da ETE para controle de notebooks, pedidos, retiradas, devoluções e permissões de estudantes.";

  ensureMeta("description", description);
  ensureMeta("keywords", "Control Ds, ETE, controle de notebooks, notebooks ETE, pedidos de notebook");
  ensureMeta("robots", "index, follow");
  ensureMeta("og:title", "Control Ds | Controle de Notebooks ETE", true);
  ensureMeta("og:description", description, true);
  ensureMeta("og:type", "website", true);
  ensureMeta("og:url", canonical, true);
  ensureLink("canonical", canonical);
})();
