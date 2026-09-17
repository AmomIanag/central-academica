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
- Migrations versionadas com `node-pg-migrate` em `apps/api/migrations`.
- Scripts na raiz: `npm run db:migrate` e `npm run db:seed` (leem `apps/api/.env`).
- UUIDs gerados pela aplicação (`crypto.randomUUID()` no código futuro; IDs determinísticos no seed). Sem extensão PostgreSQL só para gerar UUID.
- Sem Prisma, Drizzle ou TypeORM na V1.

Todas as FKs usam `ON DELETE RESTRICT`: não removemos termo, professor, aluno, disciplina, matrícula ou avaliação enquanto houver dependentes. Evita perda silenciosa de histórico acadêmico. Sem `CASCADE` na V1.

`users.email` tem `UNIQUE` e `CHECK (email = lower(email))`. A aplicação (e o seed) persiste lowercase; o banco rejeita e-mail com maiúsculas.

## Autenticação

- Sessão server-side com `express-session` + `connect-pg-simple`, persistida na tabela `session`.
- Cookie `central.sid`: httpOnly, `SameSite=Lax`, `Path=/`, `Secure` só em produção.
- Não usar `cookie-parser` salvo necessidade concreta: `express-session` já gerencia o cookie.
- Após login bem-sucedido, regenerar a sessão **antes** de associar `userId` e salvar a sessão antes da resposta.
- Senhas com `scrypt` via `node:crypto` (formato `scrypt$N$r$p$salt$key`); comparação com `timingSafeEqual`. Login não distingue e-mail inexistente de senha incorreta.
- `SESSION_SECRET` obrigatório, mínimo 32 caracteres, validado na subida da API.
- Helmet nos headers HTTP. Sem rate limiting na V1 até ser pedido.
- CORS com `credentials: true` e origem em `CORS_ORIGIN`.
- `POST /auth/login` validado com Zod (e-mail válido, senha presente).
- Sem JWT, NextAuth, Passport ou Redis na V1.

Código de auth em `apps/api/src/modules/auth/`. API acadêmica em `modules/dashboard` e `modules/disciplines`. Média/status em `modules/academic/grades.ts`. Middleware `requireAuth` em `src/middlewares`. Envelope HTTP em `src/http`.

Endpoints: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /me/dashboard`, `GET /me/disciplines`, `GET /me/disciplines/:id`. `GET /health` permanece público.

`users.email` é `TEXT`, normalizado para lowercase antes de persistir e no login, com `UNIQUE`. Não usar a extensão `CITEXT`.

## Modelagem acadêmica (V1)

Tabelas:

- `users` — aluno autenticável; `role` ∈ {`student`, `admin`}
- `terms` — período; `semester` ∈ {1, 2}; no máximo um `is_current = true` (índice único parcial)
- `professors` — dados de exibição, não fazem login
- `disciplines` — oferta no período (`UNIQUE(term_id, code)`); sem catálogo separado
- `enrollments` — `UNIQUE(user_id, discipline_id)`
- `assessments` — `weight` em (0, 1]; soma dos pesos por disciplina é regra de **service** (Etapa 5), não trigger
- `grades` — `score` em [0, 10]; `UNIQUE(enrollment_id, assessment_id)`

Não há tabela `students`. Não há colunas `average` nem `status`.

Consistência “avaliação e matrícula da mesma disciplina” fica no service da Etapa 5.

## Seed

`npm run db:seed` é idempotente (`ON CONFLICT (id) DO UPDATE`) e usa IDs fixos. Dados fictícios de desenvolvimento, não pessoais.

Aluno de seed: `aluno@central.local` / senha local `dev-aluno-123` (hash `scrypt$...` via `node:crypto`). Não é segredo de produção.

O seed cobre disciplinas com todas as notas (média futura ≥ 6 e < 6), notas parciais e avaliações sem nota.

## Média e situação

Derivadas no service (`apps/api/src/modules/academic/grades.ts`), não persistidas. Corte V1: `PASSING_AVERAGE = 6.0`.

- média parcial: `sum(score * weight) / sum(weight das avaliações com nota)`
- sem notas ou sem avaliações: `average = null`, `status = em_andamento`
- falta alguma nota: `em_andamento`
- todas lançadas e média ≥ 6.0: `aprovado`; média < 6.0: `reprovado`
- V1 ignora exame/substitutiva
- resposta HTTP arredonda `average`/`overallAverage` em 2 casas; `weight` e `score` saem como `number`

V1 lê só o termo `is_current = true`. Sem período atual: lista vazia, dashboard com `term: null` e totais zerados, detalhe `NOT_FOUND`.

## Contrato HTTP

- Sucesso: `{ "data": ... }`
- Erro: `{ "error": { "code", "message", "details?" } }`
- JSON em camelCase; SQL em snake_case
- IDs UUID; datas ISO 8601
- Exceção: `GET /health` responde `{ "status", "database" }` e não usa o envelope `data`
- Rotas desconhecidas: `404` com `{ "error": { "code": "NOT_FOUND", "message" } }`

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
- Scripts: `npm run dev:api`, `npm run dev:web`, `npm run db:migrate`, `npm run db:seed`. Sem `concurrently` até ser pedido.

Git é controlado manualmente. O agente não deve executar commit, push, branch, reset, clean, add, checkout ou switch.

## Sequência das etapas

1. Planejamento e arquitetura
2. Setup do projeto
3. Banco de dados e modelo acadêmico (`node-pg-migrate`, schema, seed)
4. Autenticação e segurança + testes mínimos das regras críticas de auth
5. API acadêmica + testes das regras de média e situação
6. Frontend e identidade visual, já contra a API real
7. Integração ponta a ponta e hardening (login, sessão, 401, CORS, loading/erro, refresh, fluxo completo)
8. Polimento, revisão e suíte final de testes — **V1 concluída**

Não antecipar etapa seguinte. Cada etapa termina em estado verificável.

## Fora da V1

Portal do professor, admin completo, catálogo vs oferta, créditos, exame, PWA, i18n, tema claro, filas, WebSockets e estado global.
