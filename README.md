# Central Acadêmica FIAP

Aplicação web full-stack para centralizar informações acadêmicas do aluno FIAP. A V1 será focada no módulo de notas.

Este repositório está na **Etapa 7 (integração e hardening)**. A V1 do aluno (login, dashboard e notas) consome a API real.

## Requisitos

- Node.js 20 ou superior
- npm 11 ou superior (vem com o Node)
- Docker Desktop (ou Docker Engine + Compose), para o PostgreSQL de desenvolvimento
- No Windows, o Docker Desktop normalmente exige WSL 2

## Estrutura

```
central-academica-fiap/
  apps/web     Next.js (frontend)
  apps/api     Express (API)
  docs/        decisões de arquitetura
```

O frontend não acessa o banco. A API Express é a única camada de negócio.

## Instalação

Na raiz do repositório:

```bash
npm install
```

## PostgreSQL (desenvolvimento local)

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

## Migrations e seed

Com o container no ar e `apps/api/.env` apontando para `localhost:5433`:

```bash
npm run db:migrate
npm run db:seed
```

Os scripts leem `DATABASE_URL` de `apps/api/.env`. Recusarão rodar se a URL não for o Postgres do projeto (`localhost:5433`).

O seed é fictício e idempotente: executar de novo atualiza os mesmos registros, sem duplicar linhas.

Aluno de desenvolvimento (não é credencial real):

- nome: Aluno Teste
- email: `aluno@central.local`
- senha local: `dev-aluno-123`
- RA: `RM000000`

Para inspecionar o banco:

```bash
docker compose exec postgres psql -U central -d central_academica
```

Exemplos:

```sql
\dt
SELECT * FROM users;
SELECT count(*) FROM grades;
```

## Variáveis de ambiente

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

Os arquivos `.env` não devem ser commitados. Ajuste só se a conexão local for diferente do Compose.

Na API, `SESSION_SECRET` é obrigatório e deve ter pelo menos 32 caracteres.

## Como iniciar

Em dois terminais, na raiz:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

- API: [http://localhost:3001](http://localhost:3001)
- Web: [http://localhost:3000](http://localhost:3000) (`/login`, `/dashboard`, `/notas`)

## Healthcheck

Com a API e o PostgreSQL no ar:

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

## Autenticação (API)

Com a API e o PostgreSQL no ar, cookie httpOnly `central.sid`:

- `POST /auth/login` — `{ "email", "password" }`
- `POST /auth/logout`
- `GET /auth/me` — exige sessão
- `GET /me/dashboard` — período atual, média geral, resumo e próximas avaliações
- `GET /me/disciplines` — disciplinas do período atual
- `GET /me/disciplines/:id` — detalhe, avaliações e notas

Sucesso: `{ "data": ... }`. Erro: `{ "error": { "code", "message", "details?" } }`.

Aluno de desenvolvimento (não é credencial real): `aluno@central.local` / `dev-aluno-123`.

```bash
npm test
```

Os testes usam o Postgres do projeto em `localhost:5433`. Não apagam o seed acadêmico; dados temporários de isolamento são removidos ao final.
