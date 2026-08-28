import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const axeSource=fs.readFileSync(path.resolve('node_modules/axe-core/axe.min.js'),'utf8');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.evaluate(()=>{
  const now=new Date().toISOString();
  const today=recifeDateKey();
  v46AuthUser={id:'contrast-adm'};
  currentUser={username:'audit',displayName:'Auditor',role:'adm',roleLabel:'Administrador',userId:'contrast-adm'};
  appReady=true;
  students=[normalizeStudent({id:'st-1',name:'Ana Beatriz',className:'1°A',course:'DS',useCount:7,lastUsed:now})];
  data=[normalizeRequest({id:'rq-wait',student:'Ana Beatriz',studentName:'Ana Beatriz',studentClass:'1°A',studentCourse:'DS',studentId:'st-1',room:'1°A DS',reason:'Atividade de programação',startTime:'10:20',endTime:'11:10',time:'10:20–11:10',dateKey:today,status:'wait',requestedBy:'audit',requestedById:'contrast-adm',requestedByLabel:'Auditor',createdAt:now})];
  permissions=[];
  history=[];
  setAuthLocked(false); setCurrentUser(currentUser); render();
  if(window.ControlTheme?.set) window.ControlTheme.set('light');
  else document.documentElement.dataset.theme='light';
});
await page.waitForTimeout(150);
await page.addScriptTag({content:axeSource});
const nodes=await page.evaluate(async()=>{
  const result=await axe.run(document,{runOnly:{type:'rule',values:['color-contrast']},resultTypes:['violations']});
  return (result.violations[0]?.nodes||[]).map(n=>({
    target:n.target,
    html:n.html,
    failure:n.failureSummary,
    data:n.any?.map(x=>x.data)||[]
  }));
});
console.log('CONTRAST NODE COUNT:',nodes.length);
for(const [i,n] of nodes.entries()){
  console.log(`NODE ${i+1}`);
  console.log('TARGET:',JSON.stringify(n.target));
  console.log('HTML:',n.html);
  console.log('FAILURE:',n.failure);
  console.log('DATA:',JSON.stringify(n.data));
}
await browser.close();
if(nodes.length) process.exit(2);
