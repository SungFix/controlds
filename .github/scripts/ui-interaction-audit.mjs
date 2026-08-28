import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const pageErrors=[];
const nativeDialogs=[];
page.on('pageerror',e=>pageErrors.push(e.message));
page.on('dialog',async d=>{nativeDialogs.push(`${d.type()}: ${d.message()}`);await d.dismiss();});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});

await page.evaluate(()=>{
  window.__rpcCalls=[]; window.__pickupCalls=[];
  v46Rpc=async(name,args={})=>{window.__rpcCalls.push({name,args});return {};};
  v46PickupRpc=async(args={})=>{window.__pickupCalls.push(args);return {};};
  clearHistoryWithPassword=async(password)=>{window.__clearPassword=password;return{removed:history.length,preview:true};};
  v46AuthUser={id:'audit-adm'};
  currentUser={username:'audit',displayName:'Auditor do Sistema',role:'adm',roleLabel:'Administrador',userId:'audit-adm'};
  appReady=true;
  data=[normalizeRequest({id:'rq-audit',student:'Aluno de Teste',studentName:'Aluno de Teste',studentClass:'1°A',studentCourse:'DS',studentId:'st-audit',room:'1°A DS',reason:'Teste automatizado',startTime:'10:20',endTime:'11:10',time:'10:20–11:10',dateKey:recifeDateKey(),status:'wait',requestedBy:'audit',requestedById:'audit-adm',requestedByLabel:'Auditor do Sistema',createdAt:new Date().toISOString()})];
  students=[normalizeStudent({id:'st-audit',name:'Aluno de Teste',className:'1°A',course:'DS',useCount:1,lastUsed:new Date().toISOString()})];
  permissions=[normalizePermission({id:'pm-audit',student:'Aluno de Teste',className:'1°A DS',interval:'morning',reason:'Teste automatizado',active:true,exitConfirmed:false,createdAt:new Date().toISOString()})];
  history=[normalizeHistoryItem({id:'hs-audit',atISO:new Date().toISOString(),text:'Evento de teste',detail:'Teste automatizado',type:'system',responsible:'Auditor do Sistema'})];
  setAuthLocked(false); setCurrentUser(currentUser); render();
});

for(const section of ['home','agenda','permissions','requests','students','computers','history']){
  await page.click(`[data-page="${section}"]`);
  if(!(await page.locator(`#page-${section}`).evaluate(el=>el.classList.contains('active')))) throw new Error(`Página ${section} não ativou`);
}

if(!(await page.evaluate(()=>!!window.ControlActionModal))) throw new Error('Sistema global de confirmação personalizada não carregou');

async function confirmCustomAction(expectedTitle){
  const modal=page.locator('#controlActionModal');
  await modal.waitFor({state:'visible'});
  if(!(await modal.evaluate(el=>el.open))) throw new Error(`Modal personalizado não abriu: ${expectedTitle}`);
  const title=(await modal.locator('#controlActionTitle').textContent()||'').trim();
  if(expectedTitle&&!title.includes(expectedTitle)) throw new Error(`Título inesperado no modal: ${title}`);
  await modal.locator('#controlActionConfirm').click();
  await page.waitForTimeout(120);
}

await page.click('[data-page="students"]');
await page.click('#newStudentBtn2');
if(!(await page.locator('#studentModal').evaluate(el=>el.open))) throw new Error('Modal de novo aluno não abriu');
await page.fill('#newStudentName','Aluno Novo de Teste');
await page.locator('#studentForm button[type="submit"]').click();
await page.waitForTimeout(100);
let calls=await page.evaluate(()=>window.__rpcCalls);
if(!calls.some(x=>x.name==='ete_upsert_student'&&x.args.p_name==='Aluno Novo de Teste')) throw new Error('Cadastro de aluno não chamou RPC correta');

await page.evaluate(()=>renderStudents());
await page.click('[data-edit-student="st-audit"]:visible');
if((await page.inputValue('#newStudentName'))!=='Aluno de Teste') throw new Error('Edição não carregou aluno');
await page.fill('#newStudentName','Aluno Editado de Teste');
await page.locator('#studentForm button[type="submit"]').click();
await page.waitForTimeout(100);
calls=await page.evaluate(()=>window.__rpcCalls);
if(!calls.some(x=>x.name==='ete_update_student'&&x.args.p_student_id==='st-audit')) throw new Error('Edição não chamou RPC correta');

