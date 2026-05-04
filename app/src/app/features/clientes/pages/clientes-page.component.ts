import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthStateService } from '../../../core/services/auth-state.service';
import {
  ClienteTabItem,
  ClientesTabResponse,
  ClienteDetailItem,
  ClienteCreate,
  ClienteUpdate,
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
}

interface FormErrors {
  nombre_fiscal?: string;
  cif_nif?: string;
  email?: string;
}

const CIF_NIF_RE = /^([0-9]{8}[A-Za-z]|[XYZxyz][0-9]{7}[A-Za-z]|[ABCDEFGHJNPQRSUVWabcdefghjnpqrsuvw][0-9]{7}[0-9A-Ja-j])$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-clientes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IntranetSidebarComponent],
  templateUrl: './clientes-page.component.html',
  styleUrl: './clientes-page.component.css',
})
export class ClientesPageComponent implements OnInit {
  private readonly intranetService = inject(IntranetService);
  private readonly authState = inject(AuthStateService);

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

  protected form: ClienteForm = this.emptyForm();
  protected formErrors: FormErrors = {};
  protected formServerError = '';

  // ── Computed ───────────────────────────────────────────────────────────────
  protected get isAdmin(): boolean {
    return this.authState.currentUser()?.role === 'administrador';
  }

  protected get filteredClientes(): ClienteTabItem[] {
    if (!this.tabData) return [];
    const q = this.searchQuery.trim().toLowerCase();
    return this.tabData.clientes.filter((c) => {
      if (!this.showInactive && !c.activo) return false;
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

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadClientes();
  }

  // ── Load ───────────────────────────────────────────────────────────────────
  protected loadClientes(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.intranetService
      .getClientesTab({ page: 1, page_size: 200 })
      .pipe(finalize(() => this.loading.set(false)))
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
    };
  }

  private extractError(err: HttpErrorResponse, fallback: string): string {
    const detail = err?.error?.detail;
    return typeof detail === 'string' ? detail : fallback;
  }
}
