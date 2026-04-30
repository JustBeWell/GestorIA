import { Component } from '@angular/core';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

@Component({
  selector: 'app-trabajos-page',
  standalone: true,
  imports: [IntranetSidebarComponent],
  templateUrl: './trabajos-page.component.html',
  styleUrl: './trabajos-page.component.css',
})
export class TrabajosPageComponent {}
