import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { EmpleadoModel } from '../models/empleado.model';
@Injectable({
  providedIn: 'root',
})
export class EmpleadoService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly empleadoKey = 'empleado_profile';
  private readonly empleadoSubject = new BehaviorSubject<EmpleadoModel | null>(null);

  readonly empleado$ = this.empleadoSubject.asObservable();

  constructor() {
    const persistedEmpleado = this.readPersistedEmpleado();
    if (persistedEmpleado) {
      this.empleadoSubject.next(persistedEmpleado);
    }
  }

  me(): Observable<EmpleadoModel> {
    return this.http.get<EmpleadoModel>(`${this.apiUrl}/users/me`).pipe(
      tap((empleado) => {
        this.empleadoSubject.next(empleado);
        localStorage.setItem(this.empleadoKey, JSON.stringify(empleado));
      }),
    );
  }

  getCachedEmpleado(): EmpleadoModel | null {
    return this.empleadoSubject.value;
  }

  clearCachedEmpleado(): void {
    this.empleadoSubject.next(null);
    localStorage.removeItem(this.empleadoKey);
  }

  private readPersistedEmpleado(): EmpleadoModel | null {
    const raw = localStorage.getItem(this.empleadoKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as EmpleadoModel;
    } catch {
      return null;
    }
  }

}
