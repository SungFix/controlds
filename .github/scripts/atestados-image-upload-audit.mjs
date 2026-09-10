import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.setDefaultTimeout(8000);

await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.evaluate(()=>{
  v46AuthUser={id:'audit-adm'};
  currentUser={username:'audit',displayName:'Auditor',role:'adm',roleLabel:'Administrador',userId:'audit-adm'};
  students=[normalizeStudent({id:'st-image-audit',name:'Aluno Imagem',className:'1°A',course:'DS'})];
  appReady=true;setAuthLocked(false);setCurrentUser(currentUser);render();
  window.__atImageUpload=null;window.__atImageInsert=null;
  const builder=()=>({
    select(){return this;},order(){return this;},in(){return Promise.resolve({data:[],error:null});},
    insert(payload){window.__atImageInsert=payload;return Promise.resolve({data:[payload],error:null});},
    then(resolve){resolve({data:[],error:null});}
  });
  sb.from=()=>builder();
  sb.channel=()=>({on(){return this;},subscribe(){return this;}});sb.removeChannel=()=>{};
  sb.storage.from=()=>({
    upload(path,file,options){window.__atImageUpload={path,type:file.type,size:file.size,options};return Promise.resolve({data:{path},error:null});},
    remove(){return Promise.resolve({data:[],error:null});},
    createSignedUrl(){return Promise.resolve({data:{signedUrl:'blob:mock-image'},error:null});}
  });
});

await page.evaluate(()=>window.ETEPortal?.openSystem('atestados'));
await page.locator('.ete-atestados').waitFor({state:'visible'});
await page.locator('[data-at-tab="new"]').click();
await page.locator('#atForm').waitFor({state:'visible'});
await page.locator('.at-image-upload-field').waitFor({state:'visible'});

const input=page.locator('#atImage');
const accept=await input.getAttribute('accept');
if(!accept?.includes('image/jpeg')||!accept.includes('image/png'))throw new Error('Upload não restringe os formatos de imagem esperados');

await page.locator('.at-student-trigger').click();
await page.fill('.at-student-search','Aluno Imagem');
await page.locator('[data-at-student-id="st-image-audit"]').click();
await page.locator('input[name="atReason"][value="atestado_medico"]').check();

await input.setInputFiles({name:'atestado-teste.jpg',mimeType:'image/jpeg',buffer:Buffer.from([255,216,255,217])});
await page.locator('.at-image-preview').waitFor({state:'visible'});
if(!/atestado-teste\.jpg/.test(await page.locator('.at-image-preview-name').textContent()||''))throw new Error('Preview não mostrou o nome do arquivo');

await page.locator('#atForm button[type="submit"]').click();
await page.waitForFunction(()=>window.__atImageInsert?.image_path&&window.__atImageUpload?.path);
const result=await page.evaluate(()=>({upload:window.__atImageUpload,insert:window.__atImageInsert}));
if(result.upload.type!=='image/jpeg')throw new Error('MIME do upload incorreto');
if(result.upload.size!==4)throw new Error('Tamanho do arquivo mock incorreto');
if(result.insert.image_path!==result.upload.path)throw new Error('Caminho da imagem não foi salvo junto ao registro');
if(result.insert.student_name!=='Aluno Imagem'||result.insert.class_name!=='1º DS A')throw new Error('Upload quebrou vínculo visual do aluno/turma');
if(!result.upload.path.startsWith('audit-adm/'))throw new Error('Caminho do Storage não está isolado pelo usuário');

await page.setViewportSize({width:430,height:900});
await page.locator('[data-at-tab="new"]').click();
await page.locator('.at-image-upload-field').waitFor({state:'visible'});
const mobile=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,field:document.querySelector('.at-image-upload-field')?.getBoundingClientRect().width}));
if(mobile.scrollWidth>mobile.viewport+2)throw new Error('Upload criou rolagem horizontal no mobile');
if(!mobile.field||mobile.field>mobile.viewport)throw new Error('Área de upload não cabe no mobile');
if(errors.length)throw new Error('Erros JS: '+errors.join(' | '));
console.log('ATESTADOS IMAGE UPLOAD AUDIT: PASS');
await browser.close();
