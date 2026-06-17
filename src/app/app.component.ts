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
        // pt-BR labels for the shared confirm dialogs (accept/reject) app-wide.
        this.primengConfig.setTranslation({ accept: 'Sim', reject: 'Não' });
    }
}
