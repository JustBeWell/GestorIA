import { Component } from '@angular/core';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

@Component({
  selector: 'app-pagos-page',
  standalone: true,
  imports: [IntranetSidebarComponent],
  templateUrl: './pagos-page.component.html',
  styleUrl: './pagos-page.component.css',
})
export class PagosPageComponent {}
