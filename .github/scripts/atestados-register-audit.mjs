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

if(pageErrors.length)throw new Error('Erros JS: '+pageErrors.join(' | '));
console.log('ATESTADOS REGISTER AUDIT: PASS');
await browser.close();
