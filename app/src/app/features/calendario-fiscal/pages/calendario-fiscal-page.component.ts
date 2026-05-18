import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CalendarioFiscalDia,
  CalendarioFiscalResponse,
  CalendarioFiscalTrabajoEmpleado,
  CalendarioFiscalVencimiento,
  CalendarioFiscalVencimientoCreate,
} from '../../../core/models/intranet.models';
import { IntranetService } from '../../../core/services/intranet.service';
import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

const today = new Date();

@Component({
  selector: 'app-calendario-fiscal-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IntranetSidebarComponent],
  templateUrl: './calendario-fiscal-page.component.html',
  styleUrl: './calendario-fiscal-page.component.css',
})
export class CalendarioFiscalPageComponent implements OnInit {
  private readonly intranetService = inject(IntranetService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<CalendarioFiscalResponse | null>(null);
  protected readonly selectedYear = signal(today.getFullYear());
  protected readonly selectedMonth = signal(today.getMonth() + 1);
  protected readonly showExportMenu = signal(false);
  protected readonly showCreateModal = signal(false);
  protected readonly showWorkList = signal(true);
  protected readonly saving = signal(false);
  protected readonly updatingId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly editingVencimiento = signal<CalendarioFiscalVencimiento | null>(null);
  protected readonly hoveredDay = signal<string | null>(null);

  protected readonly periodo = computed(() => this.data()?.periodo ?? {
    year: this.selectedYear(),
    month: this.selectedMonth(),
    month_label: '',
    subtitle: 'Vencimientos AEAT',
  });

  protected createForm = this.emptyCreateForm();

  protected readonly resumen = computed(() => this.data()?.resumen ?? {
    vencimientos_mes: 0,
    presentados: 0,
    pendientes_alta_prioridad: 0,
    clientes_afectados_alta_prioridad: 0,
    proximo_vencimiento: null,
  });

  protected readonly dias = computed(() => this.data()?.dias ?? []);
  protected readonly proximos = computed(() => this.data()?.proximos ?? []);
  protected readonly vencimientos = computed(() => this.data()?.vencimientos ?? []);
  protected readonly trabajosPorEmpleado = computed(() => this.data()?.trabajos_por_empleado ?? []);
  protected readonly trabajosEmpleadosTotal = computed(() =>
    this.trabajosPorEmpleado().reduce((total, group) => total + group.trabajos.length, 0),
  );
  protected readonly trabajosEmpleadosPendientes = computed(() =>
    this.trabajosPorEmpleado().reduce((total, group) => total + group.pendientes, 0),
  );
  protected readonly trabajosPorFecha = computed(() => {
    const map = new Map<string, CalendarioFiscalTrabajoEmpleado[]>();
    for (const group of this.trabajosPorEmpleado()) {
      for (const trabajo of group.trabajos) {
        const list = map.get(trabajo.fecha_objetivo) ?? [];
        list.push(trabajo);
        map.set(trabajo.fecha_objetivo, list);
      }
    }
    return map;
  });
  protected readonly pendientes = computed(() =>
    this.vencimientos().filter((item) => item.estado !== 'presentado' && item.estado !== 'no_aplica'),
  );
  protected readonly realizados = computed(() =>
    this.vencimientos().filter((item) => item.estado === 'presentado' || item.estado === 'no_aplica'),
  );
  protected readonly busy = computed(() =>
    this.loading() || this.saving() || this.updatingId() !== null || this.deletingId() !== null
  );

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.intranetService.getCalendarioFiscal({
      year: this.selectedYear(),
      month: this.selectedMonth(),
    }).subscribe({
      next: (response) => {
        this.data.set(response);
        this.selectedYear.set(response.periodo.year);
        this.selectedMonth.set(response.periodo.month);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el calendario fiscal.');
        this.loading.set(false);
      },
    });
  }

  protected previousMonth(): void {
    if (this.busy()) return;
    const month = this.selectedMonth();
    if (month === 1) {
      this.selectedMonth.set(12);
      this.selectedYear.update((year) => year - 1);
    } else {
      this.selectedMonth.set(month - 1);
    }
    this.load();
  }

