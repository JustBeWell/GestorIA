import { Routes } from '@angular/router';

export const NOTIFICATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/notifications-center/notifications-center.component').then((m) => m.NotificationsCenterComponent),
  },
  {
    path: 'preferencias',
    loadComponent: () =>
      import('./pages/notifications-preferences/notifications-preferences.component').then(
        (m) => m.NotificationsPreferencesComponent,
      ),
  },
];
