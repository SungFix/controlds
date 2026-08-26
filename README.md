# ETE — Controle de Notebooks com Supabase Realtime

Esta versão usa:

- GitHub Pages para hospedar o site;
- Supabase Auth para autenticar os usuários;
- Supabase Postgres para armazenar os dados compartilhados;
- Supabase Realtime para atualizar automaticamente os outros computadores.

## Arquivos

- `index.html` — sistema.
- `config.js` — URL e Publishable key do projeto Supabase.
- `supabase-schema.sql` — cria a tabela, RLS e habilita Realtime.
- `.nojekyll` — facilita publicação pelo GitHub Pages.

## 1. Criar o projeto no Supabase

Crie um projeto em https://supabase.com/

Depois abra **SQL Editor**, cole todo o conteúdo de `supabase-schema.sql` e execute.

## 2. Criar os quatro usuários no Supabase Auth

No painel do Supabase, abra **Authentication > Users** e crie manualmente:

| Usuário do site | E-mail no Supabase | Senha inicial |
| --- | --- | --- |
| klenio | klenio@ete.example.com | Use a senha inicial combinada internamente |
| miguel | miguel@ete.example.com | Use a senha inicial combinada internamente |
| ronaldo | ronaldo@ete.example.com | Use a senha inicial combinada internamente |
| monitor | monitor@ete.example.com | Use a senha inicial combinada internamente |

Marque os usuários como confirmados ao criá-los pelo painel.

O site continua exibindo apenas `klenio`, `miguel`, `ronaldo` e `monitor`.
Os e-mails servem apenas para o Supabase Auth.

Por segurança, não publique senhas reais ou iniciais no GitHub. A senha criada no Supabase Auth precisa ser a mesma senha usada no primeiro login local do usuário, e deve ser trocada no primeiro acesso em **Configurações > Alterar minha senha**.

## 3. Configurar `config.js`

No Supabase, copie:

- Project URL;
- Publishable key (ou anon key em projetos antigos).

Cole os dois valores em `config.js`.

NUNCA coloque a `service_role` no GitHub ou no navegador.

## 4. Qual computador deve abrir primeiro?

Se você já possui pedidos/histórico na versão local e quer preservá-los:

1. configure o Supabase;
2. abra esta nova versão PRIMEIRO no computador que contém os dados corretos;
3. faça login;
4. como o banco ainda estará vazio, esse computador enviará seu estado atual para o Supabase;
5. depois abra nos outros computadores.

Se o banco já possuir dados, o banco online vence o `localStorage` daquele navegador.

## 5. Sincronização

Depois que o usuário entra:

- o site lê o estado salvo no Supabase;
- toda alteração é enviada ao banco;
- o site mantém um canal Realtime aberto;
- quando outro computador altera o registro, os demais recebem a mudança e redesenham a tela automaticamente.

## 6. Publicar no GitHub Pages

Envie todos os arquivos desta pasta para a raiz do repositório.

Depois:

**Settings > Pages > Deploy from a branch > main > / (root)**

## Observação sobre segurança

Esta versão exige Supabase Auth e RLS para impedir acesso anônimo ao estado compartilhado.

As permissões funcionais de Diretor/ADM/Monitor continuam sendo aplicadas pelo JavaScript do sistema. Para um ambiente com exigência de segurança contra manipulação intencional por usuários autenticados, a próxima evolução é separar os dados em tabelas e aplicar as funções de cada cargo diretamente nas políticas RLS/RPC do banco.