await page.evaluate(()=>renderStudents());
await page.click('[data-delete-student="st-audit"]:visible');
await confirmCustomAction('Remover aluno');
calls=await page.evaluate(()=>window.__rpcCalls);
if(!calls.some(x=>x.name==='ete_delete_student'&&x.args.p_student_id==='st-audit')) throw new Error('Exclusão de aluno não chamou RPC correta');

await page.click('[data-page="requests"]');
await page.evaluate(()=>renderRequests());
const requestDelete=page.locator('[data-delete-request="rq-audit"]:visible');
if(!(await requestDelete.count())) throw new Error('Botão Apagar do pedido não apareceu');
await requestDelete.click();
await confirmCustomAction('Apagar pedido');
calls=await page.evaluate(()=>window.__rpcCalls);
if(!calls.some(x=>x.name==='ete_delete_request'&&x.args.p_request_id==='rq-audit')) throw new Error('Exclusão de pedido não chamou RPC correta');

await page.evaluate(()=>renderRequests());
await page.click('[data-pickup="rq-audit"]:visible');
if(!(await page.locator('#pickupModal').evaluate(el=>el.open))) throw new Error('Modal de retirada não abriu');
await page.fill('#pickupPin','1234');
await page.fill('#computerCode','123456');
const pickupConfirm=page.locator('#pickupForm button').filter({hasText:/Confirmar|Retirada|Confirmando/i}).last();
if(!(await pickupConfirm.count())) throw new Error('Botão de confirmação da retirada não encontrado');
await pickupConfirm.click();
await page.waitForTimeout(120);
const pc=await page.evaluate(()=>window.__pickupCalls);
if(!pc.some(x=>x.p_request_id==='rq-audit'&&x.p_code==='123456')) throw new Error('Retirada não usou RPC V2');

await page.evaluate(()=>{data[0].status='use';data[0].code='123456';render();});
await page.click('[data-page="requests"]');
await page.evaluate(()=>renderRequests());
await page.click('[data-return="rq-audit"]:visible');
await page.waitForTimeout(100);
calls=await page.evaluate(()=>window.__rpcCalls);
if(!calls.some(x=>x.name==='ete_return_request'&&x.args.p_request_id==='rq-audit')) throw new Error('Devolução não chamou RPC correta');

await page.evaluate(()=>{data[0].status='done';data[0].code='123456';render();});
await page.click('[data-page="computers"]');
await page.waitForTimeout(150);
const computerDelete=page.locator('[data-delete-computer-record="rq-audit"]:visible');
if(!(await computerDelete.count())) throw new Error('Botão Apagar do computador devolvido não apareceu');
await computerDelete.click();
await confirmCustomAction('Apagar computador');
calls=await page.evaluate(()=>window.__rpcCalls);
if(!calls.some(x=>x.name==='ete_delete_request'&&x.args.p_request_id==='rq-audit')) throw new Error('Botão Apagar do computador não chamou ete_delete_request');

await page.click('[data-page="permissions"]');
await page.click('#newPermissionBtn');
await page.fill('#permissionStudent','Aluno Permissão Teste');
await page.fill('#permissionClass','1°A DS');
await page.fill('#permissionReason','Teste automatizado');
await page.locator('#permissionForm button[type="submit"]').click();
await page.waitForTimeout(100);
calls=await page.evaluate(()=>window.__rpcCalls);
if(!calls.some(x=>x.name==='ete_create_permission')) throw new Error('Criação de permissão não chamou RPC correta');

await page.evaluate(()=>renderPermissions());
await page.click('[data-confirm-exit="pm-audit"]:visible');
if(!(await page.locator('#exitConfirmModal').evaluate(el=>el.open))) throw new Error('Modal saída não abriu');
if((await page.locator('#exitVerifierName').getAttribute('readonly'))===null) throw new Error('Identidade de saída editável');
if((await page.inputValue('#exitVerifierName'))!=='Auditor do Sistema') throw new Error('Identidade autenticada não preenchida');
await page.locator('#exitConfirmForm button[type="submit"]').click();
await page.waitForTimeout(100);
calls=await page.evaluate(()=>window.__rpcCalls);
const cc=calls.find(x=>x.name==='ete_confirm_exit');
if(!cc||cc.args.p_verifier_name!=='Auditor do Sistema') throw new Error('Saída não usa identidade autenticada');

