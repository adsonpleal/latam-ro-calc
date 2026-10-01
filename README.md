# Simulador RO LATAM

Simulador de dano de **Ragnarok Online** adaptado para o servidor **LATAM** — interface
em português (pt-BR) e rebalanceamento de classes/habilidades para a versão LATAM.

Fork e tradução do projeto [tong-calc-ro](https://github.com/turugrura/tong-calc-ro), de
turugrura.

🔗 **Acesse online:** https://simulador.latam-tools.com.br

> ⚠️ **Beta.** Alguns itens podem estar faltando ou imprecisos. A classe totalmente
> validada até agora é **Falcão do Vento**. As notas de cada versão ficam em
> **Novidades**, no próprio app (botão da versão, na barra superior).

## Recursos

- **Cálculo de dano** para 70+ classes, incluindo as 4ª classes (Cavaleiro Draconiano,
  Magus, Cardeal, Engenheiro, etc.), com fórmulas rebalanceadas para o LATAM.
- **Importação por replay** — carregue classe, nível, atributos e equipamento a partir de
  um arquivo `.rrf` exportado do jogo.
- **Simulações salvas** com renderização do personagem (paper-doll) via CDN ragassets.
- **Compartilhamento por link** — o build da simulação é codificado na URL.
- **Tabelas de resumo** de status, HP/SP e dano por habilidade.

## Stack

- [Angular 16](https://angular.io/) + [design system próprio](docs/design-system.md)
- TypeScript, RxJS
- [Vitest](https://vitest.dev/) para testes unitários da engine de cálculo
- Playwright para interações reais e comparação visual da interface
- Node 22 + [pnpm](https://pnpm.io/); deploy via Cloudflare Workers

## Como rodar

Requer **Node 22** (testado na v22.16) e **pnpm** (v11):

```bash
pnpm install --frozen-lockfile
pnpm start          # servidor local em http://localhost:4200
```

> O build usa o compilador AOT do Angular e esbuild, sem Angular CLI, webpack ou Sass.
> O servidor Node recompila em um processo separado e recarrega a página por SSE após
> um build bem-sucedido; continua servindo o último build durante a recompilação.
> `pnpm start -- --host 127.0.0.1 --port 4200` altera host/porta.
> As configurações do pnpm ficam em `pnpm-workspace.yaml`; apenas esbuild executa
> postinstall na raiz. Os peers necessários são declarados explicitamente.

## Scripts úteis

| Comando             | Descrição                                      |
| ------------------- | ---------------------------------------------- |
| `pnpm start`        | Dev server (AOT/esbuild, reload) na porta 4200        |
| `pnpm build`        | Build de produção (esbuild)                    |
| `pnpm test`         | Testes unitários (Vitest)                      |
| `pnpm test:watch`   | Vitest em modo watch                           |
| `pnpm test:cov`     | Testes com cobertura                           |
| `pnpm e2e`         | Comparação visual e interações no navegador    |
| `pnpm typecheck`   | Tipos, templates Angular e Worker                 |
| `pnpm lint:check`  | Imports não usados e fronteiras da engine                    |
| `pnpm lint`         | Mesmas verificações, sem alterar arquivos                             |

## Estrutura

```
src/app/
├── ui/          # controles próprios, tokens, ícones e overlays locais
├── core/        # engine de cálculo (calculator, damage, hp/sp) — coberta por testes
├── jobs/        # uma classe por arquivo (70+); fórmulas e habilidades
├── replay/      # parser de replay .rrf → modelo de personagem
├── domain/      # tipos e modelos de domínio
├── api-services/, pipes/, layout/, constants/, utils/
tools/           # scripts de build da base LATAM (itens, monstros, habilidades, ícones)
```

A pasta `tools/` contém os scripts que geram a base de dados LATAM
(`sync-latam-db.mjs`, `sync-monster-db.mjs`, `build-latam-monsters.mjs`) a partir das
tabelas que o [ragassets](https://github.com/adsonpleal/ragassets) publica em
`https://assets.latam-tools.com.br/raw/` — é ele que lê os arquivos do jogo; aqui só se
baixa o JSON pronto. As habilidades (nomes, descrições e ids) ficam no catálogo estático
em `src/app/skills/`.

## Base de dados de itens

O banco de itens fica em `src/assets/demo/data/item.json`. O campo `script` (os bônus de
cada item) usa uma sintaxe compacta de condições e valores. A referência completa — todos
os campos, chaves de bônus, condições e exemplos comentados — está em
**[docs/item-json.md](docs/item-json.md)**.

## Deploy

O build de produção é publicado no Cloudflare Workers (static assets). Pushes na branch
`main` disparam o deploy automático.

A política de cache fica em `src/_headers`, copiado para a raiz do build. Para publicar à
mão:

```bash
pnpm --dir tooling/cloudflare install --frozen-lockfile
pnpm build
pnpm deploy:worker
```

Wrangler tem instalação e lockfile próprios em `tooling/cloudflare`; não integra
a instalação da raiz. Para desenvolver o Worker, instale essa pasta e rode
`pnpm dev:worker`. O SDK MCP/Zod e o parser compartilhado continuam preservados.

## Créditos

Projeto original: [tong-calc-ro](https://github.com/turugrura/tong-calc-ro) por turugrura.
Esta é uma adaptação não-oficial para a comunidade LATAM. Ícones de itens/classes e render
de personagem fornecidos pelo [ragassets](https://github.com/adsonpleal/ragassets).
