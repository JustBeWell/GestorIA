import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

@Component({
  selector: 'app-ajustes-page',
  standalone: true,
  imports: [CommonModule, IntranetSidebarComponent],
  templateUrl: './ajustes-page.component.html',
  styleUrl: './ajustes-page.component.css',
})
export class AjustesPageComponent {
  protected activeSection: 'seguridad' | 'apariencia' = 'seguridad';

  protected readonly languages = [
    { code: 'ES', name: 'Español (España)', selected: true },
    { code: 'CA', name: 'Català', selected: false },
    { code: 'EN', name: 'English', selected: false },
  ];

  protected readonly sessions = [
    { device: 'MacBook Pro · Safari', meta: 'Madrid, ES · 85.214.132.56', status: 'Actual', time: 'Ahora', action: '' },
    { device: 'iPhone 15 · App móvil', meta: 'Madrid, ES · 85.214.132.58', status: '', time: 'Hace 2 horas', action: 'Cerrar' },
    { device: 'Chrome · Windows', meta: 'Barcelona, ES · 192.168.1.42', status: '', time: 'Ayer 18:42', action: 'Cerrar' },
  ];

  protected readonly accents = [
    { label: 'Oro', tone: 'gold', active: true },
    { label: 'Azul', tone: 'blue', active: false },
    { label: 'Verde', tone: 'green', active: false },
    { label: 'Rosa', tone: 'rose', active: false },
    { label: 'Púrpura', tone: 'purple', active: false },
  ];
}
