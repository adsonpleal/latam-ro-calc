import { createElement, useEffect } from 'react';
import { ApplicationServices, ServicesProvider } from './services/application';
import { CalculatorSession } from './state/calculator-session';
import { useCalculator } from './state/use-calculator';
import { registerCalculatorViews } from './views/calculator-views';
import { Content } from './views/content/ro-calculator';
import { ColorPickerOverlay, ItemPickerOverlay } from './views/item-picker';
import { Render, registerViews } from './views/render';
import { ElementalTable } from './views/elemental-table';
import { AspdCurve } from './views/aspd-curve';
import './views/calculator-styles';

registerCalculatorViews();
registerViews({
  'app-elemental-table-raw': props => <ElementalTable {...props as any} />,
  'app-aspd-curve': props => <AspdCurve {...props as any} />,
});
function Calculator({ services, session }: { services: ApplicationServices; session: CalculatorSession }) {
  const vm = useCalculator(session);
  useEffect(() => { session.start(); }, [session]);
  return createElement('app-ro-calculator', null, <Content vm={vm} services={services} />);
}
function Footer() {
  return createElement('app-footer', null, <div className="layout-footer flex-column gap-1 text-center" style={{ fontSize: '0.85rem' }}>
    <div><a href="https://latam-tools.com.br/" target="_blank" rel="noreferrer noopener">LATAM Tools</a><span className="mx-2">•</span>
      <a href="https://github.com/adsonpleal/latam-ro-calc" target="_blank" rel="noreferrer noopener">Código no GitHub</a><span className="mx-2">•</span>
      Baseado no <a href="https://github.com/turugrura/tong-calc-ro" target="_blank" rel="noreferrer noopener">tong-calc-ro</a> de turugrura</div>
    <div className="text-color-secondary">Ragnarok Online © Gravity Co., Ltd. &amp; Lee Myoungjin. Todos os ativos, dados e imagens pertencem aos seus respectivos donos.</div>
  </div>);
}
export function Application({ services, session }: { services: ApplicationServices; session: CalculatorSession }) {
  return <ServicesProvider services={services}>
    <div className="layout-wrapper layout-theme-dark layout-overlay">
      <Render tag="app-topbar" props={{}} />
      <div className="layout-main-container"><div className="layout-main"><Calculator services={services} session={session} /></div><Footer /></div>
      <div className="layout-mask" />
    </div>
    <ItemPickerOverlay /><ColorPickerOverlay />
  </ServicesProvider>;
}
