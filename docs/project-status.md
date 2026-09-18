# Status do projeto — Central Acadêmica FIAP

Handoff operacional. **V1 concluída** (Etapas 1–8). **V2 concluída** (tarefas, agenda e resumo no dashboard).  
Antes de implementar qualquer coisa, leia também [architecture.md](./architecture.md).

## Objetivo

Aplicação web full-stack para centralizar informações acadêmicas do aluno FIAP.

- **V1:** módulo de **notas** (login, dashboard acadêmico e disciplinas).
- **V2:** **tarefas pessoais**, **agenda** (visão das tasks) e resumo compacto de tarefas no dashboard.

## Stack

- Monorepo **npm workspaces** (`apps/web`, `apps/api`)
- **web:** Next.js (App Router) + React + TypeScript + Tailwind
- **api:** Node.js + Express + TypeScript
- **banco:** PostgreSQL via Docker Compose; driver `pg` + SQL; migrations `node-pg-migrate`
- Sem ORM. Sem `packages/` na V1/V2.

## Arquitetura em vigor

- O frontend **não** acessa o PostgreSQL.
- Express é a única camada de negócio e o único acesso ao banco.
- Auth HTTP: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- API acadêmica autenticada: `GET /me/dashboard`, `GET /me/disciplines`, `GET /me/disciplines/:id`.
- API de tarefas autenticada: `GET|POST /me/tasks`, `GET /me/tasks/summary`, `GET /me/tasks/options`, `GET|PATCH|DELETE /me/tasks/:id`, `POST /me/tasks/:id/complete`, `POST /me/tasks/:id/reopen`.
- `GET /health` permanece público: `{ "status", "database" }`.
- Rotas desconhecidas da API respondem `404` no envelope `{ "error": { "code", "message" } }`.
- Métodos mutáveis exigem `Origin` igual a `CORS_ORIGIN`; Origin ausente ou inválido responde `403` `CSRF_REJECTED`. GET/HEAD/OPTIONS não exigem Origin.

## Infraestrutura local

| Serviço | Endereço |
|---|---|
| web | `http://localhost:3000` |
| api | `http://localhost:3001` |
| PostgreSQL **deste projeto** (Docker) | `localhost:5433` → container `5432` |

O PostgreSQL 18 instalado no Windows em `localhost:5432` **não deve ser parado, migrado nem alterado**.  
`DATABASE_URL` da API aponta para `localhost:5433` / `central_academica`.  
`TEST_DATABASE_URL` aponta para o mesmo Postgres Docker, database `central_academica_test`.

`SESSION_SECRET` é obrigatório (mínimo 32 caracteres). Copie de `apps/api/.env.example`.

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

## Banco

Migrations em `apps/api/migrations/`: as 7 acadêmicas da Etapa 3 + `20260917140800_create-session` + `20260917215800_create-tasks`.

Tabelas: `users`, `terms`, `professors`, `disciplines`, `enrollments`, `assessments`, `grades`, `session`, `tasks` (+ `pgmigrations`).

`tasks` é organização pessoal do aluno. `assessments` continua sendo avaliação acadêmica/nota. Não há fusão automática.

Estado da task: `completed_at IS NULL` → pending; caso contrário → completed. Não há coluna `status`, `type` nem `progress`.

Prazo: `due_on` (DATE) **ou** `due_at` (TIMESTAMPTZ), nunca ambos; ambos NULL = sem prazo. Associação opcional a disciplina via FK composta `(user_id, discipline_id)` contra `enrollments`, `ON DELETE RESTRICT`. Exclusão de task é hard delete.

Seed fictício e idempotente (não cria tasks). Aluno de dev: `aluno@central.local` / senha local `dev-aluno-123`.

Não persistir `average` nem `status` acadêmicos. Média na API: parcial ponderada pelas notas lançadas; corte V1 **6.0**; sem exame/substitutiva.

## Database de testes

Testes da API usam `central_academica_test` no mesmo container Docker (`localhost:5433`), nunca o database de desenvolvimento.

- Variável: `TEST_DATABASE_URL`
- Preparação: `npm run db:test:prepare` (também roda no início de `npm test` da API)
- Antes de limpeza destrutiva, a suíte valida que a URL aponta inequivocamente para `central_academica_test`

Não usar o PostgreSQL do Windows em `5432`. Não executar `docker compose down -v`.

## Auth e CSRF

Sessão server-side (`express-session` + `connect-pg-simple`) na tabela `session`. Cookie `central.sid` (httpOnly, `SameSite=Lax`, `Path=/`, `Secure` só em produção). Helmet ligado. Login com Zod + scrypt (`timingSafeEqual`). Sessão regenerada após autenticação. Logout destrói a sessão e limpa o cookie.

Mutações (POST/PATCH/PUT/DELETE), inclusive login/logout, exigem Origin confiável. Sem token CSRF separado.

Auth em `apps/api/src/modules/auth/`. `requireAuth` e `requireTrustedOrigin` em `src/middlewares`. Envelope HTTP em `src/http`.

## Frontend

Layouts `(auth)` e `(app)`. Login, dashboard, notas, tarefas (`/tarefas`, `/tarefas/nova`, `/tarefas/[id]`) e agenda (`/agenda`) contra a API real. Design dark-first FIAP. Cliente HTTP com `credentials: "include"`; 401/`UNAUTHENTICATED` redireciona ao login. Sem mocks permanentes.

Sidebar: Dashboard, Tarefas, Agenda e Notas.

O dashboard busca `/me/dashboard` e `/me/tasks/summary` em paralelo. Falha no bloco de tarefas não derruba o resumo acadêmico.

Agenda é visualização das tasks (hoje, semana, mês, próximas, sem prazo). Avaliações não entram na agenda da V2.

## Testes

- API: Vitest + Supertest (auth, CSRF, sessão, média/status, tasks, isolamento, 404). Script: `npm test` (prepara o database de teste).
- web: Vitest (formatação, erros HTTP, contrato de `due`, timezone/calendário, cliente de tasks). Sem Cypress/Playwright.

## Decisões aprovadas (não reabrir sem necessidade)

- Não persistir `average` nem `status` acadêmicos.
- Aluno autenticado acessa só os próprios dados.
- `tasks` ≠ `assessments`; não fundir automaticamente.
- Sem coluna `type`, `progress` ou `status` em tasks.
- Sem timezone persistido por task.
- Sem JWT, Redis, Auth.js/NextAuth, Passport, `cookie-parser` (salvo necessidade concreta), rate limiting.

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

Verificar: `docker compose ps` (healthy, `5433->5432`), `curl http://localhost:3001/health`, `npm run lint`, `npm run typecheck`.

Não usar `docker compose down -v`.

Mutações via curl precisam de header `Origin` igual a `CORS_ORIGIN` (em dev: `http://localhost:3000`).

## Fora da V1/V2 / próximo passo

Portal do professor, admin, cadastro, edição de notas, IA, PWA, i18n, tema claro, deploy, recorrência, subtasks, tags, sincronização task ↔ assessment.

**Não iniciar V3 automaticamente.**
