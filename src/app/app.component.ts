import { Component, OnInit } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {

    constructor(private primengConfig: PrimeNGConfig) { }

    ngOnInit() {
        this.primengConfig.ripple = true;
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
