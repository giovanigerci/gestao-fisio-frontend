import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Pacientes } from './pages/pacientes/pacientes';
import { PacienteForm } from './pages/pacientes/paciente-form/paciente-form';
import { Agenda } from './pages/agenda/agenda';
import { AgendamentoForm } from './pages/agenda/agendamento-form/agendamento-form';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: '', redirectTo: 'agenda', pathMatch: 'full' },
    { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
    { path: 'agenda', component: Agenda, canActivate: [authGuard] },
    { path: 'agenda/novo', component: AgendamentoForm, canActivate: [authGuard] },
    { path: 'agenda/:id/editar', component: AgendamentoForm, canActivate: [authGuard] },
    { path: 'pacientes', component: Pacientes, canActivate: [authGuard] },
    { path: 'pacientes/novo', component: PacienteForm, canActivate: [authGuard] },
    { path: 'pacientes/:id/editar', component: PacienteForm, canActivate: [authGuard] },
    { path: '**', redirectTo: 'agenda' },
];
