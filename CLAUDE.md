# Gestão Fisio — Frontend (Angular)

SPA/PWA de agenda e receita para fisioterapeutas e instrutores de pilates autônomos que atendem em várias clínicas. Consome a API Django do repo `gestao-fisio-backend`. Deploy na Vercel.

Regra de ouro: regra de negócio e dinheiro são calculados no backend; o frontend exibe. É o argumento central do projeto no portfólio — lógica duplicada no front o enfraquece.

Projeto de portfólio e de aprendizado: prefira a solução idiomática do Angular moderno e, ao concluir uma tarefa, explique em 2–4 linhas o porquê das decisões não óbvias, com link da documentação oficial.

## Comandos

```bash
npm install
npm start                   # ng serve → http://localhost:4200 (API local em http://localhost:8000/api)
npm test -- --watch=false   # Vitest
npm run build               # build de produção (troca environment.ts por environment.prod.ts)
```

Telas autenticadas precisam do backend rodando localmente.

## Convenções

- 100% standalone (sem NgModules). Rotas com lazy loading em `app.routes.ts`: privadas com `authGuard`; login e registro com `guestGuard`; formulários com risco de perder edição usam `canDeactivate: [alteracoesPendentesGuard]` (o componente implementa `ComAlteracoesPendentes`, ver `pages/perfil/`).
- Estado com Signals (`signal`, `computed`; `effect` só para efeito colateral). Não introduza NgRx nem outra lib de estado.
- Templates com control flow nativo (`@if`, `@for` com `track`), não `*ngIf`/`*ngFor`.
- Nomes: componentes no estilo do CLI atual (`login.ts`, classes `Login`, `Agenda`, sem sufixo `Component`; `PerfilPage`, `TermosPage` e `PrivacidadePage` são exceções legadas — não replique). Services com sufixo e decorator `@Service()` do Angular 22, não `@Injectable` (`paciente.service.ts` → `PacienteService`). O `ng generate service` atual cria `paciente.ts`/`Paciente` — renomeie para o padrão.
- HTTP só dentro de `services/`, um service por recurso da API. Exceção: o `auth-interceptor`.
- Antes de criar componente, diretiva, pipe ou util, procure em `shared/`: já existem badge, card, combobox (`<app-combobox [opcoes] [(valor)] idCampo>`: busca com lista no padrão WAI-ARIA, sem acento/maiúscula; Esc fecha só a lista), modal (`<app-modal [titulo] [subtitulo] (fechar)>`: formulário em modal sobre o `<dialog>` nativo — ver seção Formulários em modal), confirm-modal (título, mensagem, botões e `variant` configuráveis por input — use `variant="danger"`, padrão dos modais do projeto), empty-state, progress-bar, grafico (`<app-grafico [config] [descricao]>`: wrapper do Chart.js; a configuração é montada fora, em funções puras testáveis — ver `pages/financeiro/graficos-financeiro.ts`), requisitos-senha (`<app-requisitos-senha [senha]="...">`: checklist da senha, espelha os validadores do backend), diretivas de máscara de CPF, telefone e moeda (`appMoedaMask`: digitação estilo caixa registradora — `4000` vira `40,00` —, exibe com vírgula e emite com ponto para a API), `telefone.pipe.ts`, `clinic-colors.ts` (`corDaClinica(cor)`: token da paleta a partir da cor guardada pelo backend), `iniciais.ts` (iniciais para avatares), `form-errors.ts` (mensagens de validação da API) e `datas.ts` (`formatarDataISO`/`parseDataISO`, datas da API no fuso local).
- Todo campo de texto tem `maxlength` igual ao limite do backend (`max_length` do model/serializer); senhas 128, e-mails 254, buscas 100. Textos longos (ex: histórico médico, 10.000) mostram contador perto do limite. Campos com máscara (CPF, telefone, moeda) já são limitados pela diretiva.
- Domínio e todo texto de interface em português (pt-BR); convenções do Angular/TypeScript em inglês.

## Estilos

