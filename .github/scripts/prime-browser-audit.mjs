import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const axeSource=fs.readFileSync(path.resolve('node_modules/axe-core/axe.min.js'),'utf8');
const browser=await chromium.launch({headless:true});
const sections=['home','agenda','permissions','requests','students','computers','history'];

async function noOverflow(page,label){
  const {sw,cw}=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  if(sw>cw+2) throw new Error(`${label}: overflow horizontal ${sw}/${cw}`);
}

async function auditA11y(page,label){
  if(!(await page.evaluate(()=>typeof axe!=="undefined"))) await page.addScriptTag({content:axeSource});
  const result=await page.evaluate(async()=>await axe.run(document,{
    runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},
    resultTypes:['violations']
  }));
  const bad=result.violations.filter(v=>['critical','serious'].includes(v.impact));
  if(bad.length){
    const detail=bad.map(v=>`${v.id} (${v.nodes.length})`).join(', ');
    throw new Error(`${label}: acessibilidade séria/crítica: ${detail}`);
  }
}

async function simulateAdmin(page){
  await page.evaluate(()=>{
    const now=new Date().toISOString();
    const today=recifeDateKey();
    v46AuthUser={id:'prime-audit-adm'};
    currentUser={username:'audit',displayName:'Auditor',role:'adm',roleLabel:'Administrador',userId:'prime-audit-adm'};
    appReady=true;
    students=[
      normalizeStudent({id:'st-1',name:'Ana Beatriz',className:'1°A',course:'DS',useCount:7,lastUsed:now}),
      normalizeStudent({id:'st-2',name:'Lucas Henrique',className:'2°B',course:'EDF',useCount:3,lastUsed:now})
    ];
    data=[
      normalizeRequest({id:'rq-wait',student:'Ana Beatriz',studentName:'Ana Beatriz',studentClass:'1°A',studentCourse:'DS',studentId:'st-1',room:'1°A DS',reason:'Atividade de programação',startTime:'10:20',endTime:'11:10',time:'10:20–11:10',dateKey:today,status:'wait',requestedBy:'audit',requestedById:'prime-audit-adm',requestedByLabel:'Auditor',createdAt:now}),
      normalizeRequest({id:'rq-use',student:'Lucas Henrique',studentName:'Lucas Henrique',studentClass:'2°B',studentCourse:'EDF',studentId:'st-2',room:'2°B EDF',reason:'Pesquisa escolar',startTime:'08:20',endTime:'09:10',time:'08:20–09:10',dateKey:today,status:'use',code:'123456',requestedBy:'audit',requestedById:'prime-audit-adm',requestedByLabel:'Auditor',createdAt:now,pickedAt:now,pickedBy:'Monitor'}),
      normalizeRequest({id:'rq-done',student:'Ana Beatriz',studentName:'Ana Beatriz',studentClass:'1°A',studentCourse:'DS',studentId:'st-1',room:'1°A DS',reason:'Trabalho em grupo',startTime:'13:00',endTime:'13:50',time:'13:00–13:50',dateKey:today,status:'done',code:'987654321',requestedBy:'audit',requestedById:'prime-audit-adm',requestedByLabel:'Auditor',createdAt:now,returnedAt:now,returnedBy:'Monitor'})
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
    setAuthLocked(false);
    setCurrentUser(currentUser);
    render();
  });
  await page.waitForTimeout(120);
}

async function clickSection(page,section,isMobile){
  if(isMobile){
    const button=page.locator('.mobile-menu:visible').first();
    if(!(await button.count())) throw new Error(`mobile: botão de menu ausente ao abrir ${section}`);
    const expanded=await button.getAttribute('aria-expanded');
    if(expanded!=="true") await button.click();
    await page.waitForTimeout(40);
  }
  const nav=page.locator(`[data-page="${section}"]`).first();
  await nav.click();
  await page.waitForTimeout(50);
  const active=await page.locator(`#page-${section}`).evaluate(el=>el.classList.contains('active'));
  if(!active) throw new Error(`${isMobile?'mobile':'desktop'}: ${section} não ativou`);
}

async function setTheme(page,theme){
  await page.evaluate(theme=>{
    if(window.ControlTheme?.set) window.ControlTheme.set(theme);
    else document.documentElement.dataset.theme=theme;
    try{localStorage.setItem('control-ds-theme',theme);}catch(_){}
  },theme);
  await page.waitForTimeout(40);
}

async function auditButtonHierarchy(page,label){
  const result=await page.evaluate(()=>{
    const visible=el=>{
      if(!el) return false;
      const s=getComputedStyle(el);
      return s.display!=="none"&&s.visibility!=="hidden"&&el.getClientRects().length>0;
    };
    const primary=[...document.querySelectorAll('.btn.primary')].find(visible)||null;
    const danger=[...document.querySelectorAll('.btn.danger,[data-delete-request],[data-delete-student],[data-delete-permission],[data-delete-computer-record]')].find(visible)||null;
    const css=el=>el?getComputedStyle(el):null;
    return {
      hasPolish:document.documentElement.dataset.finalPolish==='1',
      primaryBg:primary?css(primary).backgroundColor:'',
      dangerBg:danger?css(danger).backgroundColor:'',
      primaryColor:primary?css(primary).color:'',
      dangerColor:danger?css(danger).color:''
    };
  });
  if(!result.hasPolish) throw new Error(`${label}: camada final de acabamento não carregou`);
  if(result.primaryBg&&result.dangerBg&&result.primaryBg===result.dangerBg&&result.primaryColor===result.dangerColor){
    throw new Error(`${label}: ação principal e destrutiva visualmente indistinguíveis`);
  }
}

async function auditLoadingState(page,label){
  await page.evaluate(()=>{
    const b=document.querySelector('#newStudentBtn2');
    if(!b)return;
    b.dataset.primeOldText=b.textContent;
    b.disabled=true;
    b.textContent='Salvando...';
  });
  await page.waitForTimeout(80);
  const loading=await page.locator('#newStudentBtn2').evaluate(el=>el.classList.contains('is-loading')&&el.getAttribute('aria-busy')==='true');
  if(!loading) throw new Error(`${label}: estado visual de carregamento não foi aplicado`);
  await page.evaluate(()=>{
    const b=document.querySelector('#newStudentBtn2');
    if(!b)return;
    b.disabled=false;
    b.textContent=b.dataset.primeOldText||'Novo aluno';
    delete b.dataset.primeOldText;
  });
  await page.waitForTimeout(50);
}

async function auditEmptyStates(page,label,isMobile){
  await page.evaluate(()=>{data=[];students=[];permissions=[];history=[];render();});
  await page.waitForTimeout(100);
  const checks=[
    ['requests','.request-empty'],
    ['permissions','.permission-empty'],
    ['students','.student-empty'],
    ['computers','.computer-empty']
  ];
  for(const [section,selector] of checks){
    await clickSection(page,section,isMobile);
    const empty=page.locator(`#page-${section} ${selector}:visible`).first();
    if(!(await empty.count())) throw new Error(`${label}-${section}: estado vazio ausente`);
    if((await empty.getAttribute('role'))!=='status') throw new Error(`${label}-${section}: estado vazio sem semântica de status`);
    await noOverflow(page,`${label}-empty-${section}`);
    await auditA11y(page,`${label}-empty-${section}`);
  }
}

for(const vp of [
  {width:1920,height:1080,label:'desktop-1920'},
  {width:1366,height:768,label:'notebook-1366'},
  {width:390,height:844,label:'mobile-390'}
]){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height}});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));

  const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:30000});
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

  await context.setOffline(true);
  await page.waitForTimeout(60);
  if(!(await page.locator('.prime-network-banner').isVisible())) throw new Error(`${vp.label}: aviso offline não apareceu`);
  await context.setOffline(false);
  await page.waitForTimeout(60);
  if(await page.locator('.prime-network-banner').isVisible()) throw new Error(`${vp.label}: aviso offline não sumiu após reconectar`);

  if(vp.width===390){
    const card=await page.locator('.login-card').boundingBox();
    if(!card||card.x<-.5||card.x+card.width>390.5) throw new Error('mobile: login fora da tela');
  }

  await simulateAdmin(page);
  const headerTheme=page.locator('.control-theme-toggle-header:visible').first();
  if(!(await headerTheme.count())) throw new Error(`${vp.label}: botão de tema do cabeçalho ausente`);
  const isMobile=vp.width<=820;

  for(const theme of ['dark','light']){
    await setTheme(page,theme);
    for(const section of sections){
      await clickSection(page,section,isMobile);
      await noOverflow(page,`${vp.label}-${theme}-${section}`);
      await auditA11y(page,`${vp.label}-${theme}-${section}`);
      if(['requests','permissions','students','computers'].includes(section)) await auditButtonHierarchy(page,`${vp.label}-${theme}-${section}`);
    }
  }

  await clickSection(page,'students',isMobile);
  await auditLoadingState(page,`${vp.label}-loading`);
  await setTheme(page,'dark');
  await auditEmptyStates(page,`${vp.label}-dark`,isMobile);
  await simulateAdmin(page);
  await setTheme(page,'light');
  await auditEmptyStates(page,`${vp.label}-light`,isMobile);

  if(pageErrors.length) throw new Error(`${vp.label}: erros JS: ${pageErrors.join(' | ')}`);
  await context.close();
}

await browser.close();
console.log('PRIME BROWSER/A11Y AUDIT: PASS');
