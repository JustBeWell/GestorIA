import { Component, OnInit, inject } from '@angular/core';
import { EmpleadoService } from '../../../core/services/empleado.service';
import { EmpleadoModel } from '../../../core/models/empleado.model';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { retry } from 'rxjs';
@Component({
  selector: 'app-home-page',
  imports: [CommonModule, RouterLink, NgIf],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent implements OnInit {

  private readonly empleadoService = inject(EmpleadoService);
  empleado: EmpleadoModel | null = null;

  ngOnInit(): void {
    const empleadoCacheado = this.empleadoService.getCachedEmpleado();
    if (empleadoCacheado) {
      this.empleado = empleadoCacheado;
      return;
    }

    this.empleadoService.me().pipe(retry({ count: 1, delay: 150 })).subscribe({
      next: (response: EmpleadoModel) => {
        this.empleado = response;
        console.log('Datos del empleado cargados:', this.empleado);
      },
      error: (err: unknown) => {
        console.error('Error al cargar datos del empleado:', err);
      }
    });
  }
}
