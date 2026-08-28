# Control Ds — V46

Versão segura e normalizada do sistema de controle de notebooks.

## Arquivos de produção
- `index.html` — aplicativo
- `config.js` — URL e publishable key do Supabase
- `_headers` — cabeçalhos para Cloudflare Pages
- `supabase-schema-v46.sql` — migração do backend

## Hospedagem
Cloudflare Pages, branch `main`, site estático.

Configuração sugerida:
- Framework preset: None
- Build command: vazio
- Output directory: `/` ou `.`, conforme a tela da Cloudflare

## Segurança
- Login sempre obrigatório.
- Sessão não persiste no computador.
- Sem dados operacionais em localStorage.
- PIN do aluno é guardado no banco em bcrypt e nunca retornado ao navegador.
- Após 5 PINs errados, a retirada fica bloqueada por 5 minutos.
- Roles vêm do banco (`ete_profiles`), não do JavaScript.
- Alterações usam RPCs com validação no servidor.
- Tabelas de segredo não podem ser lidas pelo frontend.
- Realtime usa tabelas normalizadas; não existe mais sobrescrita de um JSON único.

## Importante
A migração V46 foi criada de forma aditiva para que a versão antiga continue funcionando até a troca do `index.html`.
Depois de confirmar a nova versão em produção, as permissões antigas de `public.app_state` podem ser desativadas.
