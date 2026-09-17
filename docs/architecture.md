# Arquitetura — Central Acadêmica FIAP

Fonte de verdade das decisões aprovadas na Etapa 1. Atualize este arquivo quando uma decisão de arquitetura mudar; não use este documento para descrever código ainda não implementado como se já existisse.

## Forma geral

Monorepo npm workspaces com duas aplicações:

- `apps/web` — Next.js (App Router) + TypeScript + React. Interface do aluno.
- `apps/api` — Express + TypeScript. Única camada de negócio e único acesso ao banco.
- PostgreSQL — fonte de verdade dos dados.

O Next.js **não** acessa o PostgreSQL e **não** expõe rotas de negócio. O frontend comunica-se com a API via HTTP JSON.

```
Aluno → Next.js → HTTP + cookie de sessão → Express → PostgreSQL
```

É um monólito modular em duas apps. Sem microserviços, Redis, GraphQL, NestJS ou ORM na V1.

Não há `packages/` compartilhados na V1. Tipos do contrato podem ser duplicados de forma consciente até a duplicação doer.

## Persistência

- Driver `pg` (node-postgres) e SQL explícito.
- Migrations com `node-pg-migrate` a partir da Etapa 3.
- Sem Prisma, Drizzle ou TypeORM na V1.

## Autenticação (a partir da Etapa 4)

- Sessão server-side com `express-session` + `connect-pg-simple`.
- Cookie httpOnly, `SameSite=Lax`, `Secure` em produção.
- Não usar `cookie-parser` salvo necessidade concreta: `express-session` já gerencia o cookie.
- Após login bem-sucedido, regenerar a sessão **antes** de associar o usuário.
- Senhas com `scrypt` via `node:crypto`.
- Sem JWT, NextAuth, Passport ou Redis na V1.

`users.email` é `TEXT`, normalizado para lowercase antes de persistir, com `UNIQUE`. Não usar a extensão `CITEXT`.

## Modelagem acadêmica planejada

Tabelas da V1:

- `users`
- `terms`
- `professors`
- `disciplines` (oferta no período, não catálogo institucional)
- `enrollments`
- `assessments`
- `grades`

Não criar tabela `students` separada: na V1 o usuário é o aluno; `role` existe para evolução.

Não persistir `average` nem `status`. São derivados na API.

Regras de negócio da média (centralizar em um único módulo, fáceis de alterar):

- média parcial ponderada pelas notas já lançadas;
- `em_andamento` se faltar nota;
- `aprovado` se todas as notas lançadas e média ≥ 6.0;
- `reprovado` se todas as notas lançadas e média < 6.0;
- V1 ignora exame/substitutiva.

## Contrato HTTP (a partir da API acadêmica)

- Sucesso: `{ "data": ... }`
- Erro: `{ "error": { "code", "message", "details?" } }`
- JSON em camelCase; SQL em snake_case
- IDs UUID; datas ISO 8601
- Exceção: `GET /health` responde `{ "status", "database" }` e não usa o envelope `data`

## Frontend

- App Router, layouts `(auth)` e `(app)` quando as páginas existirem.
- Tailwind + design tokens próprios (dark-first, accent magenta FIAP).
- Componentes locais. Sem shadcn, Redux, Zustand ou TanStack Query na V1.
- A partir da Etapa 6, se API e banco estiverem no ar, o frontend consome a API real. Sem mocks descartáveis.

Sidebar da V1: apenas Dashboard e Notas, quando esses módulos existirem.

## Desenvolvimento local

- PostgreSQL via Docker Compose (somente o banco), exposto no host em `localhost:5433` (`5433:5432`).
- API em `http://localhost:3001`
- Web em `http://localhost:3000`
- `.env` por app, a partir de `.env.example`. Sem `.env.example` redundante na raiz.
- Scripts: `npm run dev:api` e `npm run dev:web`. Sem `concurrently` até ser pedido.

Git é controlado manualmente. O agente não deve executar commit, push, branch, reset, clean, add, checkout ou switch.

## Sequência das etapas

1. Planejamento e arquitetura
2. Setup do projeto (atual)
3. Banco de dados e modelo acadêmico (`node-pg-migrate`, schema, seed)
4. Autenticação e segurança + testes mínimos das regras críticas de auth
5. API acadêmica + testes das regras de média e situação
6. Frontend e identidade visual, já contra a API real
7. Integração ponta a ponta e hardening (login, sessão, 401, CORS, loading/erro, refresh, fluxo completo)
8. Polimento, revisão e suíte final de testes

Não antecipar etapa seguinte. Cada etapa termina em estado verificável.

## Fora da V1

Portal do professor, admin completo, catálogo vs oferta, créditos, exame, PWA, i18n, tema claro, filas, WebSockets e estado global.
