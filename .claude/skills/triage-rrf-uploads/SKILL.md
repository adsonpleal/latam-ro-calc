---
name: triage-rrf-uploads
description: Puxa as gravações .rrf que a comunidade enviou pelo modal "Ajude o simulador", separa o que vale conferir e entrega cada uma pronta para o review-rrf-class (com os talentos que quem gravou informou). Use quando alguém pedir para ver os envios novos, para conferir a fila de replays da comunidade, ou depois de anunciar o pedido de gravações.
---

# Triagem das gravações enviadas pela comunidade

O modal **Ajude o simulador** (botão vermelho na barra de cima) recebe uma gravação `.rrf`,
valida na hora e grava no Firestore do projeto `simulador-latam-ro`, coleção
`replay_submissions`. Este skill é a outra ponta: buscar, escolher e encaminhar.

**Este skill não confere fórmula nenhuma.** Ele para no momento em que o arquivo está no
disco com os talentos em mãos; a conferência é do [`review-rrf-class`](../review-rrf-class/SKILL.md).

## 0. O que já foi validado no navegador

Não repita esses testes — se o envio existe, ele já passou por eles
(`src/app/replay/validate-submission.ts`, com testes em `validate-submission.spec.ts`):

- o arquivo abre no `rrfparser` e tem menos de 900 KB;
- a classe existe na calculadora (o filtro mais forte contra gravação de outro servidor);
- **a árvore de habilidades está no arquivo** (`learnedSkills` não vazio);
- quem gravou marcou que é do RO LATAM e autorizou o uso do arquivo como teste no
  repositório público.

O que **não** dá para validar de fora e você ainda precisa julgar: se a gravação é mesmo do
LATAM (o `.rrf` não diz o servidor), e se ela tem material suficiente.

## 1. Credencial

Leitura pelo cliente é negada nas regras (`firestore.rules`), então o script usa uma conta
de serviço:

1. Console do Firebase → projeto **simulador-latam-ro** → Configurações do projeto → Contas
   de serviço → **Gerar nova chave**.
2. Salve como `.firebase-admin.json` na raiz do repositório. Já está no `.gitignore`.

## 2. Listar o que chegou

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --list
```

Mostra os envios com `status: new`, do mais novo para o mais antigo, sem baixar os bytes.
Por envio: personagem, classe, níveis, duração, número de golpes, **trocas de equipamento**,
habilidades aprendidas, talentos, nick/Discord, a observação de quem gravou e os itens que
ficaram fora do banco.

`--status reviewed|rejected` e `--limit N` também existem.

### Como escolher

Priorize, nesta ordem:

1. **Classe pouco testada.** Veja quais já têm `*.replay.spec.ts` em `src/app/jobs/` — o que
   não tem vale muito mais do que a décima gravação de Guarda Noturno.
2. **Trocas de equipamento > 0.** É o que permite separar "a fórmula da classe está errada"
   de "falta um item no banco": o mesmo personagem, com e sem cada peça, na mesma gravação.
   Zero trocas ainda serve, mas rende menos.
3. **Muitos golpes.** Repetição é o que traz os críticos, que são determinísticos e é por
   eles que a conferência fecha (ver `review-rrf-class` §6).
4. **Observação de quem gravou apontando um número específico.** "Implosão Tóxica parece 10%
   maior no jogo" já é a hipótese pronta.

Sinais de que provavelmente **não** é LATAM, apesar do checkbox: muitos itens fora do banco
somados a habilidades que a classe não tem aqui. Nesse caso marque `rejected` com a nota.

## 3. Baixar

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get <id>
```

Grava em `.scratch/<id>.rrf` (git-ignorado) e imprime o cabeçalho — inclusive os
**TALENTOS**, que é a informação que o `review-rrf-class` §0 normalmente manda perguntar ao
jogador. Aqui ela já veio junto: use exatamente esses números, são o valor investido (0-100),
sem o bônus de classe.

Para promover a gravação a fixture depois que ela provar seu valor:

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get <id> --out src/app/replay/__tests__/fixtures/<classe>-<cenário>.rrf
```

O padrão do nome é `<sigla da classe>-<cenário>.rrf` (`nw-ult.rrf`, `hn-magic-lv1.rrf`).

## 4. Conferir

Chame o `review-rrf-class` com o caminho do arquivo e os talentos. Pule a parte dele de
"pergunte os talentos ao jogador" — você já tem.

Uma coisa a fazer antes, se a listagem apontou **itens fora do banco**: rode a skill
`add-ro-item` com esses ids. Sem eles, a build importada fica incompleta e o resíduo de dano
vai parecer erro de fórmula.

## 5. Fechar o ciclo

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --mark <id> --status reviewed --note "virou a fixture nw-ult; achou o buraco de maestria"
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --mark <id> --status rejected --note "gravação de outro servidor: 40 itens fora do banco"
```

Se a gravação levou a uma correção e quem enviou deixou um **nick**, credite na Novidades
(`src/app/layout/app.topbar.component.ts`, array `updates`): voz impessoal, e "por Fulano" —
não "pelo Fulano". Ver [[changelog-passive-voice]] e [[novidades-reportado-por]].

## Formato do documento

Coleção `replay_submissions`, id de 10 caracteres escolhido pelo cliente.

| campo | o que é |
|---|---|
| `bytes` | o `.rrf` cru (≤ 900 KB — um documento do Firestore cabe 1 MiB) |
| `fileName`, `uploadedAt`, `appVersion`, `latamConfirmed` | procedência |
| `status` | `new` na criação; `reviewed`/`rejected` depois, por este skill |
| `traits` | `{pow,sta,wis,spl,con,crt}`, valor investido 0-100. Ausente em classe sem talentos |
| `nick`, `discord`, `notes` | opcionais, de quem enviou |
| `summary` | o que o parser leu, desnormalizado para a listagem não baixar os bytes |
| `triagedAt`, `triageNote` | escritos por `--mark` |
