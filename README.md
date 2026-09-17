# Central Acadêmica FIAP

Aplicação web full-stack para centralizar informações acadêmicas do aluno FIAP. A **V1** entrega o módulo de **notas**: login, dashboard e disciplinas do período atual.

## Screenshot

_Adicione aqui um print da interface (login, dashboard ou notas)._

## Funcionalidades da V1

- Login com sessão server-side (cookie httpOnly)
- Dashboard do período atual (média geral, resumo e próximas avaliações)
- Lista de disciplinas com média e situação
- Detalhe da disciplina (avaliações, pesos e notas)
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
| API | `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `SESSION_SECRET` (mínimo 32 caracteres) |
| web | `NEXT_PUBLIC_API_URL` |

## Docker / PostgreSQL

Suba somente o banco, com volume persistente:

```bash
docker compose up -d
```

Credenciais locais (não são de produção):

- host: `localhost`
- porta: `5433` (mapeada para `5432` dentro do container)
- usuário: `central`
- senha: `central`
- database: `central_academica`

A porta `5433` no host evita conflito com um PostgreSQL instalado na máquina na porta padrão `5432`. Não altere o serviço local; a API e as migrations deste projeto usam `localhost:5433`.

Não use `docker compose down -v` — isso apaga o volume do banco do projeto.

## Migrations e seed

Com o container no ar e `apps/api/.env` apontando para `localhost:5433`:

```bash
npm run db:migrate
npm run db:seed
```

Os scripts leem `DATABASE_URL` de `apps/api/.env` e recusam outra porta.

O seed é **fictício** e idempotente: executar de novo atualiza os mesmos registros, sem duplicar linhas e sem dados pessoais reais.

Aluno de desenvolvimento (não é credencial real):

- nome: Aluno Teste
- email: `aluno@central.local`
- senha local: `dev-aluno-123`
- RA: `RM000000`

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
| web | [http://localhost:3000](http://localhost:3000) (`/login`, `/dashboard`, `/notas`) |
| api | [http://localhost:3001](http://localhost:3001) |
| PostgreSQL | `localhost:5433` |

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
| `npm run db:migrate` | aplica migrations |
| `npm run db:seed` | seed fictício idempotente |
| `npm test` | testes da API e do frontend |
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

- **API:** Vitest + Supertest (auth, sessão, média/status, isolamento entre alunos). Usam o Postgres do projeto em `localhost:5433`. Não apagam o seed acadêmico.
- **web:** Vitest (formatação e mapeamento de erros HTTP). Sem Cypress/Playwright na V1.

## Endpoints principais

Cookie httpOnly `central.sid`:

- `POST /auth/login` — `{ "email", "password" }`
- `POST /auth/logout`
- `GET /auth/me` — exige sessão
- `GET /me/dashboard` — período atual, média geral, resumo e próximas avaliações
- `GET /me/disciplines` — disciplinas do período atual
- `GET /me/disciplines/:id` — detalhe, avaliações e notas
- `GET /health` — público

Sucesso: `{ "data": ... }`. Erro: `{ "error": { "code", "message", "details?" } }`.  
`GET /health` não usa o envelope `data`.

## Status da V1

**V1 concluída.** Login, dashboard e notas do aluno estão implementados, testados e documentados.

## Roadmap

V2 — tarefas e agenda acadêmica