- Estilo fica em CSS por componente + folhas compartilhadas em `src/styles/` (`form-page.css`, `list-page.css`, `forms.css`). Reaproveite as classes existentes (`form-*`, `input-field` etc.) antes de criar novas; utilitários do Tailwind quase não são usados nos templates.
- Cores só via variáveis (`var(--color-primary)`, `var(--color-danger)`…), nunca hex solto. Os tokens estão em `src/styles/tokens.css` **e** repetidos no `@theme` de `src/styles.css` — ao mudar uma cor, mude nos dois.
- Tailwind CSS v4 é configurado no CSS (`@theme`): não crie `tailwind.config.js` nem use a sintaxe v3 (`@tailwind base` etc.).
- Cores de gráfico (canvas não lê `var()`): `shared/utils/cores-grafico.ts` e `CORES_CLINICA_HEX`, espelhando `tokens.css`.
- Mobile-first (é PWA usada no celular): estilo base para tela pequena e `@media (min-width: 1024px)` para desktop, como no restante do projeto.

## Contrato com a API

- Payloads em snake_case, como no DRF (`eh_experimental`, `valor_calculado`, `hora_inicio`); as interfaces TypeScript espelham os serializers.
- Status de agendamento: `'AG' | 'RE' | 'CA'` (agendado, realizado, cancelado). `eh_experimental: true` = aula experimental, sempre gratuita.
- Cadastro em 2 etapas: `POST /api/auth/registrar/enviar-codigo/` (valida os dados e envia um código de 6 dígitos ao e-mail; 429 com `aguardar_segundos` se pedir de novo antes de 60s) e `POST /api/auth/registrar/` (mesmos dados + `codigo`). A senha não é guardada no servidor entre as etapas: a tela reenvia o formulário com o código. E-mail é obrigatório e único (sem diferenciar maiúsculas).
- Auth: `POST /api/auth/token/` (login) e `GET /api/auth/me/` (sessão, via `PerfilService`); o refresh é responsabilidade do interceptor. Telas de visitante checam a sessão com `PerfilService.verificarSessao()`, que usa `SKIP_AUTH_RETRY` (`interceptors/auth-context.ts`) para um 401 não disparar refresh nem redirecionar para `/login` — sem isso, o guard do `/login` entraria em loop.
- Foto de perfil: `POST /api/auth/me/foto/` (multipart, campo `foto`; JPEG/PNG/WEBP até 5 MB) e `DELETE` no mesmo endpoint. Na tela de perfil a foto só é enviada/removida ao clicar em "Salvar".
- Clínicas e pacientes: listagem paginada (`?page=`, `?search=`, total em `count`) e `/opcoes/` (`[{id, nome}]`; nas clínicas também `cor`) para dropdowns. A listagem de clínicas traz `atendimentos_mes` e `receita_mes` (mês atual, mesma regra do resumo financeiro) e vem com as inativas no fim.
- Agendamentos: `?data_inicio=&data_fim=`; status individual via `PATCH /api/agendamentos/{id}/`; `POST /api/agendamentos/recorrente/`; `PATCH /api/agendamentos/confirmar-dia/?data=YYYY-MM-DD`.
- Receita: `GET /api/resumo-financeiro/?periodo=mes|semana&data=YYYY-MM-DD`; série diária (realizado, acumulado, previsto e período anterior) em `/resumo-financeiro/evolucao/`; histórico mensal/anual em `/resumo-financeiro/historico/?agrupar=mes|ano`. A semana vai de domingo a sábado, igual na agenda, no rótulo do financeiro e no backend — mantenha os três alinhados.
- Não existem `/vinculos/`, `/agendamentos/blocos/`, `/financeiro/*` nem `/pacientes/count/`.
- Erros de validação vêm como `{campo: ["mensagem"]}`; trate com `tratarErrosApi` de `form-errors.ts`.
- Falta um dado? Proponha o campo ou endpoint no backend; não compense com lógica no frontend.

## Dinheiro e datas (bugs clássicos)

- Nunca recalcule receita no cliente (`valor × pacientes`, regra de experimental etc.). Use `valor_calculado` e os totais de `/resumo-financeiro/`; no máximo some `valor_calculado` para mostrar o total de um bloco.
- Moeda sempre em BRL, formatada em pt-BR.
- IMPORTANTE: `new Date('YYYY-MM-DD')` é interpretado como UTC e, no Brasil (UTC-3), vira o dia anterior; `toISOString().slice(0, 10)` (ou `.split('T')[0]`) depois das 21h vira o dia seguinte. Para datas da API use `formatarDataISO` e `parseDataISO` de `shared/utils/datas.ts`. Ao somar meses com `setMonth`, fixe o dia (`setMonth(m + 1, 1)`): a partir do dia 29–31 ele pula um mês.

