# Desktop — Central Acadêmica FIAP

Aplicativo Windows da Central Acadêmica. A V1 é um wrapper Electron da aplicação web de produção; não há frontend, API ou banco próprios.

## Arquitetura

```
Central Acadêmica.exe
        │
        ▼
Electron BrowserWindow (sessão persistente, sandboxed)
        │
        ▼
https://central-academica-web-one.vercel.app
        │
        ▼
Vercel Next.js
        │  rewrite /api
        ▼
Railway Express
        │
        ▼
Supabase PostgreSQL
```

Desktop e browser usam a **mesma** origem Vercel, a mesma API e o mesmo banco. Uma disciplina, nota ou tarefa criada em um cliente aparece no outro, na mesma conta.

O Electron **não** acessa PostgreSQL, Supabase, `DATABASE_URL` nem a API no Railway. Não há SDK Supabase, API Express duplicada, Next.js embutido nem banco local.

A autenticação continua a de produção: cookie `central.sid` HttpOnly, `SameSite=Lax`, `Max-Age` 24h (igual ao TTL absoluto no PostgreSQL), CSRF por `Origin` exato da origem Vercel. CORS, cookie Domain, CSRF e rewrites da Vercel não foram alterados.

## Como executar em desenvolvimento

Na raiz do monorepo, depois de `npm install`:

```bash
npm run dev:desktop
```

Isso compila o processo principal TypeScript e abre o Electron apontando para a URL de produção (não para `localhost:3000`). É necessário internet.

Override opcional (somente http/https, sem credenciais):

```powershell
$env:DESKTOP_APP_URL="https://central-academica-web-one.vercel.app"
npm run dev:desktop
```

`apps/desktop/.env.example` documenta a variável. O app **não** carrega um arquivo `.env` automaticamente; defina a variável no shell se precisar. Não coloque segredos nesse arquivo.

Outros scripts do workspace `desktop`:

| Script                                  | Função                           |
| --------------------------------------- | -------------------------------- |
| `npm run dev:desktop`                   | compila e abre o Electron        |
| `npm run typecheck --workspace=desktop` | `tsc --noEmit`                   |
| `npm run build:desktop`                 | emite `apps/desktop/dist/`       |
| `npm test --workspace=desktop`          | valida parsing/allowlist de URLs |
| `npm run dist:desktop`                  | gera o instalador Windows        |

## Como gerar o instalador Windows

```bash
npm run dist:desktop
```

Equivalente: `npm run dist --workspace=desktop` (NSIS, x64, sem publish).

Artefatos em `apps/desktop/release/`. O instalador esperado:

`apps/desktop/release/Central Acadêmica Setup 0.1.0.exe`

A instalação cria atalhos de Desktop e Menu Iniciar para **Central Acadêmica**. Não há code signing neste build local.

## Internet

O desktop depende da aplicação web de produção. Sem rede, a janela não carrega o produto. O app não encerra: mostra um diálogo em português com **Tentar novamente** ou **Sair**. Não há modo offline.

## Modelo de segurança

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
- Sem preload, sem IPC, sem APIs Node no site remoto
- `webSecurity` permanece ligado; erros de certificado TLS não são ignorados; não há flags inseguras de linha de comando
- Navegação permitida só na origem confiável (`https://central-academica-web-one.vercel.app`, ou a origem validada de `DESKTOP_APP_URL`)
- Links `http:`/`https:` externos abrem no navegador padrão, depois de validar o protocolo; `file:`, `javascript:` e outros esquemas são bloqueados
- `window.open` / popups **não** criam `BrowserWindow` extras
- `<webview>` é bloqueado; pedidos de permissão (notificações, mídia, etc.) são recusados
- O pacote não contém `SESSION_SECRET`, `DATABASE_URL` nem credenciais Railway/Supabase

A sessão usa o `session` persistente padrão do Electron (perfil em dados do aplicativo). O cookie `central.sid` tem `Max-Age` de 24h, alinhado ao TTL absoluto no servidor; sobrevive a um restart completo do app enquanto cookie e linha em `session` ainda forem válidos. O app não lê, imprime nem armazena cookies por conta própria.

## Instalador não assinado / SmartScreen

Este build **não** é assinado. Ao distribuir `Central Acadêmica Setup 0.1.0.exe` para outra máquina, o Windows SmartScreen pode mostrar um aviso de editor desconhecido. Isso é esperado. Não desabilitamos o SmartScreen nem outros mecanismos de segurança do Windows para esconder o aviso. Assinatura de código fica para um marco futuro.

## Limitações da V1

- Sem ícone `.ico` próprio (o repositório só tem `apps/web/src/app/icon.svg`); o instalador usa o ícone padrão do Electron até um `.ico` ser adicionado
- Sem bandeja, atalhos globais, iniciar com o Windows, auto-update, notificações nativas ou modo offline
- Sem DevTools na build empacotada
- `DESKTOP_APP_URL` apontando para `localhost` **não** reconfigura CORS/CSRF de produção; o fluxo suportado é a origem Vercel
