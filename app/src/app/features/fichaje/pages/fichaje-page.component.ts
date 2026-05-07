import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { EmpleadoService } from '../../../core/services/empleado.service';
import { FichajeEventoItem, FichajeTabResponse } from '../../../core/models/intranet.models';
import { IntranetService } from '../../../core/services/intranet.service';
import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { SessionStorageService } from '../../../core/services/session-storage.service';
import { formatEventLabel } from '../../../shared/utils/event-label';

const DAILY_TARGET_HOURS = 8;

type FichajeTipoEvento = 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin';

interface FichajeStatCard {
  title: string;
  value: string;
  unit: string;
  helperLeft: string;
  helperRight: string;
  progressPercent: number;
  icon: string;
  tone: 'blue' | 'green' | 'orange' | 'yellow';
}

interface FichajeHistorialRow {
  dateKey: string;
  dayLabel: string;
  entryTime: string;
  exitTime: string;
  hoursLabel: string;
  hoursValue: number | null;
  distributionPercent: number;
  statusLabel: string;
  statusTone: 'active' | 'complete' | 'absent';
}

interface MonthRange {
  start: string;
  end: string;
  startDate: Date;
  endDate: Date;
  label: string;
}

interface FichajeSnapshot {
  fichajeData: FichajeTabResponse;
  historialRows: FichajeHistorialRow[];
  statsCards: FichajeStatCard[];
  monthLabel: string;
  pauseActive: boolean;
  lastUndoLabel: string;
  savedAt: string;
}

