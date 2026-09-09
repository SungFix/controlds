-- Aplicada em produção em 2026-09-09.
-- Adiciona suporte oficial a 3°A EDF, 3°B EDF e 3°GTU.
-- NÃO executar novamente sem verificar as migrations atuais do projeto.

alter table public.ete_students drop constraint if exists ete_students_class_name_check;
alter table public.ete_students add constraint ete_students_class_name_check check (class_name in ('1°A','1°B','2°A','2°B','3°A','3°B','3°'));
alter table public.ete_students drop constraint if exists ete_students_course_check;
alter table public.ete_students add constraint ete_students_course_check check (course in ('DS','EDF','GTU'));

alter table public.ete_requests drop constraint if exists ete_requests_student_class_check;
alter table public.ete_requests add constraint ete_requests_student_class_check check (student_class in ('1°A','1°B','2°A','2°B','3°A','3°B','3°'));
alter table public.ete_requests drop constraint if exists ete_requests_student_course_check;
alter table public.ete_requests add constraint ete_requests_student_course_check check (student_course in ('DS','EDF','GTU'));

-- As funções ete_upsert_student, ete_update_student e ete_create_request
-- foram atualizadas na migration support_third_year_edf_and_gtu_groups para aceitar:
-- DS: 1°A, 1°B, 2°A, 2°B
-- EDF: 1°A, 1°B, 2°A, 2°B, 3°A, 3°B
-- GTU: 3°
