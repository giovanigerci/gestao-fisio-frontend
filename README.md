# GestãoFisio - Frontend

O **GestãoFisio** é um sistema completo de agenda e gestão financeira voltado para fisioterapeutas e instrutores de Pilates autônomos. Este repositório contém o código-fonte do **Frontend**, desenvolvido como uma Single Page Application (SPA) e Progressive Web App (PWA).

O backend correspondente (API Rest) pode ser encontrado neste repositório: [gestao-fisio-backend](https://github.com/giovanigerci/gestao-fisio-backend).

---

## 🛠️ Stack Tecnológica

- **[Angular 22](https://angular.dev/)**: Framework principal do projeto, utilizando Standalone Components (sem módulos NgModule).
- **TypeScript**: Linguagem base para tipagem forte e maior segurança no desenvolvimento.
- **[Tailwind CSS v4.1](https://tailwindcss.com/)**: Framework utilitário para estilização responsiva. Complementado por CSS customizado com design tokens (variáveis CSS) em `src/styles/tokens.css`.
- **Signals**: Gerenciamento de estado reativo nativo do Angular (sem NgRx ou RxJS pesado para state management).
- **PWA (Progressive Web App)**: Configurado via `@angular/service-worker` para permitir instalação no dispositivo.

---

## 🏗️ Arquitetura e Organização

O projeto segue uma organização modular dentro de `src/app/`:

### `services/`
Lógica de comunicação com a API. Um serviço por domínio:

| Serviço                   | Responsabilidade                                |
|---------------------------|-------------------------------------------------|
| `auth.service.ts`         | Login, logout, registro, recuperação de senha   |
| `perfil.service.ts`       | Dados do profissional autenticado (Signal global) |
| `clinica.service.ts`      | CRUD de clínicas                                |
| `paciente.service.ts`     | CRUD de pacientes                               |
| `agendamento.service.ts`  | CRUD de agendamentos                            |
| `financeiro.service.ts`   | Resumo financeiro por período                   |

### `guards/`
- **`authGuard`**: Garante que rotas internas sejam acessadas apenas por usuários autenticados. Redireciona para `/login` caso contrário.
- **`guestGuard`**: Impede que usuários já autenticados acessem as telas de login ou registro. Redireciona para `/agenda`.

### `interceptors/`
- **`authInterceptor`**: Configura **todas** as requisições para enviar credenciais (`withCredentials: true`). Gerencia automaticamente o fluxo de *refresh token* ao receber erro 401 — reenfileira a requisição original após renovar o `access_token`. A autenticação é baseada em **cookies HttpOnly** (não em `localStorage`), o que impede o acesso dos tokens via JavaScript e mitiga ataques XSS.

### `components/` (shell)
Componentes globais, renderizados pelo `app.html`:
- **`nav-bar`**: Navegação principal. Mobile: barra inferior fixada. Desktop (≥ 1024px): sidebar lateral de 14rem.
- **`mobile-header`**: Header superior fixado (logo + avatar) — visível apenas em mobile.

### `shared/components/`
Componentes reutilizáveis:
- `badge`: Tags de status (Agendado, Realizado, Cancelado, Experimental, Hoje)
- `card`: Container de item de lista com acento de cor da clínica
- `confirm-modal`: Modal de confirmação de ação destrutiva
- `empty-state`: Ilustração de estado vazio
- `progress-bar`: Barra de progresso segmentada por clínica

### `pages/`
Todas as páginas são lazy-loaded via `loadComponent` em `app.routes.ts`.

| Rota                     | Componente               | Guard        |
|--------------------------|--------------------------|--------------|
| `/login`                 | `Login`                  | `guestGuard` |
| `/registrar`             | `Registrar`              | `guestGuard` |
| `/esqueci-senha`         | `EsqueciSenha`           | `guestGuard` |
| `/redefinir-senha`       | `RedefinirSenha`         | `guestGuard` |
| `/termos`                | `TermosPage`             | —            |
| `/privacidade`           | `PrivacidadePage`        | —            |
| `/agenda`                | `Agenda`                 | `authGuard`  |
| `/agenda/novo`           | `AgendamentoForm`        | `authGuard`  |
| `/agenda/:id/editar`     | `AgendamentoForm`        | `authGuard`  |
| `/pacientes`             | `Pacientes`              | `authGuard`  |
| `/pacientes/novo`        | `PacienteForm`           | `authGuard`  |
| `/pacientes/:id/editar`  | `PacienteForm`           | `authGuard`  |
| `/clinicas`              | `Clinicas`               | `authGuard`  |
| `/clinicas/novo`         | `ClinicaForm`            | `authGuard`  |
| `/clinicas/:id/editar`   | `ClinicaForm`            | `authGuard`  |
| `/financeiro`            | `Financeiro`             | `authGuard`  |
| `/perfil`                | `PerfilPage`             | `authGuard`  |
| `/**`                    | `NotFound`               | —            |

---

## ✨ Funcionalidades Implementadas

- **Autenticação completa**: Login, registro, logout, recuperação e redefinição de senha via e-mail.
- **Agenda**: Visualização semanal de agendamentos por dia. Criação, edição, marcação como realizado/cancelado e exclusão. Suporte a agendamentos recorrentes (por semanas) e confirmação em lote do dia.
- **Pacientes**: Listagem com busca, criação e edição.
- **Clínicas**: Listagem com busca, criação e edição (incluindo cor de identificação).
- **Financeiro**: Receita total e por clínica, navegável por semana ou mês.
- **Perfil**: Visualização e edição dos dados do profissional, upload/remoção de foto de perfil e troca de senha.

---

## 📱 PWA - Progressive Web App

Este projeto está configurado como PWA (`@angular/pwa`). O GestãoFisio pode ser instalado diretamente no dispositivo (desktop ou mobile) como aplicativo nativo, com ícones, splash screen e suporte offline básico.

---

## 🚀 Rodando o Projeto Localmente

### Pré-requisitos
- **Node.js v22+** (recomendado: `v22.23.2` ou superior)
- **Backend**: A API precisa estar rodando simultaneamente. Consulte as instruções em [gestao-fisio-backend](https://github.com/giovanigerci/gestao-fisio-backend).

### Passos para execução

1. **Clone este repositório:**
   ```bash
   git clone https://github.com/giovanigerci/gestao-fisio-frontend.git
   cd gestao-fisio-frontend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Verifique a URL da API:**
   O arquivo `src/environments/environment.ts` define a URL base da API:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:8000/api',
   };
   ```
   Certifique-se de que o backend está rodando nessa porta. Não é necessário alterar este arquivo para uso local padrão.

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   ng serve
   # ou
   npm start
   ```

5. **Acesse no navegador:**
   Abra [http://localhost:4200/](http://localhost:4200/).
