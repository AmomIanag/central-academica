# Central Acadêmica FIAP

Aplicação web full-stack para centralizar informações acadêmicas do aluno FIAP. A V1 será focada no módulo de notas.

Este repositório está na **Etapa 2 (setup)**. Autenticação, modelo acadêmico e interface final ainda não foram implementados.

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

A porta `5433` no host evita conflito com um PostgreSQL instalado na máquina na porta padrão `5432`. Não altere o serviço local; a API deste projeto usa `localhost:5433`.

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

## Como iniciar

Em dois terminais, na raiz:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

- API: [http://localhost:3001](http://localhost:3001)
- Web: [http://localhost:3000](http://localhost:3000)

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
