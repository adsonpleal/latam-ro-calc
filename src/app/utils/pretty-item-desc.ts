export const prettyItemDesc = (desc: string) =>
  desc?.replaceAll('\n', '<br>').replace(/\^(.{6})/g, '<font color="#$1">');

/** Full hover-popover HTML for an item: bold pt-BR name + client description.
 *  Shared by every item dropdown (equipment, shadow, costume/visual, pet). */
export const itemDescPopoverHtml = (item?: { name?: string; description?: string }): string => {
  const desc = prettyItemDesc(item?.description) || '';
  const title = item?.name ? `<div class="item_desc_title"><b>${item.name}</b></div><br>` : '';
  return title || desc ? `${title}${desc}` : '';
};
