# Status do projeto — Central Acadêmica FIAP

Handoff operacional. Estado real após a Etapa 4.  
Antes de implementar qualquer coisa, leia também [architecture.md](./architecture.md).

## Objetivo

Aplicação web full-stack para centralizar informações acadêmicas do aluno FIAP. A V1 entrega bem o módulo de **notas** (login, dashboard e disciplinas), não um portal completo.

## Stack

- Monorepo **npm workspaces** (`apps/web`, `apps/api`)
- **web:** Next.js (App Router) + React + TypeScript + Tailwind
- **api:** Node.js + Express + TypeScript
- **banco:** PostgreSQL via Docker Compose; driver `pg` + SQL; migrations `node-pg-migrate`
- Sem ORM. Sem `packages/` na V1.

## Arquitetura em vigor

- O frontend **não** acessa o PostgreSQL.
- Express é a única camada de negócio e o único acesso ao banco.
- Auth HTTP implementada (`POST /auth/login`, `POST /auth/logout`, `GET /auth/me`). Contrato acadêmico ainda não.
- `GET /health` permanece público: `{ "status", "database" }`.

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
| 2. Setup | Concluída e validada |
| 3. Banco e modelo acadêmico | Concluída e validada |
| 4. Autenticação e segurança | **Concluída** |
| 5. API acadêmica | **Próxima** |
| 6. Frontend e identidade visual | Não iniciada |
| 7. Integração ponta a ponta | Não iniciada |
| 8. Polimento e suíte final | Não iniciada |

## Estado da Etapa 4

Sessão server-side (`express-session` + `connect-pg-simple`) na tabela `session`. Cookie `central.sid` (httpOnly, `SameSite=Lax`, `Path=/`, `Secure` só em produção). Helmet ligado. Login com Zod + scrypt (`timingSafeEqual`). Sessão regenerada após autenticação, `userId` associado depois, sessão salva antes da resposta.

Auth em `apps/api/src/modules/auth/`. `requireAuth` em `src/middlewares`. Envelope HTTP em `src/http`.

Migrations em `apps/api/migrations/`: as 7 acadêmicas da Etapa 3 + `20260917140800_create-session`.

Tabelas: `users`, `terms`, `professors`, `disciplines`, `enrollments`, `assessments`, `grades`, `session` (+ `pgmigrations`).

Aluno de dev: `aluno@central.local` / senha local `dev-aluno-123`.

Testes de auth (Vitest + Supertest) usam o Postgres em `5433` e o aluno de seed. Limpam só `session`. Script: `npm test`.

## Decisões aprovadas (não reabrir sem necessidade)

- Não persistir `average` nem `status`.
- Média futura na API: parcial ponderada pelas notas lançadas; corte V1 **6.0**; sem exame/substitutiva.
- Aluno autenticado acessa só os próprios dados (regra de service na API acadêmica).
- Sem JWT, Redis, Auth.js/NextAuth, Passport, `cookie-parser` (salvo necessidade concreta), rate limiting.

## Etapa 5 — API acadêmica (a implementar)

- Endpoints `/me/dashboard`, `/me/disciplines` (lista e detalhe)
- Média e situação derivadas no service
- `requireAuth` já disponível; escopo = usuário da sessão

**Não antecipar na Etapa 5:** dashboard/notas/UI final (Etapa 6), Redis, ORM, módulos fora da V1.

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
