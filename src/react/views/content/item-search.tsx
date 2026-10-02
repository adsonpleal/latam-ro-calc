import { Render, displayPipe, interpolate, classNames, parseStyle, normalizeStyle } from '../render';
import { sanitizeHtml } from '../../ui/sanitize-html';
export function Content({vm, services}: {vm: any; services: any}) {
return <><Render tag="app-ui-dialog" props={{"header": interpolate(["",""], [(vm.className || vm.selectedCharacter?.className)]),
"modal": true,
"closeOnEscape": true,
"visible": vm.isShowSearchDialog,
"visibleChange": (event: any) => vm.action(() => { const $event = event; (vm.isShowSearchDialog = $event) }),
"style": normalizeStyle(Object.assign({}, normalizeStyle({"width": "75vw","height": "90vh","min-width": "750px"})))}}><Render tag="div" props={{"className": ["ui-fluid grid grid-nogutter"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["col-12 item-position-list"].filter(Boolean).join(' ')}}><Render tag="app-ui-listbox" props={{"options": vm.itemPositionOptions,
"metaKeySelection": false,
"multiple": true,
"listStyle": {"max-height": "600px"},
"value": vm.selectedItemPositions,
"onModelChange": (value: any, event: any) => vm.action(() => { ((event: any) => vm.action(() => { const $event = event; (vm.selectedItemPositions = $event) }))(value); }),
"template_item": (context: any) => { const item = context["$implicit"]; return <><Render tag="div" props={{"className": [classNames(interpolate(["flex item-position-",""], [item.value]))].filter(Boolean).join(' '),
"style": normalizeStyle(Object.assign({}, parseStyle("background-color: var(--border-radius)")))}}><Render tag="div" props={{}}>{interpolate(["",""], [item.label])}</Render></Render></>; }}}></Render></Render>
<Render tag="div" props={{"className": ["col-12 grid grid-nogutter"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["col-6 grid grid-nogutter"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["col-6"].filter(Boolean).join(' ')}}><Render tag="app-ui-cascade-select" props={{"optionValue": "value",
"optionGroupLabel": "label",
"optionLabel": "label",
"placeholder": "Bônus 1",
"options": vm.bonusNameList,
"optionGroupChildren": ["children","children"],
"showClear": true,
"value": vm.selectedBonus[0],
"onModelChange": (value: any, event: any) => vm.action(() => { ((event: any) => vm.action(() => { const $event = event; (vm.selectedBonus[0] = $event) }))(value); })}}></Render></Render>
<Render tag="div" props={{"className": ["col-6"].filter(Boolean).join(' ')}}><Render tag="app-ui-cascade-select" props={{"optionValue": "value",
"optionGroupLabel": "label",
"optionLabel": "label",
"placeholder": "Bônus 2",
"options": vm.bonusNameList,
"optionGroupChildren": ["children","children"],
"showClear": true,
"value": vm.selectedBonus[1],
"onModelChange": (value: any, event: any) => vm.action(() => { ((event: any) => vm.action(() => { const $event = event; (vm.selectedBonus[1] = $event) }))(value); })}}></Render></Render>
<Render tag="div" props={{"className": ["col-6"].filter(Boolean).join(' ')}}><Render tag="app-ui-cascade-select" props={{"optionValue": "value",
"optionGroupLabel": "label",
"optionLabel": "label",
"placeholder": "Bônus 3",
"options": vm.bonusNameList,
"optionGroupChildren": ["children","children"],
"showClear": true,
"value": vm.selectedBonus[2],
"onModelChange": (value: any, event: any) => vm.action(() => { ((event: any) => vm.action(() => { const $event = event; (vm.selectedBonus[2] = $event) }))(value); })}}></Render></Render>
<Render tag="div" props={{"className": ["col-6"].filter(Boolean).join(' ')}}><Render tag="app-ui-cascade-select" props={{"optionValue": "value",
"optionGroupLabel": "label",
"optionLabel": "label",
"placeholder": "Bônus 4",
"options": vm.bonusNameList,
"optionGroupChildren": ["children","children"],
"showClear": true,
"value": vm.selectedBonus[3],
"onModelChange": (value: any, event: any) => vm.action(() => { ((event: any) => vm.action(() => { const $event = event; (vm.selectedBonus[3] = $event) }))(value); })}}></Render></Render>
<Render tag="div" props={{"className": ["col-12 px-2 py-2 flex justify-content-between"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["search-mode flex"].filter(Boolean).join(' ')}}><Render tag="app-ui-input-switch" props={{"inputId": "search_mode",
"value": vm.isSerchMatchAllBonus,
"onModelChange": (value: any, event: any) => vm.action(() => { ((event: any) => vm.action(() => { const $event = event; (vm.isSerchMatchAllBonus = $event) }))(value); })}}></Render>
{(() => { const __condition1 = vm.isSerchMatchAllBonus;  return __condition1 ? <><Render tag="span" props={{"className": ["px-2"].filter(Boolean).join(' ')}}>{"Item deve incluir todos os bônus selecionados"}</Render></> : null; })()}
{(() => { const __condition2 = !(vm.isSerchMatchAllBonus);  return __condition2 ? <><Render tag="span" props={{"className": ["px-2"].filter(Boolean).join(' ')}}>{"Item deve incluir pelo menos 1 dos bônus selecionados"}</Render></> : null; })()}</Render>
<Render tag="div" props={{"className": ["search-btn"].filter(Boolean).join(' ')}}><Render tag="button" props={{"click": (event: any) => vm.action(() => { const $event = event; vm.onItemSearchFilterChange() }),
"className": ["ui-button-info"].filter(Boolean).join(' '),
"button": true}}>{"Buscar"}</Render></Render></Render></Render>
<Render tag="div" props={{"className": ["col-6 grid grid-nogutter"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["col-12 skill-list"].filter(Boolean).join(' ')}}><Render tag="app-ui-listbox" props={{"options": vm.offensiveSkills,
"metaKeySelection": false,
"multiple": true,
"value": vm.selectedOffensiveSkills,
"onModelChange": (value: any, event: any) => vm.action(() => { ((event: any) => vm.action(() => { const $event = event; (vm.selectedOffensiveSkills = $event) }))(value); })}}></Render></Render></Render></Render>
<Render tag="div" props={{"className": ["col-4 search_table"].filter(Boolean).join(' ')}}><Render tag="app-ui-table" props={{"dataKey": "id",
"selectionMode": "single",
"styleClass": "ui-datatable-sm",
"currentPageReportTemplate": "{totalRecords} itens",
"value": vm.filteredItems,
"selection": vm.activeFilteredItem,
"tableStyle": {"min-width": "20rem"},
"paginator": true,
"rows": 14,
"showCurrentPageReport": true,
"pageLinks": 4,
"first": vm.itemSearchFirst,
"totalRecords": vm.totalFilteredItems,
"selectionChange": (event: any) => vm.action(() => { const $event = event; (vm.activeFilteredItem = $event) }),
"firstChange": (event: any) => vm.action(() => { const $event = event; (vm.itemSearchFirst = $event) }),
"rowSelected": (event: any) => vm.action(() => { const $event = event; vm.onSelectFilteredItem($event.data) }),
"rowUnselected": (event: any) => vm.action(() => { const $event = event; vm.onSelectFilteredItem($event.data) }),
"template_body": (context: any) => { const item = context["$implicit"];
const rowIndex = context["rowIndex"]; return <><Render tag="tr" props={{"appSelectableRow": item}}><Render tag="td" props={{}}><Render tag="div" props={{"className": [classNames(interpolate(["flex gap-1 item_template item_label_",""], [item.value]))].filter(Boolean).join(' '),
"style": normalizeStyle(Object.assign({}, parseStyle("background-color: var(--border-radius)")))}}><Render tag="img" props={{"alt": "",
"src": displayPipe("iconUrl", item.id, ["item"], services),
"className": ["item_img"].filter(Boolean).join(' ')}}></Render>
<Render tag="div" props={{"className": ["text_ellips"].filter(Boolean).join(' ')}}>{interpolate([" "," "], [item.label])}</Render></Render></Render></Render></>; }}}></Render></Render>
<Render tag="div" props={{"className": ["col-8"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["flex align-items-center gap-2 px-2 py-2 ml-2"].filter(Boolean).join(' ')}}><Render tag="span" props={{"className": ["text-sm white-space-nowrap"].filter(Boolean).join(' ')}}>{"Servidor:"}</Render>
<Render tag="app-ui-dropdown" props={{"optionLabel": "label",
"optionValue": "value",
"styleClass": "w-full",
"options": vm.shopServerOptions,
"value": vm.selectedShopServer,
"onModelChange": (value: any, event: any) => vm.action(() => { ((event: any) => vm.action(() => { const $event = event; (vm.selectedShopServer = $event) }))(value); }),
"className": ["flex-1"].filter(Boolean).join(' ')}}></Render></Render>
<Render tag="div" props={{"className": ["grid grid-nogutter ml-2"].filter(Boolean).join(' '),
"style": normalizeStyle(Object.assign({}, parseStyle("max-height: 460px; overflow: auto")))}}>{(() => { const __condition3 = !(vm.activeFilteredItem);  return __condition3 ? <><Render tag="div" props={{"className": ["col-12 flex flex-column align-items-center justify-content-center text-center px-3"].filter(Boolean).join(' '),
"style": normalizeStyle(Object.assign({}, parseStyle("min-height: 240px; opacity: 0.6")))}}><Render tag="app-icon" props={{"name": "arrow-circle-left",
"style": normalizeStyle(Object.assign({}, parseStyle("font-size: 2.5rem")))}}></Render>
<Render tag="p" props={{"className": ["mt-3 mb-0"].filter(Boolean).join(' ')}}>{"Selecione um item na lista ao lado para ver seus bônus e descrição."}</Render></Render></> : null; })()}
{(() => { const __condition4 = vm.activeFilteredItem;  return __condition4 ? <><><Render tag="div" props={{"className": ["col-12 json_display"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["flex flex-column align-items-start gap-1"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{" Item ID: "}
<Render tag="a" props={{"target": "_blank",
"rel": "noopener noreferrer",
"href": vm.divinePrideItemUrl}}>{interpolate(["",""], [vm.activeFilteredItem.id])}</Render></Render>
<Render tag="a" props={{"target": "_blank",
"rel": "noopener noreferrer",
"href": vm.marketItemUrl,
"className": ["flex align-items-center gap-1"].filter(Boolean).join(' ')}}><Render tag="app-icon" props={{"name": "shopping-cart"}}></Render>
{" Mercado "}</Render></Render></Render>
<Render tag="div" props={{"className": ["col-fixed px-2 py-2 mt-3"].filter(Boolean).join(' '),
"style": normalizeStyle(Object.assign({}, parseStyle("color: #000; background-color: #fff; width: 100px")))}}>{(() => { const __condition5 = vm.seletedItemId;  return __condition5 ? <><Render tag="img" props={{"alt": "",
"src": interpolate(["https://www.divine-pride.net/img/items/collection/thROG/",""], [vm.seletedItemId])}}></Render></> : null; })()}</Render>
<Render tag="div" props={{"dangerouslySetInnerHTML": {__html: sanitizeHtml(vm.activeFilteredItemDesc ?? '')},
"className": ["col px-2 py-2 mt-3"].filter(Boolean).join(' '),
"style": normalizeStyle(Object.assign({}, parseStyle("color: #000; background-color: #fff")))}}></Render></></> : null; })()}</Render></Render></Render></Render></>;
}
