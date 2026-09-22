# Status do projeto — Central Acadêmica FIAP

Handoff operacional. **V1 concluída** (Etapas 1–8). **V2 concluída** (tarefas, agenda e resumo no dashboard). **V2.2 concluída** (gestão acadêmica editável). **Security hardening concluído** (exposição local do Postgres, throttling de login, scrypt assíncrono). **Deployment Prep concluído** (contrato de produção, migrate/bootstrap, proxy `/api`; sem infra criada). **Desktop V1** (Electron Windows apontando para a web de produção).  
Antes de implementar qualquer coisa, leia também [architecture.md](./architecture.md), [deployment.md](./deployment.md) e [desktop.md](./desktop.md).

## Objetivo

Aplicação web full-stack para centralizar informações acadêmicas do aluno FIAP.

- **V1:** módulo de **notas** (login, dashboard acadêmico e disciplinas).
- **V2:** **tarefas pessoais**, **agenda** (visão das tasks) e resumo compacto de tarefas no dashboard.
- **V2.2:** CRUD de disciplinas, edição de notas CP/GS, média anual, situação derivada e presença.

## Stack

- Monorepo **npm workspaces** (`apps/web`, `apps/api`, `apps/desktop`)
- **web:** Next.js (App Router) + React + TypeScript + Tailwind
- **api:** Node.js + Express + TypeScript
- **desktop:** Electron + TypeScript (processo principal) + electron-builder (NSIS x64)
- **banco:** PostgreSQL via Docker Compose; driver `pg` + SQL; migrations `node-pg-migrate`
- Sem ORM. Sem `packages/` na V1/V2/V2.2.

## Arquitetura em vigor

- O frontend **não** acessa o PostgreSQL.
- Express é a única camada de negócio e o único acesso ao banco.
- Auth HTTP: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- API acadêmica autenticada: `GET /me/dashboard`, `GET|POST /me/disciplines`, `GET|PATCH|DELETE /me/disciplines/:id`, `PATCH /me/disciplines/:id/grades`, `PATCH /me/disciplines/:id/attendance`.
- API de tarefas autenticada: `GET|POST /me/tasks`, `GET /me/tasks/summary`, `GET /me/tasks/options`, `GET|PATCH|DELETE /me/tasks/:id`, `POST /me/tasks/:id/complete`, `POST /me/tasks/:id/reopen`.
- `GET /health` permanece público: `{ "status", "database" }`.
- Rotas desconhecidas da API respondem `404` no envelope `{ "error": { "code", "message" } }`.
- Métodos mutáveis exigem `Origin` igual a `CORS_ORIGIN`; Origin ausente ou inválido responde `403` `CSRF_REJECTED`. GET/HEAD/OPTIONS não exigem Origin.

## Infraestrutura local

| Serviço                               | Endereço                            |
| ------------------------------------- | ----------------------------------- |
| web                                   | `http://localhost:3000`             |
| api                                   | `http://localhost:3001`             |
| PostgreSQL **deste projeto** (Docker) | `127.0.0.1:5433` → container `5432` |

O PostgreSQL 18 instalado no Windows em `localhost:5432` **não deve ser parado, migrado nem alterado**.  
`DATABASE_URL` da API aponta para `localhost:5433` / `central_academica`.  
`TEST_DATABASE_URL` aponta para o mesmo Postgres Docker, database `central_academica_test`.

`SESSION_SECRET` é obrigatório (mínimo 32 caracteres). Copie de `apps/api/.env.example`. Em produção, `NODE_ENV=production` é obrigatório (cookie `Secure` + HTTPS) e os placeholders de desenvolvimento de `SESSION_SECRET`, `CORS_ORIGIN=http://localhost:3000` e credenciais `central`/`central` são recusados na subida da API. `DATABASE_SSL_CA` é opcional (PEM da CA, server-side) e não vai para o frontend.

`TRUST_PROXY_HOPS` é um inteiro (padrão `0`). Não definir automaticamente como `1`. O valor correto só pode ser escolhido na validação real do Railway. `trust proxy = true` genérico não é usado.

Produção: Vercel (web, rewrite `/api`) → Railway (API) → Supabase PostgreSQL (somente banco). O desktop V1 carrega a origem Vercel; não fala com Railway/Supabase diretamente. Docker Compose não vai para produção. Checklist web/API: [deployment.md](./deployment.md). Desktop: [desktop.md](./desktop.md).

## Etapas

