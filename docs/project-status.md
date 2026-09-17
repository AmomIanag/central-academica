# Status do projeto — Central Acadêmica FIAP

Handoff operacional. Estado real após a Etapa 3.  
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
- Contrato HTTP acadêmico e auth ainda **não** estão implementados (exceto `GET /health`).

## Infraestrutura local

| Serviço | Endereço |
|---|---|
| web | `http://localhost:3000` |
| api | `http://localhost:3001` |
| PostgreSQL **deste projeto** (Docker) | `localhost:5433` → container `5432` |

O PostgreSQL 18 instalado no Windows em `localhost:5432` **não deve ser parado, migrado nem alterado**.  
`DATABASE_URL` da API aponta para `localhost:5433`. Scripts de migrate/seed recusam outra porta.

## Etapas

| Etapa | Status |
|---|---|
| 1. Planejamento e arquitetura | Concluída |
| 2. Setup | Concluída e validada |
| 3. Banco e modelo acadêmico | Concluída e validada |
| 4. Autenticação e segurança | **Próxima** |
| 5. API acadêmica | Não iniciada |
| 6. Frontend e identidade visual | Não iniciada |
| 7. Integração ponta a ponta | Não iniciada |
| 8. Polimento e suíte final | Não iniciada |

## Estado da Etapa 3

Migrations em `apps/api/migrations/`:

- `20260917140100_create-users`
- `20260917140200_create-terms`
- `20260917140300_create-professors`
- `20260917140400_create-disciplines`
- `20260917140500_create-enrollments`
- `20260917140600_create-assessments`
- `20260917140700_create-grades`

Tabelas: `users`, `terms`, `professors`, `disciplines`, `enrollments`, `assessments`, `grades` (+ `pgmigrations`). Sem tabela `session`.

Constraints relevantes: emails lowercase; `role` student/admin; `semester` 1/2; no máximo um `is_current`; `UNIQUE(term_id, code)`; `UNIQUE(user_id, discipline_id)`; `weight` em (0, 1]; `score` 0–10; FKs `ON DELETE RESTRICT`.

Seed fictício, IDs fixos, idempotente (`ON CONFLICT (id) DO UPDATE`):

| Tabela | Qtd |
|---|---|
| users | 1 |
| terms | 1 (current) |
| professors | 5 |
| disciplines | 5 |
| enrollments | 5 |
| assessments | 15 |
| grades | 9 |

Aluno de dev: `aluno@central.local` / senha local `dev-aluno-123` (hash scrypt no seed; **login ainda não existe**).

`GET /health` → HTTP 200 `{ "status": "ok", "database": "reachable" }`.

## Decisões aprovadas (não reabrir sem necessidade)

- Não persistir `average` nem `status`.
- Média futura na API: parcial ponderada pelas notas lançadas; corte V1 **6.0**; sem exame/substitutiva.
- Sessões **somente na Etapa 4**.
- Aluno autenticado acessa só os próprios dados (regra de service na API acadêmica).

## Etapa 4 — autenticação (a implementar)

- `express-session` + `connect-pg-simple` + cookie httpOnly
- `scrypt` via `node:crypto`
- Regenerar a sessão **depois** do login bem-sucedido, **antes** de associar o usuário
- Sem JWT, Redis, Auth.js/NextAuth, Passport, `cookie-parser` (salvo necessidade concreta)
- Testes mínimos das regras críticas de auth nesta etapa

**Não antecipar na Etapa 4:** endpoints acadêmicos (Etapa 5), dashboard/notas/UI final (Etapa 6), Redis, ORM, módulos fora da V1.

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
```

Verificar: `docker compose ps` (healthy, `5433->5432`), `curl http://localhost:3001/health`, `npm run lint`, `npm run typecheck`.

Não usar `docker compose down -v`.
