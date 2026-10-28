/**
 * Spanish catalog. Loaded on demand — see `loadCatalog`.
 *
 * Game vocabulary comes from the LATAM client itself (`/raw/items_es.json`, the
 * `Tipo:`/`Posición:` lines of its own item tooltips) rather than from a translation
 * of the Portuguese: Escudo, Equipo para Cabeza, Armadura, Calzado, Manto, Accesorio,
 * Munición, Carta, Disfraz, Equipo Sombrío, Arete/Collar/Greba Sombría and Piedra de
 * Encantamiento are the words a LATAM player reads in game.
 *
 * Typed against the pt-BR key set and deliberately `Partial`: a key missing here
 * falls back to Portuguese instead of showing a raw key.
 */
import type { TranslatedCatalog } from '.';

export const catalog: TranslatedCatalog = {
  'common.yes': 'Sí',
  'common.no': 'No',

  'locale.label': 'Idioma',

  'ui.loading': 'Cargando',
  'ui.select.clearSelection': 'Borrar selección',
  'ui.select.openOptions': 'Abrir opciones',
  'ui.select.closeOptions': 'Cerrar opciones',
  'ui.select.selectAll': 'Seleccionar todo',
  'ui.select.filterOptions': 'Filtrar opciones',
  'ui.select.clearSearch': 'Borrar búsqueda',
  'ui.select.emptyFilter': 'No se encontraron resultados',
  'ui.select.selectedCount': '{0} seleccionados',
  'ui.table.pagination': 'Paginación',
  'ui.table.firstPage': 'Primera página',
  'ui.table.previousPage': 'Página anterior',
  'ui.table.nextPage': 'Página siguiente',
  'ui.table.lastPage': 'Última página',
  'ui.table.page': 'Página {number}',
  'ui.table.currentPageReport': '{currentPage} de {totalPages}',
  'ui.dialog.close': 'Cerrar',
  'ui.toast.close': 'Cerrar notificación',
  'ui.confirm.header': 'Confirmación',

  'topbar.settings': 'Configuración',

  'itemSearch.title': 'Buscar objetos',
  'itemSearch.filters': 'Filtros',
  'itemSearch.name': 'Nombre',
  'itemSearch.namePlaceholder': 'Nombre del objeto',
  'itemSearch.type': 'Tipo',
  'itemSearch.typePlaceholder': 'Todos los tipos',
  'itemSearch.skill': 'Habilidad',
  'itemSearch.skillPlaceholder': 'Todas las habilidades',
  'itemSearch.server': 'Servidor',
  'itemSearch.onlyCurrentLevel': 'Solo objetos para el nivel actual ({level}) o inferior',
  'itemSearch.bonuses': 'Bonificaciones',
  'itemSearch.bonusNumber': 'Bonificación {number}',
  'itemSearch.addBonus': 'Agregar bonificación',
  'itemSearch.removeBonus': 'Quitar bonificación {number}',
  'itemSearch.matchAllBonuses': 'El objeto debe incluir todas las bonificaciones seleccionadas',
  'itemSearch.search': 'Buscar',
  'itemSearch.results': 'Resultados',
  'itemSearch.resultCount': '{totalRecords} objetos',
  'itemSearch.noResults': 'No se encontraron objetos.',
  'itemSearch.description': 'Descripción',
  'itemSearch.itemDescription': 'Descripción del objeto',
  'itemSearch.selectPrompt': 'Selecciona un objeto en la lista para ver sus bonificaciones y su descripción.',
  'itemSearch.customItem': 'Objeto personalizado · ID {id}',
  'itemSearch.itemId': 'ID del objeto: {id}',
  'itemSearch.market': 'Mercado',
  'itemSearch.equipTarget': 'Equipar en',
  'itemSearch.equip': 'Equipar',
  'itemSearch.equipInComparison': 'Equipar en la comparación',
  'itemSearch.noCompatibleSlot': 'No hay ninguna ranura compatible en el equipamiento actual.',

  'itemPosition.weaponList': 'Arma',
  'itemPosition.ammoList': 'Munición',
  'itemPosition.weaponCardList': 'Carta de Arma',
  'itemPosition.shieldList': 'Escudo',
  'itemPosition.shieldCardList': 'Carta de Escudo',
  'itemPosition.headUpperList': 'Superior',
  'itemPosition.headMiddleList': 'Media',
  'itemPosition.headLowerList': 'Inferior',
  'itemPosition.headCardList': 'Carta de Equipo para Cabeza',
  'itemPosition.enchants': 'Piedra de Encantamiento',
  'itemPosition.armorList': 'Armadura',
  'itemPosition.armorCardList': 'Carta de Armadura',
  'itemPosition.garmentList': 'Manto',
  'itemPosition.garmentCardList': 'Carta de Manto',
  'itemPosition.bootList': 'Calzado',
  'itemPosition.bootCardList': 'Carta de Calzado',
  'itemPosition.accList': 'Accesorio',
  'itemPosition.accCardList': 'Carta de Accesorio',
  'itemPosition.petList': 'Mascota',
  'itemPosition.costumeList': 'Disfraz',
  'itemPosition.shadowWeaponList': 'Arma Sombría',
  'itemPosition.shadowArmorList': 'Armadura Sombría',
  'itemPosition.shadowShieldList': 'Escudo Sombrío',
  'itemPosition.shadowBootList': 'Greba Sombría',
  'itemPosition.shadowEarringList': 'Arete Sombrío',
  'itemPosition.shadowPendantList': 'Collar Sombrío',
};