| Etapa                           | Status                                                      |
| ------------------------------- | ----------------------------------------------------------- |
| 1. Planejamento e arquitetura   | Concluída                                                   |
| 2. Setup                        | Concluída                                                   |
| 3. Banco e modelo acadêmico     | Concluída                                                   |
| 4. Autenticação e segurança     | Concluída                                                   |
| 5. API acadêmica                | Concluída                                                   |
| 6. Frontend e identidade visual | Concluída                                                   |
| 7. Integração ponta a ponta     | Concluída                                                   |
| 8. Polimento, testes e entrega  | **Concluída — V1 fechada**                                  |
| V2. Tarefas, agenda e dashboard | **Concluída**                                               |
| V2.2. Gestão acadêmica          | **Concluída**                                               |
| Security hardening              | **Concluído**                                               |
| Deployment Prep                 | **Concluído** — sem deploy real                             |
| Desktop V1                      | **Concluído** — Electron Windows, mesma origem/dados da web |

## Banco

Migrations em `apps/api/migrations/`: as 7 acadêmicas da Etapa 3 + `20260917140800_create-session` + `20260917215800_create-tasks` + `20260918025600_academic-v22`.

Tabelas: `users`, `terms`, `professors`, `disciplines`, `enrollments`, `assessments`, `grades`, `session`, `tasks` (+ `pgmigrations`).

`disciplines` é oferta anual do aluno (`owner_user_id`, `academic_year`). `assessments` representa os quatro slots CP/GS dos dois semestres. `grades.score` está na escala 0–100. `enrollments` guarda aulas e faltas; o percentual de presença é derivado.

`tasks` é organização pessoal do aluno. `assessments` continua sendo avaliação acadêmica/nota. Não há fusão automática.

Estado da task: `completed_at IS NULL` → pending; caso contrário → completed. Não há coluna `status`, `type` nem `progress`.

Prazo: `due_on` (DATE) **ou** `due_at` (TIMESTAMPTZ), nunca ambos; ambos NULL = sem prazo. Associação opcional a disciplina via FK composta `(user_id, discipline_id)` contra `enrollments`, `ON DELETE RESTRICT`. Exclusão de task é hard delete. Exclusão de disciplina com task vinculada responde `409 CONFLICT`.

Seed fictício e idempotente (não cria tasks). Credencial **somente de desenvolvimento**: `amom.admin@central.local` / `admin123` (hash scrypt). O UUID do usuário seed permanece o mesmo. O texto "admin" no e-mail **não** torna o usuário administrador; `role` continua `student`. Não é credencial de produção. O seed é recusado com `NODE_ENV=production` e **não** roda no startup, nas migrations nem no frontend.

A migration `academic-v22` substituiu estrutura acadêmica **fictícia** da V1 (apaga `grades`/`assessments` incompatíveis). Dados reais de produção não devem passar por esse reshape: o primeiro deploy deve começar com banco vazio, ou com `academic-v22` já aplicada. `npm run db:migrate:prod` recusa o reshape se houver dados e a migration ainda não estiver aplicada.

Produção **não** usa o seed. O primeiro aluno é criado com `npm run db:bootstrap-user` (`INITIAL_USER_*`), que recusa a senha `admin123` e o e-mail de seed e não sobrescreve usuário existente.

Não persistir média nem situação acadêmicas. Fórmulas em `apps/api/src/modules/academic/grades.ts`.

## Database de testes

Testes da API usam `central_academica_test` no mesmo container Docker (`localhost:5433`), nunca o database de desenvolvimento.

- Variável: `TEST_DATABASE_URL`
- Preparação: `npm run db:test:prepare` (também roda no início de `npm test` da API)
- Configuração canônica: `apps/api/vitest.config.mts` (setup obrigatório com `assertTestDatabase`)
- Antes de limpeza destrutiva, a suíte valida que a URL aponta inequivocamente para `central_academica_test`

Não usar o PostgreSQL do Windows em `5432`. Não executar `docker compose down -v`.

## Auth e CSRF

Sessão server-side (`express-session` + `connect-pg-simple`) na tabela `session`, usando o pool de `DATABASE_URL` (em produção, o PostgreSQL hospedado — sem localhost). Cookie `central.sid` (httpOnly, `SameSite=Lax`, `Path=/`, sem `Domain` explícito, `Secure` só quando `NODE_ENV=production`). Helmet ligado. Login com Zod + scrypt **assíncrono** (`crypto.scrypt`, `timingSafeEqual`). Sessão regenerada após autenticação. Logout destrói a sessão e limpa o cookie.

