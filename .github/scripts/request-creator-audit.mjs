import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});

await page.evaluate(()=>{
  v46AuthUser={id:'audit-miguel'};
  currentUser={username:'miguel',displayName:'Miguel',role:'diretor',roleLabel:'Diretor',userId:'audit-miguel'};
  appReady=true;
  data=[normalizeRequest({
    id:'rq-miguel-preview',
    student:'Adriely Maria da Silva',
    studentName:'Adriely Maria da Silva',
    studentClass:'1°A',
    studentCourse:'DS',
    studentId:'st-preview',
    room:'1°A DS',
    reason:'Uso de notebook para atividade em sala',
    startTime:'10:20',
    endTime:'11:10',
    time:'10:20–11:10',
    dateKey:recifeDateKey(),
    status:'wait',
    requestedBy:'miguel',
    requestedById:'audit-miguel',
    requestedByLabel:'Miguel',
    createdAt:new Date().toISOString()
  })];
  students=[]; permissions=[]; history=[];
  setAuthLocked(false); setCurrentUser(currentUser); render();
});

await page.evaluate(()=>window.ETEPortal?.openSystem('control-ds'));
await page.waitForFunction(()=>!document.body.classList.contains('portal-open'));
await page.click('[data-page="requests"]');
await page.evaluate(()=>{renderRequests();window.RequestCreatorLabel?.refresh();});
await page.waitForTimeout(250);

const creator=page.locator('.request-card .request-creator-name').first();
if(!(await creator.count())) throw new Error('Nome do criador não apareceu no pedido');
if((await creator.locator('span').innerText()).trim()!=='Miguel') throw new Error('Nome do criador exibido incorretamente');
if((await creator.getAttribute('aria-label'))!=='Criado por Miguel') throw new Error('Rótulo acessível do criador incorreto');
const box=await creator.boundingBox();
if(!box||box.height>24) throw new Error('Identificação do criador ficou grande demais');
if(pageErrors.length) throw new Error('Erros JS: '+pageErrors.join(' | '));

await page.locator('.request-card').first().screenshot({path:'artifacts/request-creator-preview.png'});
console.log('REQUEST CREATOR VISUAL AUDIT: PASS');
await browser.close();