## Autenticação

- Tokens vivem em cookies HttpOnly: o JavaScript nunca lê, grava ou guarda token — nada de `localStorage`/`sessionStorage` para auth.
- Todo request passa pelo `auth-interceptor` (`withCredentials: true`, refresh no 401 e retry). Ao mexer nele, evite loop de refresh (401 vindo do próprio `/token/refresh/`) e vários refresh disparados por requisições simultâneas.
- Em produção a API fica em `https://api.gestao-fisio.com/api` (domínio próprio apontando para o Render). Por ser subdomínio de `gestao-fisio.com`, é *same-site* com o front e os cookies continuam first-party. Não aponte o build de produção para `*.onrender.com` nem outro domínio: viraria cross-site e os navegadores bloqueiam cookies de terceiros. A origem do front precisa estar em `CORS_ALLOWED_ORIGINS` no backend.
- Não cacheie respostas de `/api/**` no `ngsw-config.json`: são dados de saúde e financeiros, autenticados.

## Produção e PWA

- Domínio principal: `gestao-fisio.com` (Vercel, conectado a Production). `www.gestao-fisio.com` redireciona com 308 para ele; DNS na Cloudflare com proxy desligado (nuvem cinza) nos registros da Vercel.
- O service worker serve o app do cache para quem já visitou, então um site fora do ar pode parecer normal no seu navegador (assets `lazy`, como `/logo.png`, quebram primeiro). Depois de deploy ou mudança de domínio/DNS, valide numa aba anônima.

## Testes

- Vitest, não Jasmine: `vi.fn()`, `vi.spyOn()` — nunca `jasmine.createSpyObj`.
- HTTP com `provideHttpClient()` + `provideHttpClientTesting()` e `HttpTestingController`; componentes que injetam Router precisam de `provideRouter([])`.
- Guards e navegação: `RouterTestingHarness` com as rotas reais; navegação é assíncrona, espere com `vi.waitFor`. Referência: `pages/perfil/perfil.spec.ts`.
- jsdom não implementa `URL.createObjectURL`/`revokeObjectURL`: faça stub com `vi.fn()`.
- Lógica de data: fixe o relógio com `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(...)` (só `Date`, para não travar o Angular) e teste o pior caso — 22h30 de um dia 31. Referência: `pages/financeiro/financeiro.spec.ts`.
- Bugfix ou feature nova em service, guard, interceptor ou formulário vem com spec. Prioridade: interceptor (refresh + retry) e guards.

## Formulários em modal

- Criar/editar abre num `<app-modal>` sobre a listagem: Clínicas, Pacientes e Agenda (sessão; o "Editar" dos detalhes da sessão abre o modal sem sair da agenda). Desktop: janela centralizada; celular (< 640px): tela cheia com "Salvar" no cabeçalho (`[modal-acao-topo]`), porque o rodapé (`[modal-rodape]`) some atrás do teclado. Os botões ficam fora do `<form>` e o enviam com `form="id-do-form"`.
- O formulário é rota filha da listagem (`/clinicas/novo`, `/clinicas/:id/editar`), com `<router-outlet />` na página da lista: a URL própria mantém o botão voltar do Android (fecha o modal), o F5 e os links diretos. Não abra o modal só por signal.
- Fechar (✕, Esc, clique fora) só navega de volta; quem pergunta "Descartar alterações?" (confirm-modal `danger`) é o `alteracoesPendentesGuard` da rota filha, via `confirmarSaida()` do formulário, que delega para `ControleDeSaida` (`shared/utils/controle-de-saida.ts`: compara o estado atual com o carregado, não empilha perguntas e libera a saída depois de salvar/excluir). Assim o botão voltar do navegador também pergunta. O router usa `canceledNavigationResolution: 'computed'` para o histórico voltar ao lugar quando o guard cancela.
- A lista se atualiza pelo `alteradas$` do service (emitido em criar/editar/excluir), sem acoplar o formulário à página. Recarga silenciosa: a lista não some.
- Erros de validação ficam no próprio campo (`aria-invalid` + `aria-describedby`), não num alerta genérico; depois de mostrá-los, `focarPrimeiroCampoComErro()` (`form-errors.ts`) leva o foco ao primeiro campo inválido.
- Sessão: a agenda vai para o dia salvo pelo `salvos$` do `AgendamentoService` (mesma semana: recarga silenciosa; outra semana: troca a semana). Ao repetir, a prévia (`GET /agendamentos/verificar-recorrencia/`, com debounce) mostra as datas e as ocupadas antes de criar; a regra de conflito é a do backend (mesmo paciente, mesma data e mesmo início).
- Effects que dependem de datas: dependa de uma chave em texto (ex: `inicioSemanaISO`), não do `Date` — um `Date` novo com o mesmo valor re-dispara o effect.
- Seções do formulário em `<fieldset>` + `<legend class="mf-secao-titulo">` (ver PacienteForm).
- Estilos: `styles/modal-form.css` (campos com fundo mais escuro, `mf-grid-2`, prévia, linha de opção, botões). No celular, campos com 16px de fonte (abaixo disso o iOS dá zoom ao focar).
- Testes: debounce sobre `toObservable` não avança com `vi.useFakeTimers` (o effect do Angular também roda em timer); espere com o relógio real (ver `agendamento-form.spec.ts`). O jsdom não tem `showModal()`/`close()`; use `simularDialogNativo()` de `shared/components/modal/simular-dialog.spec-helper.ts` (arquivos `*.spec-helper.ts` ficam fora do build do app).

