import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { AuthStateService } from '../../../core/services/auth-state.service';
import {
  ClienteTabItem,
  ClientesTabResponse,
  ClienteDetailItem,
  ClienteCreate,
  ClienteUpdate,
  TipoCliente,
} from '../../../core/models/intranet.models';
import { IntranetService } from '../../../core/services/intranet.service';
import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

type ModalMode = 'none' | 'create' | 'edit' | 'delete' | 'detail';

interface ClienteForm {
  nombre_fiscal: string;
  cif_nif: string;
  email: string;
  telefono: string;
  direccion: string;
  codigo_postal: string;
  ciudad: string;
  provincia: string;
  tipo_cliente: TipoCliente;
}

interface FormErrors {
  nombre_fiscal?: string;
  cif_nif?: string;
  email?: string;
}

const CIF_NIF_RE = /^([0-9]{8}[A-Za-z]|[XYZxyz][0-9]{7}[A-Za-z]|[ABCDEFGHJNPQRSUVWabcdefghjnpqrsuvw][0-9]{7}[0-9A-Ja-j])$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16',
];

@Component({
  selector: 'app-clientes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IntranetSidebarComponent],
  templateUrl: './clientes-page.component.html',
  styleUrl: './clientes-page.component.css',
})
export class ClientesPageComponent implements OnInit, OnDestroy {
  private readonly intranetService = inject(IntranetService);
  private readonly authState = inject(AuthStateService);
  private readonly destroy$ = new Subject<void>();

  // ── State ──────────────────────────────────────────────────────────────────
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadingDetail = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly modalMode = signal<ModalMode>('none');

  protected tabData: ClientesTabResponse | null = null;
  protected selectedDetail: ClienteDetailItem | null = null;
  protected selectedItem: ClienteTabItem | null = null;
  protected searchQuery = '';
  protected showInactive = false;
  protected activeFilter: string = 'Todos';

  protected readonly tipoOpciones: TipoCliente[] = ['Sociedad', 'Autónomo', 'SCP', 'CB'];
  protected readonly currentYear = new Date().getFullYear();

  protected form: ClienteForm = this.emptyForm();
  protected formErrors: FormErrors = {};
  protected formServerError = '';
  protected readonly showExportMenu = signal(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  protected get isAdmin(): boolean {
    return this.authState.currentUser() !== null;
  }

  protected get filteredClientes(): ClienteTabItem[] {
    if (!this.tabData) return [];
    const q = this.searchQuery.trim().toLowerCase();
    return this.tabData.clientes.filter((c) => {
      if (!this.showInactive && !c.activo) return false;
      if (this.activeFilter !== 'Todos' && c.tipo_cliente !== this.activeFilter) return false;
      if (!q) return true;
      return (
        c.nombre_fiscal.toLowerCase().includes(q) ||
        c.cif_nif.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      );
    });
  }

  protected get resumen() {
    return this.tabData?.resumen ?? { total: 0, activos: 0 };
  }

  protected get inactivosCount(): number {
    return (this.tabData?.clientes ?? []).filter((c) => !c.activo).length;
  }

  // ── Export menu ────────────────────────────────────────────────────────────
  protected toggleExportMenu(): void {
    this.showExportMenu.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.export-wrapper')) {
      this.showExportMenu.set(false);
    }
  }

