import { Component } from '@angular/core';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

@Component({
  selector: 'app-documentos-page',
  standalone: true,
  imports: [IntranetSidebarComponent],
  templateUrl: './documentos-page.component.html',
  styleUrl: './documentos-page.component.css',
})
export class DocumentosPageComponent {}
