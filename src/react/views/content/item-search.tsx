import { useMemo } from 'react';
import { inferCustomIcon } from '../../../app/core/custom-items';
import type { ApplicationServices } from '../../services/application';
import type { ItemSearchComponent } from '../../controllers/item-search';
import { iconUrl, missingIcon } from '../../services/assets';
import { Dialog } from '../../ui/dialog';
import { Button, Icon, Input } from '../../ui/primitives';
import { Select } from '../../ui/select';
import { SelectButton } from '../../ui/select-button';
import { Table } from '../../ui/table';
import { sanitizeHtml } from '../../ui/sanitize-html';

export function Content({ vm, services }: { vm: ItemSearchComponent; services: ApplicationServices }) {
  const action = (fn: () => void) => vm.action(fn);
  const typeOptions = useMemo(() => vm.itemPositionOptions.map(option => ({
    ...option, icon: inferCustomIcon(option.iconKind, null, vm.items ?? {}),
  })), [vm.itemPositionOptions, vm.items]);
  const renderFilterOption = (option: { label: string; icon?: number }, type: 'item' | 'skill') =>
    <span className="item-search-filter-option">
      {option.icon != null && <img className={'item-search-filter-icon item-search-filter-icon-' + type}
        src={iconUrl(option.icon, type)} alt="" {...missingIcon} />}
      <span>{option.label}</span>
    </span>;
  const itemIcon = (id: number) => iconUrl(id, 'item', customId => services.customItems.iconFor(customId));
  return <Dialog visible={vm.isShowSearchDialog} onVisibleChange={visible => action(() => { vm.isShowSearchDialog = visible; })}
    modal className="item-search-dialog"
    header={<><strong>Buscar itens</strong><span className="item-search-class">{vm.className || vm.selectedCharacter?.className}</span></>}>
    <div className="item-search-workspace">
      <form className="item-search-filters" onSubmit={event => { event.preventDefault(); action(() => vm.onItemSearchFilterChange()); }}>
        <div className="calc-section-heading"><span>Filtros</span></div>
        <div className="item-search-fields">
          <div className="item-search-field">
            <label className="calc-field-label" htmlFor="item-search-name">Nome</label>
            <Input id="item-search-name" type="search" placeholder="Nome do item" autoComplete="off"
              value={vm.searchName} onChange={event => action(() => { vm.searchName = event.target.value; })} />
          </div>
          <div className="item-search-field">
            <label className="calc-field-label" htmlFor="item-search-type">Tipo</label>
            <Select kind="multiselect" inputId="item-search-type" ariaLabel="Tipo" options={typeOptions}
              renderItem={option => renderFilterOption(option, 'item')}
              optionLabel="label" optionValue="value" placeholder="Todos os tipos" filter showClear resetFilterOnHide
              value={vm.selectedItemPositions} onChange={value => action(() => { vm.selectedItemPositions = value; })} />
          </div>
          <div className="item-search-field">
            <label className="calc-field-label" htmlFor="item-search-skill">Habilidade</label>
            <Select kind="multiselect" inputId="item-search-skill" ariaLabel="Habilidade" options={vm.offensiveSkills}
              renderItem={option => renderFilterOption(option, 'skill')}
              optionLabel="label" optionValue="value" placeholder="Todas as habilidades" filter showClear resetFilterOnHide
              value={vm.selectedOffensiveSkills} onChange={value => action(() => { vm.selectedOffensiveSkills = value; })} />
          </div>
          <div className="item-search-field">
            <label className="calc-field-label" htmlFor="item-search-server">Servidor</label>
            <Select inputId="item-search-server" ariaLabel="Servidor" options={vm.shopServerOptions} optionLabel="label" optionValue="value"
              value={vm.selectedShopServer} onChange={value => action(() => { vm.selectedShopServer = value; })} />
          </div>
        </div>
        <div className="calc-section-heading item-search-bonus-heading">
          <span>Bônus</span>
          <Button icon="plus" className="ui-button-text" aria-label="Adicionar bônus" onClick={() => action(() => vm.addBonusPicker())} />
        </div>
        <div className="item-search-bonus-pickers">
          {vm.bonusPickers.map((picker, index) => <div key={picker.id} className="item-search-bonus-row">
            <Select inputId={'item-search-bonus-' + picker.id} ariaLabel={'Bônus ' + (index + 1)}
              options={vm.bonusNameList} optionLabel="label" optionValue="value" placeholder={'Bônus ' + (index + 1)}
              filter showClear resetFilterOnHide scrollHeight="260px" panelClassName="item-search-options"
              value={picker.value} onChange={value => action(() => { picker.value = value; })} />
            {vm.bonusPickers.length > 1 && <Button icon="minus" className="ui-button-text" aria-label={'Remover bônus ' + (index + 1)}
              onClick={() => action(() => vm.removeBonusPicker(picker.id))} />}
          </div>)}
        </div>
        <div className="item-search-actions">
          <div className="item-search-mode">
            <span id="item-search-mode-label">Item deve incluir todos os bônus selecionados</span>
            <SelectButton ariaLabelledBy="item-search-mode-label" options={vm.yesNoOptions} optionLabel="label" optionValue="value"
              value={vm.matchAllBonuses} onChange={value => action(() => { vm.matchAllBonuses = value ?? vm.matchAllBonuses; })} />
          </div>
          <Button type="submit" icon="search" label="Buscar" className="ui-button-info" />
        </div>
      </form>
      <div className="item-search-results">
        <section className="item-search-list">
          <div className="calc-section-heading"><span>Resultados</span></div>
          <Table value={vm.filteredItems} header={null} dataKey="id" className="ui-datatable-sm"
            paginator rows={14} first={vm.itemSearchFirst} totalRecords={vm.totalFilteredItems} pageLinks={4}
            showCurrentPageReport currentPageReportTemplate="{totalRecords} itens"
            onFirstChange={first => action(() => { vm.itemSearchFirst = first; })}
            selection={vm.activeFilteredItem} onSelectionChange={item => action(() => { vm.activeFilteredItem = item; })}
            emptyMessage={<tr><td className="item-search-empty-list">Nenhum item encontrado.</td></tr>}
            renderRow={(item, _index, selectionProps) => <tr key={item.id} {...selectionProps}>
              <td><div className="item-search-result-row">
                <img src={itemIcon(item.id)} alt="" {...missingIcon} />
                <span>{item.label}</span>
              </div></td>
            </tr>} />
        </section>
        <section className="item-search-detail">
          <div className="calc-section-heading"><span>Descrição</span></div>
          <div className="item-description-card">
            {!vm.activeFilteredItem ? <div className="item-description-empty">
              <Icon name="arrow-circle-left" />
              <p>Selecione um item na lista ao lado para ver seus bônus e descrição.</p>
            </div> : <>
              <div className="item-description-meta">
                <img className="item-description-icon" src={itemIcon(vm.activeFilteredItem.id)} alt="" {...missingIcon} />
                <div className="item-description-links">
                  <strong>{vm.activeItem?.name}</strong>
                  {vm.activeItem?.custom ? <span>Item personalizado · ID {vm.activeFilteredItem.id}</span> : <div>
                    <a href={vm.divinePrideItemUrl} target="_blank" rel="noopener noreferrer">Item ID: {vm.activeFilteredItem.id}</a>
                    <a href={vm.marketItemUrl} target="_blank" rel="noopener noreferrer"><Icon name="shopping-cart" /> Mercado</a>
                  </div>}
                </div>
              </div>
              <div className="item-search-equip">
                {vm.equipTargetOptions.length > 0 ? <>
                  <div className="item-search-equip-target">
                    <label className="calc-field-label" htmlFor="item-search-equip-target">Equipar em</label>
                    <Select inputId="item-search-equip-target" ariaLabel="Equipar em" options={vm.equipTargetOptions}
                      optionLabel="label" optionValue="value" value={vm.equipTargetValue}
                      onChange={value => action(() => { vm.selectedEquipTarget = value; })} />
                  </div>
                  <Button icon="check" label={vm.equipInComparison ? 'Equipar na comparação' : 'Equipar'}
                    onClick={() => action(() => vm.equipSelectedItem())} />
                </> : <span>Nenhum espaço compatível disponível nos equipamentos atuais.</span>}
              </div>
              <div className="item-description-text">
                {!vm.activeItem?.custom && <img className="item-search-collection" alt="" {...missingIcon}
                  src={'https://www.divine-pride.net/img/items/collection/thROG/' + vm.activeFilteredItem.id} />}
                <div className="item-search-description" dangerouslySetInnerHTML={{ __html: sanitizeHtml(vm.activeFilteredItemDesc) }} />
              </div>
            </>}
          </div>
        </section>
      </div>
    </div>
  </Dialog>;
}
