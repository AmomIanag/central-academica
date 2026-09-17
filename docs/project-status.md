# Status do projeto — Central Acadêmica FIAP

Handoff operacional. **V1 concluída** (Etapas 1–8).  
Antes de implementar qualquer coisa, leia também [architecture.md](./architecture.md).

## Objetivo

Aplicação web full-stack para centralizar informações acadêmicas do aluno FIAP. A V1 entrega o módulo de **notas** (login, dashboard e disciplinas), não um portal completo.

## Stack

- Monorepo **npm workspaces** (`apps/web`, `apps/api`)
- **web:** Next.js (App Router) + React + TypeScript + Tailwind
- **api:** Node.js + Express + TypeScript
- **banco:** PostgreSQL via Docker Compose; driver `pg` + SQL; migrations `node-pg-migrate`
- Sem ORM. Sem `packages/` na V1.

## Arquitetura em vigor

- O frontend **não** acessa o PostgreSQL.
- Express é a única camada de negócio e o único acesso ao banco.
- Auth HTTP: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- API acadêmica autenticada: `GET /me/dashboard`, `GET /me/disciplines`, `GET /me/disciplines/:id`.
- `GET /health` permanece público: `{ "status", "database" }`.
- Rotas desconhecidas da API respondem `404` no envelope `{ "error": { "code", "message" } }`.

## Infraestrutura local

| Serviço | Endereço |
|---|---|
| web | `http://localhost:3000` |
| api | `http://localhost:3001` |
| PostgreSQL **deste projeto** (Docker) | `localhost:5433` → container `5432` |

O PostgreSQL 18 instalado no Windows em `localhost:5432` **não deve ser parado, migrado nem alterado**.  
`DATABASE_URL` da API aponta para `localhost:5433`. Scripts de migrate/seed recusam outra porta.

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

## Banco

Migrations em `apps/api/migrations/`: as 7 acadêmicas da Etapa 3 + `20260917140800_create-session`.

Tabelas: `users`, `terms`, `professors`, `disciplines`, `enrollments`, `assessments`, `grades`, `session` (+ `pgmigrations`).

Seed fictício e idempotente. Aluno de dev: `aluno@central.local` / senha local `dev-aluno-123`.

Não persistir `average` nem `status`. Média na API: parcial ponderada pelas notas lançadas; corte V1 **6.0**; sem exame/substitutiva.

## Auth

Sessão server-side (`express-session` + `connect-pg-simple`) na tabela `session`. Cookie `central.sid` (httpOnly, `SameSite=Lax`, `Path=/`, `Secure` só em produção). Helmet ligado. Login com Zod + scrypt (`timingSafeEqual`). Sessão regenerada após autenticação. Logout destrói a sessão e limpa o cookie.

Auth em `apps/api/src/modules/auth/`. `requireAuth` em `src/middlewares`. Envelope HTTP em `src/http`.

## Frontend

Layouts `(auth)` e `(app)`, login, dashboard, notas e detalhe contra a API real. Design dark-first FIAP. Cliente HTTP com `credentials: "include"`; 401/`UNAUTHENTICATED` redireciona ao login. Sem mocks.

Sidebar da V1: Dashboard e Notas.

## Testes

- API: Vitest + Supertest (auth, sessão, média/status, isolamento, 404). Script: `npm test`.
- web: Vitest (formatação e erros HTTP). Sem Cypress/Playwright na V1.

## Decisões aprovadas (não reabrir sem necessidade)

- Não persistir `average` nem `status`.
- Aluno autenticado acessa só os próprios dados.
- Sem JWT, Redis, Auth.js/NextAuth, Passport, `cookie-parser` (salvo necessidade concreta), rate limiting.

## Git

O usuário faz commit e push manualmente. Agentes **não** executam `add`, `commit`, `push`, `pull`, `branch`, `checkout`, `switch`, `reset` ou `clean`. Leitura (`status`, `diff`, `log`, `check-ignore`) é permitida.

## Comandos

```bash
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:web
npm test
```

Verificar: `docker compose ps` (healthy, `5433->5432`), `curl http://localhost:3001/health`, `npm run lint`, `npm run typecheck`.

Não usar `docker compose down -v`.

## Fora da V1 / próximo passo

Portal do professor, admin, cadastro, edição de notas, PWA, i18n, tema claro, deploy.

**Próximo passo:** V2 — tarefas e agenda acadêmica.

## Direção inicial da V2

A V2 adicionará tarefas manuais e agenda acadêmica.

Princípio inicial:
- `tasks` representa organização pessoal do aluno.
- `assessments` continua representando avaliações acadêmicas/notas.
- Não fundir tasks e assessments automaticamente.
- Uma tarefa pode opcionalmente estar associada a uma disciplina.
- A integração entre tarefas e avaliações pode ser estudada futuramente, mas não deve ser presumida na primeira implementação da V2.

A V2 ainda deve ser planejada antes de qualquer migration ou implementação.