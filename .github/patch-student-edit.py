from pathlib import Path

p=Path('v46-bridge.js')
s=p.read_text(encoding='utf-8')

anchor='  if(m.includes("student_not_found")) return "Aluno não encontrado. Atualize a página e tente novamente.";\n'
assert anchor in s
if 'student_already_exists' not in s:
    s=s.replace(anchor,anchor+'  if(m.includes("student_already_exists")) return "Já existe um aluno com esse nome nessa turma e curso.";\n  if(m.includes("invalid_student_name")) return "Informe um nome de aluno válido.";\n',1)

old='''    const button=document.createElement("button");
    button.type="button";
    button.className="btn small danger";
    button.dataset.deleteStudent=s.id;
    button.textContent="Remover";
    button.title="Remover aluno da lista";
    actions.append(button);
'''
new='''    const editButton=document.createElement("button");
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
'''
if 'data-edit-student' not in s:
    assert old in s
    s=s.replace(old,new,1)

marker='''};
loginWithCredentials=async function(username,password){'''
helper='''};
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
loginWithCredentials=async function(username,password){'''
if 'function v46ResetStudentEditMode' not in s:
    assert marker in s
    s=s.replace(marker,helper,1)

old_submit='''if(id==="studentForm"){if(!canManageStudents())throw new Error("forbidden");const group=parseStudentGroup($("#newStudentGroup").value);await v46Rpc("ete_upsert_student",{p_name:$("#newStudentName").value.trim(),p_class_name:group.className,p_course:group.course});v46CloseDialog("#studentModal");toast("Aluno salvo.");}'''
new_submit='''if(id==="studentForm"){if(!canManageStudents())throw new Error("forbidden");const group=parseStudentGroup($("#newStudentGroup").value),editId=String(form.dataset.editStudentId||"");if(editId){await v46Rpc("ete_update_student",{p_student_id:editId,p_name:$("#newStudentName").value.trim(),p_class_name:group.className,p_course:group.course});v46ResetStudentEditMode();v46CloseDialog("#studentModal");toast("Aluno atualizado.");}else{await v46Rpc("ete_upsert_student",{p_name:$("#newStudentName").value.trim(),p_class_name:group.className,p_course:group.course});v46CloseDialog("#studentModal");toast("Aluno salvo.");}}'''
if 'p_student_id:editId' not in s:
    assert old_submit in s
    s=s.replace(old_submit,new_submit,1)

old_decl='restorePerm=target.closest?.("[data-restore-permission]"),delStudent=target.closest?.("[data-delete-student]")'
new_decl='restorePerm=target.closest?.("[data-restore-permission]"),editStudent=target.closest?.("[data-edit-student]"),delStudent=target.closest?.("[data-delete-student]")'
if 'editStudent=target.closest' not in s:
    assert old_decl in s
    s=s.replace(old_decl,new_decl,1)

old_guard='if(!(confirmExit||revoke||restorePerm||delStudent||delReq||ret||exitRole))return;'
new_guard='if(!(confirmExit||revoke||restorePerm||editStudent||delStudent||delReq||ret||exitRole))return;'
if new_guard not in s:
    assert old_guard in s
    s=s.replace(old_guard,new_guard,1)

old_branch='''}else if(delStudent){
  if(!canManageStudents())throw new Error("forbidden");
  const s=students.find(x=>String(x.id)===String(delStudent.dataset.deleteStudent));
  if(!s)return;
  if(!confirm(`Remover ${s.name} da lista de alunos?\n\nPedidos e histórico antigos não serão apagados.`))return;
  await v46Rpc("ete_delete_student",{p_student_id:String(s.id)});
  toast("Aluno removido da lista.");
}else if(delReq){'''
new_branch='''}else if(editStudent){
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
}else if(delReq){'''
if '}else if(editStudent){' not in s:
    assert old_branch in s
    s=s.replace(old_branch,new_branch,1)

p.write_text(s,encoding='utf-8')
