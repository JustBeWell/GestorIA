import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  template: `
    <div class="nf-root">
      <div class="nf-card">
        <span class="nf-code">404</span>
        <h1 class="nf-title">Página no encontrada</h1>
        <p class="nf-desc">La dirección que intentas visitar no existe o ha sido movida.</p>
        <div class="nf-actions">
          @if (authState.isAuthenticated()) {
            <button type="button" class="nf-btn primary" (click)="goHome()">Ir al inicio</button>
            <button type="button" class="nf-btn secondary" (click)="goBack()">Volver atrás</button>
          } @else {
            <button type="button" class="nf-btn primary" (click)="goLogin()">Ir al login</button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nf-root {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--clr-bg-body, #0c1a16);
    }

    .nf-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem 2.5rem;
      background: var(--clr-bg-surface, #ffffff);
      border-radius: 1.25rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      text-align: center;
      max-width: 420px;
      width: 90%;
    }

    .nf-code {
      font-size: 5rem;
      font-weight: 800;
      line-height: 1;
      color: var(--clr-accent, #2d6a4f);
      letter-spacing: -2px;
    }

    .nf-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--clr-text-heading, #111827);
    }

    .nf-desc {
      margin: 0;
      color: var(--clr-text-secondary, #64748b);
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .nf-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 0.5rem;
    }

    .nf-btn {
      padding: 0.6rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;
    }
    .nf-btn:hover { opacity: 0.85; }

    .nf-btn.primary {
      background: var(--clr-accent, #2d6a4f);
      color: #fff;
    }

    .nf-btn.secondary {
      background: var(--clr-bg-surface-alt, #f7faf8);
      color: var(--clr-text-primary, #0f172a);
      border: 1px solid var(--clr-border, #dce8e0);
    }
  `],
})
export class NotFoundPageComponent {
  protected readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  protected goHome(): void {
    void this.router.navigateByUrl('/home');
  }

  protected goLogin(): void {
    void this.router.navigateByUrl('/auth');
  }

  protected goBack(): void {
    history.back();
  }
}
