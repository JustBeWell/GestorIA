import { Routes } from '@angular/router';

export const routes: Routes = [
	{
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
  {
		path: 'auth',
		loadComponent: () => import('./features/auth/pages/login-page.component').then((m) => m.LoginPageComponent),
	},
	{
		path: 'home',
		loadComponent: () => import('./features/home/home-page/home-page.component').then((m) => m.HomePageComponent),
	},
	{
		path: '**',
		redirectTo: '',
	}
];
