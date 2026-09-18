# Central Acadêmica FIAP

Aplicação web full-stack para centralizar informações acadêmicas do aluno FIAP. A **V1** entrega o módulo de **notas**. A **V2** adiciona **tarefas pessoais**, **agenda** e um resumo de tarefas no dashboard. A **V2.2** torna a área acadêmica **editável**, com disciplinas, notas CP/GS, média anual e presença. Um pass de **security hardening** endureceu a exposição do PostgreSQL de desenvolvimento, o login e o KDF de senha, sem mudar a funcionalidade do produto.

## Screenshot

_Adicione aqui um print da interface (login, dashboard, tarefas ou agenda)._

## Funcionalidades

- Login com sessão server-side (cookie httpOnly)
- Dashboard do ano letivo atual (média geral das MPs, resumo acadêmico e próximas avaliações)
- Gestão de disciplinas: criar, editar nome/professor e remover (bloqueada se houver tarefa vinculada)
- Notas CP/GS do 1º e 2º semestre, MD1, MD2, MP anual e situação derivada
- Presença por disciplina (aulas, faltas e percentual derivado)
- Tarefas pessoais: criar, editar, concluir, reabrir, excluir, filtrar e associar opcionalmente a uma disciplina
- Agenda (hoje, semana, mês, próximas e sem prazo), baseada somente em tarefas
- Resumo compacto de tarefas no dashboard
- Estados de loading, vazio, erro e página não encontrada
- Logout e proteção das rotas autenticadas

## Stack

- **web:** Next.js (App Router) + React + TypeScript + Tailwind
- **api:** Node.js + Express + TypeScript
- **banco:** PostgreSQL via Docker Compose (`pg` + SQL; migrations `node-pg-migrate`)

## Arquitetura

```
Aluno → Next.js → HTTP + cookie de sessão → Express → PostgreSQL
```

O frontend não acessa o banco. A API Express é a única camada de negócio.

## Estrutura

```
central-academica-fiap/
  apps/web     Next.js (frontend)
  apps/api     Express (API)
  docs/        decisões de arquitetura e status
```

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior (vem com o Node)
- Docker Desktop (ou Docker Engine + Compose), para o PostgreSQL de desenvolvimento
- No Windows, o Docker Desktop normalmente exige WSL 2

## Instalação

```bash
git clone <url-do-repositorio>
cd central-academica-fiap
npm install
```

## Configuração de ambiente

Cada app tem o seu `.env.example`. Copie para `.env` na mesma pasta:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

No Windows (PowerShell):

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

Os arquivos `.env` não devem ser commitados.

| App | Variáveis |
|---|---|
| API | `PORT`, `DATABASE_URL`, `TEST_DATABASE_URL`, `CORS_ORIGIN`, `SESSION_SECRET` (mínimo 32 caracteres) |
| web | `NEXT_PUBLIC_API_URL` |

`DATABASE_URL` aponta para o database de desenvolvimento (`central_academica`).  
`TEST_DATABASE_URL` aponta para o database de testes (`central_academica_test`) no **mesmo** PostgreSQL Docker.

Em produção, `NODE_ENV=production` é obrigatório (o cookie `Secure` depende disso). `SESSION_SECRET` e as credenciais do banco devem ser únicos — a API recusa os placeholders documentados de desenvolvimento quando `NODE_ENV=production`.

## Docker / PostgreSQL

Suba somente o banco, com volume persistente:

```bash
docker compose up -d
```

Credenciais locais (não são de produção e **nunca** devem ser reutilizadas em produção):

- host: `localhost` / `127.0.0.1`
- porta: `5433` (publicada apenas em loopback: `127.0.0.1:5433:5432`)
- usuário: `central`
- senha: `central`
- database de desenvolvimento: `central_academica`
- database de testes: `central_academica_test`

A porta `5433` no host evita conflito com um PostgreSQL instalado na máquina na porta padrão `5432`. O bind em `127.0.0.1` impede acesso de outros hosts da rede local. Não altere o serviço Windows; a API e as migrations deste projeto usam `localhost:5433`.

Não use `docker compose down -v` — isso apaga o volume do banco do projeto.

## Migrations e seed

Com o container no ar e `apps/api/.env` apontando para `localhost:5433`:

```bash
npm run db:migrate
npm run db:seed
```

Os scripts leem `DATABASE_URL` de `apps/api/.env` e recusam outra porta.

O seed é **fictício** e idempotente: executar de novo atualiza os mesmos registros, sem duplicar linhas e sem dados pessoais reais. O seed **não** cria tarefas; elas são criadas pela API/UI.

Aluno de desenvolvimento (**credencial somente de desenvolvimento**, não é credencial real nem de produção):

- nome: Aluno Teste
- email: `amom.admin@central.local`
- senha local: `admin123`
- RA: `RM000000`
- role: `student` (o texto "admin" no e-mail não concede privilégio administrativo)

Para inspecionar o banco:

