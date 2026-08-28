import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const axeSource=fs.readFileSync(path.resolve('node_modules/axe-core/axe.min.js'),'utf8');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.evaluate(()=>{
  const now=new Date().toISOString();
  v46AuthUser={id:'mobile-audit'};
  currentUser={username:'audit',displayName:'Auditor',role:'adm',roleLabel:'Administrador',userId:'mobile-audit'};
  appReady=true;
  students=[
    normalizeStudent({id:'s1',name:'Ana Beatriz',className:'1°A',course:'DS',useCount:7,lastUsed:now}),
    normalizeStudent({id:'s2',name:'Lucas Henrique',className:'2°B',course:'EDF',useCount:3,lastUsed:now})
  ];
  data=[];permissions=[];history=[];
  setAuthLocked(false);setCurrentUser(currentUser);render();
  if(window.ControlTheme?.set)window.ControlTheme.set('light');else document.documentElement.dataset.theme='light';
});
await page.waitForTimeout(180);
const menu=page.locator('.mobile-menu:visible').first();
if((await menu.getAttribute('aria-expanded'))!=='true')await menu.click();
await page.click('[data-page="students"]');
await page.waitForTimeout(100);
await page.addScriptTag({content:axeSource});
const nodes=await page.evaluate(async()=>{
 const r=await axe.run(document,{runOnly:{type:'rule',values:['color-contrast']},resultTypes:['violations']});
 return (r.violations[0]?.nodes||[]).map(n=>({target:n.target,html:n.html,failure:n.failureSummary,data:n.any?.map(x=>x.data)||[]}));
});
console.log('MOBILE STUDENTS CONTRAST COUNT:',nodes.length);
for(const [i,n] of nodes.entries()){
 console.log('NODE',i+1);console.log('TARGET:',JSON.stringify(n.target));console.log('HTML:',n.html);console.log('FAILURE:',n.failure);console.log('DATA:',JSON.stringify(n.data));
}
await browser.close();
if(nodes.length)process.exit(2);