@Component({
  selector: 'app-fichaje-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IntranetSidebarComponent],
  templateUrl: './fichaje-page.component.html',
  styleUrl: './fichaje-page.component.css',
})
export class FichajePageComponent implements OnInit, OnDestroy {
  private readonly snapshotKey = 'fichaje_snapshot';
  private readonly minActionDelayMs = 1000;
  private pendingReloadAt: number | null = null;
  private readonly router = inject(Router);
  private readonly empleadoService = inject(EmpleadoService);
  private readonly destroy$ = new Subject<void>();
  private readonly intranetService = inject(IntranetService);
  private readonly sessionStorageService = inject(SessionStorageService);
  private readonly authApiService = inject(AuthApiService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly exporting = signal(false);
  protected readonly exportingPDF = signal(false);
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
  protected readonly errorMessage = signal('');
  protected readonly actionErrorMessage = signal('');

  protected fichajeData: FichajeTabResponse | null = null;
  protected observaciones = '';
  protected monthLabel = '';
  protected statsCards: FichajeStatCard[] = [];
  protected historialRows: FichajeHistorialRow[] = [];
  protected filterQuery = '';
  protected pauseActive = false;
  protected lastUndoLabel = '';

  ngOnInit(): void {
    const cachedSnapshot = this.readSnapshot();
    if (cachedSnapshot) {
      this.applySnapshot(cachedSnapshot);
      this.loading.set(false);
    }

    this.loadFichaje();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get nextTipoEvento(): 'entrada' | 'salida' {
    return this.fichajeData?.resumen?.turno_activo ? 'salida' : 'entrada';
  }

  protected get nextActionLabel(): string {
    return this.nextTipoEvento === 'entrada' ? 'Registrar entrada' : 'Registrar salida';
  }

  protected get filteredHistorialRows(): FichajeHistorialRow[] {
    const query = this.filterQuery.trim().toLowerCase();
    if (!query) {
      return this.historialRows;
    }

    return this.historialRows.filter((row) =>
      row.dayLabel.toLowerCase().includes(query)
      || row.statusLabel.toLowerCase().includes(query)
      || row.entryTime.toLowerCase().includes(query)
      || row.exitTime.toLowerCase().includes(query)
    );
  }

  protected formatDate(value: string | null | undefined): string {
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

  protected formatTime(value: string | null | undefined): string {
    if (!value) {
      return '--:--';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--:--';
    }

    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  protected exportHistorial(): void {
    if (this.exporting()) {
      return;
    }

    const monthRange = this.getMonthRange();
    this.exporting.set(true);
    const actionStartedAt = Date.now();

    this.intranetService
      .exportFichaje({
        fecha_desde: monthRange.start,
        fecha_hasta: monthRange.end,
      })
      .pipe(finalize(() => this.finishExportWithDelay(actionStartedAt)))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `fichaje_${monthRange.label.replace(/\s+/g, '_')}.csv`;
          link.click();
          URL.revokeObjectURL(url);
        },
        error: (err: HttpErrorResponse) => {
          this.handleError(err, 'No se pudo exportar el registro.');
        },
      });
  }

  protected exportHistorialPDF(): void {
    if (this.exportingPDF()) {
      return;
    }

    const monthRange = this.getMonthRange();
    this.exportingPDF.set(true);
    const actionStartedAt = Date.now();

    this.intranetService
      .exportFichajePDF({
        fecha_desde: monthRange.start,
        fecha_hasta: monthRange.end,
      })
      .pipe(finalize(() => {
        const elapsed = Date.now() - actionStartedAt;
        const remaining = Math.max(0, this.minActionDelayMs - elapsed);
        setTimeout(() => this.exportingPDF.set(false), remaining);
      }))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `fichaje_${monthRange.label.replace(/\s+/g, '_')}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
        },
        error: (err: HttpErrorResponse) => {
          this.handleError(err, 'No se pudo exportar el registro PDF.');
        },
      });
  }

  protected registerFichaje(tipoEvento?: FichajeTipoEvento): void {
    this.actionErrorMessage.set('');
    const observaciones = this.sanitizeObservaciones();
    this.saving.set(true);
    const actionStartedAt = Date.now();

    this.intranetService
      .registerFichaje({
        tipo_evento: tipoEvento ?? this.nextTipoEvento,
        observaciones,
      })
      .pipe(finalize(() => this.finishActionWithDelay(actionStartedAt)))
      .subscribe({
        next: () => {
          this.observaciones = '';
          this.clearSnapshots();
          this.loadFichaje();
        },
        error: (err: HttpErrorResponse) => {
          this.handleActionError(err, 'No se pudo registrar el fichaje.');
        },
      });
  }

  protected togglePause(): void {
    const tipo = this.pauseActive ? 'pausa_fin' : 'pausa_inicio';
    this.registerFichaje(tipo);
  }

  protected undoLastFichaje(): void {
    this.actionErrorMessage.set('');
    this.saving.set(true);
    const actionStartedAt = Date.now();

    this.intranetService
      .deleteLastFichaje()
      .pipe(finalize(() => this.finishActionWithDelay(actionStartedAt)))
      .subscribe({
        next: () => {
          this.clearSnapshots();
          this.loadFichaje();
        },
        error: (err: HttpErrorResponse) => {
          this.handleActionError(err, 'No se pudo deshacer el ultimo fichaje.');
        },
      });
  }

  protected reload(): void {
    this.pendingReloadAt = Date.now();
    this.loadFichaje();
  }

  protected logout(): void {
    this.empleadoService.clearCachedEmpleado();
    this.authApiService.logout();
  }

  private loadFichaje(): void {
    const cachedSnapshot = this.readSnapshot();
    const shouldShowLoader = !this.fichajeData && !cachedSnapshot;
    if (shouldShowLoader) {
      this.loading.set(true);
    }
    this.errorMessage.set('');
    this.actionErrorMessage.set('');

    const monthRange = this.getMonthRange();

    this.intranetService
      .getFichajeTab({
        page: 1,
        page_size: 100,
        fecha_desde: monthRange.start,
        fecha_hasta: monthRange.end,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (this.pendingReloadAt !== null) {
            this.finishReloadWithDelay();
            return;
          }

          if (shouldShowLoader) {
            this.loading.set(false);
          }
        }),
      )
      .subscribe({
        next: (data) => {
          this.fichajeData = data;
          this.historialRows = this.buildHistorialRows(data.eventos_recientes, monthRange);
          this.statsCards = this.buildStatsCards(this.historialRows, data.eventos_recientes, monthRange);
          this.monthLabel = monthRange.label;
          this.pauseActive = this.getPauseStatus(data.eventos_recientes);
          this.lastUndoLabel = this.getUndoLabel(data.eventos_recientes);
          this.saveSnapshot({
            fichajeData: data,
            historialRows: this.historialRows,
            statsCards: this.statsCards,
            monthLabel: this.monthLabel,
            pauseActive: this.pauseActive,
            lastUndoLabel: this.lastUndoLabel,
            savedAt: new Date().toISOString(),
          });
        },
        error: (err: HttpErrorResponse) => {
          this.handleError(err, 'No se pudo cargar el fichaje.');
        },
      });
  }

  private readSnapshot(): FichajeSnapshot | null {
    const raw = localStorage.getItem(this.snapshotKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as FichajeSnapshot;
    } catch {
      return null;
    }
  }

  private saveSnapshot(snapshot: FichajeSnapshot): void {
    localStorage.setItem(this.snapshotKey, JSON.stringify(snapshot));
  }

  private applySnapshot(snapshot: FichajeSnapshot): void {
    this.fichajeData = snapshot.fichajeData;
    this.historialRows = snapshot.historialRows;
    this.statsCards = snapshot.statsCards;
    this.monthLabel = snapshot.monthLabel;
    this.pauseActive = snapshot.pauseActive;
    this.lastUndoLabel = snapshot.lastUndoLabel;
  }

  private finishActionWithDelay(startedAt: number): void {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, this.minActionDelayMs - elapsed);
    if (remaining === 0) {
      this.saving.set(false);
      return;
    }

    setTimeout(() => this.saving.set(false), remaining);
  }

  private finishExportWithDelay(startedAt: number): void {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, this.minActionDelayMs - elapsed);
    if (remaining === 0) {
      this.exporting.set(false);
      return;
    }

    setTimeout(() => this.exporting.set(false), remaining);
  }

  private clearSnapshots(): void {
    this.sessionStorageService.clearFichajeSnapshot();
    this.sessionStorageService.clearHomeSnapshot();
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

  private getMonthRange(): MonthRange {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const end = today < last ? today : last;

    return {
      start: this.toIsoDate(first),
      end: this.toIsoDate(end),
      startDate: first,
      endDate: end,
      label: new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(first),
    };
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildHistorialRows(events: FichajeEventoItem[], range: MonthRange): FichajeHistorialRow[] {
    const eventsByDay = new Map<string, FichajeEventoItem[]>();
    const pauseMinutesByDay = new Map<string, number>();
    for (const event of events) {
      const eventDate = new Date(event.fecha_hora);
      if (Number.isNaN(eventDate.getTime())) {
        continue;
      }

      const key = this.toLocalDateKey(eventDate);
      const list = eventsByDay.get(key) ?? [];
      list.push(event);
      eventsByDay.set(key, list);
    }

    for (const list of eventsByDay.values()) {
      list.sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
    }

    for (const [key, list] of eventsByDay.entries()) {
      pauseMinutesByDay.set(key, this.calculatePauseMinutes(list));
    }

    const rows: FichajeHistorialRow[] = [];
    const dayCursor = new Date(range.endDate);
    const startDate = new Date(range.startDate);

    while (dayCursor >= startDate) {
      const key = this.toLocalDateKey(dayCursor);
      const dayEvents = eventsByDay.get(key) ?? [];
      const pauseMinutes = pauseMinutesByDay.get(key) ?? 0;
      const entry = dayEvents.find((event) => event.tipo_evento === 'entrada');
      const exit = dayEvents.find((event) => event.tipo_evento === 'salida');

      let hoursValue: number | null = null;
      if (entry && exit) {
        const diffMs = new Date(exit.fecha_hora).getTime() - new Date(entry.fecha_hora).getTime();
        hoursValue = Math.max(0, diffMs / 3600000 - (pauseMinutes / 60));
      }

      let statusLabel = 'Ausencia';
      let statusTone: FichajeHistorialRow['statusTone'] = 'absent';
      let exitTime = '--:--';

      if (entry && exit) {
        statusLabel = 'Completa';
        statusTone = 'complete';
        exitTime = this.formatTime(exit.fecha_hora);
      } else if (entry) {
        statusLabel = 'En curso';
        statusTone = 'active';
        exitTime = 'en curso';
      }

      rows.push({
        dateKey: key,
        dayLabel: this.formatDayLabel(dayCursor),
        entryTime: entry ? this.formatTime(entry.fecha_hora) : '--:--',
        exitTime,
        hoursLabel: hoursValue ? `${hoursValue.toFixed(1)}h` : '--',
        hoursValue,
        distributionPercent: this.getDistributionPercent(hoursValue),
        statusLabel,
        statusTone,
      });

      dayCursor.setDate(dayCursor.getDate() - 1);
    }

    return rows;
  }

  private buildStatsCards(
    rows: FichajeHistorialRow[],
    events: FichajeEventoItem[],
    range: MonthRange
  ): FichajeStatCard[] {
    const businessDays = this.countBusinessDays(range.startDate, range.endDate);
    const totalHours = rows.reduce((acc, row) => acc + (row.hoursValue ?? 0), 0);
    const jornadasCompletas = rows.filter((row) => row.statusTone === 'complete').length;
    const promedio = jornadasCompletas ? totalHours / jornadasCompletas : 0;
    const horasMeta = businessDays * DAILY_TARGET_HOURS;
    const horasPercent = horasMeta ? Math.round((totalHours / horasMeta) * 100) : 0;
    const jornadasPercent = businessDays ? Math.round((jornadasCompletas / businessDays) * 100) : 0;
    const hoursValues = rows.map((row) => row.hoursValue).filter((value): value is number => value !== null);
    const maxHours = hoursValues.length ? Math.max(...hoursValues) : 0;
    const minHours = hoursValues.length ? Math.min(...hoursValues) : 0;
    const pauseStats = this.calculatePauseTotals(events);
    const pauseAverage = pauseStats.count ? Math.round(pauseStats.minutes / pauseStats.count) : 0;
    const pauseHours = pauseStats.minutes ? (pauseStats.minutes / 60) : 0;

    return [
      {
        title: 'Horas mes',
        value: totalHours.toFixed(1),
        unit: `/ ${horasMeta || 0} h`,
        helperLeft: 'Meta mensual',
        helperRight: `${horasPercent}%`,
        progressPercent: horasPercent,
        icon: 'clock',
        tone: 'blue',
      },
      {
        title: 'Jornadas completas',
        value: `${jornadasCompletas}`,
        unit: 'dias',
        helperLeft: `Sobre ${businessDays} laborables`,
        helperRight: `${jornadasPercent}%`,
        progressPercent: jornadasPercent,
        icon: 'calendar-check',
        tone: 'green',
      },
      {
        title: 'Promedio diario',
        value: promedio ? promedio.toFixed(1) : '0',
        unit: 'h/dia',
        helperLeft: `Pico: ${maxHours ? maxHours.toFixed(1) : '--'} h`,
        helperRight: `Minimo: ${minHours ? minHours.toFixed(1) : '--'} h`,
        progressPercent: 0,
        icon: 'trending-up',
        tone: 'yellow',
      },
      {
        title: 'Pausas',
        value: `${pauseStats.count}`,
        unit: 'este mes',
        helperLeft: `Promedio ${pauseAverage} min`,
        helperRight: `${pauseHours.toFixed(1)} h totales`,
        progressPercent: 0,
        icon: 'pause',
        tone: 'orange',
      },
    ];
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

  private calculatePauseTotals(events: FichajeEventoItem[]): { count: number; minutes: number } {
    const eventsByDay = new Map<string, FichajeEventoItem[]>();
    for (const event of events) {
      const eventDate = new Date(event.fecha_hora);
      if (Number.isNaN(eventDate.getTime())) {
        continue;
      }

      const key = this.toLocalDateKey(eventDate);
      const list = eventsByDay.get(key) ?? [];
      list.push(event);
      eventsByDay.set(key, list);
    }

    let totalMinutes = 0;
    let pauseCount = 0;

    for (const list of eventsByDay.values()) {
      list.sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
      let pauseStart: Date | null = null;

      for (const event of list) {
        if (event.tipo_evento === 'pausa_inicio') {
          pauseStart = new Date(event.fecha_hora);
        } else if (event.tipo_evento === 'pausa_fin' && pauseStart) {
          const diffMs = new Date(event.fecha_hora).getTime() - pauseStart.getTime();
          totalMinutes += Math.max(0, Math.floor(diffMs / 60000));
          pauseCount += 1;
          pauseStart = null;
        }
      }
    }

    return { count: pauseCount, minutes: totalMinutes };
  }

  private getPauseStatus(events: FichajeEventoItem[]): boolean {
    const todayKey = this.toLocalDateKey(new Date());
    const todayEvents = events
      .filter((event) => this.toLocalDateKey(new Date(event.fecha_hora)) === todayKey)
      .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

    const lastEvent = todayEvents.at(-1);
    return lastEvent?.tipo_evento === 'pausa_inicio';
  }

  private getUndoLabel(events: FichajeEventoItem[]): string {
    const lastEvent = events[0];
    if (!lastEvent) {
      return '';
    }

    const todayKey = this.toLocalDateKey(new Date());
    const eventKey = this.toLocalDateKey(new Date(lastEvent.fecha_hora));
    if (eventKey !== todayKey) {
      return '';
    }

    const dayLabel = this.formatDayLabel(new Date(lastEvent.fecha_hora));
    const timeLabel = this.formatTime(lastEvent.fecha_hora);
    const tipo = formatEventLabel(lastEvent.tipo_evento);
    return `${dayLabel} · ${timeLabel} · ${tipo}`;
  }

  private getDistributionPercent(hoursValue: number | null): number {
    if (!hoursValue) {
      return 0;
    }

    return Math.min(100, Math.round((hoursValue / DAILY_TARGET_HOURS) * 100));
  }

  private countBusinessDays(start: Date, end: Date): number {
    const current = new Date(start);
    let count = 0;

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        count += 1;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  private toLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDayLabel(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  private sanitizeObservaciones(): string | null {
    const trimmed = this.observaciones.trim();
    return trimmed.length ? trimmed : null;
  }

  private handleError(err: HttpErrorResponse, fallback: string): void {
    const detail = err?.error?.detail;
    this.errorMessage.set(typeof detail === 'string' ? detail : fallback);

    if (err.status === 401) {
      this.logout();
    }
  }

  private handleActionError(err: HttpErrorResponse, fallback: string): void {
    const detail = err?.error?.detail;
    this.actionErrorMessage.set(typeof detail === 'string' ? detail : fallback);

    if (err.status === 401) {
      this.logout();
    }
  }
}