## Gráficos

- Forma pelo trabalho do dado: evolução no tempo = linha (receita acumulada); parte do todo = rosca com no máximo 6 fatias (o excedente vira "Outras"); totais por período = colunas. Nunca dois eixos Y no mesmo gráfico.
- Marcas finas: linhas de 2px, sem curva suavizada (inventa valores entre os dias); área com ~10% de opacidade; grade e eixos em linha fina e sólida (`--color-border`). Tracejado só para projeção (previsto).
- Ênfase: período atual em azul (`destaque`), período anterior em cinza (`contexto`) — não duas cores fortes competindo.
- Cor segue a entidade (cada clínica tem a mesma cor em todas as telas). A cor é guardada no backend (campo `cor`, 1 a 5, escolhida na criação entre as menos usadas pelo profissional) e vem da API: `cor` na clínica, `cor_clinica` no agendamento, `clinica__cor` no resumo financeiro. Nunca derive a cor do `id` da clínica (ids são globais e repetiriam cores entre clínicas do mesmo profissional). Em marcas que se tocam (fatias), mantenha a ordem da paleta: azul (1) e violeta (4) se confundem lado a lado para quem tem daltonismo.
- Paleta nova ou alterada: valide com o validador de paleta categórica (luminosidade, croma, contraste >= 3:1 e separação para daltonismo) contra a superfície escura `#131b2e`.
- Todo gráfico tem legenda em HTML (para 2+ séries), tooltip com todas as séries do ponto e uma versão em tabela ("Ver dados em tabela"); texto nunca usa a cor da série.
- Recarga mantém o gráfico anterior esmaecido (sem spinner nem salto de layout).
- Colunas: no máximo 24px, cantos de 4px só na ponta do dado. O mês/ano em andamento fica esmaecido e com nota abaixo do gráfico (a coluna ainda vai crescer, não é queda). Não compare o ano em andamento com o ano anterior inteiro (por isso a visão por ano não mostra variação).
- Aba Histórico do financeiro: busca só quando a aba é aberta, com cache por agrupamento (`mes`/`ano`); resposta que chega depois de trocar o agrupamento só vai para o cache.
- `effect` que dispara busca HTTP: envolva a chamada em `untracked()`; se o carregamento ler signals, cada resposta re-dispara o effect (loop infinito de requisições). Specs de carregamento terminam com `http.verify()`.

## Dívidas conhecidas (apague ao resolver)

1. Cobertura baixa: só `perfil`, `financeiro`, `clinicas` (listagem), `guestGuard`, `shared/utils/datas` e `shared/utils/clinic-colors` têm testes de comportamento; os demais specs são apenas "should create".

## Fluxo de trabalho

- Antes de mexer em auth/interceptor, guards, rotas ou contrato com a API: apresente um plano curto e espere OK.
- Dúvida de regra de negócio: pergunte, não invente.
- Dependência nova só com OK.
- Não Adicionar comentarios desnecessários no código.
- Commits no padrão Conventional Commits (`feat(agenda): ...`, `fix(financeiro): ...`), com descrição em português; não faça push sem pedido.
- Pronto = `npm test -- --watch=false` e `npm run build` passando + resumo do que mudou e por quê.
