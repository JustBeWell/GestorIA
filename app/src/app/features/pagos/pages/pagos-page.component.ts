import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

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
} from '../../../core/models/intranet.models';

@Component({
  selector: 'app-pagos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IntranetSidebarComponent],
  templateUrl: './pagos-page.component.html',
  styleUrl: './pagos-page.component.css',
})
export class PagosPageComponent implements OnInit {
  private readonly svc = inject(IntranetService);
  private readonly auth = inject(AuthStateService);

  // ── Estado de carga ───────────────────────────────────────────────────────
  loading = signal(true);
  loadingDetail = signal(false);
  saving = signal(false);
  errorMsg = signal<string | null>(null);

  // ── Datos principales ────────────────────────────────────────────────────
  resumen = signal<PagosResumen>({ cobrado_mes: 0, pendiente_total: 0, facturas_vencidas: 0 });
  facturas = signal<FacturaPagoTabItem[]>([]);
  paginacion = signal<PaginationMeta>({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  clientes = signal<{ cliente_id: string; nombre: string }[]>([]);

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
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.resumen.set(data.resumen);
          this.facturas.set(data.facturas);
          this.paginacion.set(data.paginacion_facturas);
          this.currentPage.set(page);
        },
        error: (err) => {
          const detail = err?.error?.detail;
          this.errorMsg.set(
            typeof detail === 'string' ? detail : 'Error al cargar los datos de pagos'
          );
        },
      });
  }

  private loadClientes(): void {
    this.svc.getClientesTab({ page_size: 200 }).subscribe({
      next: (data) => {
        this.clientes.set(
          data.clientes.map((c) => ({ cliente_id: c.cliente_id, nombre: c.nombre_fiscal }))
        );
      },
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
}

