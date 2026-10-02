import { StrictMode, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { ApplicationServices, ServicesProvider } from '../../src/react/services/application';
import { Dialog } from '../../src/react/ui/dialog';
import { Button, Checkbox, Switch } from '../../src/react/ui/primitives';
import { Select } from '../../src/react/ui/select';
import { SelectButton } from '../../src/react/ui/select-button';
import { sanitizeHtml } from '../../src/react/ui/sanitize-html';
import { ConfirmDialog } from '../../src/react/ui/notifications';
import { Store } from '../../src/react/state/store';
import { useTooltip } from '../../src/react/ui/tooltip';
import { Popover } from '../../src/react/ui/popover';
import { useReorder, moveItemInArray } from '../../src/react/ui/reorder';
import { CalcValue } from '../../src/react/views/calc-value';
import { AspdCurve } from '../../src/react/views/aspd-curve';
import { StatusInput } from '../../src/react/views/status-input';
import { EquipmentChip } from '../../src/react/views/equipment-chip';
import { ItemTypeEnum } from '../../src/app/constants/item-type.enum';
import { Render } from '../../src/react/views/render';
import { registerCalculatorViews } from '../../src/react/views/calculator-views';
import { ViewState } from '../../src/react/state/view-state';
import { PopoverHandle } from '../../src/react/ui/popover-handle';
import '../../src/app/ui/styles/_tokens.css';
import '../../src/app/ui/styles/_controls.css';
import '../../src/app/ui/styles/overlay.css';

const services = new ApplicationServices(localStorage, {});
const confirmations = services.confirmations;
const outcomes = new Store({ accepted: 0, rejected: 0 });
const descriptions = services.data.descriptions;
registerCalculatorViews();
class BindingState extends ViewState {
  value = 0;
  panel = new PopoverHandle();
}
const bindingState = new BindingState();
function BoundControls() {
  useSyncExternalStore(bindingState.subscribe, bindingState.getSnapshot);
  return <section aria-label="Migrated bindings">
    <Render tag="input" props={{ type: 'number', 'aria-label': 'Bound number', value: bindingState.value,
      onModelChange: (value: number) => bindingState.action(() => { bindingState.value = value; }) }} />
    <Render tag="button" props={{ click: (event: any) => bindingState.action(() => bindingState.panel.toggle(event)) }}>Bound popover</Render>
    <Render tag="app-ui-popover" props={{ handle: bindingState.panel }}><button>Bound panel content</button></Render>
    <output aria-label="Bound value">{bindingState.value}</output>
  </section>;
}
if (window.location.search.includes('pending')) confirmations.confirm({
  message: 'Initial confirmation',
  accept: () => outcomes.update(value => ({ ...value, accepted: value.accepted + 1 })),
  reject: () => outcomes.update(value => ({ ...value, rejected: value.rejected + 1 })),
});
const options = Array.from({ length: 300 }, (_, index) => ({ label: String(index), value: index, disabled: index === 2 }));
const tree = [{ label: 'Category', items: [{ label: 'Leaf', value: 5 }, { label: 'Disabled', value: 6, disabled: true }] }];
function DragRow({ label, index, move }: { label: string; index: number; move: (from: number, to: number) => void }) {
  const reorder = useReorder(index, event => move(event.previousIndex, event.currentIndex));
  return <div className="rot-row" style={{ height: 45 }}><button style={{ touchAction: 'none' }} onPointerDown={reorder}>Move {label}</button></div>;
}
function AdditionalControls() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [order, setOrder] = useState(['A', 'B', 'C']);
  const [stat, setStat] = useState(10);
  const [breakdown, setBreakdown] = useState('');
  const [item, setItem] = useState(true);
  const tip = useTooltip({ text: 'Delayed description', showDelay: 100, position: 'top' });
  return <section>
    <button {...tip.triggerProps}>Tooltip target</button>{tip.tooltip}
    <button onClick={event => setAnchor(event.currentTarget)}>Open popover</button>
    <Popover anchor={anchor} onClose={() => setAnchor(null)}><button>Popover content</button></Popover>
    <div data-testid="drag-rows">{order.map((label, index) => <DragRow key={label} label={label} index={index}
      move={(from, to) => setOrder(current => { const next = [...current]; moveItemInArray(next, from, to); return next; })} />)}</div>
    <output aria-label="Row order">{order.join(',')}</output>
    <div data-testid="damage-value"><CalcValue label="Dano" min={10} max={20} min2={20} max2={40} totalHit={2} totalHit2={3} enableCompare showPercentDiff unit=" HP" /></div>
    <StatusInput label="FOR" dropdownList={[10, 20]} value={stat} onChange={setStat} extraValue={5} compareExtraValue={8}
      otherValue={20} otherLabel="Comparação" onExtraClick={() => setBreakdown('main')} onCompareExtraClick={() => setBreakdown('compare')} />
    <output aria-label="Breakdown side">{breakdown}</output>
    <EquipmentChip descriptions={descriptions} onPick={() => setBreakdown('picker')} onClear={() => setItem(false)}
      view={{ chip: { kind: 'item', slotKey: ItemTypeEnum.weapon, index: 0, placeholder: 'Arma' },
        text: item ? 'Fixture sword' : 'Arma', filled: item, icon: null, elementClass: null, descId: item ? 1 : null, primary: true, preRelease: false }}
      items={{ 1: { id: 1, name: 'Fixture sword' } as any }} />
    <button onClick={() => descriptions.setDescriptions({ '1': 'Delayed ^ff0000description' })}>Load descriptions</button>
    <div style={{ width: 620 }}><AspdCurve aspd={190} aspd2={180} /></div>
  </section>;
}
function Fixture() {
  const outcome = useSyncExternalStore(outcomes.subscribe, outcomes.getSnapshot);
  const [value, setValue] = useState<any>(0);
  const [checked, setChecked] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [multi, setMulti] = useState<any[]>([]);
  return <ServicesProvider services={services}>
    <ConfirmDialog service={confirmations} />
    <main><Button label="Open dialog" onClick={() => setDialog(true)} />
      {mounted && <AdditionalControls />}
      {mounted && <BoundControls />}
      <Button label="Unmount controls" onClick={() => setMounted(false)} />
      <output aria-label="Selected value">{String(value)}</output>
      <output aria-label="Multiple values">{multi.join(',')}</output>
      <output aria-label="Accepted confirmations">{outcome.accepted}</output>
      <output aria-label="Rejected confirmations">{outcome.rejected}</output>
      <Checkbox value={checked} onChange={setChecked} label="Checkbox" />
      <Switch value={checked} onChange={setChecked} ariaLabel="Switch" />
      <SelectButton options={[0, false, 1]} value={value} onChange={setValue} ariaLabel="Segments" />
      {mounted && <><Select options={options} value={value} onChange={setValue} ariaLabel="Number" filter showClear resetFilterOnHide />
        <Select options={options} value={value} onChange={setValue} ariaLabel="Virtual number" filter virtualScroll />
        <Select kind="multiselect" options={options.slice(0, 4)} value={multi} onChange={setMulti} ariaLabel="Multiple" filter />
        <Select kind="cascadeselect" options={tree} value={value} onChange={setValue} ariaLabel="Tree" /></>}
      <Dialog visible={dialog} onVisibleChange={setDialog} header="Fixture dialog" modal style={{ width: 400 }}>
        <Select options={options} value={value} onChange={setValue} ariaLabel="Nested number" filter />
        <Button label="Done" onClick={() => setDialog(false)} />
      </Dialog>
      <div data-testid="sanitized" dangerouslySetInnerHTML={{ __html: sanitizeHtml('<font color="#ff0000"><b>Safe</b></font><img src="x" onerror="window.__unsafe=true"><a href="jav&#x61;script:alert(1)">link</a><svg onload="window.__unsafe=true"></svg><script>window.__unsafe=true</script>') }} />
    </main>
  </ServicesProvider>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture /></StrictMode>);
