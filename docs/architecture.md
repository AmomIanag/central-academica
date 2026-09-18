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

É um monólito modular em duas apps. Sem microserviços, Redis, GraphQL, NestJS ou ORM na V1/V2/V2.2.

Não há `packages/` compartilhados na V1/V2/V2.2. Tipos do contrato podem ser duplicados de forma consciente até a duplicação doer.

## Persistência

- Driver `pg` (node-postgres) e SQL explícito.
- Migrations versionadas com `node-pg-migrate` em `apps/api/migrations`.
- Scripts na raiz: `npm run db:migrate` e `npm run db:seed` (leem `apps/api/.env`).
- UUIDs gerados pela aplicação (`crypto.randomUUID()` no código futuro; IDs determinísticos no seed). Sem extensão PostgreSQL só para gerar UUID.
- Sem Prisma, Drizzle ou TypeORM na V1/V2/V2.2.

Todas as FKs usam `ON DELETE RESTRICT`: não removemos termo, professor, aluno, disciplina, matrícula, avaliação ou tarefa enquanto houver dependentes. Evita perda silenciosa de histórico acadêmico. Sem `CASCADE` na V1/V2/V2.2. A exclusão de disciplina pela API remove apenas o grafo acadêmico do dono (enrollment, assessments, grades) depois de confirmar que não há tasks vinculadas; se houver, responde `409 CONFLICT`.

`users.email` tem `UNIQUE` e `CHECK (email = lower(email))`. A aplicação (e o seed) persiste lowercase; o banco rejeita e-mail com maiúsculas.

A associação opcional de uma task a disciplina usa FK composta `(user_id, discipline_id)` contra `enrollments`. Uma task só pode apontar para disciplina em que o aluno esteja matriculado, em qualquer período.

## Autenticação

- Sessão server-side com `express-session` + `connect-pg-simple`, persistida na tabela `session`.
- Cookie `central.sid`: httpOnly, `SameSite=Lax`, `Path=/`, `Secure` só em produção.
- Não usar `cookie-parser` salvo necessidade concreta: `express-session` já gerencia o cookie.
- Após login bem-sucedido, regenerar a sessão **antes** de associar `userId` e salvar a sessão antes da resposta.
- Senhas com `scrypt` via `node:crypto` (formato `scrypt$N$r$p$salt$key`); comparação com `timingSafeEqual`. Login não distingue e-mail inexistente de senha incorreta.
- `SESSION_SECRET` obrigatório, mínimo 32 caracteres, validado na subida da API.
- Helmet nos headers HTTP. Sem rate limiting na V1 até ser pedido.
- CORS com `credentials: true` e origem em `CORS_ORIGIN`.
- Mutações HTTP (`POST`, `PATCH`, `PUT`, `DELETE`) exigem header `Origin` exatamente igual a `CORS_ORIGIN`. Origin ausente ou inválido responde `403` com código `CSRF_REJECTED`. GET/HEAD/OPTIONS não exigem Origin. Não há token CSRF separado.
- `POST /auth/login` validado com Zod (e-mail válido, senha presente).
- Sem JWT, NextAuth, Passport ou Redis na V1/V2/V2.2.

Código de auth em `apps/api/src/modules/auth/`. API acadêmica em `modules/dashboard` e `modules/disciplines`. Tarefas em `modules/tasks`. Média/status/presença em `modules/academic/grades.ts`. Middlewares `requireAuth` e `requireTrustedOrigin` em `src/middlewares`. Envelope HTTP em `src/http`.