```bash
docker compose exec postgres psql -U central -d central_academica
```

## Como iniciar

Em dois terminais, na raiz:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

| Serviço | Endereço |
|---|---|
| web | [http://localhost:3000](http://localhost:3000) (`/login`, `/dashboard`, `/tarefas`, `/agenda`, `/notas`) |
| api | [http://localhost:3001](http://localhost:3001) |
| PostgreSQL | `localhost:5433` |

Mutações HTTP (login, logout, criar/editar tarefas) exigem header `Origin` igual a `CORS_ORIGIN`. O navegador envia isso automaticamente. Em curl:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"amom.admin@central.local\",\"password\":\"admin123\"}"
```

## Healthcheck

```bash
curl http://localhost:3001/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "database": "reachable"
}
```

Se o banco estiver inacessível, a API responde `503` e `database` vem como `unreachable`.

## Scripts principais

| Script | Função |
|---|---|
| `npm run dev:api` | API em watch (`localhost:3001`) |
| `npm run dev:web` | frontend Next.js (`localhost:3000`) |
| `npm run db:migrate` | aplica migrations no database de desenvolvimento |
| `npm run db:seed` | seed fictício idempotente |
| `npm run db:test:prepare` | cria/migra/seed o database `central_academica_test` |
| `npm test` | testes da API (com database de teste) e do frontend |
| `npm run lint` | ESLint nas duas apps |
| `npm run typecheck` | TypeScript nas duas apps |

Builds:

```bash
npm run build --workspace=api
npm run build --workspace=web
```

## Testes

```bash
npm test
```

- **API:** Vitest + Supertest (auth, CSRF, sessão, throttling de login, média anual/status, CRUD acadêmico, presença, tarefas, isolamento entre alunos). Usam `TEST_DATABASE_URL` (`central_academica_test` em `localhost:5433`). Recusam o database de desenvolvimento. `npm test` prepara o database de teste antes de executar. A configuração canônica é `apps/api/vitest.config.mts`, com setup que valida o database de teste e limpa só ele.
- **web:** Vitest (formatação, erros HTTP, contrato de `due` e cliente de tasks). Sem Cypress/Playwright.

Total: 103 testes (84 API + 19 web).

## Endpoints principais

Cookie httpOnly `central.sid`:

- `POST /auth/login` — `{ "email", "password" }`
- `POST /auth/logout`
- `GET /auth/me` — exige sessão
- `GET /me/dashboard` — ano letivo atual, média geral das MPs, resumo e próximas avaliações
- `GET /me/disciplines` — disciplinas do ano letivo atual
- `POST /me/disciplines` — cria disciplina anual do aluno autenticado
- `GET /me/disciplines/:id` — detalhe, semestres, MP, situação e presença
- `PATCH /me/disciplines/:id` — nome e professor
- `PATCH /me/disciplines/:id/grades` — lança, altera ou remove CP/GS (`score` ou `null`)
- `PATCH /me/disciplines/:id/attendance` — aulas e faltas
- `DELETE /me/disciplines/:id` — remove a estrutura acadêmica; `409` se houver tarefa vinculada
- `GET /me/tasks` — lista tarefas do aluno autenticado (filtros: `status`, `priority`, `disciplineId`, `from`, `to`, `timeZone`, `limit`, `offset`)
- `POST /me/tasks` — cria tarefa
- `GET /me/tasks/summary` — pendentes, atrasadas e próximas 3
- `GET /me/tasks/options` — disciplinas em que o aluno está matriculado
- `GET /me/tasks/:id` — detalhe
- `PATCH /me/tasks/:id` — edição dos campos permitidos
- `POST /me/tasks/:id/complete` — conclusão idempotente
- `POST /me/tasks/:id/reopen` — reabertura idempotente
- `DELETE /me/tasks/:id` — exclusão definitiva
- `GET /health` — público

Sucesso: `{ "data": ... }`. Erro: `{ "error": { "code", "message", "details?" } }`.  
`GET /health` não usa o envelope `data`.

## Status

**V1 concluída.** Login, dashboard acadêmico e notas do aluno estão implementados, testados e documentados.

**V2 concluída.** Tarefas pessoais, agenda e resumo de tarefas no dashboard estão implementados, testados e documentados.

**V2.2 concluída.** Gestão acadêmica: CRUD de disciplinas, edição de notas CP/GS (escala 0–100), MD1/MD2/MP, situação derivada e presença. Sem fórmula pós-exame.

**Security hardening concluído.** Porta PostgreSQL de desenvolvimento em loopback, throttling de login, scrypt assíncrono, limites de payload/senha e guarda de placeholders de produção. Sem mudança de funcionalidade do produto.

## Roadmap

Fora do escopo atual: portal do professor, admin real, cadastro, fórmula pós-exame, regra de frequência mínima, IA, PWA, deploy, recorrência, subtasks, tags e sincronização automática entre tarefas e avaliações.
