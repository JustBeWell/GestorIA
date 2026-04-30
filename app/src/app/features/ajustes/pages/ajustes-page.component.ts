import { Component } from '@angular/core';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

@Component({
  selector: 'app-ajustes-page',
  standalone: true,
  imports: [IntranetSidebarComponent],
  templateUrl: './ajustes-page.component.html',
  styleUrl: './ajustes-page.component.css',
})
export class AjustesPageComponent {}