Endpoints: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /me/dashboard`, `GET /me/disciplines`, `POST /me/disciplines`, `GET /me/disciplines/:id`, `PATCH /me/disciplines/:id`, `PATCH /me/disciplines/:id/grades`, `PATCH /me/disciplines/:id/attendance`, `DELETE /me/disciplines/:id`, `GET /me/tasks`, `POST /me/tasks`, `GET /me/tasks/summary`, `GET /me/tasks/options`, `GET /me/tasks/:id`, `PATCH /me/tasks/:id`, `POST /me/tasks/:id/complete`, `POST /me/tasks/:id/reopen`, `DELETE /me/tasks/:id`. `GET /health` permanece público.

`users.email` é `TEXT`, normalizado para lowercase antes de persistir e no login, com `UNIQUE`. Não usar a extensão `CITEXT`.

## Modelagem acadêmica (V2.2)

Tabelas:

- `users` — aluno autenticável; `role` ∈ {`student`, `admin`}
- `terms` — calendário; `semester` ∈ {1, 2}; no máximo um `is_current = true` (índice único parcial). `year` marca o ano letivo corrente usado para listar disciplinas anuais.
- `professors` — dados de exibição, não fazem login; `email` é opcional
- `disciplines` — oferta **anual** do aluno (`owner_user_id`, `academic_year`); `UNIQUE(owner_user_id, academic_year, code)`; `term_id` associa a oferta ao calendário, mas o semestre das notas vive em `assessments`
- `enrollments` — `UNIQUE(user_id, discipline_id)`; `total_classes` e `absences` (≥ 0, faltas ≤ aulas)
- `assessments` — quatro slots por disciplina: `semester` ∈ {1, 2} e `kind` ∈ {`CP`, `GS`}; `UNIQUE(discipline_id, semester, kind)`; `weight` permanece por compatibilidade (CP = 0.40, GS = 0.60) e **não** é fonte da verdade
- `grades` — `score` em [0, 100]; `UNIQUE(enrollment_id, assessment_id)`; ausência de nota é ausência de linha, não zero

Não há tabela `students`. Não há colunas de média nem situação.

A disciplina editável pertence ao aluno (`owner_user_id`). Trocar o professor cria/reusa um registro no escopo do dono; não renomeia um professor compartilhado.

Consistência “avaliação e matrícula da mesma disciplina” fica no service.

## Tarefas pessoais (V2)

`tasks` representa organização pessoal do aluno. `assessments` continua representando avaliações acadêmicas/notas. Não fundir automaticamente.

- Estado derivado: `completed_at IS NULL` → pending; caso contrário → completed. Não persistir `status`, `type` nem `progress`.
- Prioridade: `low | normal | high`.
- Prazo: `due_on DATE` **ou** `due_at TIMESTAMPTZ`, nunca ambos; ambos NULL = sem prazo. `due_on` é data civil (não converter para meia-noite UTC). `due_at` é instante.
- Contrato HTTP discriminado: `due: null | { kind: "date", date } | { kind: "datetime", at }`.
- Timezone de agenda/overdue vem da query (`timeZone` IANA). Não persistir timezone por task. Não fixar `America/Sao_Paulo` no banco.
- Exclusão é hard delete.
- Agenda é visualização das tasks, não uma entidade. Avaliações não entram automaticamente na agenda da V2.

## Seed

`npm run db:seed` é idempotente (`ON CONFLICT (id) DO UPDATE`) e usa IDs fixos. Dados fictícios de desenvolvimento, não pessoais.

Aluno de seed (credencial **somente de desenvolvimento**): `amom.admin@central.local` / senha local `admin123` (hash `scrypt$...` via `node:crypto`). O UUID do usuário seed é estável. O e-mail não concede papel de administrador. Não é segredo de produção.

O seed cobre disciplinas anuais com CP/GS dos dois semestres (caso de referência MD1 72 / MD2 88 / MP 81.6), notas parciais, disciplina sem nota e presença de exemplo.

## Média, situação e presença

Derivadas no service (`apps/api/src/modules/academic/grades.ts`), não persistidas.

Fórmulas oficiais (escala 0–100):

- `MD1 = CP1 × 0.40 + GS1 × 0.60`
- `MD2 = CP2 × 0.40 + GS2 × 0.60`
- `MP = MD1 × 0.40 + MD2 × 0.60`

MD1/MD2 não são arredondadas antes de calcular MP. A resposta HTTP arredonda números em no máximo duas casas.

Situação anual:

- qualquer uma das quatro notas ausente → `EM_ANDAMENTO`
- com as quatro notas: `MP >= 60` → `APROVADO_DIRETO`; `40 <= MP < 60` → `EXAME`; `MP < 40` → `REPROVADO_DIRETO`

Não há fórmula pós-exame. Presença = `(totalAulas - faltas) / totalAulas × 100`; com 0 aulas o percentual é `null`. Presença não altera a situação nesta versão.

O frontend não recalcula MD/MP/situação/presença. Listagem do aluno usa o ano letivo do termo `is_current`. Sem período atual: lista vazia, dashboard com `term: null` e totais zerados, detalhe `NOT_FOUND`.

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
- Componentes locais. Sem shadcn, Redux, Zustand ou TanStack Query na V1/V2/V2.2.
- A partir da Etapa 6, se API e banco estiverem no ar, o frontend consome a API real. Sem mocks descartáveis.

Sidebar: Dashboard, Tarefas, Agenda e Notas.

## Desenvolvimento local

- PostgreSQL via Docker Compose (somente o banco), exposto no host em `localhost:5433` (`5433:5432`).
- Database de desenvolvimento: `central_academica`. Database de testes: `central_academica_test` no mesmo container (`TEST_DATABASE_URL`).
- API em `http://localhost:3001`
- Web em `http://localhost:3000`
- `.env` por app, a partir de `.env.example`. Sem `.env.example` redundante na raiz.
- Scripts: `npm run dev:api`, `npm run dev:web`, `npm run db:migrate`, `npm run db:seed`, `npm run db:test:prepare`. Sem `concurrently` até ser pedido.

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
9. Tarefas pessoais, agenda e resumo no dashboard — **V2 concluída**
10. Gestão acadêmica editável (disciplinas, notas CP/GS, presença) — **V2.2 concluída**

Não antecipar etapa seguinte. Cada etapa termina em estado verificável.

## Fora da V1/V2/V2.2

Portal do professor, admin completo, catálogo vs oferta, créditos, fórmula pós-exame, regra de frequência mínima, PWA, i18n, tema claro, filas, WebSockets, estado global, IA, recorrência, subtasks, tags e sincronização task ↔ assessment.
