import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, finalize, forkJoin, takeUntil } from 'rxjs';

import { AuthStateService } from '../../../core/services/auth-state.service';
import {
  EstadoTrabajo,
  PrioridadTrabajo,
  TrabajoComentario,
  TrabajoCreate,
  TrabajoDetailItem,
  TrabajoTabItem,
  TrabajosTabResponse,
  TrabajoUpdate,
} from '../../../core/models/intranet.models';
import { IntranetService } from '../../../core/services/intranet.service';
import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';
import { ClientesTabResponse } from '../../../core/models/intranet.models';

type ModalMode = 'none' | 'create' | 'edit' | 'delete';

interface TrabajoForm {
  titulo: string;
  cliente_id: string;
  descripcion: string;
  prioridad: PrioridadTrabajo;
  fecha_inicio: string;
  fecha_objetivo: string;
  nota_bloqueo: string;
}

interface EmpleadoOption {
  id: string;
  nombre: string;
  apellidos: string;
  activo: boolean;
  nombre_completo: string;
}

interface ClienteOption {
  cliente_id: string;
  nombre_fiscal: string;
  nro_cliente: number | null;
}

const ESTADOS: { key: EstadoTrabajo; label: string; color: string; dot: string }[] = [
  { key: 'pendiente',  label: 'Pendiente',  color: '#3b82f6', dot: '#3b82f6' },
  { key: 'en_curso',   label: 'En curso',   color: '#f59e0b', dot: '#f59e0b' },
  { key: 'bloqueado',  label: 'Bloqueado',  color: '#ef4444', dot: '#ef4444' },
  { key: 'finalizado', label: 'Finalizado', color: '#10b981', dot: '#10b981' },
  { key: 'cancelado',  label: 'Cancelado',  color: '#94a3b8', dot: '#94a3b8' },
];

const PRIORIDADES: { key: PrioridadTrabajo; label: string }[] = [
  { key: 'urgente',   label: 'Urgente' },
  { key: 'alta',      label: 'Alta' },
  { key: 'media',     label: 'Media' },
  { key: 'baja',      label: 'Baja' },
  { key: 'no_aplica', label: 'N/A' },
];

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

@Component({
  selector: 'app-trabajos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IntranetSidebarComponent],
  templateUrl: './trabajos-page.component.html',
  styleUrl: './trabajos-page.component.css',
})
export class TrabajosPageComponent implements OnInit, OnDestroy {
  private readonly intranetService = inject(IntranetService);
  private readonly authState = inject(AuthStateService);
  private readonly destroy$ = new Subject<void>();
  @ViewChild('commentsList') private commentsList!: ElementRef<HTMLElement>;

  // ── State ──────────────────────────────────────────────────────────────────
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadingDetail = signal(false);
  protected readonly errorMessage = signal('');

  protected tabData: TrabajosTabResponse | null = null;
  protected readonly modalMode = signal<ModalMode>('none');
  protected selectedTrabajo: TrabajoDetailItem | null = null;
  protected selectedItem: TrabajoTabItem | null = null;

  // Panel de detalle
  protected detailOpen = false;
  protected comentarios: TrabajoComentario[] = [];
  protected loadingComentarios = false;
  protected nuevoComentario = '';
  protected savingComentario = false;

  // Filtros
  protected filterPrioridad: string = '';
  protected filterClienteId: string = '';
  protected showCancelados = false;

  // Listas para selectores
  protected empleadosList: EmpleadoOption[] = [];
  protected clientesList: ClienteOption[] = [];
  protected addEmpleadoId = '';
  protected savingAsignacion = false;

  // Formulario
  protected form: TrabajoForm = this.emptyForm();
  protected formErrors: Record<string, string> = {};
  protected formServerError = '';

  // Constantes para templates
  readonly estados = ESTADOS;
  readonly prioridades = PRIORIDADES;

  // ── Computed ───────────────────────────────────────────────────────────────
  protected get isAdmin(): boolean {
    return this.authState.currentUser()?.role === 'administrador';
  }

  protected get resumen() {
    return this.tabData?.resumen ?? { total: 0, pendientes: 0, en_curso: 0, bloqueados: 0, finalizados: 0, cancelados: 0 };
  }

