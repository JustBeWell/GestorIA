import { Component } from '@angular/core';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

@Component({
  selector: 'app-calendario-fiscal-page',
  standalone: true,
  imports: [IntranetSidebarComponent],
  templateUrl: './calendario-fiscal-page.component.html',
  styleUrl: './calendario-fiscal-page.component.css',
})
export class CalendarioFiscalPageComponent {}
