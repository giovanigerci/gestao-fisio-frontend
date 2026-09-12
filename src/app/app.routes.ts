import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { guestGuard } from './guards/guest-guard';
import { NotFound } from './pages/not-found/not-found';

export const routes: Routes = [
    { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login), canActivate: [guestGuard] },
    { path: 'registrar', loadComponent: () => import('./pages/registrar/registrar').then(m => m.Registrar), canActivate: [guestGuard] },
    { path: 'esqueci-senha', loadComponent: () => import('./pages/esqueci-senha/esqueci-senha').then(m => m.EsqueciSenha), canActivate: [guestGuard] },
    { path: 'redefinir-senha', loadComponent: () => import('./pages/redefinir-senha/redefinir-senha').then(m => m.RedefinirSenha), canActivate: [guestGuard] },
    { path: '', redirectTo: 'agenda', pathMatch: 'full' },
    { path: 'agenda', loadComponent: () => import('./pages/agenda/agenda').then(m => m.Agenda), canActivate: [authGuard] },
    { path: 'agenda/novo', loadComponent: () => import('./pages/agenda/agendamento-form/agendamento-form').then(m => m.AgendamentoForm), canActivate: [authGuard] },
    { path: 'agenda/:id/editar', loadComponent: () => import('./pages/agenda/agendamento-form/agendamento-form').then(m => m.AgendamentoForm), canActivate: [authGuard] },
    { path: 'pacientes', loadComponent: () => import('./pages/pacientes/pacientes').then(m => m.Pacientes), canActivate: [authGuard] },
    { path: 'pacientes/novo', loadComponent: () => import('./pages/pacientes/paciente-form/paciente-form').then(m => m.PacienteForm), canActivate: [authGuard] },
    { path: 'pacientes/:id/editar', loadComponent: () => import('./pages/pacientes/paciente-form/paciente-form').then(m => m.PacienteForm), canActivate: [authGuard] },
    { path: 'clinicas', loadComponent: () => import('./pages/clinicas/clinicas').then(m => m.Clinicas), canActivate: [authGuard] },
    { path: 'clinicas/novo', loadComponent: () => import('./pages/clinicas/clinica-form/clinica-form').then(m => m.ClinicaForm), canActivate: [authGuard] },
    { path: 'clinicas/:id/editar', loadComponent: () => import('./pages/clinicas/clinica-form/clinica-form').then(m => m.ClinicaForm), canActivate: [authGuard] },
    { path: 'financeiro', loadComponent: () => import('./pages/financeiro/financeiro').then(m => m.Financeiro), canActivate: [authGuard] },
    { path: 'perfil', loadComponent: () => import('./pages/perfil/perfil').then(m => m.PerfilPage), canActivate: [authGuard] },
    { path: '**', component: NotFound },
];

