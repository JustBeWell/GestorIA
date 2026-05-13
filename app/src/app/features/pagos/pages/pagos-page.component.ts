import { Component, NgZone, OnInit, OnDestroy, HostListener, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';
import { IntranetService } from '../../../core/services/intranet.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import {
  FacturaPagoTabItem,
  FacturaDetailItem,
  FacturaCreate,
  FacturaUpdate,
  PagoCreate,
  PagosResumen,
  PaginationMeta,
  EstadoFactura,
  MetodoPago,
  DeudaVivaPorCliente,
  PagoRecienteTabItem,
} from '../../../core/models/intranet.models';

@Component({
  selector: 'app-pagos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IntranetSidebarComponent],
  templateUrl: './pagos-page.component.html',
  styleUrl: './pagos-page.component.css',
})
export class PagosPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly svc = inject(IntranetService);
  private readonly auth = inject(AuthStateService);
  private readonly ngZone = inject(NgZone);

  // ── Estado de carga ───────────────────────────────────────────────────────
  loading = signal(true);
  loadingDetail = signal(false);
  saving = signal(false);
  errorMsg = signal<string | null>(null);

  // ── Datos principales ────────────────────────────────────────────────────
  resumen = signal<PagosResumen>({ cobrado_mes: 0, facturado_mes: 0, facturas_emitidas_mes: 0, pendiente_total: 0, pendiente_count: 0, facturas_vencidas: 0, vencido_total: 0 });
  facturas = signal<FacturaPagoTabItem[]>([]);
  pagosRecientes = signal<PagoRecienteTabItem[]>([]);
  paginacion = signal<PaginationMeta>({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  clientes = signal<{ cliente_id: string; nombre: string }[]>([]);

  // ── Tabs ──────────────────────────────────────────────────────────
  activeTab = signal<'facturas' | 'deuda' | 'pagos'>('facturas');
  deudaViva = signal<DeudaVivaPorCliente[]>([]);
  loadingDeuda = signal(false);
  deudaLoaded = signal(false);

  // ── Filtros ───────────────────────────────────────────────────────────────
  filtroEstado = signal<string>('');
  filtroCliente = signal<string>('');
  filtroVencidas = signal(false);
  currentPage = signal(1);

  // ── Detalle / panel lateral ───────────────────────────────────────────────
  selectedFactura = signal<FacturaDetailItem | null>(null);
  showDetailPanel = signal(false);

  // ── Modal alta/edición factura ────────────────────────────────────────────
  showFacturaModal = signal(false);
  isEditMode = signal(false);
  editingFacturaId = signal<string | null>(null);
  facturaForm = signal<FacturaCreate & { estado?: EstadoFactura }>({
    cliente_id: '',
    concepto: '',
    base_imponible: 0,
    porcentaje_iva: 21,
    fecha_emision: null,
    fecha_vencimiento: null,
    notas: null,
  });

  // ── Modal registro de pago ─────────────────────────────────────────────────
  showPagoModal = signal(false);
  pagoForm = signal<PagoCreate>({
    importe: 0,
    metodo_pago: 'transferencia',
    fecha_pago: null,
    referencia: null,
    notas: null,
  });

  // ── Modal confirmar anulación ─────────────────────────────────────────────
  showAnularModal = signal(false);
  anulando = signal<string | null>(null);
  showExportMenu = signal(false);

  // ── Computed ──────────────────────────────────────────────────────────────
  isAdmin = computed(() => this.auth.currentUser() !== null);

  totalImporte = computed(() => {
    const f = this.facturaForm();
    const base = f.base_imponible || 0;
    const iva = f.porcentaje_iva ?? 21;
    return +(base + (base * iva) / 100).toFixed(2);
  });

  estadosFactura: { value: EstadoFactura; label: string }[] = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'emitida', label: 'Emitida' },
    { value: 'pagada_parcial', label: 'Pago parcial' },
    { value: 'pagada', label: 'Pagada' },
    { value: 'anulada', label: 'Anulada' },
  ];

  metodosPago: { value: MetodoPago; label: string }[] = [
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'tarjeta', label: 'Tarjeta' },
    { value: 'domiciliacion', label: 'Domiciliación' },
    { value: 'otro', label: 'Otro' },
  ];

  // ──────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadData();
    this.loadClientes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected loadData(page = 1): void {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.svc
      .getPagosTab({
        page_facturas: page,
        page_size_facturas: 20,
        estado_factura: this.filtroEstado() || undefined,
        cliente_id: this.filtroCliente() || undefined,
        vencidas_solo: this.filtroVencidas() || undefined,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.ngZone.run(() => this.loading.set(false)))
      )
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.resumen.set(data.resumen);
            this.facturas.set(data.facturas);
            this.pagosRecientes.set(data.pagos_recientes ?? []);
            this.paginacion.set(data.paginacion_facturas);
            this.currentPage.set(page);
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            const detail = err?.error?.detail;
            this.errorMsg.set(
              typeof detail === 'string' ? detail : 'Error al cargar los datos de pagos'
            );
          });
        },
      });
  }

  private loadClientes(): void {
    this.svc.getClientesTab({ page_size: 200 }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.clientes.set(
          data.clientes.map((c) => ({ cliente_id: c.cliente_id, nombre: c.nombre_fiscal }))
        );
      },
      error: () => {},
    });
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────

  switchTab(tab: 'facturas' | 'deuda' | 'pagos'): void {
    this.activeTab.set(tab);
    if (tab === 'deuda' && !this.deudaLoaded()) {
      this.loadDeudaViva();
    }
  }

  loadDeudaViva(): void {
    this.loadingDeuda.set(true);
    this.svc.getDeudaViva().pipe(
      takeUntil(this.destroy$),
      finalize(() => this.ngZone.run(() => this.loadingDeuda.set(false)))
    ).subscribe({
      next: (data) => this.ngZone.run(() => {
        this.deudaViva.set(data);
        this.deudaLoaded.set(true);
      }),
      error: (err) => this.ngZone.run(() => {
        const detail = err?.error?.detail;
        this.errorMsg.set(typeof detail === 'string' ? detail : 'Error al cargar la deuda viva');
      }),
    });
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  onFiltroEstadoChange(value: string): void {
    this.filtroEstado.set(value);
    this.loadData(1);
  }

  onFiltroClienteChange(value: string): void {
    this.filtroCliente.set(value);
    this.loadData(1);
  }

  onFiltroVencidasChange(checked: boolean): void {
    this.filtroVencidas.set(checked);
    this.loadData(1);
  }

  goToPage(page: number): void {
    const meta = this.paginacion();
    if (page < 1 || page > meta.total_pages) return;
    this.loadData(page);
  }

  // ── Detalle ───────────────────────────────────────────────────────────────

  openDetail(factura: FacturaPagoTabItem): void {
    this.showDetailPanel.set(true);
    this.loadingDetail.set(true);
    this.svc.getFacturaDetail(factura.factura_id).pipe(
      finalize(() => this.loadingDetail.set(false))
    ).subscribe({
      next: (data) => this.selectedFactura.set(data),
      error: () => this.selectedFactura.set(null),
    });
  }

  closeDetail(): void {
    this.showDetailPanel.set(false);
    this.selectedFactura.set(null);
  }

  // ── Alta factura ──────────────────────────────────────────────────────────

  openCreateFactura(): void {
    this.isEditMode.set(false);
    this.editingFacturaId.set(null);
    this.facturaForm.set({
      cliente_id: '',
      concepto: '',
      base_imponible: 0,
      porcentaje_iva: 21,
      fecha_emision: new Date().toISOString().slice(0, 10) as any,
      fecha_vencimiento: null,
      notas: null,
    });
    this.showFacturaModal.set(true);
  }

  openEditFactura(factura: FacturaDetailItem): void {
    this.isEditMode.set(true);
    this.editingFacturaId.set(factura.factura_id);
    this.facturaForm.set({
      cliente_id: factura.cliente_id,
      concepto: factura.concepto ?? '',
      base_imponible: factura.base_imponible,
      porcentaje_iva: factura.porcentaje_iva,
      fecha_emision: factura.fecha_emision as any,
      fecha_vencimiento: factura.fecha_vencimiento as any,
      notas: factura.notas,
      estado: factura.estado,
    });
    this.showFacturaModal.set(true);
  }

  closeFacturaModal(): void {
    this.showFacturaModal.set(false);
  }

  saveFactura(): void {
    const f = this.facturaForm();
    if (!f.cliente_id || !f.concepto || !f.base_imponible) return;
    this.saving.set(true);

    const obs = this.isEditMode()
      ? this.svc.updateFactura(this.editingFacturaId()!, f as FacturaUpdate)
      : this.svc.createFactura(f as FacturaCreate);

    obs.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (result) => {
        this.closeFacturaModal();
        this.loadData(this.currentPage());
        if (this.showDetailPanel() && this.selectedFactura()?.factura_id === result.factura_id) {
          this.selectedFactura.set(result);
        }
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.errorMsg.set(typeof detail === 'string' ? detail : 'Error al guardar la factura');
      },
    });
  }

  // ── Anulación ─────────────────────────────────────────────────────────────

  confirmAnular(facturaId: string): void {
    this.anulando.set(facturaId);
    this.showAnularModal.set(true);
  }

  cancelAnular(): void {
    this.showAnularModal.set(false);
    this.anulando.set(null);
  }

  executeAnular(): void {
    const id = this.anulando();
    if (!id) return;
    this.saving.set(true);
    this.svc.deleteFactura(id).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.cancelAnular();
        this.loadData(this.currentPage());
        if (this.selectedFactura()?.factura_id === id) {
          this.closeDetail();
        }
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.errorMsg.set(typeof detail === 'string' ? detail : 'No se pudo anular la factura');
        this.cancelAnular();
      },
    });
  }

  // ── Registro pago ─────────────────────────────────────────────────────────

  openPagoModal(): void {
    const factura = this.selectedFactura();
    if (!factura) return;
    this.pagoForm.set({
      importe: +factura.pendiente.toFixed(2),
      metodo_pago: 'transferencia',
      fecha_pago: new Date().toISOString().slice(0, 10) as any,
      referencia: null,
      notas: null,
    });
    this.showPagoModal.set(true);
  }

  closePagoModal(): void {
    this.showPagoModal.set(false);
  }

  savePago(): void {
    const factura = this.selectedFactura();
    if (!factura) return;
    const p = this.pagoForm();
    if (!p.importe || p.importe <= 0) return;
    this.saving.set(true);
    this.svc.createPago(factura.factura_id, p).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.closePagoModal();
        this.svc.getFacturaDetail(factura.factura_id).subscribe((d) => this.selectedFactura.set(d));
        this.loadData(this.currentPage());
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.errorMsg.set(typeof detail === 'string' ? detail : 'Error al registrar el pago');
      },
    });
  }

  // ── Helpers de vista ──────────────────────────────────────────────────────

  estadoLabel(estado: string): string {
    return this.estadosFactura.find((e) => e.value === estado)?.label ?? estado;
  }

  isVencida(factura: FacturaPagoTabItem): boolean {
    if (!factura.fecha_vencimiento) return false;
    if (factura.estado === 'pagada' || factura.estado === 'anulada') return false;
    return new Date(factura.fecha_vencimiento) < new Date();
  }

  diasVencida(fechaVencimiento: string | null): number {
    if (!fechaVencimiento) return 0;
    const hoy = new Date();
    const venc = new Date(fechaVencimiento);
    return Math.floor((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
  }

  paginasArray(): number[] {
    const meta = this.paginacion();
    return Array.from({ length: meta.total_pages }, (_, i) => i + 1);
  }

  updateFacturaFormField(field: string, value: any): void {
    this.facturaForm.update((f) => ({ ...f, [field]: value }));
  }

  updatePagoFormField(field: string, value: any): void {
    this.pagoForm.update((f) => ({ ...f, [field]: value }));
  }

  dismissError(): void {
    this.errorMsg.set(null);
  }

  readonly today = new Date();

  isVencidaByDate(fechaVencimiento: string | null, estado: string): boolean {
    if (!fechaVencimiento) return false;
    if (estado === 'pagada' || estado === 'anulada') return false;
    return new Date(fechaVencimiento) < this.today;
  }

  kpiBarPct(val: number, ref: number): number {
    if (ref <= 0) return 0;
    return Math.min((val / ref) * 100, 100);
  }

  // ── Export ────────────────────────────────────────────────────────────────

  toggleExportMenu(): void {
    this.showExportMenu.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.export-wrapper')) {
      this.showExportMenu.set(false);
    }
  }

  exportCsv(): void {
    this.showExportMenu.set(false);
    const rows = this.facturas();
    if (!rows.length) return;
    const headers = ['Nº Factura', 'Cliente', 'Estado', 'Fecha emisión', 'Fecha vencimiento', 'Total', 'Pagado', 'Pendiente'];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const fmt = (n: number) => n.toFixed(2);
    const lines = [
      headers.join(','),
      ...rows.map((f) =>
        [
          escape(f.numero),
          escape(f.cliente_nombre),
          escape(this.estadoLabel(f.estado)),
          escape(f.fecha_emision ? new Date(f.fecha_emision).toLocaleDateString('es-ES') : ''),
          escape(f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString('es-ES') : ''),
          escape(fmt(f.total)),
          escape(fmt(f.pagado)),
          escape(fmt(f.pendiente)),
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facturas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    this.showExportMenu.set(false);
    const rows = this.facturas();
    const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
    const date = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });
    const tableRows = rows
      .map(
        (f) => `<tr>
          <td>${f.numero}</td>
          <td>${f.cliente_nombre}</td>
          <td>${this.estadoLabel(f.estado)}</td>
          <td>${f.fecha_emision ? date.format(new Date(f.fecha_emision)) : '—'}</td>
          <td>${f.fecha_vencimiento ? date.format(new Date(f.fecha_vencimiento)) : '—'}</td>
          <td>${fmt.format(f.total)}</td>
          <td>${fmt.format(f.pagado)}</td>
          <td>${fmt.format(f.pendiente)}</td>
        </tr>`
      )
      .join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Facturas — ${new Date().toLocaleDateString('es-ES')}</title>
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
      <h1>Facturas y pagos</h1>
      <p>Exportado el ${new Date().toLocaleDateString('es-ES')} · ${rows.length} registros</p>
      <table><thead><tr>
        <th>Nº Factura</th><th>Cliente</th><th>Estado</th><th>Emisión</th><th>Vencimiento</th>
        <th>Total</th><th>Pagado</th><th>Pendiente</th>
      </tr></thead><tbody>${tableRows}</tbody></table>
      <script>window.onload=()=>{window.print();}<\/script>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }
}