  protected exportCsv(): void {
    this.showExportMenu.set(false);
    const rows = this.filteredClientes;
    if (!rows.length) return;
    const headers = ['Referencia', 'Nombre fiscal', 'CIF/NIF', 'Tipo', 'Email', 'Teléfono', 'Activo', 'Trabajos abiertos', 'Facturación año', 'Pendiente total', 'Última actividad'];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((c) =>
        [
          escape(c.referencia),
          escape(c.nombre_fiscal),
          escape(c.cif_nif),
          escape(c.tipo_cliente),
          escape(c.email),
          escape(c.telefono),
          escape(c.activo ? 'Sí' : 'No'),
          escape(c.trabajos_abiertos),
          escape(c.facturacion_anio.toFixed(2)),
          escape(c.pendiente_total.toFixed(2)),
          escape(c.ultima_actividad ? new Date(c.ultima_actividad).toLocaleDateString('es-ES') : ''),
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected exportPdf(): void {
    this.showExportMenu.set(false);
    const rows = this.filteredClientes;
    const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
    const date = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });
    const tableRows = rows
      .map(
        (c) => `<tr>
          <td>${c.referencia || '—'}</td>
          <td>${c.nombre_fiscal}</td>
          <td>${c.cif_nif}</td>
          <td>${c.tipo_cliente}</td>
          <td>${c.email ?? '—'}</td>
          <td>${c.activo ? 'Activo' : 'Inactivo'}</td>
          <td>${c.trabajos_abiertos}</td>
          <td>${fmt.format(c.facturacion_anio)}</td>
          <td>${fmt.format(c.pendiente_total)}</td>
          <td>${c.ultima_actividad ? date.format(new Date(c.ultima_actividad)) : '—'}</td>
        </tr>`
      )
      .join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Clientes — ${new Date().toLocaleDateString('es-ES')}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 20px; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        p  { margin: 0 0 12px; color: #64748b; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
        td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        @media print { @page { margin: 15mm; size: landscape; } }
      </style></head><body>
      <h1>Gestión de clientes</h1>
      <p>Exportado el ${new Date().toLocaleDateString('es-ES')} · ${rows.length} registros</p>
      <table><thead><tr>
        <th>Referencia</th><th>Nombre fiscal</th><th>CIF/NIF</th><th>Tipo</th><th>Email</th>
        <th>Estado</th><th>Trabajos</th><th>Facturación año</th><th>Pendiente</th><th>Últ. actividad</th>
      </tr></thead><tbody>${tableRows}</tbody></table>
      <script>window.onload=()=>{window.print();}<\/script>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadClientes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Load ───────────────────────────────────────────────────────────────────
  protected loadClientes(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.intranetService
      .getClientesTab({ page: 1, page_size: 200 })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => { this.tabData = data; },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(this.extractError(err, 'No se pudo cargar la lista de clientes.'));
        },
      });
  }

  // ── Modal: detail ──────────────────────────────────────────────────────────
  protected openDetail(item: ClienteTabItem): void {
    this.selectedItem = item;
    this.selectedDetail = null;
    this.loadingDetail.set(true);
    this.modalMode.set('detail');
    this.intranetService
      .getClienteDetail(item.cliente_id)
      .pipe(finalize(() => this.loadingDetail.set(false)))
      .subscribe({
        next: (d) => { this.selectedDetail = d; },
        error: () => { this.selectedDetail = null; },
      });
  }

  // ── Modal: create ─────────────────────────────────────────────────────────
  protected openCreate(): void {
    this.form = this.emptyForm();
    this.formErrors = {};
    this.formServerError = '';
    this.modalMode.set('create');
  }

  // ── Modal: edit ───────────────────────────────────────────────────────────
  protected openEdit(item: ClienteTabItem, event: Event): void {
    event.stopPropagation();
    this.selectedItem = item;
    this.formErrors = {};
    this.formServerError = '';
    this.form = {
      nombre_fiscal: item.nombre_fiscal,
      cif_nif: item.cif_nif,
      email: item.email ?? '',
      telefono: item.telefono ?? '',
      direccion: '',
      codigo_postal: '',
      ciudad: '',
      provincia: '',
      tipo_cliente: (item.tipo_cliente as TipoCliente) ?? 'Sociedad',
    };
    this.modalMode.set('edit');
    // Enrich form with full detail (address fields)
    this.intranetService.getClienteDetail(item.cliente_id).subscribe({
      next: (d) => {
        if (this.modalMode() !== 'edit') return;
        this.form = {
          nombre_fiscal: d.nombre_fiscal,
          cif_nif: d.cif_nif,
          email: d.email ?? '',
          telefono: d.telefono ?? '',
          direccion: d.direccion ?? '',
          codigo_postal: d.codigo_postal ?? '',
          ciudad: d.ciudad ?? '',
          provincia: d.provincia ?? '',
          tipo_cliente: (d.tipo_cliente as TipoCliente) ?? 'Sociedad',
        };
      },
    });
  }

  // ── Modal: delete ─────────────────────────────────────────────────────────
  protected openDelete(item: ClienteTabItem, event: Event): void {
    event.stopPropagation();
    this.selectedItem = item;
    this.formServerError = '';
    this.modalMode.set('delete');
  }

  protected closeModal(): void {
    this.modalMode.set('none');
    this.selectedItem = null;
    this.selectedDetail = null;
    this.formServerError = '';
  }

