# Control Ds — V46

Versão de produção do sistema de controle de notebooks da ETE Central Barreiros, mantendo a interface visual aprovada e usando a arquitetura V46 normalizada no Supabase.

## Arquivos de produção
- `index.html` — interface visual aprovada, responsiva e completa
- `v46-bridge.js` — integração da interface com tabelas normalizadas, Realtime e RPCs V46
- `config.js` — URL e publishable key do Supabase
- `_headers` — cabeçalhos de segurança para Cloudflare Pages
- `supabase-schema-v46.sql` — referência da arquitetura/migração V46

## Hospedagem
Cloudflare Pages, branch `main`, site estático.

Configuração sugerida:
- Framework preset: None
- Build command: vazio
- Output directory: `/` ou `.`, conforme a tela da Cloudflare

## Segurança e arquitetura
- Login obrigatório a cada abertura/atualização da página.
- Sessão do Supabase com `persistSession: false`.
- Perfis e roles vêm de `ete_profiles` no banco.
- Dados operacionais não dependem de `app_state` nem de cache persistente em `localStorage`.
- Pedidos, alunos, permissões e histórico usam tabelas normalizadas.
- Alterações sensíveis passam pelas RPCs V46, com validação e autorização no servidor.
- PIN do aluno é tratado pelo backend e armazenado com bcrypt; o frontend não recebe o hash.
- Realtime acompanha as tabelas normalizadas.
- A identidade de quem confirma ações é vinculada à conta autenticada.

## Importante
O banco já foi migrado para V46. Não execute `supabase-schema-v46.sql` novamente sem primeiro verificar o estado atual do projeto Supabase.