await page.evaluate(()=>{permissions[0].active=false;renderPermissions();});
await page.waitForTimeout(150);
const permissionDelete=page.locator('[data-delete-permission="pm-audit"]:visible');
if(!(await permissionDelete.count())) throw new Error('Botão Apagar da permissão cancelada não apareceu');
await permissionDelete.click();
await confirmCustomAction('Apagar permissão');
calls=await page.evaluate(()=>window.__rpcCalls);
if(!calls.some(x=>x.name==='ete_delete_permission'&&x.args.p_permission_id==='pm-audit')) throw new Error('Exclusão de permissão não chamou RPC correta');

await page.click('[data-page="history"]');
await page.click('#clearHistoryButton');
if(!(await page.locator('#clearHistoryModal').evaluate(el=>el.open))) throw new Error('Modal histórico não abriu');
await page.fill('#clearHistoryPassword','senha-de-teste');
await page.locator('#confirmClearHistory').click();
await page.waitForTimeout(100);
if((await page.evaluate(()=>window.__clearPassword))!=='senha-de-teste') throw new Error('Senha de limpeza não passou pelo fluxo correto');

await page.evaluate(()=>{
  currentUser={username:'ronaldo',displayName:'Ronaldo',role:'professor',roleLabel:'Professor',userId:'audit-prof'};
  v46AuthUser={id:'audit-prof'};
  setCurrentUser(currentUser); render();
});
const roleHidden=async sel=>await page.locator(sel).evaluate(el=>el.classList.contains('role-hidden'));
if(await roleHidden('#newPermissionBtn')) throw new Error('Professor não vê Nova permissão');
if(await roleHidden('#newStudentBtn2')) throw new Error('Professor não vê Novo aluno');
if(await roleHidden('#clearHistoryButton')) throw new Error('Professor não vê Apagar histórico');
const professorFns=await page.evaluate(()=>({create:canCreateRequest(),students:canManageStudents(),permission:canCreatePermission(),history:canClearHistory()}));
if(!Object.values(professorFns).every(Boolean)) throw new Error('Professor não herdou permissões de gestão');
if((await page.locator('.header-account-copy small').first().textContent()).trim()!=='Professor') throw new Error('Professor não aparece com o cargo correto');

await page.evaluate(()=>{
  currentUser={username:'monitor',displayName:'Monitor de Teste',role:'monitor',roleLabel:'Monitor',userId:'audit-monitor'};
  v46AuthUser={id:'audit-monitor'};
  setCurrentUser(currentUser);
  data=[normalizeRequest({id:'rq-mon',student:'Aluno Monitor',studentName:'Aluno Monitor',studentClass:'1°A',studentCourse:'DS',studentId:'st-mon',room:'1°A DS',reason:'Teste',startTime:'10:20',endTime:'11:10',time:'10:20–11:10',dateKey:recifeDateKey(),status:'wait',requestedBy:'audit',requestedById:'other-user',requestedByLabel:'Outro',createdAt:new Date().toISOString()})];
  render();
});
const hidden=async sel=>await page.locator(sel).evaluate(el=>el.classList.contains('role-hidden'));
if(!(await hidden('#newPermissionBtn'))) throw new Error('Monitor vê Nova permissão');
if(!(await hidden('#newStudentBtn2'))) throw new Error('Monitor vê Novo aluno');
if(!(await hidden('#clearHistoryButton'))) throw new Error('Monitor vê Apagar histórico');
await page.click('[data-page="requests"]');
await page.evaluate(()=>renderRequests());
if(!(await page.locator('[data-pickup="rq-mon"]:visible').isVisible())) throw new Error('Monitor não vê retirada');

if(nativeDialogs.length) throw new Error('Diálogo nativo do navegador apareceu: '+nativeDialogs.join(' | '));
if(pageErrors.length) throw new Error('Erros JS: '+pageErrors.join(' | '));
console.log('AUTHENTICATED UI INTERACTION AUDIT V2: PASS');
await browser.close();
