import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	{
    path: '',
    redirectTo: 'intro',
    pathMatch: 'full',
  },
  {
    path: 'intro',
    loadComponent: () => import('./features/auth/pages/branding-video-page.component').then((m) => m.BrandingVideoPageComponent),
  },
  {
		path: 'auth',
		loadComponent: () => import('./features/auth/pages/login-page.component').then((m) => m.LoginPageComponent),
	},
	{
		path: 'home',
		canActivate: [authGuard],
		loadComponent: () => import('./features/home/home-page/home-page.component').then((m) => m.HomePageComponent),
	},
	{
		path: 'fichaje',
		canActivate: [authGuard],
		loadComponent: () => import('./features/fichaje/pages/fichaje-page.component').then((m) => m.FichajePageComponent),
	},
	{
		path: 'clientes',
		canActivate: [authGuard],
		loadComponent: () => import('./features/clientes/pages/clientes-page.component').then((m) => m.ClientesPageComponent),
	},
	{
		path: 'trabajos',
		canActivate: [authGuard],
		loadComponent: () => import('./features/trabajos/pages/trabajos-page.component').then((m) => m.TrabajosPageComponent),
	},
	{
		path: 'pagos',
		canActivate: [authGuard],
		loadComponent: () => import('./features/pagos/pages/pagos-page.component').then((m) => m.PagosPageComponent),
	},
	{
		path: 'documentos',
		canActivate: [authGuard],
		loadComponent: () => import('./features/documentos/pages/documentos-page.component').then((m) => m.DocumentosPageComponent),
	},
	{
		path: 'ajustes',
		canActivate: [authGuard],
		loadComponent: () => import('./features/ajustes/pages/ajustes-page.component').then((m) => m.AjustesPageComponent),
	},
	{
		path: 'calendario-fiscal',
		canActivate: [authGuard],
		loadComponent: () => import('./features/calendario-fiscal/pages/calendario-fiscal-page.component').then((m) => m.CalendarioFiscalPageComponent),
	},
	{
		path: 'admin',
		canActivate: [authGuard],
		loadComponent: () => import('./features/admin/pages/admin-page.component').then((m) => m.AdminPageComponent),
	},
	{
		path: '**',
		redirectTo: '',
	}
];