  protected nextMonth(): void {
    if (this.busy()) return;
    const month = this.selectedMonth();
    if (month === 12) {
      this.selectedMonth.set(1);
      this.selectedYear.update((year) => year + 1);
    } else {
      this.selectedMonth.set(month + 1);
    }
    this.load();
  }

  protected previousYear(): void {
    if (this.busy()) return;
    this.selectedYear.update((year) => year - 1);
    this.load();
  }

  protected nextYear(): void {
    if (this.busy()) return;
    this.selectedYear.update((year) => year + 1);
    this.load();
  }

  protected toggleExportMenu(): void {
    if (this.busy() || !this.data()) return;
    this.showExportMenu.update((value) => !value);
  }

  protected toggleWorkList(): void {
    this.showWorkList.update((value) => !value);
  }

  protected exportIcs(): void {
    if (this.busy() || !this.data()) return;
    this.showExportMenu.set(false);
    this.intranetService.exportCalendarioFiscalICS(
      this.periodo().year,
      this.periodo().month,
    ).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calendario-fiscal-${this.periodo().year}-${String(this.periodo().month).padStart(2, '0')}.ics`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  protected openCreate(): void {
    if (this.busy()) return;
    this.createForm = this.emptyCreateForm();
    this.editingVencimiento.set(null);
    this.showCreateModal.set(true);
  }

  protected openEdit(item: CalendarioFiscalVencimiento): void {
    if (this.busy()) return;
    this.createForm = {
      fecha: item.fecha,
      modelo: item.modelo,
      titulo: item.titulo,
      descripcion: item.descripcion ?? '',
      categoria: item.categoria,
      periodo: item.periodo,
      prioridad: item.prioridad,
      estado: item.estado,
      fuente_url: item.fuente_url ?? '',
    };
    this.editingVencimiento.set(item);
    this.showCreateModal.set(true);
  }

  protected closeCreate(): void {
    if (this.saving()) return;
    this.showCreateModal.set(false);
    this.editingVencimiento.set(null);
  }

  protected createVencimiento(): void {
    if (this.saving() || !this.createForm.fecha || !this.createForm.modelo.trim() || !this.createForm.titulo.trim()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.intranetService.createCalendarioFiscalVencimiento({
      ...this.createForm,
      modelo: this.createForm.modelo.trim(),
      titulo: this.createForm.titulo.trim(),
      categoria: this.createForm.categoria.trim() || 'Extra',
      periodo: this.createForm.periodo.trim() || this.periodo().month_label,
      descripcion: this.createForm.descripcion?.trim() || null,
      fuente_url: this.createForm.fuente_url?.trim() || null,
    };
    const editing = this.editingVencimiento();
    const request$ = editing
      ? this.intranetService.updateCalendarioFiscalVencimiento(editing.id, payload)
      : this.intranetService.createCalendarioFiscalVencimiento(payload);

    request$.subscribe({
      next: (item) => {
        this.selectedYear.set(this.parseDate(item.fecha).getFullYear());
        this.selectedMonth.set(this.parseDate(item.fecha).getMonth() + 1);
        this.showCreateModal.set(false);
        this.editingVencimiento.set(null);
        this.saving.set(false);
        this.load();
      },
      error: () => {
        this.error.set(editing ? 'No se pudo actualizar el vencimiento.' : 'No se pudo crear el vencimiento.');
        this.saving.set(false);
      },
    });
  }

  protected deleteVencimiento(item: CalendarioFiscalVencimiento): void {
    if (this.busy()) return;
    const confirmed = window.confirm(`Eliminar vencimiento ${item.modelo} - ${item.titulo}?`);
    if (!confirmed) return;

    this.deletingId.set(item.id);
    this.error.set(null);
    this.intranetService.deleteCalendarioFiscalVencimiento(item.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.load();
      },
      error: () => {
        this.error.set('No se pudo eliminar el vencimiento.');
        this.deletingId.set(null);
      },
    });
  }

  protected updateEstado(item: CalendarioFiscalVencimiento, estado: CalendarioFiscalVencimiento['estado']): void {
    if (this.busy()) return;
    this.updatingId.set(item.id);
    this.error.set(null);
    this.intranetService.updateCalendarioFiscalEstado(item.id, estado).subscribe({
      next: () => {
        this.updatingId.set(null);
        this.load();
      },
      error: () => {
        this.error.set('No se pudo actualizar el estado del vencimiento.');
        this.updatingId.set(null);
      },
    });
  }

  protected presentedRatio(): number {
    const resumen = this.resumen();
    if (!resumen.vencimientos_mes) {
      return 0;
    }
    return Math.round((resumen.presentados / resumen.vencimientos_mes) * 100);
  }

  protected dateLabel(vencimiento: CalendarioFiscalVencimiento | null): string {
    if (!vencimiento) {
      return 'Sin vencimientos';
    }
    return this.formatShortDate(vencimiento.fecha);
  }

  protected deadlineDistance(vencimiento: CalendarioFiscalVencimiento): string {
    return this.dateDistance(vencimiento.fecha);
  }

  protected dateDistance(value: string): string {
    const due = this.parseDate(value);
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000);
    if (diffDays === 0) {
      return 'hoy';
    }
    if (diffDays > 0) {
      return `en ${diffDays}d`;
    }
    return `hace ${Math.abs(diffDays)}d`;
  }

  protected trabajoEstadoLabel(estado: CalendarioFiscalTrabajoEmpleado['estado']): string {
    const labels: Record<CalendarioFiscalTrabajoEmpleado['estado'], string> = {
      pendiente: 'Pendiente',
      en_curso: 'En curso',
      bloqueado: 'Bloqueado',
      finalizado: 'Realizado',
      cancelado: 'Cancelado',
    };
    return labels[estado] ?? estado;
  }

  protected trabajoPrioridadClass(prioridad: CalendarioFiscalTrabajoEmpleado['prioridad']): string {
    return prioridad === 'urgente' ? 'alta' : prioridad;
  }

  protected formatShortDate(value: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
    }).format(this.parseDate(value)).replace('.', '');
  }

  protected monthCode(value: string): string {
    return new Intl.DateTimeFormat('es-ES', { month: 'short' })
      .format(this.parseDate(value))
      .replace('.', '')
      .toUpperCase();
  }

  protected dayNumber(value: string): string {
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit' }).format(this.parseDate(value));
  }

  protected visibleEvents(day: CalendarioFiscalDia): CalendarioFiscalVencimiento[] {
    return day.vencimientos.slice(0, 2);
  }

  protected visibleTrabajos(day: CalendarioFiscalDia): CalendarioFiscalTrabajoEmpleado[] {
    const trabajos = this.trabajosPorFecha().get(day.fecha) ?? [];
    const shownVenc = Math.min(day.vencimientos.length, 2);
    const slots = Math.max(2 - shownVenc, 0);
    return trabajos.slice(0, slots);
  }

  protected allTrabajos(day: CalendarioFiscalDia): CalendarioFiscalTrabajoEmpleado[] {
    return this.trabajosPorFecha().get(day.fecha) ?? [];
  }

  protected hiddenEventsCount(day: CalendarioFiscalDia): number {
    const trabajos = this.trabajosPorFecha().get(day.fecha) ?? [];
    const shownVenc = Math.min(day.vencimientos.length, 2);
    const shownTrab = Math.min(trabajos.length, Math.max(2 - shownVenc, 0));
    return (day.vencimientos.length - shownVenc) + (trabajos.length - shownTrab);
  }

  protected dayHasEvents(day: CalendarioFiscalDia): boolean {
    return day.vencimientos.length > 0 || (this.trabajosPorFecha().get(day.fecha)?.length ?? 0) > 0;
  }

  protected trackDay(_: number, day: CalendarioFiscalDia): string {
    return day.fecha;
  }

  protected trackVencimiento(_: number, item: CalendarioFiscalVencimiento): string {
    return item.id;
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private emptyCreateForm(): CalendarioFiscalVencimientoCreate {
    return {
      fecha: `${this.selectedYear()}-${String(this.selectedMonth()).padStart(2, '0')}-01`,
      modelo: '',
      titulo: '',
      descripcion: '',
      categoria: 'Extra',
      periodo: this.periodo().month_label || `${this.selectedMonth()}/${this.selectedYear()}`,
      prioridad: 'media',
      estado: 'pendiente',
      fuente_url: '',
    };
  }
}
