import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Registrar } from './pages/registrar/registrar';
import { Pacientes } from './pages/pacientes/pacientes';
import { PacienteForm } from './pages/pacientes/paciente-form/paciente-form';
import { Clinicas } from './pages/clinicas/clinicas';
import { ClinicaForm } from './pages/clinicas/clinica-form/clinica-form';
import { Agenda } from './pages/agenda/agenda';
import { AgendamentoForm } from './pages/agenda/agendamento-form/agendamento-form';
import { Financeiro } from './pages/financeiro/financeiro';
import { PerfilPage } from './pages/perfil/perfil';
import { authGuard } from './guards/auth-guard';
import { guestGuard } from './guards/guest-guard';

export const routes: Routes = [
    { path: 'login', component: Login, canActivate: [guestGuard] },
    { path: 'registrar', component: Registrar, canActivate: [guestGuard] },
    { path: '', redirectTo: 'agenda', pathMatch: 'full' },
    { path: 'agenda', component: Agenda, canActivate: [authGuard] },
    { path: 'agenda/novo', component: AgendamentoForm, canActivate: [authGuard] },
    { path: 'agenda/:id/editar', component: AgendamentoForm, canActivate: [authGuard] },
    { path: 'pacientes', component: Pacientes, canActivate: [authGuard] },
    { path: 'pacientes/novo', component: PacienteForm, canActivate: [authGuard] },
    { path: 'pacientes/:id/editar', component: PacienteForm, canActivate: [authGuard] },
    { path: 'clinicas', component: Clinicas, canActivate: [authGuard] },
    { path: 'clinicas/novo', component: ClinicaForm, canActivate: [authGuard] },
    { path: 'clinicas/:id/editar', component: ClinicaForm, canActivate: [authGuard] },
    { path: 'financeiro', component: Financeiro, canActivate: [authGuard] },
    { path: 'perfil', component: PerfilPage, canActivate: [authGuard] },
    { path: '**', redirectTo: 'agenda' },
];
