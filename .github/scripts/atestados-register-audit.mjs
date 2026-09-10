import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));
page.setDefaultTimeout(7000);

await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});

await page.evaluate(()=>{
  v46AuthUser={id:'audit-adm'};
  currentUser={username:'audit',displayName:'Auditor do Sistema',role:'adm',roleLabel:'Administrador',userId:'audit-adm'};
  students=[
    normalizeStudent({id:'st-at-audit',name:'Aluno Atestados',className:'1°A',course:'DS'}),
    normalizeStudent({id:'st-at-second',name:'Bruna Exemplo',className:'3°A',course:'EDF'})
  ];
  appReady=true;
  setAuthLocked(false);
  setCurrentUser(currentUser);
  render();

  const query=()=>({
    select(){return this;},
    order(){return this;},
    then(resolve){resolve({data:[],error:null});}
  });
  sb.from=()=>query();
  sb.channel=()=>({on(){return this;},subscribe(){return this;}});
  sb.removeChannel=()=>{};
});

await page.evaluate(()=>window.ETEPortal?.openSystem('atestados'));
await page.locator('.ete-atestados').waitFor({state:'visible'});
await page.locator('[data-at-tab="new"]').click();
await page.locator('#atForm').waitFor({state:'visible'});

const studentTrigger=page.locator('.at-student-trigger');
await studentTrigger.waitFor({state:'visible'});
if(await page.locator('#atStudent').isVisible())throw new Error('Campo manual de nome ainda está visível no Atestados');
if(await page.locator('.at-room-picker').isVisible())throw new Error('Campo manual de turma ainda está visível no Atestados');

const layoutFill=await page.evaluate(()=>{
  const layout=document.querySelector('.at-form-layout')?.getBoundingClientRect();
  const card=document.querySelector('.at-form-card')?.getBoundingClientRect();
  return layout&&card?{layout:layout.width,card:card.width}:null;
});
if(!layoutFill||layoutFill.card<layoutFill.layout-2)throw new Error(`Formulário não preencheu a largura disponível: ${JSON.stringify(layoutFill)}`);

await studentTrigger.click();
const studentPanel=page.locator('.at-student-panel');
await studentPanel.waitFor({state:'visible'});
await page.fill('.at-student-search','Aluno Atestados');
await page.locator('[data-at-student-id="st-at-audit"]').click();
await studentPanel.waitFor({state:'hidden'});
if((await page.inputValue('#atStudent'))!=='Aluno Atestados')throw new Error('Seleção de aluno não preencheu o nome interno');
const selectedClass=await page.locator('input[name="atClass"]:checked').inputValue();
if(selectedClass!=='1º DS A')throw new Error(`Turma automática incorreta: ${selectedClass}`);
if(!/Aluno Atestados/.test(await studentTrigger.textContent()||''))throw new Error('Resumo do aluno selecionado não foi atualizado');

const symmetricPair=await page.evaluate(()=>{
  const date=document.querySelector('#atDate')?.closest('.at-field')?.getBoundingClientRect();
  const period=document.querySelector('.at-choice-grid')?.closest('.at-field')?.getBoundingClientRect();
  return date&&period?{dateWidth:date.width,periodWidth:period.width,dateTop:date.top,periodTop:period.top}:null;
});
if(!symmetricPair||Math.abs(symmetricPair.dateWidth-symmetricPair.periodWidth)>3||Math.abs(symmetricPair.dateTop-symmetricPair.periodTop)>3)throw new Error(`Data e período não ficaram simétricos: ${JSON.stringify(symmetricPair)}`);

