import { Component, OnInit } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';
import { PageScrollLockService } from './page-scroll-lock.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {

    constructor(
        private primengConfig: PrimeNGConfig,
        private readonly pageScroll: PageScrollLockService,
    ) { }

    ngOnInit() {
        this.primengConfig.ripple = true;
        // Every p-overlay picker — dropdown, multiselect, cascadeselect — reads these.
        // PrimeNG ships both behaviours and leaves both switched off by default.
        this.primengConfig.overlayOptions = {
            // Esc closes the open panel. Without it PrimeNG 16 has no Escape handling in
            // Dropdown, MultiSelect or CascadeSelect at all, and the only way out is to
            // click somewhere else. Kept as the backstop for a picker whose own Escape
            // never reaches OverlayEscapeService — which is the one that actually matters,
            // because the component's handler is a second slower than this one.
            hideOnEscape: true,
            // No fade on the way out. Measured across the page, that tenth of a second was
            // the entire cost of a close — flat, whether the list held three options or
            // three thousand — and next to the equipment chips, which detach within a
            // frame, it read as lag. Opening keeps its animation: there the panel's content
            // is what the eye is waiting for. Set here rather than per picker because the
            // component-level input for it is deprecated and warns once per instance.
            hideTransitionOptions: '0ms',
            // And the page behind a panel holds still: PrimeNG's default is to *hide* the
            // panel when an ancestor scrolls, which makes a stray wheel nudge lose the
            // choice being made.
            //
            // onBefore*, not onShow/onHide: those two fire when the open and close
            // animations *finish*, so an animation that never completes would strand the
            // page frozen. These fire when it starts, which is also when the freeze is
            // wanted — and they still pair one for one.
            onBeforeShow: () => this.pageScroll.lock(),
            onBeforeHide: () => this.pageScroll.unlock(),
        };
        // pt-BR labels app-wide: confirm dialogs (accept/reject) and the
        // dropdown/listbox empty-state messages (e.g. filtered search with no hit).
        this.primengConfig.setTranslation({
            accept: 'Sim',
            reject: 'Não',
            emptyFilterMessage: 'Nenhum resultado encontrado',
            emptyMessage: 'Nenhum resultado encontrado',
        });
    }
}
