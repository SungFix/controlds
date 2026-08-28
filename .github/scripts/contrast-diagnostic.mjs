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
  students=[
    normalizeStudent({id:'st-1',name:'Ana Beatriz',className:'1°A',course:'DS',useCount:7,lastUsed:now}),
    normalizeStudent({id:'st-2',name:'Lucas Henrique',className:'2°B',course:'EDF',useCount:3,lastUsed:now})
  ];
  data=[
    normalizeRequest({id:'rq-wait',student:'Ana Beatriz',studentName:'Ana Beatriz',studentClass:'1°A',studentCourse:'DS',studentId:'st-1',room:'1°A DS',reason:'Atividade de programação',startTime:'10:20',endTime:'11:10',time:'10:20–11:10',dateKey:today,status:'wait',requestedBy:'audit',requestedById:'contrast-adm',requestedByLabel:'Auditor',createdAt:now}),
    normalizeRequest({id:'rq-use',student:'Lucas Henrique',studentName:'Lucas Henrique',studentClass:'2°B',studentCourse:'EDF',studentId:'st-2',room:'2°B EDF',reason:'Pesquisa escolar',startTime:'08:20',endTime:'09:10',time:'08:20–09:10',dateKey:today,status:'use',code:'123456',requestedBy:'audit',requestedById:'contrast-adm',requestedByLabel:'Auditor',createdAt:now,pickedAt:now,pickedBy:'Monitor'}),
    normalizeRequest({id:'rq-done',student:'Ana Beatriz',studentName:'Ana Beatriz',studentClass:'1°A',studentCourse:'DS',studentId:'st-1',room:'1°A DS',reason:'Trabalho em grupo',startTime:'13:00',endTime:'13:50',time:'13:00–13:50',dateKey:today,status:'done',code:'987654321',requestedBy:'audit',requestedById:'contrast-adm',requestedByLabel:'Auditor',createdAt:now,returnedAt:now,returnedBy:'Monitor'})
  ];
  permissions=[
    normalizePermission({id:'pm-1',student:'Ana Beatriz',className:'1°A DS',interval:'morning',reason:'Atendimento na coordenação',active:true,exitConfirmed:true,exitConfirmedAt:now,exitVerifierRole:'Professor',exitVerifierName:'Ronaldo',createdAt:now}),
    normalizePermission({id:'pm-2',student:'Lucas Henrique',className:'2°B EDF',interval:'afternoon',reason:'Atividade externa',active:true,exitConfirmed:false,createdAt:now})
  ];
  history=[
    normalizeHistoryItem({id:'hs-1',atISO:now,text:'Notebook 123456 retirado por Lucas Henrique',detail:'2°B EDF · 08:20–09:10',type:'pickup',responsible:'Monitor'}),
    normalizeHistoryItem({id:'hs-2',atISO:now,text:'Pedido criado para Ana Beatriz',detail:'1°A DS · 10:20–11:10',type:'request',responsible:'Auditor'}),
    normalizeHistoryItem({id:'hs-3',atISO:now,text:'Notebook 987654321 devolvido por Ana Beatriz',detail:'1°A DS · devolução concluída',type:'return',responsible:'Monitor'})
  ];
  setAuthLocked(false); setCurrentUser(currentUser); render();
  if(window.ControlTheme?.set) window.ControlTheme.set('light');
  else document.documentElement.dataset.theme='light';
});
await page.waitForTimeout(180);
await page.addScriptTag({content:axeSource});

let total=0;
for(const section of ['home','agenda','permissions','requests','students','computers','history']){
  await page.click(`[data-page="${section}"]`);
  await page.waitForTimeout(60);
  const nodes=await page.evaluate(async()=>{
    const result=await axe.run(document,{runOnly:{type:'rule',values:['color-contrast']},resultTypes:['violations']});
    return (result.violations[0]?.nodes||[]).map(n=>({target:n.target,html:n.html,failure:n.failureSummary,data:n.any?.map(x=>x.data)||[]}));
  });
  console.log(`SECTION ${section.toUpperCase()} COUNT:`,nodes.length);
  for(const [i,n] of nodes.entries()){
    console.log(`${section.toUpperCase()} NODE ${i+1}`);
    console.log('TARGET:',JSON.stringify(n.target));
    console.log('HTML:',n.html);
    console.log('FAILURE:',n.failure);
    console.log('DATA:',JSON.stringify(n.data));
  }
  total+=nodes.length;
}
await browser.close();
console.log('TOTAL CONTRAST NODES:',total);
if(total) process.exit(2);
