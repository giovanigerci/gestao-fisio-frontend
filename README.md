# GestãoFisio — Frontend

O **GestãoFisio** é um sistema de agenda e receita para fisioterapeutas e instrutores de Pilates autônomos que atendem em várias clínicas. Este repositório contém o **frontend**: uma SPA/PWA em Angular 22, usada principalmente no celular.

- **Em produção:** [gestao-fisio.com](https://gestao-fisio.com)
- **Backend (API REST em Django/DRF):** [gestao-fisio-backend](https://github.com/giovanigerci/gestao-fisio-backend)

> **Regra de ouro do projeto:** regra de negócio e dinheiro são calculados no backend; o frontend exibe. Nenhum valor de receita é recalculado no cliente: as telas usam `valor_calculado` e os totais de `/resumo-financeiro/`.

---

## ✨ Destaques técnicos

- **Sessão com cookies HttpOnly e refresh único.** O JavaScript nunca lê nem guarda token. O backend rotaciona o refresh token a cada uso, então um `RenovacaoDeSessao` compartilha o refresh em andamento entre todas as requisições que recebem 401 ao mesmo tempo, com retry e backoff quando a API está acordando. Sem isso, dois refresh em paralelo deslogariam o usuário.
- **Formulários em modal que são rotas.** Criar/editar abre num `<dialog>` nativo sobre a listagem, mas cada formulário tem URL própria (`/clinicas/novo`, `/pacientes/:id/editar`). O botão voltar do Android fecha o modal, o F5 e os links diretos funcionam, e um `canDeactivate` pergunta "Descartar alterações?" só quando o estado mudou de verdade.
- **Acessibilidade.** Modais e painéis sobre `<dialog>` (foco preso, Esc, leitor de tela), combobox de busca no padrão WAI-ARIA, erros no próprio campo com `aria-invalid`/`aria-describedby`, foco levado ao primeiro campo inválido e tudo que abre algo é `<button>` ou link alcançável pelo teclado.
- **Gráficos com intenção.** Chart.js encapsulado num componente, com a configuração montada em funções puras testáveis. A paleta das clínicas foi validada para contraste e daltonismo, a cor de cada clínica é a mesma em todas as telas, e todo gráfico tem legenda em HTML e versão em tabela.
- **PWA que se atualiza sozinho com segurança.** A versão nova entra na próxima mudança de página, depois do guard de alterações pendentes, para nenhum formulário ser perdido. Se um deploy apagou o chunk que a versão aberta pede, a navegação é refeita do zero, com trava para não virar ciclo de recargas.
- **Segurança no deploy.** Content Security Policy estrita (sem script inline), `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy` no `vercel.json`. A fonte Inter é servida pelo próprio site, sem Google Fonts (que mandaria o IP de cada visitante ao Google).
- **LGPD na prática.** Exportação de todos os dados da conta (ZIP com CSVs), exclusão definitiva da conta com confirmação por senha, troca de e-mail confirmada por código, e Termos e Política de Privacidade versionados no próprio app.
- **Datas sem os bugs clássicos.** `new Date('YYYY-MM-DD')` vira o dia anterior no Brasil (UTC-3), e `toISOString()` depois das 21h vira o dia seguinte. As datas da API passam por `formatarDataISO`/`parseDataISO`, e os testes fixam o relógio no pior caso (22h30 de um dia 31).

---

## 🛠️ Stack

- **[Angular 22](https://angular.dev/)**: 100% standalone, rotas com lazy loading, control flow nativo (`@if`, `@for`) e services com `@Service()`.
- **Signals** para estado (`signal`, `computed`, `effect`), sem NgRx.
- **TypeScript 6**.
- **[Tailwind CSS v4](https://tailwindcss.com/)** configurado no CSS (`@theme`), com design tokens em `src/styles/tokens.css` e CSS por componente.
- **[Chart.js 4](https://www.chartjs.org/)** para os gráficos do financeiro.
- **PWA** com `@angular/service-worker`.
- **[Vitest](https://vitest.dev/)** + jsdom para os testes.
- **Vercel** para o deploy, com a API num subdomínio próprio (same-site, cookies first-party).

---

## 📋 Funcionalidades

- **Acesso:** login com "manter conectado", cadastro em duas etapas com código de verificação por e-mail, recuperação e redefinição de senha com checklist dos requisitos, e mensagem própria quando a API limita as tentativas.
- **Agenda:** visões de **semana** e **mês** (a escolha fica salva no aparelho). Sessões avulsas ou com repetição semanal, com prévia das datas e das já ocupadas antes de criar. Marcação de realizada/cancelada, confirmação do dia inteiro em lote e aula experimental (sempre gratuita).
- **Pacientes:** listagem com busca no servidor e scroll infinito, formulário em seções (dados pessoais, contato e saúde) com máscaras de CPF e telefone e idade calculada pela data de nascimento.
- **Clínicas:** cards com atendimentos e receita do mês, valor por atendimento com máscara de moeda e cor de identificação usada em todo o app.
- **Financeiro:** receita da semana ou do mês por clínica, evolução diária (realizado, previsto e período anterior), composição por clínica e histórico mensal/anual.
- **Perfil:** dados do profissional, foto, troca de senha e de e-mail, exportação dos dados e exclusão da conta.

---

## 🏗️ Arquitetura

```
src/app/
├── atualizacao/     # ciclo de vida do PWA (versão nova, chunk perdido, trava de recarga)
├── components/      # shell: nav-bar (barra inferior no celular, lateral no desktop) e mobile-header
├── guards/          # authGuard, guestGuard e alteracoesPendentesGuard
├── interceptors/    # authInterceptor (credenciais, refresh e retry) e RenovacaoDeSessao
├── pages/           # uma pasta por tela; formulários como rotas filhas da listagem
├── services/        # um service por recurso da API; HTTP só aqui
└── shared/
    ├── components/  # badge, card, combobox, confirm-modal, empty-state, folha, grafico,
    │                # modal, progress-bar, requisitos-senha
    ├── directives/  # máscaras de CPF, telefone e moeda
    ├── pipes/       # telefone
    └── utils/       # datas, cores das clínicas e dos gráficos, erros de formulário, download...
```

### Services

| Service                      | Responsabilidade                                                       |
|------------------------------|------------------------------------------------------------------------|
| `auth.service.ts`            | Login, logout, cadastro em duas etapas, recuperação e troca de senha   |
| `perfil.service.ts`          | Profissional autenticado (signal global), foto, troca de e-mail e verificação de sessão |
| `conta.service.ts`           | Resumo dos dados da conta, exportação e exclusão (LGPD)                |
| `exportacao-dados.service.ts`| Estado do download da exportação, compartilhado entre telas            |
| `clinica.service.ts`         | Clínicas: listagem paginada, opções para seleção e CRUD                |
| `paciente.service.ts`        | Pacientes: listagem paginada com busca, detalhe e CRUD                 |
| `agendamento.service.ts`     | Sessões: período, recorrência, prévia de conflitos e confirmação do dia|
| `financeiro.service.ts`      | Resumo, evolução diária e histórico da receita                         |

### Rotas

Todas as páginas são carregadas sob demanda (`loadComponent`).

| Rota                                      | Componente                  | Guard                          |
|-------------------------------------------|-----------------------------|--------------------------------|
| `/login`, `/registrar`                    | `Login`, `Registrar`        | `guestGuard`                   |
| `/esqueci-senha`, `/redefinir-senha`      | `EsqueciSenha`, `RedefinirSenha` | `guestGuard`              |
| `/termos`, `/privacidade`                 | `TermosPage`, `PrivacidadePage` | —                          |
| `/agenda`                                 | `Agenda`                    | `authGuard`                    |
| `/agenda/novo`, `/agenda/:id/editar`      | `AgendamentoForm` (modal)   | `alteracoesPendentesGuard`     |
| `/pacientes`                              | `Pacientes`                 | `authGuard`                    |
| `/pacientes/novo`, `/pacientes/:id/editar`| `PacienteForm` (modal)      | `alteracoesPendentesGuard`     |
| `/clinicas`                               | `Clinicas`                  | `authGuard`                    |
| `/clinicas/novo`, `/clinicas/:id/editar`  | `ClinicaForm` (modal)       | `alteracoesPendentesGuard`     |
| `/financeiro`                             | `Financeiro`                | `authGuard`                    |
| `/perfil`                                 | `PerfilPage`                | `authGuard` + `alteracoesPendentesGuard` |
| `/**`                                     | `NotFound`                  | —                              |

---

## 🧪 Testes

Testes com Vitest e `HttpTestingController`. Cobrem o interceptor e o refresh de sessão, os guards, as telas de perfil, financeiro, agenda (semana e mês) e clínicas, os formulários em modal, a lógica de datas, as cores das clínicas e o ciclo de atualização do PWA.

```bash
npm test -- --watch=false
```

---

## 🚀 Rodando localmente

### Pré-requisitos

- **Node.js 22** (desenvolvido com `v22.23.2`) e npm 10.
- **Backend** rodando em `http://localhost:8000`. Veja o [gestao-fisio-backend](https://github.com/giovanigerci/gestao-fisio-backend). As telas autenticadas dependem dele.

### Passos

```bash
git clone https://github.com/giovanigerci/gestao-fisio-frontend.git
cd gestao-fisio-frontend
npm install
npm start          # http://localhost:4200
```

A URL da API fica em `src/environments/environment.ts` (`http://localhost:8000/api`). O build de produção (`npm run build`) troca esse arquivo por `environment.prod.ts`.

---

## 📚 Documentação

- [`CLAUDE.md`](CLAUDE.md): convenções do projeto, contrato com a API e o porquê das decisões (autenticação, datas, gráficos, PWA, CSP).
- [`docs/legal/`](docs/legal/): Termos de Uso, Política de Privacidade (LGPD), DPA, modelo de TCLE, Política de Cookies e Plano de Resposta a Incidentes.
