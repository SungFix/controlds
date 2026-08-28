import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const axeSource=fs.readFileSync(path.resolve('node_modules/axe-core/axe.min.js'),'utf8');
const browser=await chromium.launch({headless:true});

async function noOverflow(page,label){
  const {sw,cw}=await page.evaluate(()=>({
    sw:document.documentElement.scrollWidth,
    cw:document.documentElement.clientWidth
  }));
  if(sw>cw+2) throw new Error(`${label}: overflow horizontal ${sw}/${cw}`);
}

async function auditA11y(page,label){
  await page.addScriptTag({content:axeSource});
  const result=await page.evaluate(async()=>await axe.run(document,{
    runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}
  }));
  const bad=result.violations.filter(v=>['critical','serious'].includes(v.impact));
  if(bad.length){
    throw new Error(`${label}: ${bad.map(v=>`${v.id} (${v.nodes.length})`).join(', ')}`);
  }
}

async function simulateAdmin(page){
  await page.evaluate(()=>{
    v46AuthUser={id:'prime-audit-adm'};
    currentUser={
      username:'audit',displayName:'Auditor',role:'adm',
      roleLabel:'Administrador',userId:'prime-audit-adm'
    };
    appReady=true;
    data=[];students=[];permissions=[];history=[];
    setAuthLocked(false);
    setCurrentUser(currentUser);
    render();
  });
  await page.waitForTimeout(100);
}

for(const vp of [
  {width:1920,height:1080,label:'desktop-1920'},
  {width:1366,height:768,label:'notebook-1366'},
  {width:390,height:844,label:'mobile-390'}
]){
  const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));

  const response=await page.goto('http://127.0.0.1:4173/',{
    waitUntil:'networkidle',timeout:30000
  });
  if(!response?.ok()) throw new Error(`${vp.label}: HTTP ${response?.status()}`);

  await page.locator('#loginGate').waitFor({state:'visible'});
  await noOverflow(page,`${vp.label}-login`);
  if(!(await page.locator('#loginSubmit').isVisible())) throw new Error(`${vp.label}: Entrar invisível`);
  if(!(await page.locator('link[rel="manifest"]').count())) throw new Error(`${vp.label}: manifest não injetado`);
  if(!(await page.locator('.prime-skip-link').count())) throw new Error(`${vp.label}: skip link ausente`);
  if(!(await page.locator('.prime-network-banner').count())) throw new Error(`${vp.label}: banner de rede ausente`);

  const before=await page.evaluate(()=>document.documentElement.dataset.theme);
  const loginThemeButton=page.locator('.control-theme-toggle-floating:visible').first();
  if(!(await loginThemeButton.count())) throw new Error(`${vp.label}: botão de tema do login ausente`);
  await loginThemeButton.click();
  const after=await page.evaluate(()=>document.documentElement.dataset.theme);
  if(before===after) throw new Error(`${vp.label}: tema não alternou no login`);
  await loginThemeButton.click();

  if(vp.width===390){
    const card=await page.locator('.login-card').boundingBox();
    if(!card||card.x<-.5||card.x+card.width>390.5) throw new Error('mobile: login fora da tela');
  }

  await simulateAdmin(page);
  const headerTheme=page.locator('.control-theme-toggle-header:visible').first();
  if(!(await headerTheme.count())) throw new Error(`${vp.label}: botão de tema do cabeçalho ausente`);

  for(const section of ['home','agenda','permissions','requests','students','computers','history']){
    await page.click(`[data-page="${section}"]`);
    await page.waitForTimeout(40);
    const active=await page.locator(`#page-${section}`).evaluate(el=>el.classList.contains('active'));
    if(!active) throw new Error(`${vp.label}: ${section} não ativou`);
    await noOverflow(page,`${vp.label}-${section}`);
  }

  await page.click('[data-page="home"]');
  await auditA11y(page,`${vp.label}-home`);
  if(pageErrors.length) throw new Error(`${vp.label}: erros JS: ${pageErrors.join(' | ')}`);
  await page.close();
}

await browser.close();
console.log('PRIME BROWSER/A11Y AUDIT: PASS');
