import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

@Component({
  selector: 'app-documentos-page',
  standalone: true,
  imports: [CommonModule, IntranetSidebarComponent],
  templateUrl: './documentos-page.component.html',
  styleUrl: './documentos-page.component.css',
})
export class DocumentosPageComponent {
  protected readonly pinnedFolders = [
    { initials: 'CB', name: 'Construcciones Bétula SL', files: 124, size: '284 MB', tone: 'terra' },
    { initials: 'TN', name: 'Talleres Norte SLU', files: 89, size: '156 MB', tone: 'gold' },
  ];

  protected readonly storageTypes = [
    { label: 'PDF', size: '412 MB', tone: 'pdf' },
    { label: 'XLSX', size: '142 MB', tone: 'xlsx' },
    { label: 'DOCX', size: '68 MB', tone: 'docx' },
    { label: 'Otros', size: '21 MB', tone: 'other' },
  ];

  protected readonly recentFiles = [
    { type: 'PDF', name: 'Modelo_303_1T_2026.pdf', client: 'Construcciones Bétula SL', size: '412 KB', date: '10:42', tone: 'pdf' },
    { type: 'XLSX', name: 'Nominas_marzo_2026.xlsx', client: 'Talleres Norte SLU', size: '1,2 MB', date: 'ayer 16:22', tone: 'xlsx' },
    { type: 'DOCX', name: 'Contrato_arrendamiento.docx', client: 'Marina Pérez Soler', size: '84 KB', date: 'ayer 11:05', tone: 'docx' },
    { type: 'PDF', name: 'Justificante_pago_AEAT.pdf', client: 'Javier Romero Castaño', size: '212 KB', date: '27 abr', tone: 'pdf' },
  ];

  protected readonly folders = [
    { initials: 'CB', name: 'Construcciones Bétula SL', id: 'C-1042', files: 124, size: '284 MB', updated: 'hoy', tone: 'terra' },
    { initials: 'TN', name: 'Talleres Norte SLU', id: 'C-1019', files: 89, size: '156 MB', updated: 'ayer', tone: 'gold' },
    { initials: 'MP', name: 'Marina Pérez Soler', id: 'C-1037', files: 47, size: '62 MB', updated: '2 días', tone: 'blue' },
    { initials: 'Hd', name: 'Hortelanos del Sur SCP', id: 'C-1029', files: 38, size: '48 MB', updated: '5 días', tone: 'green' },
    { initials: 'JR', name: 'Javier Romero Castaño', id: 'C-1024', files: 22, size: '31 MB', updated: 'hoy', tone: 'magenta' },
    { initials: 'NF', name: 'Núria Fontanet', id: 'C-1011', files: 18, size: '24 MB', updated: '12 días', tone: 'violet' },
  ];
}
