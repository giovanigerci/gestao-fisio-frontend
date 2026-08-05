import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Pacientes } from './pages/pacientes/pacientes';
import { PacienteForm } from './pages/pacientes/paciente-form/paciente-form';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: '', redirectTo: 'pacientes', pathMatch: 'full' },
    { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
    { path: 'pacientes', component: Pacientes, canActivate: [authGuard] },
    { path: 'pacientes/novo', component: PacienteForm, canActivate: [authGuard] },
    { path: 'pacientes/:id/editar', component: PacienteForm, canActivate: [authGuard] },
    { path: '**', redirectTo: 'pacientes' },
];
