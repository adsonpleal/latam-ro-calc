export const prettyItemDesc = (desc: string) =>
  desc?.replaceAll('\n', '<br>').replace(/\^(.{6})/g, '<font color="#$1">');

/** Full hover-popover HTML for an item: bold pt-BR name + client description.
 *  Shared by every item dropdown (equipment, shadow, costume/visual, pet).
 *  `description` comes in separately (ItemDescriptionStore) because it loads
 *  after the item map; before it lands this renders the name alone.
 *
 *  Descrições longas (o Chapéu de Kiwawa 401147 tem 56 linhas) não recebem mais
 *  tratamento nenhum aqui: quem cuida do excesso de altura é o próprio popover,
 *  que rola na vertical (ver `.item_desc_tooltip .p-tooltip-text` no styles.scss).
 *  Antes elas fluíam para uma segunda coluna, o que partia a leitura no meio. */
export const itemDescPopoverHtml = (item?: { name?: string }, description?: string): string => {
  const desc = prettyItemDesc(description) || '';
  const title = item?.name ? `<div class="item_desc_title"><b>${item.name}</b></div><br>` : '';
  if (!title && !desc) return '';

  return `${title}${desc}`;
};
