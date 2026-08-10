export const prettyItemDesc = (desc: string) =>
  desc?.replaceAll('\n', '<br>').replace(/\^(.{6})/g, '<font color="#$1">');

/**
 * Acima de quantas linhas a descrição passa a ser diagramada em colunas.
 *
 * A mediana é 10 linhas e o p95 é 29, então isto pega só a cauda longa (~6% dos
 * itens). O limite vem da altura útil: a ~20px por linha, 28 linhas já ocupam
 * perto dos 85vh de uma tela de 720px — daí para cima o popover ficava mais alto
 * que a janela, e o PrimeNG o prendia no canto com o resto para fora da tela.
 * Foi o caso do Chapéu de Kiwawa (401147), com 56 linhas: 885px de altura numa
 * viewport de 720px.
 */
const LINHAS_PARA_COLUNAR = 28;

/** Full hover-popover HTML for an item: bold pt-BR name + client description.
 *  Shared by every item dropdown (equipment, shadow, costume/visual, pet).
 *  `description` comes in separately (ItemDescriptionStore) because it loads
 *  after the item map; before it lands this renders the name alone. */
export const itemDescPopoverHtml = (item?: { name?: string }, description?: string): string => {
  const desc = prettyItemDesc(description) || '';
  const title = item?.name ? `<div class="item_desc_title"><b>${item.name}</b></div><br>` : '';
  if (!title && !desc) return '';

  // Só as descrições longas ganham o wrapper: aplicar colunas em todas partiria
  // ao meio qualquer descrição curta que fosse larga o bastante.
  const linhas = description ? description.split('\n').length : 0;
  if (linhas > LINHAS_PARA_COLUNAR) {
    return `<div class="item_desc_long">${title}${desc}</div>`;
  }

  return `${title}${desc}`;
};
