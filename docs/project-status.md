# Status do projeto — Central Acadêmica FIAP

Handoff operacional. **V1 concluída** (Etapas 1–8). **V2 concluída** (tarefas, agenda e resumo no dashboard). **V2.2 concluída** (gestão acadêmica editável). **Security hardening concluído** (exposição local do Postgres, throttling de login, scrypt assíncrono).  
Antes de implementar qualquer coisa, leia também [architecture.md](./architecture.md).

## Objetivo

Aplicação web full-stack para centralizar informações acadêmicas do aluno FIAP.

- **V1:** módulo de **notas** (login, dashboard acadêmico e disciplinas).
- **V2:** **tarefas pessoais**, **agenda** (visão das tasks) e resumo compacto de tarefas no dashboard.
- **V2.2:** CRUD de disciplinas, edição de notas CP/GS, média anual, situação derivada e presença.

## Stack

- Monorepo **npm workspaces** (`apps/web`, `apps/api`)
- **web:** Next.js (App Router) + React + TypeScript + Tailwind
- **api:** Node.js + Express + TypeScript
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

| Serviço | Endereço |
|---|---|
| web | `http://localhost:3000` |
| api | `http://localhost:3001` |
| PostgreSQL **deste projeto** (Docker) | `127.0.0.1:5433` → container `5432` |

O PostgreSQL 18 instalado no Windows em `localhost:5432` **não deve ser parado, migrado nem alterado**.  
`DATABASE_URL` da API aponta para `localhost:5433` / `central_academica`.  
`TEST_DATABASE_URL` aponta para o mesmo Postgres Docker, database `central_academica_test`.

`SESSION_SECRET` é obrigatório (mínimo 32 caracteres). Copie de `apps/api/.env.example`. Em produção, `NODE_ENV=production` é obrigatório (cookie `Secure`) e os placeholders de desenvolvimento de `SESSION_SECRET` / credenciais `central`/`central` são recusados na subida da API.

## Etapas

| Etapa | Status |
|---|---|
| 1. Planejamento e arquitetura | Concluída |
| 2. Setup | Concluída |
| 3. Banco e modelo acadêmico | Concluída |
| 4. Autenticação e segurança | Concluída |
| 5. API acadêmica | Concluída |
| 6. Frontend e identidade visual | Concluída |
| 7. Integração ponta a ponta | Concluída |
| 8. Polimento, testes e entrega | **Concluída — V1 fechada** |
| V2. Tarefas, agenda e dashboard | **Concluída** |
| V2.2. Gestão acadêmica | **Concluída** |
| Security hardening | **Concluído** |

## Banco

Migrations em `apps/api/migrations/`: as 7 acadêmicas da Etapa 3 + `20260917140800_create-session` + `20260917215800_create-tasks` + `20260918025600_academic-v22`.

Tabelas: `users`, `terms`, `professors`, `disciplines`, `enrollments`, `assessments`, `grades`, `session`, `tasks` (+ `pgmigrations`).

`disciplines` é oferta anual do aluno (`owner_user_id`, `academic_year`). `assessments` representa os quatro slots CP/GS dos dois semestres. `grades.score` está na escala 0–100. `enrollments` guarda aulas e faltas; o percentual de presença é derivado.

`tasks` é organização pessoal do aluno. `assessments` continua sendo avaliação acadêmica/nota. Não há fusão automática.

Estado da task: `completed_at IS NULL` → pending; caso contrário → completed. Não há coluna `status`, `type` nem `progress`.

Prazo: `due_on` (DATE) **ou** `due_at` (TIMESTAMPTZ), nunca ambos; ambos NULL = sem prazo. Associação opcional a disciplina via FK composta `(user_id, discipline_id)` contra `enrollments`, `ON DELETE RESTRICT`. Exclusão de task é hard delete. Exclusão de disciplina com task vinculada responde `409 CONFLICT`.

