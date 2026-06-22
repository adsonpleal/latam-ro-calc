# Simulador RO LATAM

Simulador de dano de **Ragnarok Online** adaptado para o servidor **LATAM** — interface
em português (pt-BR) e rebalanceamento de classes/habilidades para a versão LATAM.

Fork e tradução do projeto [tong-calc-ro](https://github.com/turugrura/tong-calc-ro), de
turugrura.

🔗 **Acesse online:** https://simulador.latam-tools.com.br

> ⚠️ **Beta.** Alguns itens podem estar faltando ou imprecisos. A classe totalmente
> validada até agora é **Falcão do Vento**. Veja o [CHANGELOG](CHANGELOG.md).

## Recursos

- **Cálculo de dano** para 70+ classes, incluindo as 4ª classes (Cavaleiro Draconiano,
  Magus, Cardeal, Engenheiro, etc.), com fórmulas rebalanceadas para o LATAM.
- **Importação por replay** — carregue classe, nível, atributos e equipamento a partir de
  um arquivo `.rrf` exportado do jogo.
- **Simulações salvas** com renderização do personagem (paper-doll) via CDN ragassets.
- **Compartilhamento por link** — o build da simulação é codificado na URL.
- **Tabelas de resumo** de status, HP/SP e dano por habilidade.

## Stack

- [Angular 16](https://angular.io/) + [PrimeNG 16](https://primeng.org/)
- TypeScript, RxJS
- [Vitest](https://vitest.dev/) para testes unitários da engine de cálculo
- Docker para dev/prod; deploy via Firebase Hosting

## Como rodar

O ambiente recomendado é via **Docker** (evita problemas de versão de Node e binários
nativos). Há dois profiles que nunca sobem juntos por acidente:

```bash
# Desenvolvimento — ng serve com hot reload em http://localhost:4200
docker compose --profile dev up --build

# Produção local — build estático servido pelo nginx em http://localhost:8090
docker compose --profile prod up --build
```

> O dev server usa o **webpack** (não o esbuild/Vite), pois o HMR via WebSocket do esbuild
> não atravessa proxies reversos. `ng build` (imagem de prod) continua usando esbuild.

### Sem Docker

Requer Node 22 e [pnpm](https://pnpm.io/) (ou `bun`, ver `bun.lock`):

```bash
pnpm install
pnpm start          # ng serve em http://localhost:4200
```

## Scripts úteis

| Comando             | Descrição                                      |
| ------------------- | ---------------------------------------------- |
| `pnpm start`        | Dev server (webpack, HMR) na porta 4200        |
| `pnpm build`        | Build de produção (esbuild)                    |
| `pnpm test`         | Testes unitários (Vitest)                      |
| `pnpm test:watch`   | Vitest em modo watch                           |
| `pnpm test:cov`     | Testes com cobertura                           |
| `pnpm lint`         | ESLint com `--fix`                             |

## Estrutura

```
src/app/
├── core/        # engine de cálculo (calculator, damage, hp/sp) — coberta por testes
├── jobs/        # uma classe por arquivo (70+); fórmulas e habilidades
├── replay/      # parser de replay .rrf → modelo de personagem
├── domain/      # tipos e modelos de domínio
├── api-services/, pipes/, layout/, constants/, utils/
tools/           # scripts de build da base LATAM (itens, monstros, habilidades, ícones)
```

A pasta `tools/` contém os scripts que geram a base de dados LATAM (`build-latam-db.mjs`,
`build-latam-monsters.mjs`, etc.) a partir das fontes do jogo. As habilidades (nomes,
descrições e ids) ficam no catálogo estático em `src/app/skills/`.

## Base de dados de itens

O banco de itens fica em `src/assets/demo/data/item.json`. O campo `script` (os bônus de
cada item) usa uma sintaxe compacta de condições e valores. A referência completa — todos
os campos, chaves de bônus, condições e exemplos comentados — está em
**[docs/item-json.md](docs/item-json.md)**.

## Deploy

O build de produção é publicado no Firebase Hosting. Pushes na branch `main` disparam o
deploy automático.

```bash
pnpm build && firebase deploy
```

## Créditos

Projeto original: [tong-calc-ro](https://github.com/turugrura/tong-calc-ro) por turugrura.
Esta é uma adaptação não-oficial para a comunidade LATAM. Ícones de itens/classes e render
de personagem fornecidos pelo [ragassets](https://github.com/adsonpleal/ragassets).
