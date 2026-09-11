(function initAtestadosReportPies(){
  "use strict";

  const ROOT_SELECTOR="#eteAtestadosRoot";
  const MAX_SLICES=6;
  let observer=null;
  let scanQueued=false;

  function numberFrom(value){
    const match=String(value||"").replace(/\./g,"").match(/\d+/);
    return match?Number(match[0]):0;
  }

  function readItems(chart){
    const classRows=Array.from(chart.querySelectorAll(".at-class-chart-row"));
    if(classRows.length){
      return classRows.map(row=>({
        name:String(row.querySelector("strong")?.textContent||"Não informado").trim(),
        count:numberFrom(row.querySelector("b")?.textContent||row.querySelector("small")?.textContent)
      })).filter(item=>item.count>0);
    }

    const reportRows=Array.from(chart.querySelectorAll(".at-report-row"));
    return reportRows.map(row=>({
      name:String(row.querySelector("strong")?.textContent||"Não informado").trim(),
      count:numberFrom(row.querySelector("small")?.textContent)
    })).filter(item=>item.count>0);
  }

  function groupItems(items,otherLabel){
    const sorted=items.slice().sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,"pt-BR"));
    if(sorted.length<=MAX_SLICES)return sorted;
    const visible=sorted.slice(0,MAX_SLICES-1);
    const rest=sorted.slice(MAX_SLICES-1).reduce((sum,item)=>sum+item.count,0);
    visible.push({name:otherLabel,count:rest});
    return visible;
  }

  function percent(value,total){
    if(!total)return "0%";
    const result=value/total*100;
    return new Intl.NumberFormat("pt-BR",{maximumFractionDigits:1}).format(result)+"%";
  }

  function gradient(items,total){
    let cursor=0;
    const stops=items.map((item,index)=>{
      const start=cursor;
      cursor+=total?item.count/total*100:0;
      const end=index===items.length-1?100:cursor;
      return `var(--at-pie-${index%8+1}) ${start.toFixed(3)}% ${end.toFixed(3)}%`;
    });
    return `conic-gradient(${stops.join(",")})`;
  }

  function createLegendItem(item,index,total,unit){
    const row=document.createElement("li");
    row.className="at-pie-report-item";

    const swatch=document.createElement("span");
    swatch.className="at-pie-report-swatch";
    swatch.style.background=`var(--at-pie-${index%8+1})`;
    swatch.setAttribute("aria-hidden","true");

    const copy=document.createElement("span");
    copy.className="at-pie-report-copy";
    const name=document.createElement("strong");
    name.textContent=item.name;
    const count=document.createElement("small");
    count.textContent=`${item.count} ${unit}${item.count===1?"":"s"}`;
    copy.append(name,count);

    const share=document.createElement("b");
    share.textContent=percent(item.count,total);

    row.append(swatch,copy,share);
    return row;
  }

  function convert(chart){
    if(!chart?.isConnected)return;
    const items=readItems(chart);
    if(!items.length)return;

    const card=chart.closest(".at-card,.at-school-panel");
    if(!card)return;
    const title=String(card.querySelector(".at-card-head strong,.at-card-head h3,header h3")?.textContent||"Distribuição").trim();
    const reasonChart=/justific|motivo/i.test(title);
    const grouped=groupItems(items,reasonChart?"Outras justificativas":"Outras turmas");
    const total=grouped.reduce((sum,item)=>sum+item.count,0);
    if(!total)return;

    const unit=reasonChart?"seleção":"registro";
    const wrapper=document.createElement("div");
    wrapper.className="at-pie-report";
    wrapper.dataset.atPieReady="1";

    const visual=document.createElement("div");
    visual.className="at-pie-report-visual";
    const pie=document.createElement("div");
    pie.className="at-pie-report-graphic";
    pie.style.background=gradient(grouped,total);
    pie.setAttribute("role","img");
    pie.setAttribute("aria-label",title+": "+grouped.map(item=>`${item.name}, ${item.count}, ${percent(item.count,total)}`).join("; "));

    const totalBox=document.createElement("div");
    totalBox.className="at-pie-report-total";
    const totalNumber=document.createElement("strong");
    totalNumber.textContent=String(total);
    const totalLabel=document.createElement("span");
    totalLabel.textContent=reasonChart?(total===1?"justificativa selecionada":"justificativas selecionadas"):(total===1?"registro":"registros");
    totalBox.append(totalNumber,totalLabel);
    visual.append(pie,totalBox);

    const legend=document.createElement("ol");
    legend.className="at-pie-report-legend";
    grouped.forEach((item,index)=>legend.appendChild(createLegendItem(item,index,total,unit)));

    wrapper.append(visual,legend);
    chart.replaceWith(wrapper);
    card.classList.add("at-report-pie-card");

    const subtitle=card.querySelector(".at-card-head small,header p");
    if(subtitle){
      subtitle.textContent=reasonChart?"Percentual das justificativas selecionadas":"Percentual dos registros por turma";
    }
  }

  function scan(){
    scanQueued=false;
    const root=document.querySelector(ROOT_SELECTOR);
    if(!root)return;
    root.querySelectorAll(".at-report-grid-clean .at-class-chart,.at-report-grid .at-report-bars").forEach(convert);
  }

  function queueScan(){
    if(scanQueued)return;
    scanQueued=true;
    requestAnimationFrame(scan);
  }

  function start(){
    const root=document.querySelector(ROOT_SELECTOR);
    if(!root){setTimeout(start,120);return;}
    if(observer)observer.disconnect();
    observer=new MutationObserver(queueScan);
    observer.observe(root,{childList:true,subtree:true});
    scan();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