  protected get allTrabajos(): TrabajoTabItem[] {
    if (!this.tabData) return [];
    return this.tabData.trabajos.filter((t) => {
      if (this.filterPrioridad && t.prioridad !== this.filterPrioridad) return false;
      if (this.filterClienteId && t.cliente_id !== this.filterClienteId) return false;
      return true;
    });
  }

  protected columnTrabajos(estado: EstadoTrabajo): TrabajoTabItem[] {
    return this.allTrabajos.filter((t) => t.estado === estado);
  }

  protected get visibleColumnas(): typeof ESTADOS {
    return ESTADOS.filter((e) => e.key !== 'cancelado' || this.showCancelados);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadData();
    this.loadClientes();
    this.loadEmpleados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.intranetService.getTrabajosTab({ page_size: 200 })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => { this.tabData = data; },
        error: (err: HttpErrorResponse) => {
          const detail = err.error?.detail;
          const msg = typeof detail === 'string' ? detail : 'Error al cargar los trabajos.';
          this.errorMessage.set(msg);
        },
      });
  }

  private loadEmpleados(): void {
    this.intranetService.getEmpleadosList().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        this.empleadosList = list
          .filter((u: any) => u.activo)
          .map((u: any) => ({
            id: u.id,
            nombre: u.nombre,
            apellidos: u.apellidos,
            activo: u.activo,
            nombre_completo: `${u.nombre} ${u.apellidos}`.trim(),
          }));
      },
    });
  }

  private loadClientes(): void {
    this.intranetService.getClientesTab({ page_size: 200 }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.clientesList = data.clientes.filter((c) => c.activo).map((c) => ({
          cliente_id: c.cliente_id,
          nombre_fiscal: c.nombre_fiscal,
          nro_cliente: null,
        }));
      },
    });
  }

  // ── Card interaction ──────────────────────────────────────────────────────
  protected openDetail(item: TrabajoTabItem): void {
    this.selectedItem = item;
    this.detailOpen = true;
    this.loadingDetail.set(true);
    this.comentarios = [];
    this.nuevoComentario = '';

    forkJoin({
      detail: this.intranetService.getTrabajoDetail(item.trabajo_id),
      comentarios: this.intranetService.getTrabajoComentarios(item.trabajo_id),
    })
      .pipe(finalize(() => this.loadingDetail.set(false)))
      .subscribe({
        next: ({ detail, comentarios }) => {
          this.selectedTrabajo = detail;
          this.comentarios = comentarios;
          this.scrollCommentsToBottom();
        },
      });
  }

  protected closeDetail(): void {
    this.detailOpen = false;
    this.selectedTrabajo = null;
    this.selectedItem = null;
    this.addEmpleadoId = '';
  }

  private loadComentarios(trabajoId: string): void {
    this.loadingComentarios = true;
    this.intranetService.getTrabajoComentarios(trabajoId)
      .pipe(finalize(() => { this.loadingComentarios = false; }))
      .subscribe({
        next: (list) => {
          this.comentarios = list;
          this.scrollCommentsToBottom();
        },
      });
  }

  private scrollCommentsToBottom(): void {
    setTimeout(() => {
      const el = this.commentsList?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  // ── Estado rápido desde kanban ─────────────────────────────────────────────
  protected changeEstado(item: TrabajoTabItem, estado: EstadoTrabajo): void {
    if (!this.isAdmin) return;
    this.intranetService.updateTrabajo(item.trabajo_id, { estado }).subscribe({
      next: (updated) => {
        if (this.selectedTrabajo?.trabajo_id === item.trabajo_id) {
          this.selectedTrabajo = updated;
        }
        this.loadData();
      },
    });
  }

  // ── Comentarios ──────────────────────────────────────────────────────────
  protected submitComentario(): void {
    const texto = this.nuevoComentario.trim();
    if (!texto || !this.selectedTrabajo) return;
    this.savingComentario = true;
    const trabajoId = this.selectedTrabajo.trabajo_id;
    this.intranetService.addTrabajoComentario(trabajoId, texto)
      .pipe(finalize(() => { this.savingComentario = false; }))
      .subscribe({
        next: () => {
          this.nuevoComentario = '';
          this.loadComentarios(trabajoId);
        },
      });
  }

  // ── Asignación de empleados ──────────────────────────────────────────────
  protected assignEmpleado(): void {
    if (!this.addEmpleadoId || !this.selectedTrabajo) return;
    this.savingAsignacion = true;
    this.intranetService.assignEmpleadoToTrabajo(this.selectedTrabajo.trabajo_id, this.addEmpleadoId)
      .pipe(finalize(() => { this.savingAsignacion = false; }))
      .subscribe({
        next: (res) => {
          if (this.selectedTrabajo) {
            this.selectedTrabajo = { ...this.selectedTrabajo, empleados_asignados: res.empleados };
          }
          this.addEmpleadoId = '';
          this.refreshCardEmpleados(this.selectedTrabajo!.trabajo_id, res.empleados);
          this.loadData();
        },
        error: (err: HttpErrorResponse) => {
          alert(err.error?.detail ?? 'Error al asignar empleado');
        },
      });
  }

  protected unassignEmpleado(empleadoId: string): void {
    if (!this.selectedTrabajo || !this.isAdmin) return;
    this.intranetService.unassignEmpleadoFromTrabajo(this.selectedTrabajo.trabajo_id, empleadoId).subscribe({
      next: () => {
        if (this.selectedTrabajo) {
          const updated = this.selectedTrabajo.empleados_asignados.filter((e) => e.empleado_id !== empleadoId);
          this.selectedTrabajo = { ...this.selectedTrabajo, empleados_asignados: updated };
          this.refreshCardEmpleados(this.selectedTrabajo.trabajo_id, updated);
        }
        this.loadData();
      },
    });
  }

  private refreshCardEmpleados(trabajoId: string, empleados: { empleado_id: string; nombre_completo: string }[]): void {
    if (!this.tabData) return;
    this.tabData = {
      ...this.tabData,
      trabajos: this.tabData.trabajos.map((t) =>
        t.trabajo_id === trabajoId ? { ...t, empleados_asignados: empleados } : t
      ),
    };
  }

  // ── Modal create / edit ───────────────────────────────────────────────────
  protected openCreate(): void {
    this.form = this.emptyForm();
    this.formErrors = {};
    this.formServerError = '';
    this.modalMode.set('create');
  }

  protected openEdit(): void {
    if (!this.selectedTrabajo) return;
    const t = this.selectedTrabajo;
    this.form = {
      titulo: t.titulo,
      cliente_id: t.cliente_id,
      descripcion: t.descripcion ?? '',
      prioridad: t.prioridad,
      fecha_inicio: t.fecha_inicio ?? '',
      fecha_objetivo: t.fecha_objetivo ?? '',
      nota_bloqueo: t.nota_bloqueo ?? '',
    };
    this.formErrors = {};
    this.formServerError = '';
    this.modalMode.set('edit');
  }

  protected openDelete(): void {
    this.modalMode.set('delete');
  }

  protected closeModal(): void {
    this.modalMode.set('none');
  }

  protected submitForm(): void {
    if (!this.validateForm()) return;
    this.saving.set(true);
    this.formServerError = '';

    if (this.modalMode() === 'create') {
      const payload: TrabajoCreate = {
        titulo: this.form.titulo,
        cliente_id: this.form.cliente_id,
        descripcion: this.form.descripcion || null,
        prioridad: this.form.prioridad,
        fecha_inicio: this.form.fecha_inicio || null,
        fecha_objetivo: this.form.fecha_objetivo || null,
        nota_bloqueo: this.form.nota_bloqueo || null,
      };
      this.intranetService.createTrabajo(payload)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: () => {
            this.closeModal();
            this.loadData();
          },
          error: (err: HttpErrorResponse) => {
            this.formServerError = err.error?.detail ?? 'Error al crear el trabajo';
          },
        });
    } else if (this.modalMode() === 'edit' && this.selectedTrabajo) {
      const payload: TrabajoUpdate = {
        titulo: this.form.titulo,
        descripcion: this.form.descripcion || null,
        prioridad: this.form.prioridad,
        fecha_inicio: this.form.fecha_inicio || null,
        fecha_objetivo: this.form.fecha_objetivo || null,
        nota_bloqueo: this.form.nota_bloqueo || null,
      };
      this.intranetService.updateTrabajo(this.selectedTrabajo.trabajo_id, payload)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (updated) => {
            this.selectedTrabajo = updated;
            this.closeModal();
            this.loadData();
          },
          error: (err: HttpErrorResponse) => {
            this.formServerError = err.error?.detail ?? 'Error al actualizar el trabajo';
          },
        });
    }
  }

  protected confirmDelete(): void {
    if (!this.selectedTrabajo) return;
    this.saving.set(true);
    this.intranetService.deleteTrabajo(this.selectedTrabajo.trabajo_id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.closeModal();
          this.closeDetail();
          this.loadData();
        },
        error: (err: HttpErrorResponse) => {
          this.formServerError = err.error?.detail ?? 'Error al cancelar el trabajo';
        },
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private validateForm(): boolean {
    this.formErrors = {};
    if (!this.form.titulo.trim()) this.formErrors['titulo'] = 'El título es obligatorio';
    if (!this.form.cliente_id) this.formErrors['cliente_id'] = 'El cliente es obligatorio';
    return Object.keys(this.formErrors).length === 0;
  }

  private emptyForm(): TrabajoForm {
    return {
      titulo: '',
      cliente_id: '',
      descripcion: '',
      prioridad: 'media',
      fecha_inicio: '',
      fecha_objetivo: '',
      nota_bloqueo: '',
    };
  }

  protected formatRef(nro: number | null | undefined, prefix: string): string {
    return nro != null ? `${prefix}-${nro}` : '';
  }

  protected formatDate(isoDate: string | null | undefined, prefix = ''): string {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    return `${prefix}${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
  }

  protected progress(item: TrabajoTabItem): number {
    if (!item.fecha_inicio || !item.fecha_objetivo) return 0;
    const start = new Date(item.fecha_inicio).getTime();
    const end   = new Date(item.fecha_objetivo).getTime();
    const now   = Date.now();
    if (end <= start) return 100;
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  }

  protected progressColor(item: TrabajoTabItem): string {
    const p = this.progress(item);
    if (item.fecha_objetivo && new Date(item.fecha_objetivo) < new Date()) return '#ef4444';
    if (p >= 70) return '#10b981';
    if (p >= 40) return '#f59e0b';
    return '#3b82f6';
  }

  protected prioridadLabel(key: string): string {
    return PRIORIDADES.find((p) => p.key === key)?.label ?? key;
  }

  protected estadoLabel(key: string): string {
    return ESTADOS.find((e) => e.key === key)?.label ?? key;
  }

  protected estadoColor(key: string): string {
    return ESTADOS.find((e) => e.key === key)?.color ?? '#94a3b8';
  }

  protected getClienteNombre(clienteId: string): string {
    return this.clientesList.find((c) => c.cliente_id === clienteId)?.nombre_fiscal ?? '';
  }

  protected getAvailableEmpleados(): EmpleadoOption[] {
    if (!this.selectedTrabajo) return this.empleadosList;
    const asignados = new Set(this.selectedTrabajo.empleados_asignados.map((e) => e.empleado_id));
    return this.empleadosList.filter((e) => !asignados.has(e.id));
  }

  protected initials(nombre: string): string {
    return nombre.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  // ── Export ───────────────────────────────────────────────
  protected readonly showExportMenu = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.export-wrapper')) {
      this.showExportMenu.set(false);
    }
  }

  protected toggleExportMenu(): void {
    this.showExportMenu.update((v) => !v);
  }

  protected exportCsv(): void {
    this.showExportMenu.set(false);
    const rows = this.allTrabajos;
    if (!rows.length) return;
    const headers = ['#', 'Título', 'Cliente', 'Estado', 'Prioridad', 'Empleados', 'Fecha inicio', 'Fecha objetivo', 'Fecha cierre'];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('es-ES') : '';
    const lines = [
      headers.join(','),
      ...rows.map((t) =>
        [
          escape(t.nro_trabajo),
          escape(t.titulo),
          escape(t.cliente_nombre),
          escape(this.estadoLabel(t.estado)),
          escape(this.prioridadLabel(t.prioridad)),
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

  protected exportPdf(): void {
    this.showExportMenu.set(false);
    const rows = this.allTrabajos;
    const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('es-ES') : '—';
    const tableRows = rows
      .map(
        (t) => `<tr>
          <td>${this.formatRef(t.nro_trabajo, 'T')}</td>
          <td>${t.titulo}</td>
          <td>${t.cliente_nombre}</td>
          <td>${this.estadoLabel(t.estado)}</td>
          <td>${this.prioridadLabel(t.prioridad)}</td>
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
}