`POST /auth/login` tem throttling em memória do processo: limite por IP/origem e limite por e-mail normalizado. Estouro responde `429` `TOO_MANY_REQUESTS` com a mesma mensagem genérica, exista ou não a conta. O store atual **não é compartilhado entre instâncias**. **1 instância da API** no primeiro deploy; multi-instância exigirá store distribuído. Sem Redis neste pass.

`TRUST_PROXY_HOPS` (inteiro, padrão `0`) configura hops confiáveis do Express. Não usar `true` nem funções via env. O valor de produção só deve ser definido depois de validar a topologia no Railway.

Mutações (POST/PATCH/PUT/DELETE), inclusive login/logout e a gestão acadêmica, exigem Origin confiável (`CORS_ORIGIN` = origem do **browser**, mesmo com proxy `/api`). Sem token CSRF separado.

Auth em `apps/api/src/modules/auth/`. `requireAuth` e `requireTrustedOrigin` em `src/middlewares`. Envelope HTTP em `src/http`.

## Frontend

Layouts `(auth)` e `(app)`. Login, dashboard, notas (`/notas`, `/notas/nova`, `/notas/[id]`, `/notas/[id]/editar`), tarefas (`/tarefas`, `/tarefas/nova`, `/tarefas/[id]`) e agenda (`/agenda`) contra a API real. Design dark-first FIAP. Cliente HTTP com `credentials: "include"`; 401/`UNAUTHENTICATED` redireciona ao login. Sem mocks permanentes.

Em desenvolvimento o browser chama `http://localhost:3001`. Em produção o browser chama `/api`; o Next.js reescreve para `API_PROXY_TARGET` (Railway). Isso preserva cookie first-party (`SameSite=Lax`).

Sidebar: Dashboard, Tarefas, Agenda e Notas.

O dashboard busca `/me/dashboard` e `/me/tasks/summary` em paralelo. Falha no bloco de tarefas não derruba o resumo acadêmico.

Agenda é visualização das tasks (hoje, semana, mês, próximas, sem prazo). Avaliações não entram na agenda da V2.

## Testes

- API: Vitest + Supertest (auth, CSRF, sessão, média anual/status, CRUD acadêmico, presença, tasks, isolamento, 404). Script: `npm test` (prepara o database de teste).
- web: Vitest (formatação, erros HTTP, contrato de `due`, timezone/calendário, cliente de tasks). Sem Cypress/Playwright.

Total atual: **159 testes** (127 API + 32 web).

## Decisões aprovadas (não reabrir sem necessidade)

- Não persistir média nem situação acadêmicas.
- Aluno autenticado acessa só os próprios dados. Editar disciplina pessoal não altera dados de outro usuário.
- `tasks` ≠ `assessments`; não fundir automaticamente.
- Sem coluna `type`, `progress` ou `status` em tasks.
- Sem timezone persistido por task.
- Sem JWT, Redis, Auth.js/NextAuth, Passport, `cookie-parser` (salvo necessidade concreta).
- Rate limiting de login é process-local (`express-rate-limit` + MemoryStore). Multi-instância exigirá store compartilhado.
- Pesos CP/GS e dos semestres são regra de negócio fixa; o aluno não edita pesos.
- Sem fórmula pós-exame e sem reprovação por frequência nesta versão.

## Git

O usuário faz commit e push manualmente. Agentes **não** executam `add`, `commit`, `push`, `pull`, `branch`, `checkout`, `switch`, `reset` ou `clean`. Leitura (`status`, `diff`, `log`, `check-ignore`) é permitida.

## Comandos

```bash
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run db:test:prepare
npm run dev:api
npm run dev:web
npm run dev:desktop
npm test
npm run build:api
npm run build:web
npm run dist:desktop
```

Verificar: `docker compose ps` (healthy, `127.0.0.1:5433->5432`), `curl http://localhost:3001/health`, `npm run lint`, `npm run typecheck`.

Produção (explícito, nunca no startup): `npm run db:migrate:prod`, `npm run db:bootstrap-user`. Não usar `docker compose down -v`.

Mutações via curl precisam de header `Origin` igual a `CORS_ORIGIN` (em dev: `http://localhost:3000`).

## Fora da V1/V2/V2.2 / próximo passo

Portal do professor, admin real, cadastro, fórmula pós-exame, regra de frequência mínima, IA, PWA, i18n, tema claro, recorrência, subtasks, tags, sincronização task ↔ assessment.

O **deploy real** (criar projetos Vercel/Railway/Supabase e migrar produção) é o próximo passo guiado. **Não iniciar V3 automaticamente.**
