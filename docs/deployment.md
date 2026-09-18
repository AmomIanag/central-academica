# Deploy — Central Acadêmica FIAP

Checklist operacional do **primeiro deploy**. Este documento não cria infraestrutura e **não substitui** a validação real em Vercel, Railway e Supabase.

Nenhuma conta, projeto ou banco de produção foi criado no Deployment Prep.

Arquitetura-alvo:

```
GitHub
  ├── Vercel     Next.js (browser origin + rewrite /api → API)
  └── Railway    Express
                   └── Supabase PostgreSQL (somente banco)
```

Supabase é **apenas** o PostgreSQL hospedado. Sem Supabase Auth, sem PostgREST como backend, sem SDK Supabase no frontend. A API Express continua sendo a única camada que acessa o banco.

Docker Compose permanece **somente desenvolvimento** (`127.0.0.1:5433:5432`). Não é manifesto de produção.

---

## 1. Preconditions

- [ ] Node.js **24.x** (`.nvmrc` e `engines.node`)
- [ ] Repositório com Deployment Prep (testes, lint, typecheck e builds verdes)
- [ ] Segredos de produção **únicos** — nunca reutilizar `SESSION_SECRET`, senha `central`/`central`, e-mail `amom.admin@central.local` ou senha `admin123`
- [ ] Um único aluno inicial (não há cadastro público)
- [ ] **1 instância** da API no primeiro deploy (MemoryStore do rate limit)
- [ ] Banco de produção **vazio** na primeira migração (a migration V2.2 só é segura em schema vazio ou com `academic-v22` já aplicada)

## 2. Supabase

- [ ] Criar um projeto PostgreSQL (somente banco)
- [ ] Copiar a connection string do Postgres (não a URL do PostgREST)
- [ ] Preferir a URL que o provedor indicar para conexões server-side, incluindo `sslmode` se fornecido
- [ ] Colar a CA raiz oficial em `DATABASE_SSL_CA` (PEM). Não commitar o certificado. Não usar `rejectUnauthorized: false`.
- [ ] Não habilitar Auth, não expor a tabela ao frontend, não usar a `anon` key na web
- [ ] Anotar, se o provedor oferecer endpoints distintos: URL de runtime vs URL de migração (`DATABASE_URL` vs `MIGRATION_DATABASE_URL`)

Não conectar ferramentas locais ao banco de produção neste checklist até o passo de migração explícito.

## 3. Production migrations

Comando (explícito; **não** roda no startup da API):

```bash
ALLOW_PRODUCTION_MIGRATIONS=true MIGRATION_DATABASE_URL="<url>" DATABASE_SSL_CA="<pem>" npm run db:migrate:prod
```

O script:

- exige `ALLOW_PRODUCTION_MIGRATIONS=true` e `MIGRATION_DATABASE_URL`
- não cai para `DATABASE_URL`, `TEST_DATABASE_URL` nem `localhost:5433`
- não executa o seed de desenvolvimento
- imprime host/database com senha mascarada
- recusa reshape V2.2 se o banco já tiver dados acadêmicos e `academic-v22` ainda não estiver aplicada
- usa o mesmo helper TLS da API (`DATABASE_SSL_CA` + `rejectUnauthorized: true`) na conexão de `MIGRATION_DATABASE_URL`

- [ ] Confirmar que o banco está vazio (primeiro deploy) ou que `academic-v22` já consta em `pgmigrations`
- [ ] Executar `npm run db:migrate:prod`
- [ ] Confirmar que o seed **não** foi executado

A migration `academic-v22` apaga `grades`/`assessments` para converter seed V1 fictício. Dados reais de produção **não** devem passar por esse reshape. Não altere migrations históricas.

## 4. Initial user

Não use `npm run db:seed` em produção.

```bash
DATABASE_URL="<runtime url>" \
INITIAL_USER_NAME="..." \
INITIAL_USER_EMAIL="..." \
INITIAL_USER_PASSWORD="..." \
INITIAL_USER_RA="..." \
INITIAL_USER_COURSE="..." \
npm run db:bootstrap-user
```

- [ ] Senha diferente de `admin123`
- [ ] E-mail diferente de `amom.admin@central.local`
- [ ] Script não imprime a senha
- [ ] Se e-mail ou RA já existir, o script falha sem sobrescrever
- [ ] Usuário criado com `role=student`

## 5. Railway API

Build / start a partir da raiz do monorepo (ou equivalente no serviço `apps/api`):

```bash
npm run build:api
npm run start:api
```

Variáveis da API:

