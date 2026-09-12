# GestãoFisio - Frontend

O **GestãoFisio** é um sistema completo de agenda e gestão financeira voltado para fisioterapeutas e instrutores de Pilates autônomos. Este repositório contém o código-fonte do **Frontend**, desenvolvido como uma Single Page Application (SPA) e Progressive Web App (PWA).

O backend correspondente (API Rest) pode ser encontrado neste repositório: [gestao-fisio-backend](https://github.com/giovanigerci/gestao-fisio-backend).

---

## 🛠️ Stack Tecnológica

O projeto foi construído utilizando as seguintes tecnologias e conceitos modernos do ecossistema front-end:

- **[Angular 22](https://angular.dev/)**: Framework principal do projeto, utilizando a abordagem standalone components.
- **TypeScript**: Linguagem base para tipagem forte e maior segurança no desenvolvimento.
- **[Tailwind CSS v4.1.12](https://tailwindcss.com/)**: Framework utilitário para estilização rápida, responsiva e padronizada.
- **Signals**: Gerenciamento de estado reativo nativo do Angular (sem a necessidade de bibliotecas externas complexas como NgRx ou RxJS pesado para o state management).
- **PWA (Progressive Web App)**: Configurado via `@angular/service-worker` para permitir a instalação da aplicação.

---

## 🏗️ Arquitetura e Organização

O projeto segue uma organização modular e focada em domínios para garantir escalabilidade e fácil manutenção. A estrutura dentro de `src/app/` está dividida em:

- **`services/`**: Concentram a lógica de comunicação com a API. Cada domínio possui seu serviço dedicado (`auth`, `paciente`, `clinica`, `agendamento`, `financeiro`, `perfil`), seguindo um padrão consistente de métodos (listar, buscarPorId, criar, atualizar, excluir).
- **`guards/`**: Protegem o acesso às rotas da aplicação.
  - `authGuard`: Garante que rotas internas (Agenda, Pacientes, etc.) sejam acessadas apenas por usuários autenticados.
  - `guestGuard`: Impede que usuários já logados acessem as telas de login ou registro.
- **`interceptors/`**: Gerenciam modificações em requisições e respostas HTTP.
  - `authInterceptor`: Configura todas as requisições para enviar credenciais (`withCredentials: true`) e gerencia a lógica de _refresh token_ automaticamente caso ocorra erro 401. A autenticação com a API é baseada em **cookies httpOnly** em vez de `localStorage`. Esta decisão técnica aumenta a segurança contra ataques XSS (Cross-Site Scripting), já que o token não fica acessível diretamente via código JavaScript no navegador.
- **`shared/`**: Componentes reutilizáveis e utilitários isolados para manter o padrão visual em toda a aplicação. Contém componentes reais como `badge`, `card`, `confirm-modal`, `empty-state` e `progress-bar`, além de estilos reutilizados (como o `form-page` em `src/styles/`).

---

## ✨ Funcionalidades Implementadas

O frontend conta com as seguintes páginas e fluxos completos:

- **Autenticação**: Telas de Login e Registro de novo profissional.
- **Agenda**: Visualização de agendamentos, com suporte a criação e edição (incluindo o fluxo de recorrência).
- **Pacientes**: Listagem, criação e edição de pacientes.
- **Clínicas**: Listagem, criação e edição de clínicas/locais de atendimento.
- **Financeiro**: Módulo para acompanhamento da gestão financeira dos atendimentos.
- **Perfil**: Visualização e edição dos dados do profissional, incluindo upload e remoção de foto de perfil.

---

## 📱 PWA - Progressive Web App

Este projeto já está configurado como um PWA (utilizando `@angular/pwa`). Isso significa que o GestãoFisio pode ser instalado diretamente no dispositivo do usuário (desktop ou mobile) como um aplicativo nativo.

---

## 🚀 Rodando o Projeto Localmente

Para rodar este projeto em sua máquina, siga os passos abaixo.

### Pré-requisitos
- **Node.js**: Recomenda-se utilizar a versão `v22.23.2` ou superior.
- **Backend**: A API precisa estar rodando simultaneamente para que o frontend consiga se autenticar e carregar dados. Consulte as instruções de setup local no [repositório do backend](https://github.com/giovanigerci/gestao-fisio-backend).

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

3. **Configure as variáveis de ambiente:**
   Verifique o arquivo `src/environments/environment.ts`. Certifique-se de que a API url esteja apontando corretamente para o backend local (ex: `http://localhost:8000/api`).

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   ng serve
   ```

5. **Acesse no navegador:**
   Abra [http://localhost:4200/](http://localhost:4200/) para ver a aplicação rodando.
