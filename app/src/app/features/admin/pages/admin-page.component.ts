import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  AdminChartsResponse,
  AdminEmpleadoResumen,
  AdminFichajesResponse,
  AdminResumenResponse,
  AuditoriaEventoItem,
  AuditoriaResponse,
  ClienteTabItem,
  ClientesTabResponse,
  EstadoFactura,
  FacturaPagoTabItem,
  FacturacionMensualPoint,
  HorasMensualesPoint,
  TrabajosMensualesPoint,
  ClientesMensualesPoint,
  PaginationMeta,
  PagosResumen,
  TrabajoTabItem,
  TrabajosTabResponse,
  EstadoTrabajo,
} from '../../../core/models/intranet.models';
import { UserCreatePayload, UserAdminUpdatePayload } from '../../../core/models/user-admin.models';
import { IntranetService } from '../../../core/services/intranet.service';
import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';
import { SessionStorageService } from '../../../core/services/session-storage.service';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, IntranetSidebarComponent],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.css',
})
export class AdminPageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly intranetService = inject(IntranetService);
  private readonly sessionStorageService = inject(SessionStorageService);
  private readonly destroy$ = new Subject<void>();

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly modalError = signal('');
  protected readonly modalSaving = signal(false);
  protected data: AdminResumenResponse | null = null;
  protected readonly charts = signal<AdminChartsResponse | null>(null);

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  protected readonly activeTab = signal<'resumen' | 'fichajes' | 'clientes' | 'trabajos' | 'pagos' | 'auditoria'>('resumen');

  // ── Auditoría signals ────────────────────────────────────────
  protected readonly auditoriaEventos = signal<AuditoriaEventoItem[]>([]);
  protected readonly auditoriaLoading = signal(false);
  protected readonly auditoriaPaginacion = signal<PaginationMeta | null>(null);
  protected readonly auditoriaPage = signal(1);
  protected readonly filtroAuditoriaEntidad = signal('');
  protected readonly filtroAuditoriaAccion = signal('');
  protected readonly expandedAuditoria = signal<string | null>(null);

  // ─── Tab clientes ─────────────────────────────────────────────────────────
  protected readonly clientesLoading = signal(false);
  protected adminClientes: ClienteTabItem[] = [];
  protected clientesSearch = '';

  protected get filteredAdminClientes(): ClienteTabItem[] {
    const q = this.clientesSearch.trim().toLowerCase();
    if (!q) return this.adminClientes;
    return this.adminClientes.filter(
      (c) => c.nombre_fiscal.toLowerCase().includes(q) || c.cif_nif.toLowerCase().includes(q)
    );
  }

  // ─── Tab trabajos ─────────────────────────────────────────────────────────
  protected readonly trabajosLoading = signal(false);
  protected adminTrabajos: TrabajoTabItem[] = [];
  protected trabajosFilterEstado: EstadoTrabajo | '' = '';
  protected trabajosSearch = '';

  protected get filteredAdminTrabajos(): TrabajoTabItem[] {
    const q = this.trabajosSearch.trim().toLowerCase();
    return this.adminTrabajos.filter((t) => {
      if (this.trabajosFilterEstado && t.estado !== this.trabajosFilterEstado) return false;
      if (q && !t.titulo.toLowerCase().includes(q) && !t.cliente_nombre.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  readonly estadosTrabajo: { key: EstadoTrabajo; label: string }[] = [
    { key: 'pendiente',  label: 'Pendiente' },
    { key: 'en_curso',   label: 'En curso' },
    { key: 'bloqueado',  label: 'Bloqueado' },
    { key: 'finalizado', label: 'Finalizado' },
    { key: 'cancelado',  label: 'Cancelado' },
  ];

  // ─── Tab pagos ────────────────────────────────────────────────────────────
  readonly today = new Date();
  protected readonly pagosLoading = signal(false);
  protected adminPagosFacturas: FacturaPagoTabItem[] = [];
  protected adminPagosResumen: PagosResumen = {
    cobrado_mes: 0, facturado_mes: 0, facturas_emitidas_mes: 0,
    pendiente_total: 0, pendiente_count: 0, facturas_vencidas: 0, vencido_total: 0,
  };
  protected pagosSearch = '';
  protected pagosFilterEstado: EstadoFactura | '' = '';

  protected get filteredAdminPagos(): FacturaPagoTabItem[] {
    const q = this.pagosSearch.trim().toLowerCase();
    return this.adminPagosFacturas.filter((f) => {
      if (this.pagosFilterEstado && f.estado !== this.pagosFilterEstado) return false;
      if (q && !f.numero.toLowerCase().includes(q) && !f.cliente_nombre.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  readonly estadosFactura: { key: EstadoFactura; label: string }[] = [
    { key: 'borrador',       label: 'Borrador' },
    { key: 'emitida',        label: 'Emitida' },
    { key: 'pagada_parcial', label: 'Parcial' },
    { key: 'pagada',         label: 'Pagada' },
    { key: 'anulada',        label: 'Anulada' },
  ];

  // ─── Vista gráficas ───────────────────────────────────────────────────────
  protected readonly activeChartView = signal<'combined' | 'grid'>('combined');
  protected readonly hoveredIdx = signal<number | null>(null);
  protected readonly hiddenSeries = signal<Set<string>>(new Set<string>());

  protected readonly combinedSeries: { key: string; name: string; color: string; values: () => number[] }[] = [
    { key: 'facturado',   name: 'Facturado',    color: '#e8a838', values: () => this.facturacionValues('facturado_total') },
    { key: 'cobrado',     name: 'Cobrado',      color: '#22c55e', values: () => this.facturacionValues('cobrado_total') },
    { key: 'trabajos',    name: 'Trab. nuevos', color: '#3b82f6', values: () => this.trabajosValues('trabajos_creados') },
    { key: 'finalizados', name: 'Finalizados',  color: '#0d9488', values: () => this.trabajosValues('finalizados') },
    { key: 'clientes',    name: 'Clientes',     color: '#a855f7', values: () => this.clientesValues() },
    { key: 'horas',       name: 'Horas',        color: '#f59e0b', values: () => this.horasValues() },
  ];

  // ─── Tab clientes ─────────────────────────────────────────────────────────
  protected loadAdminClientes(): void {
    this.clientesLoading.set(true);
    this.intranetService.getClientesTab({ page_size: 200 })
      .pipe(takeUntil(this.destroy$), finalize(() => this.clientesLoading.set(false)))
      .subscribe({ next: (res) => { this.adminClientes = res.clientes; } });
  }

  protected refreshAdminClientes(): void {
    this.adminClientes = [];
    this.loadAdminClientes();
  }

  // ─── Tab trabajos ─────────────────────────────────────────────────────────
  protected loadAdminTrabajos(): void {
    this.trabajosLoading.set(true);
    this.intranetService.getTrabajosTab()
      .pipe(takeUntil(this.destroy$), finalize(() => this.trabajosLoading.set(false)))
      .subscribe({ next: (res) => { this.adminTrabajos = res.trabajos; } });
  }

  protected refreshAdminTrabajos(): void {
    this.adminTrabajos = [];
    this.loadAdminTrabajos();
  }

  protected estadoLabel(estado: EstadoTrabajo): string {
    const m: Record<EstadoTrabajo, string> = {
      pendiente: 'Pendiente', en_curso: 'En curso', bloqueado: 'Bloqueado',
      finalizado: 'Finalizado', cancelado: 'Cancelado',
    };
    return m[estado] ?? estado;
  }

  protected facturaEstadoLabel(estado: string): string {
    const m: Record<string, string> = {
      borrador: 'Borrador', emitida: 'Emitida', pagada_parcial: 'Parcial',
      pagada: 'Pagada', vencida: 'Vencida', anulada: 'Anulada',
    };
    return m[estado] ?? estado;
  }

  // ─── Tab pagos ────────────────────────────────────────────────────────────
  protected loadAdminPagos(): void {
    this.pagosLoading.set(true);
    this.intranetService.getPagosTab({ page_size_facturas: 500 })
      .pipe(takeUntil(this.destroy$), finalize(() => this.pagosLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.adminPagosFacturas = res.facturas;
          this.adminPagosResumen = res.resumen;
        },
        error: (err: HttpErrorResponse) => {
          const detail = err?.error?.detail;
          this.errorMessage.set(typeof detail === 'string' ? detail : 'No se pudieron cargar las facturas.');
        },
      });
  }

  protected refreshAdminPagos(): void {
    this.adminPagosFacturas = [];
    this.loadAdminPagos();
  }

  // ─── Tab fichajes ─────────────────────────────────────────────────────────
  protected readonly fichajesLoading = signal(false);
  protected fichajes: AdminFichajesResponse | null = null;
  protected fichajesFilter = {
    empleado_id: '',
    fecha_desde: '',
    fecha_hasta: '',
    tipo_evento: '',
    page: 1,
    page_size: 30,
  };

  // ─── Modal crear empleado ──────────────────────────────────────────────────
  protected showCreateModal = false;
  protected createForm: UserCreatePayload = {
    nombre_usuario: '',
    password: '',
    rol: 'empleado',
    nombre: '',
    apellidos: '',
    nif: '',
    telefono: '',
  };

  // ─── Modal editar empleado ─────────────────────────────────────────────────
  protected showEditModal = false;
  protected editTarget: AdminEmpleadoResumen | null = null;
  protected editForm: UserAdminUpdatePayload & { usuario_id?: string } = {};

  // ─── Modal corrección fichaje ──────────────────────────────────────────────
  protected showCorreccionModal = false;
  protected correccionForm: {
    empleado_id: string;
    tipo_evento: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin';
    fecha: string;
    hora: string;
    observaciones: string;
  } = { empleado_id: '', tipo_evento: 'entrada', fecha: '', hora: '', observaciones: '' };

  @ViewChild('kpiTrack') kpiTrack!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    const user = this.sessionStorageService.getUser();
    if (user?.role !== 'administrador') {
      void this.router.navigateByUrl('/home');
      return;
    }
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.intranetService.getAdminResumen().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.data = res;
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const detail = err?.error?.detail;
        this.errorMessage.set(typeof detail === 'string' ? detail : 'No se pudo cargar el panel de administracion.');
        this.loading.set(false);
      },
    });

    this.intranetService.getAdminCharts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { this.charts.set(res); },
      error: () => {},
    });
  }

  // ─── Modal crear ──────────────────────────────────────────────────────────
  protected openCreateModal(): void {
    this.createForm = { nombre_usuario: '', password: '', rol: 'empleado', nombre: '', apellidos: '', nif: '', telefono: '' };
    this.modalError.set('');
    this.showCreateModal = true;
  }

  protected closeCreateModal(): void {
    this.showCreateModal = false;
    this.modalError.set('');
  }

  protected submitCreateEmpleado(): void {
    if (!this.createForm.nombre_usuario || !this.createForm.password || !this.createForm.nombre || !this.createForm.apellidos || !this.createForm.nif) {
      this.modalError.set('Todos los campos obligatorios deben estar rellenos.');
      return;
    }
    this.modalSaving.set(true);
    this.modalError.set('');
    this.intranetService.createEmpleado(this.createForm).subscribe({
      next: () => {
        this.modalSaving.set(false);
        this.showCreateModal = false;
        this.loading.set(true);
        this.loadData();
      },
      error: (err: HttpErrorResponse) => {
        this.modalSaving.set(false);
        const detail = err?.error?.detail;
        this.modalError.set(typeof detail === 'string' ? detail : 'Error al crear el empleado.');
      },
    });
  }

  // ─── Modal editar ──────────────────────────────────────────────────────────
  protected openEditModal(emp: AdminEmpleadoResumen): void {
    this.editTarget = emp;
    this.editForm = { rol: emp.rol as 'administrador' | 'empleado', activo: emp.activo, mfa_habilitado: emp.mfa_habilitado };
    this.modalError.set('');
    this.showEditModal = true;
  }

  protected closeEditModal(): void {
    this.showEditModal = false;
    this.modalError.set('');
    this.editTarget = null;
  }

  protected submitEditEmpleado(): void {
    if (!this.editTarget) return;
    this.modalSaving.set(true);
    this.modalError.set('');
    this.intranetService.adminUpdateEmpleado(this.editTarget.usuario_id, {
      rol: this.editForm.rol,
      activo: this.editForm.activo,
      mfa_habilitado: this.editForm.mfa_habilitado,
    }).subscribe({
      next: () => {
        this.modalSaving.set(false);
        this.showEditModal = false;
        this.loading.set(true);
        this.loadData();
      },
      error: (err: HttpErrorResponse) => {
        this.modalSaving.set(false);
        const detail = err?.error?.detail;
        this.modalError.set(typeof detail === 'string' ? detail : 'Error al actualizar el empleado.');
      },
    });
  }

  // ─── Tab navigation ──────────────────────────────────────────────
  protected switchTab(tab: 'resumen' | 'fichajes' | 'clientes' | 'trabajos' | 'pagos' | 'auditoria'): void {
    this.activeTab.set(tab);
    if (tab === 'fichajes' && !this.fichajes) {
      this.loadFichajes();
    }
    if (tab === 'clientes' && !this.adminClientes.length) {
      this.loadAdminClientes();
    }
    if (tab === 'trabajos' && !this.adminTrabajos.length) {
      this.loadAdminTrabajos();
    }
    if (tab === 'pagos' && !this.adminPagosFacturas.length) {
      this.loadAdminPagos();
    }
    if (tab === 'auditoria' && !this.auditoriaEventos().length) {
      this.loadAuditoria();
    }
  }

  // ─── Auditoría tab ────────────────────────────────────────────
  protected loadAuditoria(page = 1): void {
    this.auditoriaLoading.set(true);
    this.auditoriaPage.set(page);
    const params: Record<string, unknown> = { page, page_size: 50 };
    const ent = this.filtroAuditoriaEntidad();
    const acc = this.filtroAuditoriaAccion();
    if (ent) params['entidad'] = ent;
    if (acc) params['accion'] = acc;
    this.intranetService.getAuditoria(params).pipe(
      finalize(() => this.auditoriaLoading.set(false)),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (res: AuditoriaResponse) => {
        this.auditoriaEventos.set(res.eventos);
        this.auditoriaPaginacion.set(res.paginacion);
      },
      error: () => {},
    });
  }

  protected toggleExpandAuditoria(id: string): void {
    this.expandedAuditoria.set(this.expandedAuditoria() === id ? null : id);
  }

  protected readonly cierreDownloading = signal(false);

  // ── Export menus ────────────────────────────────────────────
  protected readonly showFichajesExportMenu = signal(false);
  protected readonly showTrabajosExportMenu = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.export-wrapper')) {
      this.showFichajesExportMenu.set(false);
      this.showTrabajosExportMenu.set(false);
    }
  }

  protected toggleFichajesExportMenu(): void {
    this.showFichajesExportMenu.update((v) => !v);
    this.showTrabajosExportMenu.set(false);
  }

  protected toggleTrabajosExportMenu(): void {
    this.showTrabajosExportMenu.update((v) => !v);
    this.showFichajesExportMenu.set(false);
  }

  protected exportFichajesCsv(): void {
    this.showFichajesExportMenu.set(false);
    const rows = this.fichajes?.fichajes ?? [];
    if (!rows.length) return;
    const headers = ['Empleado', 'Tipo evento', 'Fecha y hora', 'Origen', 'Observaciones'];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((f) =>
        [
          escape(f.nombre_completo),
          escape(this.tipoEventoLabel(f.tipo_evento)),
          escape(new Date(f.fecha_hora).toLocaleString('es-ES')),
          escape(f.origen),
          escape(f.observaciones ?? ''),
        ].join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fichajes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected exportFichajesPdf(): void {
    this.showFichajesExportMenu.set(false);
    const rows = this.fichajes?.fichajes ?? [];
    const tableRows = rows
      .map(
        (f) => `<tr>
          <td>${f.nombre_completo}</td>
          <td>${this.tipoEventoLabel(f.tipo_evento)}</td>
          <td>${new Date(f.fecha_hora).toLocaleString('es-ES')}</td>
          <td>${f.origen}</td>
          <td>${f.observaciones ?? '—'}</td>
        </tr>`
      )
      .join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Fichajes — ${new Date().toLocaleDateString('es-ES')}</title>
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
      <h1>Fichajes</h1>
      <p>Exportado el ${new Date().toLocaleDateString('es-ES')} · ${rows.length} registros</p>
      <table><thead><tr>
        <th>Empleado</th><th>Tipo evento</th><th>Fecha y hora</th><th>Origen</th><th>Observaciones</th>
      </tr></thead><tbody>${tableRows}</tbody></table>
      <script>window.onload=()=>{window.print();}<\/script>
      </body></html>`;
    const w = window.open('', '_blank');
    w?.document.write(html);
    w?.document.close();
  }

  protected exportTrabajosCsv(): void {
    this.showTrabajosExportMenu.set(false);
    const rows = this.filteredAdminTrabajos;
    if (!rows.length) return;
    const headers = ['#', 'Título', 'Cliente', 'Estado', 'Prioridad', 'Empleados', 'Fecha inicio', 'Fecha objetivo', 'Fecha cierre'];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-ES') : '';
    const lines = [
      headers.join(','),
      ...rows.map((t) =>
        [
          escape(t.nro_trabajo),
          escape(t.titulo),
          escape(t.cliente_nombre),
          escape(this.estadoLabel(t.estado)),
          escape(t.prioridad),
          escape(t.empleados_asignados.map((e) => e.nombre_completo).join('; ')),
          escape(fmtDate(t.fecha_inicio)),
          escape(fmtDate(t.fecha_objetivo)),
          escape(fmtDate(t.fecha_cierre)),
        ].join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trabajos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected exportTrabajosPdf(): void {
    this.showTrabajosExportMenu.set(false);
    const rows = this.filteredAdminTrabajos;
    const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-ES') : '—';
    const tableRows = rows
      .map(
        (t) => `<tr>
          <td>${t.nro_trabajo}</td>
          <td>${t.titulo}</td>
          <td>${t.cliente_nombre}</td>
          <td>${this.estadoLabel(t.estado)}</td>
          <td>${t.prioridad}</td>
          <td>${t.empleados_asignados.map((e) => e.nombre_completo).join(', ') || '—'}</td>
          <td>${fmtDate(t.fecha_inicio)}</td>
          <td>${fmtDate(t.fecha_objetivo)}</td>
          <td>${fmtDate(t.fecha_cierre)}</td>
        </tr>`
      )
      .join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Trabajos — ${new Date().toLocaleDateString('es-ES')}</title>
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
      <h1>Gestión de trabajos</h1>
      <p>Exportado el ${new Date().toLocaleDateString('es-ES')} · ${rows.length} registros</p>
      <table><thead><tr>
        <th>#</th><th>Título</th><th>Cliente</th><th>Estado</th><th>Prioridad</th>
        <th>Empleados</th><th>Inicio</th><th>Objetivo</th><th>Cierre</th>
      </tr></thead><tbody>${tableRows}</tbody></table>
      <script>window.onload=()=>{window.print();}<\/script>
      </body></html>`;
    const w = window.open('', '_blank');
    w?.document.write(html);
    w?.document.close();
  }

  get cierreYear(): number { return new Date().getFullYear(); }
  get cierreMonth(): number { return new Date().getMonth() + 1; }

  protected downloadCierre(): void {
    this.cierreDownloading.set(true);
    this.intranetService.exportCierrePDF(this.cierreYear, this.cierreMonth).pipe(
      finalize(() => this.cierreDownloading.set(false)),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cierre_${this.cierreYear}_${String(this.cierreMonth).padStart(2, '0')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {},
    });
  }

  // ─── Fichajes tab ─────────────────────────────────────────────────────────
  protected loadFichajes(): void {
    this.fichajesLoading.set(true);
    const f = this.fichajesFilter;
    this.intranetService.getAdminFichajes({
      page: f.page,
      page_size: f.page_size,
      empleado_id: f.empleado_id || undefined,
      fecha_desde: f.fecha_desde || undefined,
      fecha_hasta: f.fecha_hasta || undefined,
      tipo_evento: f.tipo_evento || undefined,
    }).subscribe({
      next: (res) => { this.fichajes = res; this.fichajesLoading.set(false); },
      error: () => { this.fichajesLoading.set(false); },
    });
  }

  protected applyFichajesFilter(): void {
    this.fichajesFilter.page = 1;
    this.loadFichajes();
  }

  protected fichajesGoToPage(p: number): void {
    this.fichajesFilter.page = p;
    this.loadFichajes();
  }

  protected tipoEventoLabel(tipo: string): string {
    const map: Record<string, string> = {
      entrada: 'Entrada',
      salida: 'Salida',
      pausa_inicio: 'Pausa inicio',
      pausa_fin: 'Pausa fin',
    };
    return map[tipo] ?? tipo;
  }

  // ─── Modal corrección ─────────────────────────────────────────────────────
  protected openCorreccionModal(): void {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);
    this.correccionForm = { empleado_id: '', tipo_evento: 'entrada', fecha: today, hora: now, observaciones: '' };
    this.modalError.set('');
    this.showCorreccionModal = true;
  }

  protected closeCorreccionModal(): void {
    this.showCorreccionModal = false;
    this.modalError.set('');
  }

  protected submitCorreccion(): void {
    const f = this.correccionForm;
    if (!f.empleado_id || !f.fecha || !f.hora) {
      this.modalError.set('Empleado, fecha y hora son obligatorios.');
      return;
    }
    this.modalSaving.set(true);
    this.modalError.set('');
    const fechaHora = `${f.fecha}T${f.hora}:00`;
    this.intranetService.createCorreccionFichaje({
      empleado_id: f.empleado_id,
      tipo_evento: f.tipo_evento,
      fecha_hora: fechaHora,
      observaciones: f.observaciones || null,
    }).subscribe({
      next: () => {
        this.modalSaving.set(false);
        this.showCorreccionModal = false;
        this.loadFichajes();
      },
      error: (err) => {
        this.modalSaving.set(false);
        const detail = err?.error?.detail;
        this.modalError.set(typeof detail === 'string' ? detail : 'Error al registrar la corrección.');
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  protected get empleadosActivos(): AdminEmpleadoResumen[] {
    return this.data?.empleados.filter((e) => e.activo) ?? [];
  }

  protected get empleadosInactivos(): AdminEmpleadoResumen[] {
    return this.data?.empleados.filter((e) => !e.activo) ?? [];
  }

  protected get empleadosFichandoHoy(): number {
    return this.data?.empleados.filter((e) => e.turno_activo).length ?? 0;
  }

  protected formatHours(value: number): string {
    if (!value) return '0h';
    const h = Math.floor(value);
    const m = Math.round((value - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected scrollCarousel(direction: 'prev' | 'next'): void {
    const el = this.kpiTrack?.nativeElement;
    if (!el) return;
    const cardWidth = el.querySelector('.kpi-card')?.clientWidth ?? 160;
    const gap = 10;
    const step = (cardWidth + gap) * 2;
    el.scrollBy({ left: direction === 'next' ? step : -step, behavior: 'smooth' });
  }

  // ─── SVG chart helpers ────────────────────────────────────────────────────
  protected buildPolyline(values: number[], w = 400, h = 80, padX = 12, padY = 8): string {
    if (!values.length) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const usableW = w - padX * 2;
    const usableH = h - padY * 2;
    return values
      .map((v, i) => {
        const x = padX + (i / Math.max(values.length - 1, 1)) * usableW;
        const y = padY + usableH - ((v - min) / range) * usableH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  protected facturacionValues(key: 'facturado_total' | 'cobrado_total'): number[] {
    return (this.charts()?.facturacion ?? []).map((p) => p[key]);
  }

  protected trabajosValues(key: 'trabajos_creados' | 'finalizados'): number[] {
    return (this.charts()?.trabajos ?? []).map((p) => p[key]);
  }

  protected chartLabels(source: 'facturacion' | 'trabajos' | 'clientes' | 'horas'): string[] {
    return (this.charts()?.[source] ?? []).map((p) => p.label);
  }

  protected horasValues(): number[] {
    return (this.charts()?.horas ?? []).map((p) => (p as HorasMensualesPoint).horas_totales);
  }

  protected clientesValues(): number[] {
    return (this.charts()?.clientes ?? []).map((p) => (p as ClientesMensualesPoint).clientes_nuevos);
  }

  protected maxVal(values: number[]): number {
    return Math.max(...values, 0);
  }

  protected formatAxisCurrency(value: number): string {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
    return `${value.toFixed(0)}€`;
  }

  // ─── Gráfica combinada ────────────────────────────────────────────────────

  protected toggleSeries(key: string): void {
    const s = new Set(this.hiddenSeries());
    if (s.has(key)) s.delete(key); else s.add(key);
    this.hiddenSeries.set(s);
  }

  protected isHidden(key: string): boolean {
    return this.hiddenSeries().has(key);
  }

  protected buildNormPolyline(values: number[], w = 800, h = 180, padX = 24, padY = 14): string {
    if (!values.length) return '';
    const max = Math.max(...values) || 1;
    const usableW = w - padX * 2;
    const usableH = h - padY * 2;
    return values
      .map((v, i) => {
        const x = padX + (i / Math.max(values.length - 1, 1)) * usableW;
        const y = padY + usableH - (v / max) * usableH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  protected buildNormArea(values: number[], w = 800, h = 180, padX = 24, padY = 14): string {
    if (!values.length) return '';
    const pts = this.buildNormPolyline(values, w, h, padX, padY);
    const lastX = (padX + (w - padX * 2)).toFixed(1);
    const firstX = padX.toFixed(1);
    const bottom = (h - padY + 2).toFixed(1);
    return `${pts} ${lastX},${bottom} ${firstX},${bottom}`;
  }

  protected hoverLineX(w = 800, padX = 24): number {
    const idx = this.hoveredIdx();
    const labels = this.chartLabels('facturacion');
    if (idx === null || !labels.length) return -1;
    return padX + (idx / Math.max(labels.length - 1, 1)) * (w - padX * 2);
  }

  protected hoverDot(values: number[], w = 800, h = 180, padX = 24, padY = 14): { x: number; y: number } | null {
    const idx = this.hoveredIdx();
    if (idx === null || !values[idx] && values[idx] !== 0) return null;
    const max = Math.max(...values) || 1;
    const x = padX + (idx / Math.max(values.length - 1, 1)) * (w - padX * 2);
    const y = padY + (h - padY * 2) - (values[idx] / max) * (h - padY * 2);
    return { x, y };
  }

  protected onChartHover(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const labels = this.chartLabels('facturacion');
    if (!labels.length) return;
    const idx = Math.round((x / rect.width) * (labels.length - 1));
    this.hoveredIdx.set(Math.max(0, Math.min(idx, labels.length - 1)));
  }

  protected clearHover(): void { this.hoveredIdx.set(null); }

  protected tooltipData(): { label: string; series: { key: string; name: string; value: string; color: string }[] } | null {
    const idx = this.hoveredIdx();
    const c = this.charts();
    if (idx === null || !c) return null;
    const label = c.facturacion[idx]?.label ?? c.trabajos[idx]?.label ?? '';
    return {
      label,
      series: [
        { key: 'facturado', name: 'Facturado',   value: this.formatCurrency(c.facturacion[idx]?.facturado_total ?? 0), color: '#e8a838' },
        { key: 'cobrado',   name: 'Cobrado',      value: this.formatCurrency(c.facturacion[idx]?.cobrado_total   ?? 0), color: '#22c55e' },
        { key: 'trabajos',  name: 'Trab. nuevos', value: String(c.trabajos[idx]?.trabajos_creados ?? 0),                color: '#3b82f6' },
        { key: 'finalizados', name: 'Finalizados', value: String(c.trabajos[idx]?.finalizados ?? 0),                   color: '#0d9488' },
        { key: 'clientes',  name: 'Clientes',     value: String(c.clientes[idx]?.clientes_nuevos ?? 0),                color: '#a855f7' },
        { key: 'horas',     name: 'Horas',        value: `${(c.horas[idx]?.horas_totales ?? 0).toFixed(1)}h`,          color: '#f59e0b' },
      ].filter(s => !this.isHidden(s.key)),
    };
  }

  protected tooltipLeft(): number {
    const idx = this.hoveredIdx();
    const labels = this.chartLabels('facturacion');
    if (idx === null || !labels.length) return 50;
    return (idx / Math.max(labels.length - 1, 1)) * 100;
  }

  // ─── Delete / baja ────────────────────────────────────────────────────────

  protected readonly deleteTarget = signal<{
    type: 'cliente' | 'trabajo' | 'factura';
    id: string;
    label: string;
  } | null>(null);
  protected readonly deleteError = signal('');
  protected readonly deleteSaving = signal(false);

  protected openDeleteConfirm(type: 'cliente' | 'trabajo' | 'factura', id: string, label: string): void {
    this.deleteTarget.set({ type, id, label });
    this.deleteError.set('');
  }

  protected closeDeleteConfirm(): void {
    if (this.deleteSaving()) return;
    this.deleteTarget.set(null);
    this.deleteError.set('');
  }

  protected confirmAdminDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleteSaving.set(true);
    this.deleteError.set('');

    let op$;
    if (target.type === 'cliente') {
      op$ = this.intranetService.deleteCliente(target.id);
    } else if (target.type === 'trabajo') {
      op$ = this.intranetService.deleteTrabajo(target.id);
    } else {
      op$ = this.intranetService.deleteFactura(target.id);
    }

    op$.pipe(finalize(() => this.deleteSaving.set(false))).subscribe({
      next: () => {
        this.deleteTarget.set(null);
        if (target.type === 'cliente')  this.refreshAdminClientes();
        if (target.type === 'trabajo')  this.refreshAdminTrabajos();
        if (target.type === 'factura')  this.refreshAdminPagos();
      },
      error: (err: HttpErrorResponse) => {
        const detail = err?.error?.detail;
        this.deleteError.set(typeof detail === 'string' ? detail : 'No se pudo completar la operación.');
      },
    });
  }
}
