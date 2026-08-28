"use strict";

// V46 bridge: keeps the approved V45 visual/UX while replacing the legacy
// app_state/localStorage operational model with normalized Supabase tables/RPCs.
let v46AuthUser=null;
let v46Channels=[];
let v46ReloadTimer=null;

function v46TimeText(value){ return String(value||"").slice(0,5); }
function v46RoleLabel(role){ return role==="adm"?"Administrador":role==="diretor"?"Diretor":"Monitor"; }
function v46EmptyState(){ return {requests:[],history:[],students:[],permissions:[],deletedRequestIds:[],historyClearedAt:""}; }
function v46ExplainError(err){
  const m=String(err?.message||err||"");
  if(m.includes("duplicate_overlap")) return "Já existe um pedido ativo desse aluno em um horário que coincide.";
  if(m.includes("invalid_pin")) return "PIN incorreto ou inválido. Use de 4 a 8 números.";
  if(m.includes("pin_locked")) return "Muitas tentativas incorretas. Aguarde 5 minutos.";
  if(m.includes("code_in_use")) return "Este notebook já está em uso.";
  if(m.includes("forbidden")) return "Sua conta não tem permissão para esta ação.";
  if(m.includes("request_in_use")) return "Confirme a devolução antes de apagar o pedido.";
  if(m.includes("student_not_found")) return "Aluno não encontrado. Atualize a página e tente novamente.";
  if(m.includes("student_already_exists")) return "Já existe um aluno com esse nome nessa turma e curso.";
  if(m.includes("invalid_student_name")) return "Informe um nome de aluno válido.";
  if(m.includes("restore_window_expired")) return "O prazo de 5 minutos para restaurar terminou.";
  if(m.includes("past_date")) return "Não é possível criar pedido para uma data passada.";
  if(m.includes("Invalid login credentials")) return "Usuário ou senha inválidos.";
  return "Não foi possível concluir a ação. Verifique a conexão e tente novamente.";
}
function v46ClearBrowserResidue(){try{for(const key of Object.keys(localStorage)){if(key.startsWith("ete_")||/^sb-.*-auth-token$/.test(key)) localStorage.removeItem(key);}sessionStorage.clear();}catch{}}
function v46DerivedStatus(row){const raw=String(row?.status||"wait");if(raw!=="use")return raw;const dateKey=String(row?.date_key||""),nowKey=recifeDateKey();if(dateKey&&dateKey<nowKey)return"late";if(dateKey&&dateKey>nowKey)return"use";const end=minutesFromTime(v46TimeText(row?.end_time));if(!Number.isFinite(end))return"use";return currentMinutes()>Math.min(end+15,MAX_TIME_MINUTES)?"late":"use";}
function v46MapRequest(row){const start=v46TimeText(row.start_time),end=v46TimeText(row.end_time);return normalizeRequest({id:row.id,student:row.student_name,studentName:row.student_name,studentClass:row.student_class,studentCourse:row.student_course,studentId:row.student_id,room:[row.student_class,row.student_course].filter(Boolean).join(" "),reason:row.reason,period:"Horário definido",startTime:start,endTime:end,time:`${start}–${end}`,dateKey:String(row.date_key||""),status:v46DerivedStatus(row),code:String(row.code||""),requestedBy:row.requested_by_username||"",requestedById:row.requested_by||"",requestedByLabel:row.requested_by_label||"",createdAt:row.created_at,updatedAt:row.updated_at,pickedAt:row.picked_at,pickedBy:row.picked_by_label||"",returnedAt:row.returned_at,returnedBy:row.returned_by_label||""});}
function v46MapStudent(row){return normalizeStudent({id:row.id,name:row.name,className:row.class_name,course:row.course,useCount:Number(row.use_count||0),lastUsed:row.last_used||""});}
function v46MapPermission(row){return normalizePermission({id:row.id,student:row.student,className:row.class_name,interval:row.interval,reason:row.reason,active:row.active,exitConfirmed:row.exit_confirmed,exitConfirmedAt:row.exit_confirmed_at||"",exitVerifierRole:row.exit_verifier_role||"",exitVerifierName:row.exit_verifier_name||"",restoreUntil:row.restore_until?Date.parse(row.restore_until):0,createdAt:row.created_at,updatedAt:row.updated_at});}
function v46MapHistory(row){return normalizeHistoryItem({id:row.id,atISO:row.at_iso,at:row.at_iso?new Date(row.at_iso).toLocaleTimeString("pt-BR",{timeZone:"America/Recife",hour:"2-digit",minute:"2-digit"}):recifeTimeLabel(),text:row.text,detail:row.detail||"",type:row.type||"system",responsible:row.responsible||"Sistema"});}
async function v46LoadData(showState=true){if(!sb||!v46AuthUser)return;if(showState)setSyncState("loading");try{const[rq,st,pm,hs]=await Promise.all([sb.from("ete_requests").select("*").order("created_at",{ascending:false}),sb.from("ete_students").select("*").order("name",{ascending:true}),sb.from("ete_permissions").select("*").order("created_at",{ascending:false}),sb.from("ete_history").select("*").order("at_iso",{ascending:false})]);for(const result of[rq,st,pm,hs])if(result.error)throw result.error;applyingRemote=true;data=(rq.data||[]).map(v46MapRequest);students=(st.data||[]).map(v46MapStudent);permissions=(pm.data||[]).map(v46MapPermission);history=(hs.data||[]).map(v46MapHistory);historyClearedAt="";deletedRequestIds=[];applyingRemote=false;render();setSyncState("online");}catch(err){applyingRemote=false;console.error("Falha ao carregar dados V46:",err);setSyncState("error");throw err;}}
function v46ScheduleReload(){clearTimeout(v46ReloadTimer);v46ReloadTimer=setTimeout(()=>v46LoadData(false).catch(()=>{}),180);}
function v46Subscribe(){if(!sb)return;for(const ch of v46Channels){try{sb.removeChannel(ch)}catch{}}v46Channels=[];["ete_requests","ete_students","ete_permissions","ete_history"].forEach(table=>{const ch=sb.channel("control-ds-v46-"+table+"-"+Math.random().toString(36).slice(2)).on("postgres_changes",{event:"*",schema:"public",table},v46ScheduleReload).subscribe(status=>{if(status==="SUBSCRIBED")setSyncState("online");if(["CHANNEL_ERROR","TIMED_OUT","CLOSED"].includes(status))setSyncState("error")});v46Channels.push(ch);});}
async function v46Rpc(name,args={}){if(!navigator.onLine){setSyncState("error");throw new Error("offline");}setSyncState("saving");const{data:result,error}=await sb.rpc(name,args);if(error){setSyncState("error");throw error;}await v46LoadData(false);return result;}
scheduleSharedPersist=()=>{};persistLocalShared=()=>{};loadLocalSharedState=()=>v46EmptyState();saveStudents=()=>{};pushRemoteState=async()=>false;loadRemoteShared=v46LoadData;subscribeRemote=v46Subscribe;log=()=>{};
setSyncState=function(state){const pill=$("#syncPill"),side=$("#sideSyncText"),label=$("#sideSyncLabel");if(!pill)return;pill.classList.remove("online","error");const map={login:["Aguardando login","Entre com sua conta para carregar os dados compartilhados."],loading:["Carregando dados","Conectando ao Supabase..."],saving:["Salvando","Enviando a alteração com segurança..."],online:["Sincronizado","Dados protegidos e atualizados em tempo real."],error:["Falha de conexão","Não faça alterações até a conexão voltar."]};const[title,detail]=map[state]||map.error;pill.textContent=title;if(state==="online")pill.classList.add("online");if(state==="error")pill.classList.add("error");if(label)label.textContent=state==="online"?"Supabase conectado":state==="error"?"Sem conexão":"Sincronização";if(side)side.textContent=detail;};
canDeleteRequest=function(r){if(!currentUser||!r)return false;return currentUser.role==="adm"||String(r.requestedById||"")===String(v46AuthUser?.id||"");};
const v46RenderStudentsBase=renderStudents;
renderStudents=function(){
  v46RenderStudentsBase();
  if(!canManageStudents())return;
  const q=($("#studentSearch")?.value||"").toLocaleLowerCase("pt-BR");
  const list=[...students]
    .filter(s=>(s.name+" "+s.className+" "+s.course).toLocaleLowerCase("pt-BR").includes(q))
    .sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  const cards=$$("#studentRows .student-card");
  cards.forEach((card,index)=>{
    const s=list[index],foot=card.querySelector(".student-card-foot");
    if(!s||!foot||foot.querySelector("[data-delete-student]"))return;
    let actions=foot.querySelector(".v46-student-actions");
    if(!actions){
      actions=document.createElement("div");
      actions.className="row-actions v46-student-actions";
      const useButton=foot.querySelector("[data-use-student]");
      if(useButton)actions.append(useButton);
      foot.append(actions);
    }
    const editButton=document.createElement("button");
    editButton.type="button";
    editButton.className="btn small secondary";
    editButton.dataset.editStudent=s.id;
    editButton.textContent="Editar";
    editButton.title="Editar nome, turma ou curso";
    actions.append(editButton);
    const button=document.createElement("button");
    button.type="button";
    button.className="btn small danger";
    button.dataset.deleteStudent=s.id;
    button.textContent="Remover";
    button.title="Remover aluno e todos os dados ligados";
    actions.append(button);
  });
};
function v46ResetStudentEditMode(){
  const form=$("#studentForm");
  if(form)delete form.dataset.editStudentId;
  const title=$("#studentModalTitle");
  if(title)title.textContent="Cadastrar aluno";
  const submit=form?.querySelector('button[type="submit"]');
  if(submit)submit.textContent="Salvar aluno";
}
document.addEventListener("click",event=>{
  if(event.target.closest?.("#newStudentBtn,#newStudentBtn2"))v46ResetStudentEditMode();
},true);
loginWithCredentials=async function(username,password){const client=initSupabase();username=String(username||"").trim().toLowerCase();const email=authEmailForUsername(username);if(!client||!email)throw new Error("Invalid login credentials");const{data:authData,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;v46AuthUser=authData.user;const{data:profile,error:profileError}=await client.from("ete_profiles").select("user_id,username,display_name,role").eq("user_id",authData.user.id).single();if(profileError||!profile){try{await client.auth.signOut({scope:"local"})}catch{}throw new Error("Conta sem perfil autorizado.");}setCurrentUser({username:profile.username,displayName:profile.display_name,role:profile.role,roleLabel:v46RoleLabel(profile.role),userId:profile.user_id});unlockApp();await v46LoadData(true);v46Subscribe();return authData;};
forceFreshLogin=async function(){v46ClearBrowserResidue();const client=initSupabase();if(!client){setSyncState("error");return;}try{await client.auth.signOut({scope:"local"})}catch{}currentUser=null;v46AuthUser=null;appReady=false;data=[];students=[];permissions=[];history=[];deletedRequestIds=[];render();setAuthLocked(true);$("#loginUsername").value="";$("#loginPassword").value="";setSyncState("login");};
logoutApp=async function(){for(const ch of v46Channels){try{sb?.removeChannel(ch)}catch{}}v46Channels=[];try{if(sb)await sb.auth.signOut({scope:"local"})}catch{}v46AuthUser=null;currentUser=null;appReady=false;data=[];students=[];permissions=[];history=[];deletedRequestIds=[];v46ClearBrowserResidue();render();setAuthLocked(true);$("#loginPassword").value="";setSyncState("login");};
clearHistoryWithPassword=async function(password){if(!canClearHistory())throw new Error("Seu perfil não pode apagar o histórico.");const client=initSupabase(),email=authEmailForUsername(currentUser?.username);if(!client||!email)throw new Error("Não foi possível validar sua conta.");const{error:authError}=await client.auth.signInWithPassword({email,password});if(authError)throw new Error("Senha incorreta.");if(IS_TEST_PREVIEW)return{removed:history.length,preview:true};const previous=history.map(normalizeHistoryItem);downloadHistoryBackup(previous);await v46Rpc("ete_clear_history",{});return{removed:previous.length,preview:false};};
function v46CurrentGroup(){return parseStudentGroup(getCurrentStudentGroup());}function v46CloseDialog(id){try{$(id)?.close()}catch{}}function v46BusyButton(form){const btn=form?.querySelector('button[type="submit"]');if(!btn)return()=>{};const old=btn.textContent;btn.disabled=true;btn.textContent="Salvando...";return()=>{btn.disabled=false;btn.textContent=old;};}
document.addEventListener("submit",async event=>{const form=event.target,id=form?.id||"";if(!["studentForm","exitConfirmForm","permissionForm","requestForm","pickupForm"].includes(id))return;event.preventDefault();event.stopImmediatePropagation();const done=v46BusyButton(form);try{if(id==="studentForm"){if(!canManageStudents())throw new Error("forbidden");const group=parseStudentGroup($("#newStudentGroup").value),editId=String(form.dataset.editStudentId||"");if(editId){await v46Rpc("ete_update_student",{p_student_id:editId,p_name:$("#newStudentName").value.trim(),p_class_name:group.className,p_course:group.course});v46ResetStudentEditMode();v46CloseDialog("#studentModal");toast("Aluno atualizado.");}else{await v46Rpc("ete_upsert_student",{p_name:$("#newStudentName").value.trim(),p_class_name:group.className,p_course:group.course});v46CloseDialog("#studentModal");toast("Aluno salvo.");}}else if(id==="exitConfirmForm"){if(!canConfirmExit())throw new Error("forbidden");if(!pendingExitPermissionId)throw new Error("Permissão não encontrada.");await v46Rpc("ete_confirm_exit",{p_permission_id:String(pendingExitPermissionId),p_verifier_role:currentUser?.role==="monitor"?"Monitor":"Professor",p_verifier_name:currentUser?.displayName||"Usuário"});v46CloseDialog("#exitConfirmModal");pendingExitPermissionId=null;toast("Saída confirmada.");}else if(id==="permissionForm"){if(!canCreatePermission())throw new Error("forbidden");await v46Rpc("ete_create_permission",{p_student:$("#permissionStudent").value.trim(),p_class_name:$("#permissionClass").value.trim(),p_interval:$("#permissionInterval").value,p_reason:$("#permissionReason").value.trim()});v46CloseDialog("#permissionModal");toast("Permissão registrada.");}else if(id==="requestForm"){if(!canCreateRequest())throw new Error("forbidden");const start=formState.start,end=formState.end,dateKey=$("#date").value||recifeDateKey(),studentName=$("#student").value.trim(),pin=$("#studentPin").value.trim();if(!studentName){$("#student").focus();throw new Error("Informe o nome do aluno.");}if(!/^\d{4,8}$/.test(pin)){$("#studentPin").focus();throw new Error("O PIN do aluno deve ter de 4 a 8 números.");}if(minutesFromTime(end)<=minutesFromTime(start))throw new Error("A devolução precisa ser depois da retirada.");const group=v46CurrentGroup();await v46Rpc("ete_create_request",{p_student_name:studentName,p_student_class:group.className,p_student_course:group.course,p_reason:$("#reason").value.trim(),p_start_time:start,p_end_time:end,p_date_key:dateKey,p_pin:pin});$("#studentPin").value="";v46CloseDialog("#requestModal");toast("Pedido criado e salvo.");}else if(id==="pickupForm"){if(!canPickup())throw new Error("forbidden");const requestId=String($("#pickupForm").dataset.id||""),pin=$("#pickupPin").value.trim(),code=$("#computerCode").value.trim();if(!/^\d{4,8}$/.test(pin))throw new Error("Digite o PIN do aluno (4 a 8 números).");if(!/^\d{6}$/.test(code))throw new Error("Digite um código de 6 dígitos.");await v46Rpc("ete_pickup_request",{p_request_id:requestId,p_pin:pin,p_code:code});$("#pickupPin").value="";$("#computerCode").value="";v46CloseDialog("#pickupModal");toast("Retirada confirmada.");}}catch(err){console.error(err);toast(v46ExplainError(err));}finally{done();}},true);
document.addEventListener("click",async event=>{const target=event.target,confirmExit=target.closest?.("[data-confirm-exit]"),revoke=target.closest?.("[data-revoke-permission]"),restorePerm=target.closest?.("[data-restore-permission]"),editStudent=target.closest?.("[data-edit-student]"),delStudent=target.closest?.("[data-delete-student]"),delReq=target.closest?.("[data-delete-request]"),ret=target.closest?.("[data-return]"),exitRole=target.closest?.("[data-exit-role]");if(!(confirmExit||revoke||restorePerm||editStudent||delStudent||delReq||ret||exitRole))return;event.preventDefault();event.stopImmediatePropagation();try{if(exitRole){toast("A confirmação usa automaticamente o perfil de quem está logado.");return;}if(confirmExit){if(!canConfirmExit())throw new Error("forbidden");const p=permissions.find(x=>String(x.id)===String(confirmExit.dataset.confirmExit));if(!p)throw new Error("Permissão não encontrada.");pendingExitPermissionId=p.id;pendingExitVerifierRole=currentUser?.roleLabel||"Usuário";$("#exitStudentInfo").textContent=p.student;$("#exitClassInfo").textContent=p.className;$("#exitIntervalInfo").textContent=permissionIntervalName(p.interval)+" · "+permissionIntervalLabel(p.interval);$("#exitVerifierName").value=currentUser?.displayName||"";$("#exitVerifierName").readOnly=true;$$("[data-exit-role]").forEach(btn=>{btn.classList.remove("active");btn.disabled=true;btn.title="A identidade vem da conta autenticada";});$("#exitConfirmModal").showModal();}else if(revoke){if(!canCreatePermission())throw new Error("forbidden");await v46Rpc("ete_cancel_permission",{p_permission_id:String(revoke.dataset.revokePermission)});toast("Permissão cancelada. Você pode restaurar por 5 minutos.");}else if(restorePerm){if(!canCreatePermission())throw new Error("forbidden");await v46Rpc("ete_restore_permission",{p_permission_id:String(restorePerm.dataset.restorePermission)});toast("Permissão restaurada.");}else if(editStudent){
  if(!canManageStudents())throw new Error("forbidden");
  const s=students.find(x=>String(x.id)===String(editStudent.dataset.editStudent));
  if(!s)return;
  const form=$("#studentForm");
  form.dataset.editStudentId=String(s.id);
  $("#newStudentName").value=s.name;
  setGroupPickerValue("newStudentGroup",`${s.className} ${s.course}`);
  closeGroupPickers();
  $("#studentModalTitle").textContent="Editar aluno";
  const submit=form.querySelector('button[type="submit"]');
  if(submit)submit.textContent="Salvar alterações";
  $("#studentModal").showModal();
}else if(delStudent){
  if(!canManageStudents())throw new Error("forbidden");
  const s=students.find(x=>String(x.id)===String(delStudent.dataset.deleteStudent));
  if(!s)return;
  if(!confirm(`Remover ${s.name} e TODOS os dados ligados a esse aluno?\n\nSerão apagados pedidos, PINs de pedidos, permissões e histórico relacionados. Essa ação não pode ser desfeita.`))return;
  await v46Rpc("ete_delete_student",{p_student_id:String(s.id)});
  toast("Aluno e dados ligados removidos.");
}else if(delReq){const r=data.find(x=>String(x.id)===String(delReq.dataset.deleteRequest));if(!r)return;if(!canDeleteRequest(r))throw new Error("forbidden");if(["use","late"].includes(r.status))throw new Error("request_in_use");if(!confirm(`Apagar o pedido de ${r.student}?\n\nEssa ação remove o pedido da agenda, dos computadores e da lista de pedidos.`))return;await v46Rpc("ete_delete_request",{p_request_id:String(r.id)});toast("Pedido apagado.");}else if(ret){if(!canReturn())throw new Error("forbidden");const r=data.find(x=>String(x.id)===String(ret.dataset.return)),wasLate=r?.status==="late";await v46Rpc("ete_return_request",{p_request_id:String(ret.dataset.return)});toast(wasLate?"Devolução confirmada com atraso.":"Devolução confirmada.");}}catch(err){console.error(err);toast(v46ExplainError(err));}},true);
for(const input of [$("#studentPin"),$("#pickupPin")]){if(!input)continue;input.minLength=4;input.maxLength=8;input.pattern="\\d{4,8}";input.autocomplete="new-password";}
v46ClearBrowserResidue();data=[];students=[];permissions=[];history=[];deletedRequestIds=[];try{render()}catch{}setSyncState("login");

// V46_DYNAMIC_DATE_RESET
resetRequestForm=function(){const day=recifeDateKey();$("#requestForm").reset();$("#date").value=day;$("#date").min=day;$("#studentPin").value="";formState={start:"07:30",end:"08:20"};selectedSavedStudentId="";populateSavedStudentSelect("");setGroupPickerValue("studentGroup","1°A DS");updateRequestSummary();};
setInterval(()=>{const nextDay=recifeDateKey();if(nextDay!==today){today=nextDay;render();}},30000);