  // ── Save (create / edit) ──────────────────────────────────────────────────
  protected saveCliente(): void {
    this.formErrors = {};
    this.formServerError = '';
    if (!this.validateForm()) return;

    this.saving.set(true);
    const payload = this.buildPayload();

    const op$ = this.modalMode() === 'create'
      ? this.intranetService.createCliente(payload as ClienteCreate)
      : this.intranetService.updateCliente(this.selectedItem!.cliente_id, payload as ClienteUpdate);

    op$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.closeModal();
        this.loadClientes();
      },
      error: (err: HttpErrorResponse) => {
        const detail = err?.error?.detail ?? '';
        if (err.status === 409 || (typeof detail === 'string' && (detail.toLowerCase().includes('cif') || detail.toLowerCase().includes('nif')))) {
          this.formErrors.cif_nif = 'Ya existe un cliente con este CIF/NIF.';
        } else {
          this.formServerError = this.extractError(err, 'No se pudo guardar el cliente.');
        }
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  protected confirmDelete(): void {
    if (!this.selectedItem) return;
    this.saving.set(true);
    this.formServerError = '';
    this.intranetService
      .deleteCliente(this.selectedItem.cliente_id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadClientes();
        },
        error: (err: HttpErrorResponse) => {
          this.formServerError = this.extractError(err, 'No se pudo dar de baja al cliente.');
        },
      });
  }

  // ── Format helpers ────────────────────────────────────────────────────────
  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(iso));
  }

  protected formatAddress(cp: string | null | undefined, ciudad: string | null | undefined): string {
    const parts = ([cp, ciudad] as Array<string | null | undefined>).filter((v): v is string => !!v);
    return parts.length ? parts.join(' · ') : '—';
  }

  /** Formats a billing number as € XX.XXX (thousands separator, no decimals) */
  protected formatBilling(value: number): string {
    if (!value) return '€ 0';
    return '€ ' + new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value);
  }

  /** Returns relative time label: Hoy / Ayer / N días / N meses */
  protected getRelativeTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 30) return `${days} días`;
    const months = Math.floor(days / 30);
    return months === 1 ? '1 mes' : `${months} meses`;
  }

  /** Returns 1–2 capital initials from a name */
  protected getInitials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  /** Deterministic color from name string */
  protected getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  // ── Private ───────────────────────────────────────────────────────────────
  private validateForm(): boolean {
    let valid = true;
    if (!this.form.nombre_fiscal.trim()) {
      this.formErrors.nombre_fiscal = 'El nombre fiscal es obligatorio.';
      valid = false;
    }
    const cif = this.form.cif_nif.trim().toUpperCase();
    if (!cif) {
      this.formErrors.cif_nif = 'El CIF/NIF es obligatorio.';
      valid = false;
    } else if (!CIF_NIF_RE.test(cif)) {
      this.formErrors.cif_nif = 'Formato inválido. Ejemplo: B12345678 (CIF) o 12345678A (NIF).';
      valid = false;
    }
    if (this.form.email && !EMAIL_RE.test(this.form.email.trim())) {
      this.formErrors.email = 'El email no tiene un formato válido.';
      valid = false;
    }
    return valid;
  }

  private buildPayload(): ClienteCreate | ClienteUpdate {
    return {
      nombre_fiscal: this.form.nombre_fiscal.trim(),
      cif_nif: this.form.cif_nif.trim().toUpperCase(),
      email: this.form.email.trim() || null,
      telefono: this.form.telefono.trim() || null,
      direccion: this.form.direccion.trim() || null,
      codigo_postal: this.form.codigo_postal.trim() || null,
      ciudad: this.form.ciudad.trim() || null,
      provincia: this.form.provincia.trim() || null,
      tipo_cliente: this.form.tipo_cliente,
    };
  }

  private emptyForm(): ClienteForm {
    return {
      nombre_fiscal: '',
      cif_nif: '',
      email: '',
      telefono: '',
      direccion: '',
      codigo_postal: '',
      ciudad: '',
      provincia: '',
      tipo_cliente: 'Sociedad',
    };
  }

  private extractError(err: HttpErrorResponse, fallback: string): string {
    const detail = err?.error?.detail;
    return typeof detail === 'string' ? detail : fallback;
  }
}