const dateInput=page.locator('#atDate');
const dateTrigger=page.locator('.at-date-trigger');
const datePopover=page.locator('.at-date-popover');
await dateTrigger.waitFor({state:'visible'});
const initialDate=await dateInput.inputValue();
await dateTrigger.click();
await datePopover.waitFor({state:'visible'});
const initialMonth=await datePopover.locator('.at-date-month').textContent();
await datePopover.locator('[data-at-date-next]').click();
const nextMonth=await datePopover.locator('.at-date-month').textContent();
if(initialMonth===nextMonth)throw new Error('Calendário não avançou para o próximo mês');
await datePopover.locator('.at-date-day:not(.outside)').first().click();
await datePopover.waitFor({state:'hidden'});
const changedDate=await dateInput.inputValue();
if(!changedDate||changedDate===initialDate)throw new Error('Calendário personalizado não atualizou a data');
await dateTrigger.click();
await datePopover.waitFor({state:'visible'});
await datePopover.locator('[data-at-date-today]').click();
await datePopover.waitFor({state:'hidden'});
if((await dateInput.inputValue())!==initialDate)throw new Error('Botão Hoje não restaurou a data atual');

const reasonTrigger=page.locator('.at-reason-trigger');
const reasonList=page.locator('.at-reason-list');
await reasonTrigger.waitFor({state:'visible'});
await reasonTrigger.click();
await reasonList.waitFor({state:'visible'});
await page.waitForTimeout(250);

const reasonCheckbox=page.locator('input[name="atReason"][value="atestado_medico"]');
await reasonCheckbox.check();
if(!(await reasonCheckbox.isChecked()))throw new Error('Justificativa do SIEPE não pôde ser marcada');
if(!/1 justificativa selecionada/i.test(await reasonTrigger.textContent()||''))throw new Error('Resumo da justificativa selecionada não foi atualizado');

await reasonTrigger.click();
await page.waitForFunction(()=>getComputedStyle(document.querySelector('.at-reason-list')).display==='none');
await reasonTrigger.click();
await reasonList.waitFor({state:'visible'});
await reasonTrigger.click();
await page.waitForFunction(()=>getComputedStyle(document.querySelector('.at-reason-list')).display==='none');

if(await page.locator('.at-time-custom').count()){
  throw new Error('Seletor de horário foi montado enquanto o período específico estava oculto');
}

await page.locator('input[name="atAbsenceScope"][value="partial"]').check();
await page.waitForFunction(()=>document.querySelectorAll('.at-time-custom').length===2);

const first=page.locator('.at-time-custom').first();
await first.locator('.at-time-trigger').click();
await first.locator('.at-time-option[data-at-time-part="hour"][data-at-time-value="09"]').click();
await first.locator('.at-time-option[data-at-time-part="minute"][data-at-time-value="15"]').click();

const value=await page.locator('#atStartTime').inputValue();
if(value!=='09:15')throw new Error(`Horário personalizado não foi salvo no input: ${value}`);

await first.locator('.at-time-done').click();
if(await first.evaluate(el=>el.classList.contains('open')))throw new Error('Seletor de horário não fechou ao concluir');

await page.locator('input[name="atAbsenceScope"][value="full_day"]').check();
if((await page.locator('#atStartTime').inputValue())!=='')throw new Error('Horário não foi limpo ao voltar para dia inteiro');

await page.setViewportSize({width:430,height:900});
await page.waitForTimeout(180);
const mobileState=await page.evaluate(()=>{
  const form=document.querySelector('#atForm');
  const card=document.querySelector('.at-form-card');
  if(!form||!card)return null;
  const columns=getComputedStyle(form).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length;
  const rect=card.getBoundingClientRect();
  return {columns,left:rect.left,right:rect.right,viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth};
});
if(!mobileState||mobileState.columns!==1)throw new Error(`Formulário mobile não ficou em uma coluna: ${JSON.stringify(mobileState)}`);
if(mobileState.scrollWidth>mobileState.viewport+2)throw new Error(`Atestados criou rolagem horizontal no mobile: ${JSON.stringify(mobileState)}`);

if(pageErrors.length)throw new Error('Erros JS: '+pageErrors.join(' | '));
console.log('ATESTADOS REGISTER AUDIT: PASS');
await browser.close();