| Variável | Papel |
|---|---|
| `NODE_ENV` | `production` (cookie `Secure`) |
| `PORT` | fornecido pela plataforma |
| `DATABASE_URL` | PostgreSQL de runtime |
| `DATABASE_SSL_CA` | PEM da CA (opcional, server-side). Mesma variável na API e em `db:migrate:prod` |
| `SESSION_SECRET` | único, ≥ 32 caracteres |
| `CORS_ORIGIN` | origem HTTPS do frontend no **navegador** |
| `TRUST_PROXY_HOPS` | inteiro; **deixar 0** até validar a topologia |

Opcional: `HOST` (padrão de produção `0.0.0.0`).  
`MIGRATION_DATABASE_URL` e `TEST_DATABASE_URL` **não** são necessários na subida da API.

- [ ] Healthcheck da plataforma em `GET /health`
- [ ] Uma réplica apenas

## 6. Vercel frontend

Root do app: `apps/web` (ou rewrite de monorepo equivalente).

```bash
npm run build:web
```

| Variável | Papel |
|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` |
| `API_PROXY_TARGET` | origem HTTPS da API no Railway (**server-side**) |

Não definir `NEXT_PUBLIC_API_PROXY_TARGET`, `DATABASE_URL`, `DATABASE_SSL_CA` nem `SESSION_SECRET` na web.

Rewrite: `/api/:path*` → `<API_PROXY_TARGET>/:path*`.

Desenvolvimento local continua `NEXT_PUBLIC_API_URL=http://localhost:3001` **sem** `API_PROXY_TARGET`.

## 7. Proxy / origin / cookie

- [ ] No navegador, login vai para `https://<vercel>/api/auth/login` (não para o host Railway)
- [ ] Cookie `central.sid`: HttpOnly, `SameSite=Lax`, `Path=/`, **sem** `Domain` explícito
- [ ] `Secure` presente (exige `NODE_ENV=production` + HTTPS)
- [ ] Não usar `SameSite=None` neste primeiro deploy
- [ ] `CORS_ORIGIN` na API = origem Vercel do browser (mesmo com proxy; mutações ainda enviam `Origin`)
- [ ] `POST` sem Origin ou com Origin errado continua `403 CSRF_REJECTED`

## 8. Trust proxy / IP

- [ ] Com `TRUST_PROXY_HOPS=0`, anotar o IP que o limiter de login enxerga
- [ ] Só então, se o Express estiver atrás do proxy do Railway, testar um hop **numérico** (`1`, etc.)
- [ ] Não usar `trust proxy = true` genérico nem funções vindas de env
- [ ] Confirmar que o limiter ainda distingue clientes e não agrupa todo mundo no IP do proxy
- [ ] Pedidos via rewrite Vercel podem apresentar IP do Vercel — validar na prática

## 9. End-to-end validation

- [ ] `GET /health` → `200` `{ "status": "ok", "database": "reachable" }` (sem connection string)
- [ ] Login / logout / `/auth/me`
- [ ] Dashboard, Notas, Tarefas, Agenda
- [ ] Refresh mantém a sessão
- [ ] Segundo usuário (se criado) não vê dados do primeiro

## 10. Security checks

- [ ] Placeholders de desenvolvimento recusados com `NODE_ENV=production`
- [ ] Seed de desenvolvimento não rodou
- [ ] Rate limit de login ainda responde `429` nesta instância única
- [ ] SQL continua parametrizado; Origin exato; sessão no PostgreSQL
- [ ] Nenhum `NEXT_PUBLIC_*` com segredo

## 11. Production release gate

Só promover se:

- [ ] Migrações aplicadas no banco vazio (ou já em V2.2)
- [ ] Usuário inicial criado pelo bootstrap
- [ ] Cookie same-origin via `/api` funciona
- [ ] Healthcheck estável
- [ ] CSRF/CORS com a origem real do browser
- [ ] `TRUST_PROXY_HOPS` validado ou explicitamente deixado em `0` com o risco conhecido

## 12. Rollback notes

- Reverter o deploy da API/web nas plataformas; sessões já emitidas podem invalidar-se se `SESSION_SECRET` mudar
- Não rode `down` de migrations em produção sem um plano — o `down` de V2.2 não reconstrói notas apagadas
- Não use `docker compose down -v` no ambiente local como analogia; isso apaga o volume de desenvolvimento
- Horizontal scaling exige store de rate limit compartilhado **antes** de subir réplicas

---

Itens que só a infraestrutura real pode confirmar: hops de proxy, encaminhamento de `Set-Cookie` no rewrite da Vercel, e se runtime e migração usam o mesmo endpoint ou um pooler distinto. TLS do Postgres deve usar `DATABASE_SSL_CA` no Railway (não um arquivo local nem `NODE_EXTRA_CA_CERTS`).
