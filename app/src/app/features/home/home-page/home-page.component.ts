import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, of, retry } from 'rxjs';

import { EmpleadoModel } from '../../../core/models/empleado.model';
import {
  FichajeEventoItem,
  IntranetHomeResponse,
  QuarterSeriesPoint,
  QuarterSeriesResponse,
} from '../../../core/models/intranet.models';
import { EmpleadoService } from '../../../core/services/empleado.service';
import { IntranetService } from '../../../core/services/intranet.service';
import { SessionStorageService } from '../../../core/services/session-storage.service';
import { formatEventLabel } from '../../../shared/utils/event-label';

interface CalendarDay {
  day: number | null;
  fichajes: number;
  isToday: boolean;
  hoursLabel: string;
  summaryLabel: string;
  progressPercent: number;
  entryLabel: string;
  exitLabel: string;
  statusLabel: string;
}

interface ActivityItem {
  title: string;
  subtitle: string;
  time: string;
  tag: string;
}

interface DayMetrics {
  entry: FichajeEventoItem | null;
  exit: FichajeEventoItem | null;
  workedHours: number;
}

interface HomeSnapshot {
  home: IntranetHomeResponse;
  fichajeEventos: FichajeEventoItem[];
  empleado: EmpleadoModel | null;
  series: {
    fichaje: QuarterSeriesResponse | null;
    clientes: QuarterSeriesResponse | null;
    trabajos: QuarterSeriesResponse | null;
    pagos: QuarterSeriesResponse | null;
  };
  savedAt: string;
}

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent implements OnInit {
  private readonly snapshotKey = 'home_snapshot';
  private readonly minActionDelayMs = 1000;

  private readonly empleadoService = inject(EmpleadoService);
  private readonly intranetService = inject(IntranetService);
  private readonly sessionStorageService = inject(SessionStorageService);
  private readonly router = inject(Router);

  private pendingReloadAt: number | null = null;

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  protected empleado: EmpleadoModel | null = null;
  protected homeData: IntranetHomeResponse | null = null;
  protected calendarDays: CalendarDay[] = [];
  protected monthLabel = '';
  protected todayLabel = '';
  protected activityItems: ActivityItem[] = [];
  protected selectedDay: number | null = null;
  private latestFichajeEvents: FichajeEventoItem[] = [];

  protected fichajeSeries: QuarterSeriesPoint[] = [];
  protected clientesSeries: QuarterSeriesPoint[] = [];
  protected trabajosSeries: QuarterSeriesPoint[] = [];
  protected pagosSeries: QuarterSeriesPoint[] = [];
  protected fichajeMonthSeries: number[] = [];
  protected fichajeSparkline = '0,30 100,30';
  protected clientesSparkline = '0,30 100,30';
  protected trabajosSparkline = '0,30 100,30';
  protected pagosSparkline = '0,30 100,30';

  ngOnInit(): void {
    const cachedSnapshot = this.readSnapshot();
    const hasSnapshot = Boolean(cachedSnapshot?.empleado);
    const pendingReloadAt = this.pendingReloadAt;

    if (cachedSnapshot) {
      this.applySnapshot(cachedSnapshot);
      this.loading.set(!hasSnapshot);
    }

    const empleadoCacheado = this.empleadoService.getCachedEmpleado();
    const empleado$ = empleadoCacheado
      ? of(empleadoCacheado)
      : this.empleadoService.me().pipe(retry({ count: 1, delay: 150 }));

    const { start, end } = this.getMonthRange();

    if (!hasSnapshot && !pendingReloadAt) {
      this.loading.set(true);
    }

    forkJoin({
      empleado: empleado$,
      home: this.intranetService.getHome(),
      fichaje: this.intranetService.getFichajeTab({
        page: 1,
        page_size: 100,
        fecha_desde: start,
        fecha_hasta: end,
      }),
      fichajeSeries: this.intranetService.getFichajeQuarterSeries(),
      clientesSeries: this.intranetService.getClientesQuarterSeries(),
      trabajosSeries: this.intranetService.getTrabajosQuarterSeries(),
      pagosSeries: this.intranetService.getPagosQuarterSeries(),
    })
      .pipe(finalize(() => {
        if (!hasSnapshot && !pendingReloadAt) {
          this.loading.set(false);
        }
      }))
      .subscribe({
        next: ({ empleado, home, fichaje, fichajeSeries, clientesSeries, trabajosSeries, pagosSeries }) => {
          this.empleado = empleado;
          this.homeData = home;
          this.latestFichajeEvents = fichaje.eventos_recientes;
          this.buildCalendar(fichaje.eventos_recientes);
          this.activityItems = this.buildActivityItems();
          this.fichajeSeries = fichajeSeries.points;
          this.clientesSeries = clientesSeries.points;
          this.trabajosSeries = trabajosSeries.points;
          this.pagosSeries = pagosSeries.points;
          this.updateSparklines();
          this.saveSnapshot({
            home,
            fichajeEventos: fichaje.eventos_recientes,
            empleado,
            series: {
              fichaje: fichajeSeries,
              clientes: clientesSeries,
              trabajos: trabajosSeries,
              pagos: pagosSeries,
            },
            savedAt: new Date().toISOString(),
          });
          this.finishReloadWithDelay();
        },
        error: (err: HttpErrorResponse) => {
          const detail = err?.error?.detail;
          if (!hasSnapshot) {
            this.errorMessage.set(typeof detail === 'string' ? detail : 'No se pudo cargar el dashboard de intranet.');
          }

          if (err.status === 401) {
            this.logout();
          }

          this.finishReloadWithDelay();
        },
      });
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return 'No disponible';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'No disponible';
    }

    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  protected formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value ?? 0);
  }

  protected get employeeFirstName(): string {
    const name = this.getProfileName();
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Usuario';
    }

    return trimmed.split(' ').filter(Boolean)[0] ?? 'Usuario';
  }

  protected get employeeInitials(): string {
    const source = this.getProfileName();
    if (!source) {
      return 'UI';
    }

    const parts = source.split(' ').filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
    return initials.join('') || 'UI';
  }

  protected get profileFullName(): string {
    return this.getProfileName();
  }

  protected get profileRole(): string {
    return this.empleado?.rol
      ?? this.homeData?.usuario?.rol
      ?? this.sessionStorageService.getUser()?.role
      ?? 'Empleado';
  }

  protected get profileNif(): string {
    return this.empleado?.nif ?? '';
  }

  protected get profilePhone(): string {
    return this.empleado?.telefono ?? '';
  }

  protected get profileStatusLabel(): string {
    if (this.empleado?.activo === undefined || this.empleado?.activo === null) {
      return '';
    }

    return this.empleado.activo ? 'Activo' : 'Inactivo';
  }

  protected get fichajeDayHoursLabel(): string {
    return this.formatHours(this.getTodayWorkedHours());
  }

  protected get fichajeMonthTotalHoursLabel(): string {
    return this.formatHours(this.getMonthTotalHours());
  }

  protected get fichajeDayDeltaLabel(): string {
    const delta = this.getDayDeltaPercent();
    if (!Number.isFinite(delta)) {
      return 'Sin media';
    }

    const prefix = delta > 0 ? '+' : '';
    const formatted = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(delta);
    return `${prefix}${formatted}% vs media`;
  }

  protected get fichajeDayDeltaPercent(): number {
    return this.getDayDeltaPercent();
  }

  protected get shiftStartLabel(): string {
    const shiftStart = this.getLatestShiftStart();
    if (!shiftStart) {
      return '--:--';
    }

    return this.formatTime(shiftStart);
  }

  protected get shiftObjectiveLabel(): string {
    const shiftStart = this.getLatestShiftStart();
    if (!shiftStart) {
      return '--:--';
    }

    const start = new Date(shiftStart);
    if (Number.isNaN(start.getTime())) {
      return '--:--';
    }

    start.setHours(start.getHours() + 8);
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(start);
  }

  protected get shiftDurationLabel(): string {
    const shiftStart = this.getLatestShiftStart();
    if (!shiftStart) {
      return '0h 00m';
    }

    const start = new Date(shiftStart);
    if (Number.isNaN(start.getTime())) {
      return '0h 00m';
    }

    const shiftEnd = this.getLatestShiftEnd();
    const end = shiftEnd ? new Date(shiftEnd) : new Date();
    if (Number.isNaN(end.getTime())) {
      return '0h 00m';
    }

    const diffMs = end.getTime() - start.getTime();
    const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  protected get ultimoEventoLabel(): string {
    return formatEventLabel(this.homeData?.fichaje?.ultimo_evento_tipo ?? null);
  }

  protected logout(): void {
    this.sessionStorageService.clearSession();
    this.empleadoService.clearCachedEmpleado();
    void this.router.navigateByUrl('/auth');
  }

  protected reload(): void {
    this.pendingReloadAt = Date.now();
    this.errorMessage.set('');
    this.ngOnInit();
  }

  protected selectDay(day: number | null): void {
    if (!day) {
      return;
    }

    this.selectedDay = day;
  }

  protected get selectedDayData(): CalendarDay | null {
    if (!this.selectedDay) {
      return null;
    }

    return this.calendarDays.find((cell) => cell.day === this.selectedDay) ?? null;
  }

  protected get selectedDayLabel(): string {
    if (!this.selectedDay) {
      return '';
    }

    return `${this.selectedDay} de ${this.monthLabel}`;
  }

  private getMonthRange(): { start: string; end: string } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    return {
      start: this.toIsoDate(first),
      end: this.toIsoDate(last),
    };
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildCalendar(events: FichajeEventoItem[]): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const dayCountMap = new Map<number, number>();
    const dayEventsMap = new Map<number, FichajeEventoItem[]>();
    for (const event of events) {
      const eventDate = new Date(event.fecha_hora);
      if (eventDate.getFullYear() !== year || eventDate.getMonth() !== month) {
        continue;
      }

      const day = eventDate.getDate();
      dayCountMap.set(day, (dayCountMap.get(day) ?? 0) + 1);
      const list = dayEventsMap.get(day) ?? [];
      list.push(event);
      dayEventsMap.set(day, list);
    }

    for (const list of dayEventsMap.values()) {
      list.sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
    }

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: CalendarDay[] = [];
    for (let index = 0; index < mondayOffset; index++) {
      cells.push({
        day: null,
        fichajes: 0,
        isToday: false,
        hoursLabel: '',
        summaryLabel: '',
        progressPercent: 0,
        entryLabel: '',
        exitLabel: '',
        statusLabel: '',
      });
    }

    const monthSeries: number[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = dayEventsMap.get(day) ?? [];
      const metrics = this.getDayMetrics(dayEvents, now);
      const daySummary = this.buildDaySummary(dayEvents, now, day, metrics);
      cells.push({
        day,
        fichajes: dayCountMap.get(day) ?? 0,
        isToday:
          day === now.getDate() &&
          month === now.getMonth() &&
          year === now.getFullYear(),
        hoursLabel: daySummary.hoursLabel,
        summaryLabel: daySummary.summaryLabel,
        progressPercent: daySummary.progressPercent,
        entryLabel: daySummary.entryLabel,
        exitLabel: daySummary.exitLabel,
        statusLabel: daySummary.statusLabel,
      });
      monthSeries.push(metrics.workedHours);
    }

    while (cells.length % 7 !== 0) {
      cells.push({
        day: null,
        fichajes: 0,
        isToday: false,
        hoursLabel: '',
        summaryLabel: '',
        progressPercent: 0,
        entryLabel: '',
        exitLabel: '',
        statusLabel: '',
      });
    }

    this.calendarDays = cells;
    this.selectedDay = this.selectedDay ?? now.getDate();
    this.fichajeMonthSeries = monthSeries;
    this.monthLabel = new Intl.DateTimeFormat('es-ES', {
      month: 'long',
      year: 'numeric',
    }).format(now);

    this.todayLabel = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);
  }

  private buildDaySummary(
    events: FichajeEventoItem[],
    now: Date,
    day: number,
    metrics: DayMetrics = this.getDayMetrics(events, now)
  ): {
    hoursLabel: string;
    summaryLabel: string;
    progressPercent: number;
    entryLabel: string;
    exitLabel: string;
    statusLabel: string;
  } {
    if (!events.length) {
      return {
        hoursLabel: '',
        summaryLabel: 'Sin registro',
        progressPercent: 0,
        entryLabel: '--:--',
        exitLabel: '--:--',
        statusLabel: 'Sin registro',
      };
    }

    const { entry, exit, workedHours } = metrics;

    if (!entry) {
      return {
        hoursLabel: '',
        summaryLabel: 'Sin registro',
        progressPercent: 0,
        entryLabel: '--:--',
        exitLabel: '--:--',
        statusLabel: 'Sin registro',
      };
    }

    const hoursLabel = workedHours ? `${workedHours.toFixed(1)} h` : '';
    const entryLabel = this.formatTime(entry.fecha_hora);
    const exitLabel = exit ? this.formatTime(exit.fecha_hora) : '--:--';
    const progressPercent = Math.min(100, Math.round((workedHours / 8) * 100));

    if (!exit) {
      return {
        hoursLabel,
        summaryLabel: entryLabel ? `Entrada ${entryLabel} · En curso` : 'En curso',
        progressPercent,
        entryLabel,
        exitLabel: '--:--',
        statusLabel: day === now.getDate() ? 'En curso' : 'Sin salida',
      };
    }

    const summaryLabel = entryLabel && exitLabel
      ? `Entrada ${entryLabel} · Salida ${exitLabel}`
      : workedHours >= 7
        ? 'Jornada completa'
        : 'Parcial';

    return {
      hoursLabel,
      summaryLabel,
      progressPercent,
      entryLabel,
      exitLabel,
      statusLabel: workedHours >= 7 ? 'Completa' : 'Parcial',
    };
  }

  private getDayMetrics(events: FichajeEventoItem[], now: Date): DayMetrics {
    if (!events.length) {
      return { entry: null, exit: null, workedHours: 0 };
    }

    const entry = events.find((event) => event.tipo_evento === 'entrada') ?? null;
    const exit = [...events].reverse().find((event) => event.tipo_evento === 'salida') ?? null;

    if (!entry) {
      return { entry: null, exit, workedHours: 0 };
    }

    const entryDate = new Date(entry.fecha_hora);
    const endDate = exit ? new Date(exit.fecha_hora) : now;
    if (Number.isNaN(entryDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { entry, exit, workedHours: 0 };
    }

    const pauseMinutes = this.calculatePauseMinutes(events);
    const workedHours = Math.max(0, (endDate.getTime() - entryDate.getTime()) / 3600000 - (pauseMinutes / 60));
    return { entry, exit, workedHours };
  }

  private calculatePauseMinutes(events: FichajeEventoItem[]): number {
    let pauseStart: Date | null = null;
    let totalMinutes = 0;

    for (const event of events) {
      if (event.tipo_evento === 'pausa_inicio') {
        pauseStart = new Date(event.fecha_hora);
      }
      if (event.tipo_evento === 'pausa_fin' && pauseStart) {
        const diffMs = new Date(event.fecha_hora).getTime() - pauseStart.getTime();
        totalMinutes += Math.max(0, Math.floor(diffMs / 60000));
        pauseStart = null;
      }
    }

    return totalMinutes;
  }

  private formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--:--';
    }

    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private formatHours(value: number): string {
    if (!Number.isFinite(value) || value <= 0) {
      return '0,0 h';
    }

    const formatted = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
    return `${formatted} h`;
  }

  private buildActivityItems(): ActivityItem[] {
    const items: ActivityItem[] = [];
    const ultimoEventoTipo = this.homeData?.fichaje?.ultimo_evento_tipo ?? null;
    const ultimoEventoHora = this.homeData?.fichaje?.ultimo_evento_fecha_hora
      ? this.formatTime(this.homeData?.fichaje?.ultimo_evento_fecha_hora)
      : 'Hoy';

    if (ultimoEventoTipo) {
      items.push({
        title: `Ultimo fichaje: ${formatEventLabel(ultimoEventoTipo)}`,
        subtitle: 'Actualizado desde el registro de fichajes.',
        time: ultimoEventoHora,
        tag: 'F',
      });
    }

    const trabajosPendientes = this.homeData?.trabajos?.pendientes ?? 0;
    if (trabajosPendientes > 0) {
      items.push({
        title: `${trabajosPendientes} trabajos pendientes`,
        subtitle: 'En seguimiento desde el modulo de trabajos.',
        time: 'Hoy',
        tag: 'T',
      });
    }

    const trabajosFinalizados = this.homeData?.trabajos?.finalizados ?? 0;
    if (trabajosFinalizados > 0) {
      items.push({
        title: `${trabajosFinalizados} trabajos finalizados`,
        subtitle: 'Avance registrado en el modulo de trabajos.',
        time: 'Este mes',
        tag: 'T',
      });
    }

    const facturasVencidas = this.homeData?.pagos?.facturas_vencidas ?? 0;
    if (facturasVencidas > 0) {
      items.push({
        title: `${facturasVencidas} facturas vencidas`,
        subtitle: 'Pendientes en el modulo de pagos.',
        time: 'Hoy',
        tag: 'P',
      });
    }

    const clientesActivos = this.homeData?.clientes?.activos ?? 0;
    if (clientesActivos > 0) {
      items.push({
        title: `${clientesActivos} clientes activos`,
        subtitle: 'Censo actual del modulo de clientes.',
        time: 'Actual',
        tag: 'C',
      });
    }

    if (!items.length) {
      items.push({
        title: 'Sin actividad reciente',
        subtitle: 'Todavia no hay registros nuevos en la intranet.',
        time: 'Hoy',
        tag: '—',
      });
    }

    return items;
  }


  private readSnapshot(): HomeSnapshot | null {
    const raw = localStorage.getItem(this.snapshotKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as HomeSnapshot;
    } catch {
      return null;
    }
  }

  private saveSnapshot(snapshot: HomeSnapshot): void {
    localStorage.setItem(this.snapshotKey, JSON.stringify(snapshot));
  }

  private applySnapshot(snapshot: HomeSnapshot): void {
    this.homeData = snapshot.home;
    this.empleado = snapshot.empleado ?? null;
    this.latestFichajeEvents = snapshot.fichajeEventos ?? [];
    this.buildCalendar(snapshot.fichajeEventos);
    this.activityItems = this.buildActivityItems();
    this.fichajeSeries = snapshot.series?.fichaje?.points ?? [];
    this.clientesSeries = snapshot.series?.clientes?.points ?? [];
    this.trabajosSeries = snapshot.series?.trabajos?.points ?? [];
    this.pagosSeries = snapshot.series?.pagos?.points ?? [];
    this.updateSparklines();
  }

  private getProfileName(): string {
    const fromEmpleado = `${this.empleado?.nombre ?? ''} ${this.empleado?.apellidos ?? ''}`.trim();
    if (fromEmpleado) {
      return fromEmpleado;
    }

    const fromHome = this.homeData?.usuario?.nombre_completo?.trim();
    if (fromHome) {
      return fromHome;
    }

    return this.sessionStorageService.getUser()?.nombre_usuario ?? 'Usuario';
  }

  private updateSparklines(): void {
    this.fichajeSparkline = this.buildSparkline(this.fichajeMonthSeries);
    this.clientesSparkline = this.buildSparkline(this.clientesSeries.map((item) => item.value));
    this.trabajosSparkline = this.buildSparkline(this.trabajosSeries.map((item) => item.value));
    this.pagosSparkline = this.buildSparkline(this.pagosSeries.map((item) => item.value));
  }

  private getTodayWorkedHours(): number {
    if (!this.fichajeMonthSeries.length) {
      return 0;
    }

    const today = new Date();
    const index = today.getDate() - 1;
    return this.fichajeMonthSeries[index] ?? 0;
  }

  private getMonthTotalHours(): number {
    if (!this.fichajeMonthSeries.length) {
      return 0;
    }

    return this.fichajeMonthSeries.reduce((total, value) => total + value, 0);
  }

  private getMonthAverageHours(): number {
    if (!this.fichajeMonthSeries.length) {
      return 0;
    }

    const today = new Date();
    const daysElapsed = Math.min(today.getDate(), this.fichajeMonthSeries.length);
    if (daysElapsed <= 0) {
      return 0;
    }

    const totalToDate = this.fichajeMonthSeries
      .slice(0, daysElapsed)
      .reduce((total, value) => total + value, 0);
    return totalToDate / daysElapsed;
  }

  private getDayDeltaPercent(): number {
    const average = this.getMonthAverageHours();
    if (average <= 0) {
      return Number.NaN;
    }

    const todayHours = this.getTodayWorkedHours();
    return ((todayHours - average) / average) * 100;
  }

  private buildSparkline(values: number[]): string {
    if (!values.length) {
      return '0,30 100,30';
    }

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const count = values.length;
    const points = values.map((value, index) => {
      const x = count === 1 ? 50 : (index / (count - 1)) * 100;
      const y = 30 - ((value - min) / range) * 26;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    return points.join(' ');
  }

  private finishReloadWithDelay(): void {
    if (this.pendingReloadAt === null) {
      return;
    }

    const elapsed = Date.now() - this.pendingReloadAt;
    const remaining = Math.max(0, this.minActionDelayMs - elapsed);
    this.pendingReloadAt = null;

    if (remaining === 0) {
      this.loading.set(false);
      return;
    }

    setTimeout(() => this.loading.set(false), remaining);
  }

  private getLatestShiftStart(): string | null {
    if (!this.latestFichajeEvents.length) {
      return null;
    }

    const sorted = [...this.latestFichajeEvents]
      .filter((event) => event.tipo_evento === 'entrada' || event.tipo_evento === 'salida')
      .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());

    const lastEntrada = sorted.find((event) => event.tipo_evento === 'entrada');
    return lastEntrada?.fecha_hora ?? null;
  }

  private getLatestShiftEnd(): string | null {
    if (!this.latestFichajeEvents.length) {
      return null;
    }

    const sorted = [...this.latestFichajeEvents]
      .filter((event) => event.tipo_evento === 'entrada' || event.tipo_evento === 'salida')
      .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());

    const lastSalida = sorted.find((event) => event.tipo_evento === 'salida');
    const lastEntrada = sorted.find((event) => event.tipo_evento === 'entrada');
    if (!lastSalida || !lastEntrada) {
      return null;
    }

    const entradaTime = new Date(lastEntrada.fecha_hora).getTime();
    const salidaTime = new Date(lastSalida.fecha_hora).getTime();
    return salidaTime > entradaTime ? lastSalida.fecha_hora : null;
  }
}
