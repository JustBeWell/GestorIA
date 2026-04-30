import { Component } from '@angular/core';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

@Component({
  selector: 'app-clientes-page',
  standalone: true,
  imports: [IntranetSidebarComponent],
  templateUrl: './clientes-page.component.html',
  styleUrl: './clientes-page.component.css',
})
export class ClientesPageComponent {}