Seed fictício e idempotente (não cria tasks). Credencial **somente de desenvolvimento**: `amom.admin@central.local` / `admin123` (hash scrypt). O UUID do usuário seed permanece o mesmo. O texto "admin" no e-mail **não** torna o usuário administrador; `role` continua `student`. Não é credencial de produção.

Não persistir média nem situação acadêmicas. Fórmulas em `apps/api/src/modules/academic/grades.ts`.

## Database de testes

Testes da API usam `central_academica_test` no mesmo container Docker (`localhost:5433`), nunca o database de desenvolvimento.

- Variável: `TEST_DATABASE_URL`
- Preparação: `npm run db:test:prepare` (também roda no início de `npm test` da API)
- Configuração canônica: `apps/api/vitest.config.mts` (setup obrigatório com `assertTestDatabase`)
- Antes de limpeza destrutiva, a suíte valida que a URL aponta inequivocamente para `central_academica_test`

Não usar o PostgreSQL do Windows em `5432`. Não executar `docker compose down -v`.

## Auth e CSRF

Sessão server-side (`express-session` + `connect-pg-simple`) na tabela `session`. Cookie `central.sid` (httpOnly, `SameSite=Lax`, `Path=/`, `Secure` só quando `NODE_ENV=production`). Helmet ligado. Login com Zod + scrypt **assíncrono** (`crypto.scrypt`, `timingSafeEqual`). Sessão regenerada após autenticação. Logout destrói a sessão e limpa o cookie.

`POST /auth/login` tem throttling em memória do processo: limite por IP/origem e limite por e-mail normalizado. Estouro responde `429` `TOO_MANY_REQUESTS` com a mesma mensagem genérica, exista ou não a conta. O store atual **não é compartilhado entre instâncias**; deploy multi-instância exigirá um store distribuído. Sem Redis neste pass.

Mutações (POST/PATCH/PUT/DELETE), inclusive login/logout e a gestão acadêmica, exigem Origin confiável. Sem token CSRF separado.

Auth em `apps/api/src/modules/auth/`. `requireAuth` e `requireTrustedOrigin` em `src/middlewares`. Envelope HTTP em `src/http`.

## Frontend

Layouts `(auth)` e `(app)`. Login, dashboard, notas (`/notas`, `/notas/nova`, `/notas/[id]`, `/notas/[id]/editar`), tarefas (`/tarefas`, `/tarefas/nova`, `/tarefas/[id]`) e agenda (`/agenda`) contra a API real. Design dark-first FIAP. Cliente HTTP com `credentials: "include"`; 401/`UNAUTHENTICATED` redireciona ao login. Sem mocks permanentes.

Sidebar: Dashboard, Tarefas, Agenda e Notas.

O dashboard busca `/me/dashboard` e `/me/tasks/summary` em paralelo. Falha no bloco de tarefas não derruba o resumo acadêmico.

Agenda é visualização das tasks (hoje, semana, mês, próximas, sem prazo). Avaliações não entram na agenda da V2.

## Testes

- API: Vitest + Supertest (auth, CSRF, sessão, média anual/status, CRUD acadêmico, presença, tasks, isolamento, 404). Script: `npm test` (prepara o database de teste).
- web: Vitest (formatação, erros HTTP, contrato de `due`, timezone/calendário, cliente de tasks). Sem Cypress/Playwright.

Total atual: **103 testes** (84 API + 19 web).

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
npm test
```

Verificar: `docker compose ps` (healthy, `127.0.0.1:5433->5432`), `curl http://localhost:3001/health`, `npm run lint`, `npm run typecheck`.

Não usar `docker compose down -v`.

Mutações via curl precisam de header `Origin` igual a `CORS_ORIGIN` (em dev: `http://localhost:3000`).

## Fora da V1/V2/V2.2 / próximo passo

Portal do professor, admin real, cadastro, fórmula pós-exame, regra de frequência mínima, IA, PWA, i18n, tema claro, deploy, recorrência, subtasks, tags, sincronização task ↔ assessment.

**Não iniciar V3 automaticamente.**
