import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { guestGuard } from './guards/guest-guard';
import { alteracoesPendentesGuard } from './guards/alteracoes-pendentes-guard';
import { NotFound } from './pages/not-found/not-found';

export const routes: Routes = [
    { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login), canActivate: [guestGuard] },
    { path: 'registrar', loadComponent: () => import('./pages/registrar/registrar').then(m => m.Registrar), canActivate: [guestGuard] },
    { path: 'esqueci-senha', loadComponent: () => import('./pages/esqueci-senha/esqueci-senha').then(m => m.EsqueciSenha), canActivate: [guestGuard] },
    { path: 'redefinir-senha', loadComponent: () => import('./pages/redefinir-senha/redefinir-senha').then(m => m.RedefinirSenha), canActivate: [guestGuard] },
    { path: 'termos', loadComponent: () => import('./pages/termos/termos').then(m => m.TermosPage) },
    { path: 'privacidade', loadComponent: () => import('./pages/privacidade/privacidade').then(m => m.PrivacidadePage) },
    { path: '', redirectTo: 'agenda', pathMatch: 'full' },
    // Formulários de criar/editar são rotas filhas da listagem e abrem em modal sobre ela: a URL própria
    // mantém o botão voltar (fecha o modal), o F5 e os links diretos funcionando
    {
        path: 'agenda', loadComponent: () => import('./pages/agenda/agenda').then(m => m.Agenda), canActivate: [authGuard],
        children: [
            { path: 'novo', loadComponent: () => import('./pages/agenda/agendamento-form/agendamento-form').then(m => m.AgendamentoForm), canDeactivate: [alteracoesPendentesGuard] },
            { path: ':id/editar', loadComponent: () => import('./pages/agenda/agendamento-form/agendamento-form').then(m => m.AgendamentoForm), canDeactivate: [alteracoesPendentesGuard] },
        ],
    },
    {
        path: 'pacientes', loadComponent: () => import('./pages/pacientes/pacientes').then(m => m.Pacientes), canActivate: [authGuard],
        children: [
            { path: 'novo', loadComponent: () => import('./pages/pacientes/paciente-form/paciente-form').then(m => m.PacienteForm), canDeactivate: [alteracoesPendentesGuard] },
            { path: ':id/editar', loadComponent: () => import('./pages/pacientes/paciente-form/paciente-form').then(m => m.PacienteForm), canDeactivate: [alteracoesPendentesGuard] },
        ],
    },
    {
        path: 'clinicas', loadComponent: () => import('./pages/clinicas/clinicas').then(m => m.Clinicas), canActivate: [authGuard],
        children: [
            { path: 'novo', loadComponent: () => import('./pages/clinicas/clinica-form/clinica-form').then(m => m.ClinicaForm), canDeactivate: [alteracoesPendentesGuard] },
            { path: ':id/editar', loadComponent: () => import('./pages/clinicas/clinica-form/clinica-form').then(m => m.ClinicaForm), canDeactivate: [alteracoesPendentesGuard] },
        ],
    },
    { path: 'financeiro', loadComponent: () => import('./pages/financeiro/financeiro').then(m => m.Financeiro), canActivate: [authGuard] },
    { path: 'perfil', loadComponent: () => import('./pages/perfil/perfil').then(m => m.PerfilPage), canActivate: [authGuard], canDeactivate: [alteracoesPendentesGuard] },
    { path: '**', component: NotFound },
];

