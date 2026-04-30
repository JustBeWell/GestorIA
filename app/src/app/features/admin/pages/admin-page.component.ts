import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  AdminChartsResponse,
  AdminEmpleadoResumen,
  AdminFichajesResponse,
  AdminResumenResponse,
  FacturacionMensualPoint,
  HorasMensualesPoint,
  TrabajosMensualesPoint,
  ClientesMensualesPoint,
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
export class AdminPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly intranetService = inject(IntranetService);
  private readonly sessionStorageService = inject(SessionStorageService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly modalError = signal('');
  protected readonly modalSaving = signal(false);
  protected data: AdminResumenResponse | null = null;
  protected charts: AdminChartsResponse | null = null;

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  protected readonly activeTab = signal<'resumen' | 'fichajes'>('resumen');

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

  private loadData(): void {
    this.intranetService.getAdminResumen().subscribe({
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

    this.intranetService.getAdminCharts().subscribe({
      next: (res) => { this.charts = res; },
      error: () => { /* charts are optional, fail silently */ },
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

  // ─── Tab navigation ───────────────────────────────────────────────────────
  protected switchTab(tab: 'resumen' | 'fichajes'): void {
    this.activeTab.set(tab);
    if (tab === 'fichajes' && !this.fichajes) {
      this.loadFichajes();
    }
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
    return (this.charts?.facturacion ?? []).map((p) => p[key]);
  }

  protected trabajosValues(key: 'trabajos_creados' | 'finalizados'): number[] {
    return (this.charts?.trabajos ?? []).map((p) => p[key]);
  }

  protected chartLabels(source: 'facturacion' | 'trabajos' | 'clientes' | 'horas'): string[] {
    return (this.charts?.[source] ?? []).map((p) => p.label);
  }

  protected horasValues(): number[] {
    return (this.charts?.horas ?? []).map((p) => (p as HorasMensualesPoint).horas_totales);
  }

  protected clientesValues(): number[] {
    return (this.charts?.clientes ?? []).map((p) => (p as ClientesMensualesPoint).clientes_nuevos);
  }

  protected maxVal(values: number[]): number {
    return Math.max(...values, 0);
  }

  protected formatAxisCurrency(value: number): string {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
    return `${value.toFixed(0)}€`;
  }
}
