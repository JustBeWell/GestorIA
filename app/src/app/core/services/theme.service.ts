import { Injectable, signal, effect } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly STORAGE_KEY = 'app-theme';

  readonly theme = signal<AppTheme>(this.loadSavedTheme());

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem(ThemeService.STORAGE_KEY, t); } catch { /* private/storage full */ }
    });
  }

  toggle(): void {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  setTheme(t: AppTheme): void {
    this.theme.set(t);
  }

  private loadSavedTheme(): AppTheme {
    try {
      const saved = localStorage.getItem(ThemeService.STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* ignore */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
