# Notas para agentes

## Ambiente: local, sem Docker

Este projeto roda **localmente com Node + npm**. O setup em Docker foi **removido**
(consumia memória demais na máquina do autor). Não recrie `Dockerfile`,
`docker-compose.yml` nem `nginx.conf`, e **não** rode `docker compose ...` nem
`docker exec ...` aqui — não há container para este projeto.

```bash
pnpm install    # uma vez (ou quando as deps mudarem)
pnpm start      # dev server em http://localhost:4200
pnpm test       # Vitest (suíte completa)
pnpm build      # build de produção
pnpm lint       # ESLint --fix
```

- **Node 22** (v22.16 em uso) + **pnpm 11**. Angular 16.
- O gerenciador de pacotes é o **pnpm** — não use `npm install` aqui. Ele quebra com
  `EUNSUPPORTEDPROTOCOL workspace:*` ao ler o store do pnpm, e gera um
  `package-lock.json` que não pertence ao projeto. O lockfile do projeto é o
  `pnpm-lock.yaml`.
- **Toda configuração do pnpm mora em `pnpm-workspace.yaml`.** O pnpm 11 ignora tanto o
  campo `"pnpm"` do `package.json` quanto as chaves equivalentes no `.npmrc`. Dois
  ajustes são necessários e já estão lá:
  - `allowBuilds` (esbuild, `@parcel/watcher`, nx) — sem isso o `pnpm install` termina em
    `ERR_PNPM_IGNORED_BUILDS` e o `ng build` quebra por falta do binário do esbuild;
  - `publicHoistPattern: ['@babel/*']` — o build do Angular 16 resolve `@babel/runtime`
    por caminho absoluto na raiz do `node_modules`, que o layout estrito do pnpm não
    fornece; sem isso o dev server falha com
    `Can't resolve '.../@babel/runtime/helpers/esm/asyncToGenerator.js'`.
- Ao mudar essas configurações, apague o `node_modules` antes de reinstalar — o pnpm
  responde "Already up to date" e não refaz os links.
- Para abrir o preview no chat, use a configuração `ro-calc-dev` do
  `.claude/launch.json` (`preview_start` com `{name: "ro-calc-dev"}`), que executa
  `pnpm start`. Nunca suba servidor por `Bash`/`PowerShell` direto.

> `npm start` é `ng serve --hmr`, que usa o **webpack**, não o esbuild/Vite. Isso é
> proposital: o HMR via WebSocket do esbuild não atravessa o proxy do preview e a
> página não renderiza. `ng build` continua usando esbuild normalmente.

## Testes

`pnpm test` roda a suíte inteira (Vitest, ~15s). Os testes de lógica ficam ao lado do
código (`src/**/*.spec.ts`); a engine vive em `src/app/core/` com uma fronteira do
ESLint. O hook `pre-push` (`.githooks/pre-push`, ligado pelo script `prepare`) roda os
testes e bloqueia o push se algo falhar.

## Dados dos itens

`src/assets/demo/data/item.json` é a fonte dos itens; `latam-items.json` traz nome e
descrição em pt-BR.

> **O browser não lê mais esses arquivos.** `tools/build-web-data.mjs` mescla os dois em
> build time e emite `src/assets/data/` (fora do git). Depois de editar o `item.json`,
> rode `pnpm data:dev` — ou reinicie o `pnpm start`, que já o executa — senão a mudança
> não aparece na tela. O `pnpm build` roda o gerador com `--hash` e, no fim, o
> `tools/inject-data-manifest.mjs`, que injeta os nomes hasheados no `index.html`.
> O servidor MCP continua lendo os arquivos crus de `src/assets/demo/data/`. Ao cadastrar bônus e conjuntos, a **descrição pt-BR é a
fonte da verdade** — o `latam-items.json` serve para resolver *ids*, não para decidir o efeito.
Detalhes do formato em [`docs/item-json.md`](docs/item-json.md); para adicionar itens,
use a skill `add-ro-item`.

## Dados dos monstros

A fonte é um arquivo público do projeto **ragassets**, sem autenticação:

    https://raw.githubusercontent.com/adsonpleal/ragassets/main/mobs.json

O ragassets o gera a partir da RagnaPlace Public API (gateway laro-pt), ou seja, valores
do servidor LATAM. **Este repositório só baixa o arquivo — nunca chama a API.**

- `tools/mob-source.mjs` — leitura, mapeamento de campos, normalização de raça e a
  política de nulos. Comece por aqui.
- `tools/sync-monster-db.mjs` — atualiza as estatísticas dos registros que já existem no
  `monster.json`. Nunca adiciona nem remove ids, e preserva o `spawn` (que é mantido à
  mão: a fonte não tem mapa de spawn).
- `tools/build-latam-monsters.mjs` — gera o overlay de nomes pt-BR
  (`latam-monsters.json`) a partir do mesmo arquivo.
- Para **adicionar** um monstro, use a skill `add-ro-monster`.
