import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import {
  CalendarioFiscalDia,
  CalendarioFiscalResponse,
  CalendarioFiscalVencimiento,
} from '../../../core/models/intranet.models';
import { IntranetService } from '../../../core/services/intranet.service';
import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

const today = new Date();

@Component({
  selector: 'app-calendario-fiscal-page',
  standalone: true,
  imports: [CommonModule, IntranetSidebarComponent],
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

  protected readonly periodo = computed(() => this.data()?.periodo ?? {
    year: this.selectedYear(),
    month: this.selectedMonth(),
    month_label: '',
    subtitle: 'Vencimientos AEAT',
  });

  protected readonly resumen = computed(() => this.data()?.resumen ?? {
    vencimientos_mes: 0,
    presentados: 0,
    pendientes_alta_prioridad: 0,
    clientes_afectados_alta_prioridad: 0,
    proximo_vencimiento: null,
  });

  protected readonly dias = computed(() => this.data()?.dias ?? []);
  protected readonly proximos = computed(() => this.data()?.proximos ?? []);

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
    const month = this.selectedMonth();
    if (month === 12) {
      this.selectedMonth.set(1);
      this.selectedYear.update((year) => year + 1);
    } else {
      this.selectedMonth.set(month + 1);
    }
    this.load();
  }

  protected exportIcs(): void {
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
    const due = this.parseDate(vencimiento.fecha);
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

  protected hiddenEventsCount(day: CalendarioFiscalDia): number {
    return Math.max(day.vencimientos.length - 2, 0);
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
}
