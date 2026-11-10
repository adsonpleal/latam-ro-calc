# Sincronização do ragassets em 10/11/2026

Fonte: tabelas públicas `items.json`, `items_en.json`, `items_es.json`, `jobs.json`,
`skills.json` e `mobs.json` em <https://assets.latam-tools.com.br/raw/>, publicadas em
10/11/2026 01:34–01:36 UTC. Os geradores preservam o conteúdo do cliente; as regras
calculáveis ficam em `item.json`.

O catálogo recebeu 73 IDs e 161 descrições atualizadas, cinco delas renomeadas. A tabela
de sprites recebeu 13 IDs. Classes, atributos e nomes de monstros não tiveram alterações —
`mobs.json` continua datado de 08/09/2026, e `sync-monster-db.mjs` relatou zero registros
alterados em 537.

## Vinte e dois itens deixaram de ser pré-lançamento

As Coroas e Botas Ambivalentes, a Rapieira Infernal, o Punhal Celestial, a Ceifeira
Infernal, a Marreta Celestial, o conjunto Magistral dos Falcões e os Dons Celestial e
Infernal estavam cadastrados com o texto em inglês da página do iRO. O cliente agora os
traz, então a marca `preRelease` saiu e a `description` voltou para `""`, deixando a
sobreposição pt-BR vencer — é exatamente o que `pre-release-items.spec.ts` existe para
cobrar.

Os scripts desses 22 registros foram escritos a partir do texto do iRO. Conferir cláusula
por cláusula contra a descrição pt-BR, que agora é a fonte de verdade, é uma passada
própria: o pacote Bem e Mal do Episódio 19 (três coroas, três botas, seis armas e dois
encantes cujo efeito é todo bônus de conjunto) não está modelado. A linha "Dano mágico de
propriedade Sagrado +20%" do Dom Infernal (312021) entrou congelada em
`own-element-magic-bonus-key.spec.ts` por esse motivo.

## HP por refino do conjunto Magistral dos Falcões

As quatro peças (24832–24835) prometem "HP máx. +10 por refino" na descrição pt-BR e não
declaravam `script.hp`. O texto do iRO não traz essa linha, que é por que o registro
chegou sem ela. As quatro passaram a declarar `"1---10"`, e
`shadow-set-refine-hp.spec.ts` foi de 573 para 577 peças, 556 com a linha.

## Seis visuais novos

400100 Cabelo de Leon, 400325 Elmo do Rei do Norte, 400965 Véu de Friederike, 420204
Cabelo de Juncea, 420703 Cabelo de Aurelie e 480488 Asas de Juncea receberam registro,
sem atributos e sem script, com o subtipo e a posição que todo visual daquela posição usa.
O Elmo do Rei do Norte ocupa Topo e Meio, então carrega `locations` — `head-gear-locations.data.spec.ts`
cobrou isso sozinho.

## Tabela de Conjuração e Espera

`build-skill-delays.mjs` passou a estender até `maxLevel` a coluna que para antes dele,
repetindo o último valor, em vez de só recortar a que passa. É o que o ragassets recomenda
e o que os arquivos de classe já modelam. Só uma coluna no cliente atual está nesse estado
com valores diferentes entre si: o pós-conjuração do Ataque Vital (399), cinco entradas
para dez níveis. Sem a extensão, a verificação por nível de `skill-delay.spec.ts` lia
`undefined` do nível 5 ao 10 e comparava `NaN`, que não falha — os seis níveis estavam sem
cobertura. Nenhum número do motor mudou: `Lorde` já traz `acd: skillLevel <= 4 ? 0.8 : 1`.
O arquivo gerado é dado de validação; nada do pacote do navegador o lê.

## Nomes e descrições em inglês e espanhol

O ragassets passou a publicar uma cópia de cada tabela de texto por idioma. Este repositório
já consumia `items_en.json` e `items_es.json` desde o i18n da calculadora, e as duas
sobreposições foram atualizadas junto (14.997 e 14.998 entradas).

As cópias de `skills`, `status`, `randomopt`, `jobs` e `classes` ficaram de fora de propósito.
A interface traduz nome de habilidade, de classe e de bônus aleatório pelos próprios arquivos
de i18n, que são escritos à mão e conferidos contra o cliente; trocá-los pelo texto do cliente
é uma mudança de origem de dados, com o seu próprio diff a revisar, e não pertence a uma
sincronização. `mobs_en.json` e `mobs_es.json` respondem 404 — os nomes de monstro não vêm do
cliente e ainda não foram publicados —, então `build-latam-monsters.mjs` continua só em pt-BR.
