import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:900}});
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});

await page.evaluate(()=>{
  window.__registeredFlowRpcCalls=[];
  v46Rpc=async(name,args={})=>{
    window.__registeredFlowRpcCalls.push({name,args});
    if(name==='ete_pickup_request_v3') return {ok:true,request:{id:args.p_request_id}};
    return {};
  };
  v46AuthUser={id:'flow-audit-user'};
  currentUser={username:'adm',displayName:'Auditor',role:'adm',roleLabel:'Administrador',userId:'flow-audit-user'};
  appReady=true;
  students=[normalizeStudent({id:'st-flow',name:'Aluno Cadastrado',className:'1°A',course:'DS',useCount:0,lastUsed:''})];
  data=[normalizeRequest({id:'rq-flow',student:'Aluno Cadastrado',studentName:'Aluno Cadastrado',studentClass:'1°A',studentCourse:'DS',studentId:'st-flow',room:'1°A DS',reason:'Teste',startTime:'10:20',endTime:'11:10',time:'10:20–11:10',dateKey:recifeDateKey(),status:'wait',requestedBy:'adm',requestedById:'flow-audit-user',requestedByLabel:'Auditor',createdAt:new Date().toISOString()})];
  permissions=[];
  history=[];
  setAuthLocked(false);
  setCurrentUser(currentUser);
  render();
  if(typeof populateSavedStudentSelect==='function') populateSavedStudentSelect('');
});

await page.evaluate(()=>window.ETEPortal?.openSystem('control-ds'));
await page.waitForFunction(()=>!document.body.classList.contains('portal-open'));
await page.waitForSelector('#registeredStudentFlowStyles',{state:'attached'});

const visuallyRemoved=async selector=>page.locator(selector).evaluate(el=>{
  const label=el.closest('label');
  const style=label?getComputedStyle(label):getComputedStyle(el);
  return el.getAttribute('aria-hidden')==='true' && el.tabIndex===-1 && (style.opacity==='0'||style.display==='none'||style.visibility==='hidden');
});
const waitDialogClosed=async selector=>page.waitForFunction(sel=>{
  const dialog=document.querySelector(sel);
  return !!dialog && !dialog.open;
},selector);

await page.locator('.new-request:visible').first().click();
if(!(await page.locator('#requestModal').evaluate(el=>el.open))) throw new Error('Modal de pedido não abriu');
if(!(await visuallyRemoved('#student'))) throw new Error('Nome manual do aluno ainda está exposto no pedido');
if(!(await visuallyRemoved('#studentPin'))) throw new Error('PIN ainda está exposto no pedido');
if(!(await page.locator('#studentGroupPicker').evaluate(el=>el.closest('label')?.getAttribute('aria-hidden')==='true'))) throw new Error('Turma manual ainda está exposta no pedido');
if(!(await page.locator('#studentPickerTrigger').isVisible())) throw new Error('Seletor de aluno cadastrado não aparece no pedido');
await page.click('#studentPickerTrigger');
await page.click('[data-student-pick="st-flow"]');
await page.fill('#reason','Teste sem PIN');
await page.locator('#requestForm button[type="submit"]').click();
await waitDialogClosed('#requestModal');
let calls=await page.evaluate(()=>window.__registeredFlowRpcCalls);
const requestCall=calls.find(call=>call.name==='ete_create_request_v3');
if(!requestCall||requestCall.args.p_student_id!=='st-flow') throw new Error('Pedido não usou RPC v3 com aluno cadastrado');
if(Object.prototype.hasOwnProperty.call(requestCall.args,'p_pin')) throw new Error('Pedido ainda envia PIN');

await page.click('[data-page="permissions"]');
await page.click('#newPermissionBtn');
if(!(await visuallyRemoved('#permissionStudent'))) throw new Error('Nome manual ainda está exposto na autorização');
if(!(await visuallyRemoved('#permissionClass'))) throw new Error('Turma manual ainda está exposta na autorização');
if(!(await page.locator('#permissionSavedStudentTrigger').isVisible())) throw new Error('Seletor de aluno cadastrado não aparece na autorização');
await page.click('#permissionSavedStudentTrigger');
await page.click('[data-permission-student-id="st-flow"]');
await page.fill('#permissionReason','Autorização de teste');
await page.locator('#permissionForm button[type="submit"]').click();
await waitDialogClosed('#permissionModal');
calls=await page.evaluate(()=>window.__registeredFlowRpcCalls);
const permissionCall=calls.find(call=>call.name==='ete_create_permission_v2');
if(!permissionCall||permissionCall.args.p_student_id!=='st-flow') throw new Error('Autorização não usou o aluno cadastrado');

await page.evaluate(()=>{
  const form=document.querySelector('#pickupForm');
  form.dataset.id='rq-flow';
  document.querySelector('#computerCode').value='';
  document.querySelector('#pickupModal').showModal();
});
if(!(await visuallyRemoved('#pickupPin'))) throw new Error('PIN ainda está exposto na retirada');
await page.fill('#computerCode','123456');
const pickupConfirm=page.locator('#pickupForm button').filter({hasText:/Confirmar|Retirada|Confirmando/i}).last();
if(!(await pickupConfirm.count())) throw new Error('Botão de confirmação da retirada não encontrado');
await pickupConfirm.click();
await page.waitForTimeout(500);
const pickupState=await page.evaluate(()=>({
  open:document.querySelector('#pickupModal')?.open,
  calls:window.__registeredFlowRpcCalls,
  submitFlag:document.querySelector('#pickupForm')?.dataset.registeredFlowSubmit||'',
  code:document.querySelector('#computerCode')?.value||''
}));
const pickupCall=pickupState.calls.find(call=>call.name==='ete_pickup_request_v3');
if(!pickupCall) throw new Error('Retirada não chamou RPC v3. Estado: '+JSON.stringify(pickupState));
if(pickupCall.args.p_request_id!=='rq-flow'||pickupCall.args.p_code!=='123456') throw new Error('Retirada enviou dados incorretos: '+JSON.stringify(pickupCall));
if(Object.prototype.hasOwnProperty.call(pickupCall.args,'p_pin')) throw new Error('Retirada ainda envia PIN');
if(pickupState.open) throw new Error('Retirada chamou RPC v3, mas modal permaneceu aberto. Estado: '+JSON.stringify(pickupState));

if(pageErrors.length) throw new Error('Erros JavaScript: '+pageErrors.join(' | '));
console.log('REGISTERED STUDENT FLOW AUDIT: PASS');
await browser.close();
