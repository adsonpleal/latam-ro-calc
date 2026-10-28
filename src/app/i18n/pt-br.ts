/**
 * The source catalog. Every key is written here first, in the wording the app has
 * always shipped, and `es.ts`/`en.ts` are checked against this object's key set —
 * so a key that exists only in a translation fails `pnpm typecheck`.
 *
 * It is bundled with the app rather than loaded: it is the fallback for every lookup
 * (see `translate`), so it has to be there before the first paint.
 *
 * Keys are dotted and grouped by where the text appears: `common.*` for wording
 * shared across screens, `ui.*` for the design-system primitives, and one group per
 * screen. Placeholders are `{name}`.
 */
export const ptBR = {
  'common.yes': 'Sim',
  'common.no': 'Não',

  'locale.label': 'Idioma',

  // Design-system primitives (src/react/ui). Mostly accessible names, which is
  // exactly why they belong here: a screen reader in Spanish should not read
  // Portuguese button names.
  'ui.loading': 'Carregando',
  'ui.select.clearSelection': 'Limpar seleção',
  'ui.select.openOptions': 'Abrir opções',
  'ui.select.closeOptions': 'Fechar opções',
  'ui.select.selectAll': 'Selecionar todos',
  'ui.select.filterOptions': 'Filtrar opções',
  'ui.select.clearSearch': 'Limpar busca',
  'ui.select.emptyFilter': 'Nenhum resultado encontrado',
  'ui.select.selectedCount': '{0} selecionados',
  'ui.table.pagination': 'Paginação',
  'ui.table.firstPage': 'Primeira página',
  'ui.table.previousPage': 'Página anterior',
  'ui.table.nextPage': 'Próxima página',
  'ui.table.lastPage': 'Última página',
  'ui.table.page': 'Página {number}',
  'ui.table.currentPageReport': '{currentPage} de {totalPages}',
  'ui.dialog.close': 'Fechar',
  'ui.toast.close': 'Fechar notificação',
  'ui.confirm.header': 'Confirmação',

  'topbar.settings': 'Configurações',
  'updates.title': 'NOVIDADES',
  'updates.loading': 'Carregando novidades…',
  'updates.error': 'Não foi possível carregar as novidades.',
  'updates.retry': 'Tentar novamente',
  'updates.originalHistory': 'Histórico original (pré-fork) →',

  'itemSearch.title': 'Buscar itens',
  'itemSearch.filters': 'Filtros',
  'itemSearch.name': 'Nome',
  'itemSearch.namePlaceholder': 'Nome do item',
  'itemSearch.type': 'Tipo',
  'itemSearch.typePlaceholder': 'Todos os tipos',
  'itemSearch.skill': 'Habilidade',
  'itemSearch.skillPlaceholder': 'Todas as habilidades',
  'itemSearch.server': 'Servidor',
  'itemSearch.onlyCurrentLevel': 'Apenas itens para o nível atual ({level}) ou inferior',
  'itemSearch.bonuses': 'Bônus',
  'itemSearch.bonusNumber': 'Bônus {number}',
  'itemSearch.addBonus': 'Adicionar bônus',
  'itemSearch.removeBonus': 'Remover bônus {number}',
  'itemSearch.matchAllBonuses': 'Item deve incluir todos os bônus selecionados',
  'itemSearch.search': 'Buscar',
  'itemSearch.results': 'Resultados',
  'itemSearch.resultCount': '{totalRecords} itens',
  'itemSearch.noResults': 'Nenhum item encontrado.',
  'itemSearch.description': 'Descrição',
  'itemSearch.itemDescription': 'Descrição do item',
  'itemSearch.selectPrompt': 'Selecione um item na lista ao lado para ver seus bônus e descrição.',
  'itemSearch.customItem': 'Item personalizado · ID {id}',
  'itemSearch.itemId': 'Item ID: {id}',
  'itemSearch.market': 'Mercado',
  'itemSearch.equipTarget': 'Equipar em',
  'itemSearch.equip': 'Equipar',
  'itemSearch.equipInComparison': 'Equipar na comparação',
  'itemSearch.noCompatibleSlot': 'Nenhum espaço compatível disponível nos equipamentos atuais.',

  // Equipment positions the item-search type filter offers. They name slots, not
  // items, so they are UI text and not something the ragassets tables answer.
  'itemPosition.weaponList': 'Arma',
  'itemPosition.ammoList': 'Munição',
  'itemPosition.weaponCardList': 'Carta de Arma',
  'itemPosition.shieldList': 'Escudo',
  'itemPosition.shieldCardList': 'Carta de Escudo',
  'itemPosition.headUpperList': 'Topo',
  'itemPosition.headMiddleList': 'Meio',
  'itemPosition.headLowerList': 'Baixo',
  'itemPosition.headCardList': 'Carta de Cabeça',
  'itemPosition.enchants': 'Pedra de Encantamento',
  'itemPosition.armorList': 'Armadura',
  'itemPosition.armorCardList': 'Carta de Armadura',
  'itemPosition.garmentList': 'Capa',
  'itemPosition.garmentCardList': 'Carta de Capa',
  'itemPosition.bootList': 'Botas',
  'itemPosition.bootCardList': 'Carta de Botas',
  'itemPosition.accList': 'Acessório',
  'itemPosition.accCardList': 'Carta de Acessório',
  'itemPosition.petList': 'Pet',
  'itemPosition.costumeList': 'Visual',
  'itemPosition.shadowWeaponList': 'Arma Sombria',
  'itemPosition.shadowArmorList': 'Armadura Sombria',
  'itemPosition.shadowShieldList': 'Escudo Sombrio',
  'itemPosition.shadowBootList': 'Botas Sombrias',
  'itemPosition.shadowEarringList': 'Brinco Sombrio',
  'itemPosition.shadowPendantList': 'Pingente Sombrio',
} as const;
