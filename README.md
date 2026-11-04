# Studio Aurora

Sistema de agendamento para um estúdio de manicure (unhas) com um profissional,
três áreas (site público + painel da cliente + administração) e regras de agenda
reais: disponibilidade calculada, bloqueios, intervalos, regras de antecedência,
cancelamento e remarcação, lembrete por WhatsApp, histórico e relatórios.

> **Autor:** Daniel Ortega Pereira · [github.com/dnlortega](https://github.com/dnlortega) · dnlortega@gmail.com

---

## Stack

| Camada        | Tecnologia                                                             |
| ------------- | ---------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict      |
| UI            | shadcn/ui (base-nova, Base UI) + Tailwind CSS v4 + Lucide              |
| Banco         | PostgreSQL gerenciado (Neon) via Drizzle ORM — único banco do projeto   |
| Bancos de teste | `aurora_test` (Vitest) e `aurora_e2e` (Playwright), no mesmo projeto Neon |
| Autenticação  | Sessões opacas próprias (scrypt + cookie httpOnly), sem Supabase Auth   |
| Validação     | Zod + React Hook Form                                                  |
| E-mail        | Resend (opcional; sem chave o envio fica como `not_configured`)        |
| Testes        | Vitest (unitários + integração) e Playwright (ponta a ponta)           |

> **Nota de arquitetura:** a especificação original previa Supabase Auth +
> RLS. A implementação atual usa PostgreSQL puro (Neon), autenticação própria
> e autorização aplicada no servidor em todas as consultas e ações. O
> isolamento por proprietário é feito nas queries (equivalente funcional ao
> RLS), não por policies do Supabase. Veja “Segurança”.

---

## Funcionalidades

**Site público**

- `/` é a própria tela de agendamento — não existe página de marketing.
- `/agendar` continua no ar como atalho da mesma tela (canonical aponta para `/`).
- Catálogo de unhas (manicure, pedicure e gel) com preço, duração e descrição.
- Agendamento em 4 etapas: serviços → data → horário real → confirmação.
- Datas sempre exibidas como dd/mm/aaaa.
- Login/cadastro no meio do fluxo sem perder a seleção.
- Recuperação e redefinição de senha por link com token de uso único.

**Painel da cliente**

- Visão geral, próximos atendimentos e histórico.
- Cancelamento e remarcação respeitando as regras configuradas.
- Detalhe do agendamento com status, valores e histórico.
- Perfil, telefone e preferências de notificação.
- Acesso restrito aos próprios agendamentos.

**Administração**

- Dashboard com KPIs, fluxo de 14 dias, serviços mais procurados e agenda do dia.
- Agenda por dia, semana e mês, com filtros por status, serviço e período.
- Lista de agendamentos com busca, status rápido e exportação CSV autorizada.
- Criação manual de agendamento, remarcação, cancelamento e mudança de status.
- Lembrete por WhatsApp na agenda, na lista e na ficha do agendamento: o botão
  abre o WhatsApp da cliente com a mensagem pronta (nome, data dd/mm/aaaa, hora
  marcada, serviços e valor). Nada é enviado pelo servidor e nada é registrado
  como "mensagem enviada" — a envio acontece no app/Web WhatsApp do salão.
- Serviços: criar, editar, ativar/desativar e **excluir definitivamente**.
- Clientes: cadastro, edição, ativação e histórico.
- Horários de funcionamento, intervalos, bloqueios e folgas.
- Relatórios: totais, concluídos, cancelamentos, no-show, receita e serviços.
- Configurações do salão, regras de agenda e registro de pagamento.
- Trilha de auditoria administrativa.
- `/admin/status`: banco (motor, latência, migrações, registros), execução
  (Node/Next, região), Vercel, repositório GitHub (branch e commit) e presença
  das chaves de integração. As chaves aparecem só como *configurada/ausente* —
  nenhum valor de segredo é renderizado e a URL do banco vira `host:porta/base`.

**Tela de acesso**

- Seção “N contas cadastradas”, renderizada **somente em desenvolvimento**
  (`NODE_ENV !== "production"`), lida direto do banco: nome, e-mail, papel e o
  tipo de hash de cada conta, cada uma com um botão “Entrar como”. Em produção a
  seção não existe.
- Senha nenhuma é exibida ou copiável: a conta guarda apenas o hash (scrypt;
  bcrypt nas contas migradas do sistema antigo), função de mão única. O botão
  cria a sessão no servidor (`devImpersonateAction`), grava o evento na trilha
  de auditoria e abre o painel daquele perfil — e a ação se recusa a rodar em
  produção mesmo se alguém POSTar a rota direto.
- Formulários de login, cadastro, recuperação e redefinição são server actions:
  o HTML já sai do servidor com `method="post"`, então e-mail e senha viajam no
  corpo da requisição — inclusive sem JavaScript — e nunca aparecem na URL, no
  histórico ou nos logs.
- Cadastro consulta o banco antes de gravar e avisa quando o e-mail já existe
  (a busca é por `lower(email)`, então `Ana@X.com` e `ana@x.com` são o mesmo
  cadastro). O índice único no banco garante a regra mesmo com duas requisições
  simultâneas.

---

## Requisitos

- Node.js 20.9+ (recomendado 22 ou 24)
- npm 10+
- Um banco PostgreSQL no Neon (ou outro provedor externo) — não há banco local
  embutido; sem `DATABASE_URL` o app falha com mensagem explícita
- Nenhum Docker é necessário

---

## Instalação

```bash
git clone <url-do-repositorio>
cd studio-aurora
npm install
cp .env.example .env.local
# edite .env.local: DATABASE_URL (Neon), AUTH_SECRET e NEXT_PUBLIC_APP_URL
npm run db:migrate
npm run db:seed
npm run dev
```

Acesse <http://localhost:3000>.

Desenvolvimento, testes e produção usam o mesmo serviço Neon. O aplicativo usa o
banco do `DATABASE_URL` (por padrão, `neondb`); os testes usam bancos separados
no mesmo projeto — `aurora_test` para o Vitest e `aurora_e2e` para o Playwright
— criados e zerados pelos próprios scripts. Nenhuma rotina de teste alcança os
dados do salão: as guards em `scripts/neon-test-db.ts` recusam qualquer banco
que não tenha exatamente um desses dois nomes.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | URL do PostgreSQL na Neon. Não há fallback local. |
| `TEST_DATABASE_URL` | não | Override do banco do Vitest (padrão: mesmo host, banco `aurora_test`). |
| `E2E_DATABASE_URL` | não | Override do banco do Playwright (padrão: mesmo host, banco `aurora_e2e`). |
| `DB_AUTO_MIGRATE` | não | `true` aplica migrações ao abrir o banco. O padrão é `false`: migração é o `npm run db:migrate`. |
| `AUTH_SECRET` | sim | Segredo de 32+ caracteres para derivar tokens de sessão. |
| `NEXT_PUBLIC_APP_URL` | sim | URL pública usada nos links de redefinição. |
| `DEV_ORIGINS` | não | Origens (IP:porta) autorizadas para o HMR ao abrir o app pela rede local. |
| `RESEND_API_KEY` | não | Habilita envio de e-mails. Sem ela, nada é simulado como enviado. |
| `EMAIL_FROM` | não | Remetente dos e-mails (ex.: `Studio Aurora <agenda@dominio.com>`). |
| `NEXT_PUBLIC_REPOSITORY_URL` | não | Link do repositório exibido em `/admin/status` fora da Vercel. |
| `SEED_ADMIN_*` | não | Apenas para o seed de demonstração. |

Gere um segredo com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Banco de dados

### Desenvolvimento (Neon)

```bash
npm run db:migrate    # aplica as migrações Drizzle no banco do DATABASE_URL
npm run db:seed       # catálogo + configurações + admin demo (se SEED_ADMIN_* definido)
npm run db:sync-catalog -- --dry-run  # mostra o que mudaria no cardápio de unhas
npm run db:sync-catalog               # aplica: remove serviços fora do cardápio
```

`db:sync-catalog` é o caminho seguro para trocar o cardápio de um banco que já
tem dados: ele apaga os serviços que saíram do menu, mantém os textos que
você editou no painel e nunca toca no histórico — cada item de agendamento
guarda nome, preço e duração do momento da reserva (`appointment_items`).
Depois de alinhar, rode `npm run db:seed` para recriar os agendamentos de
demonstração com o cardápio novo.

### Produção (Neon)

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```

`npm run db:migrate` aplica as migrações Drizzle pendentes. Depois mantenha
`DB_AUTO_MIGRATE=false` para não rodar DDL em cada cold start.

### Migração do banco antigo (Prisma)

O script `npm run db:migrate:legacy`:

1. faz backup JSON em `.data/backups/`;
2. renomeia as tabelas antigas para `legacy_*` (não apaga nada);
3. aplica o schema novo;
4. converte usuários (preservando hashes bcrypt), serviços e agendamentos.

```bash
DATABASE_URL="postgresql://..." npm run db:migrate:legacy
```

Hashes bcrypt antigos continuam válidos: no primeiro login o sistema valida em
bcrypt e troca automaticamente para scrypt.

---

## Primeiro administrador

Não existe cadastro público de administrador. Use o procedimento seguro:

```bash
npm run admin:create
```

O script pede nome, e-mail e senha (ou use as variáveis `ADMIN_NAME`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Em produção, rode uma única vez com a
`DATABASE_URL` de produção e troque a senha depois do primeiro acesso.

O seed local (`npm run db:seed`) só cria admin quando `SEED_ADMIN_*` estão
definidos — nunca use essas credenciais em produção.

---

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sem emitir |
| `npm test` | Vitest (unitários + integração) |
| `npm run test:e2e` | Playwright contra o banco Neon `aurora_e2e` |
| `npm run db:generate` | Gera migração Drizzle a partir do schema |
| `npm run db:migrate` | Aplica migrações |
| `npm run db:migrate:legacy` | Migra dados do banco antigo |
| `npm run db:seed` | Catálogo/configurações/admin demo |
| `npm run db:sync-catalog` | Alinha o banco ao cardápio de unhas (aceita `--dry-run`) |
| `npm run admin:create` | Cria administrador com senha segura |
| `npm run db:reset:e2e` | Zera e re-migra o banco Neon `aurora_e2e` |

---

## Testes

```bash
npm test                 # unitários + integração (banco Neon aurora_test, re-migrado por arquivo)
npm run typecheck
npm run build
npm run test:e2e         # sobe o app na porta 3100 com o banco Neon aurora_e2e
```

Os testes de integração cobrem criação de reserva com snapshot de preço,
conflito de horário (inclusive duas reservas simultâneas), bloqueios,
antecedência, regras de cancelamento/remarcação, permissões de cliente/admin,
pagamento e a unicidade de e-mail no cadastro (compara `lower(email)` e prova o
índice único). Os unitários cobrem o motor de disponibilidade, o fuso do salão e
o painel de status (redação de segredos, classificação de erros e tom de cada
aviso).

Os E2E cobrem cadastro, login/logout, fluxo de agendamento completo, painel,
recuperação de senha, o atalho “Entrar como” e três cenários de segurança:

- **login com JavaScript desativado** — confirma que o `<form>` é `POST` e que a
  URL final (`/admin`) não contém e-mail nem senha;
- **“Entrar como”** — cada linha da lista abre o painel do seu perfil, o HTML
  não contém nenhuma senha e nenhum POST leva senha ou e-mail na URL; um POST
  forjado com conta inexistente volta para `/entrar?erro=dev` sem emitir cookie
  de sessão;
- **`/admin/status`** — anônimo vai para `/entrar?next=`, cliente vai para
  `/painel?aviso=sem-permissao` e o administrador vê as quatro seções sem que o
  valor do `AUTH_SECRET` apareça no HTML.

Como o banco agora é externo, cada página custa várias idas pela rede: os
timeoutes do Playwright são maiores que os de um banco em processo (`expect`
30 s, teste 180 s). E o Next 16 não mantém dois `next dev` na mesma pasta — o
`npm run dev` precisa estar parado antes do `npm run test:e2e`; um preflight
avisa disso antes de mexer em qualquer banco.

O Playwright baixa o Chromium na primeira execução:

```bash
npx playwright install chromium
```

### Integração contínua

`.github/workflows/ci.yml` roda em cada push nas branches principais, em todo pull
request e sob demanda:

- **Types, lint, testes e build** — `typecheck`, `eslint`, `vitest` e
  `next build`, todos contra o PostgreSQL da Neon;
- **Playwright** — sobe `next dev` na porta 3100 com o banco `aurora_e2e` zerado
  e re-migrado do zero e publica o relatório HTML com os rastros e as capturas
  de tela quando algo falha.

O CI precisa do segredo `DATABASE_URL` (o mesmo `postgresql://…neon.tech/…` do
`.env.local`); sem ele os jobs falham com mensagem explícita em vez de pular os
testes. O banco usado pelos testes é sempre o `aurora_test`/`aurora_e2e` derivado
do mesmo host — o workflow não toca no banco do salão. O `AUTH_SECRET` do
workflow é um valor fictício, apenas para a derivação de sessão funcionar.

---

## Deploy na Vercel

1. Suba o repositório no GitHub.
2. Em **Vercel → Add New Project**, importe o repositório.
3. Framework preset: **Next.js** (build `npm run build`, install `npm install`).
4. Configure as variáveis de produção:

   ```
   DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
   AUTH_SECRET=<segredo forte>
   NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app
   DB_AUTO_MIGRATE=false
   RESEND_API_KEY=<opcional>
   EMAIL_FROM="Studio Aurora <agenda@seudominio.com>"
   NEXT_PUBLIC_REPOSITORY_URL=https://github.com/dnlortega/studio-aurora
   ```

5. Antes do primeiro deploy (ou após mudanças de schema), aplique as migrações
   apontando para o banco de produção:

   ```bash
   DATABASE_URL="postgresql://..." npm run db:migrate
   ```

6. Deploy. Crie o admin de produção com `npm run admin:create` usando a mesma
   `DATABASE_URL`.
7. Ajuste `NEXT_PUBLIC_APP_URL` para o domínio final e refaça o deploy.
8. Entre como administrador e abra `/admin/status` para conferir conexão com o
   Neon, migrações aplicadas, região da Vercel, commit publicado e quais chaves
   de integração estão presentes.

O app recusa a subir sem `DATABASE_URL`: não existe banco em disco, então cada
instância serverless fala com o mesmo PostgreSQL da Neon.

---

## Regras de negócio

- **Fuso do salão:** datas e minutos são tratados como hora local
  (`America/Sao_Paulo` por padrão), sem depender do fuso do navegador.
- **Disponibilidade:** considera duração total dos serviços, horário de
  funcionamento, intervalo de almoço, bloqueios, folgas, antecedência mínima e
  janela máxima de agendamento.
- **Conflitos:** a reserva roda em transação com lock por dia e revalidação;
  duas pessoas disputando o mesmo horário resultam em uma única reserva.
- **Snapshot:** cada item guarda nome, preço e duração do momento da reserva.
  Alterar ou excluir o serviço não altera o histórico.
- **Status:** `pending`, `confirmed`, `completed`, `cancelled`, `no_show`.
- **Cancelamento/remarcação:** respeitam antecedência mínima configurada;
  concluídos e passados não podem ser alterados pelo cliente.
- **Pagamento:** controle manual do admin (pago/não pago + data), independente
  do status do atendimento. Não há gateway online.
- **Exclusão de serviço:** remove a linha do banco; os agendamentos antigos
  continuam íntegros via snapshot (`service_id` vira `NULL`).
- **Autorização:** toda ação valida sessão, papel e propriedade no servidor.
  IDs enviados pelo navegador nunca são confiados.

### Limitações conhecidas

- **WhatsApp sem envio automático.** O módulo de notações registra a tentativa
  como `not_configured`; nenhuma mensagem é simulada como enviada. O lembrete
  do painel é manual: abre um link `wa.me` com a mensagem pronta e é o admin que
  envia na conversa.
- **E-mail** só funciona com `RESEND_API_KEY`. Sem ela, em produção não há
  envio de link de redefinição (em dev o link é exibido na tela).
- **Pagamentos** registram apenas pago/não pago e data — sem forma de pagamento
  ou histórico de transações (`payment_records`).
- **Relatórios** ainda não separam “receita prevista” de “receita efetivamente
  recebida” nem contam novos clientes.
- **Rate limiting** é em memória; na Vercel cada instância tem seu próprio
  contador.
- Agenda para **um profissional**; não há múltiplos profissionais/recursos.
- Sem categoria de serviço, tempo de preparo entre atendimentos ou upload de
  imagens.
- Sem rotina automática de lembretes (cron) e sem retenção/expurgo LGPD
  automatizado.

---

## Segurança

- Senhas com scrypt (salt individual); sessões opacas hasheadas com HMAC-SHA256.
- Cookie `httpOnly`, `SameSite=Lax`, `Secure` em produção.
- Todas as consultas de cliente filtram por `client_id` da sessão.
- Ações administrativas exigem papel `admin` no servidor.
- Rate limit em login, cadastro, recuperação e redefinição.
- Tokens de redefinição com hash, expiração de 1 hora e uso único.
- Credenciais nunca vão para a URL: os formulários de acesso usam server actions
  e nascem como `POST` no HTML, funcionando igual sem JavaScript.
- Os esqueletos de carregamento ficam em `(site)/`, `admin/` e `painel/`, e não
  na raiz do app. Um `loading.tsx` na raiz cria borda de Suspense em toda rota:
  o React manda o conteúdo suspenso dentro de `<div hidden>` e quem revela é um
  script — sem JavaScript a pessoa ficaria olhando o esqueleto e não conseguiria
  nem entrar na conta.
- `/admin/status` é só para administrador e mostra no máximo a *presença* das
  chaves; mensagens de erro do driver são redigidas antes de aparecer na tela.
- A lista de contas cadastradas na tela de acesso existe apenas em `development`
  e não revela senha: o botão “Entrar como” abre a sessão no servidor
  (`devImpersonateAction`), que se recusa a funcionar em produção e registra o
  evento na auditoria.
- Senha em texto plano não existe em lugar nenhum — nem no banco, nem no
  `.env.local`, nem no código dos testes de ponta a ponta além de contas
  fictícias do banco `aurora_e2e`. O que o banco guarda é hash irreversível.
- Desenvolvimento, testes e produção usam o mesmo serviço Neon, com bancos
  separados para os testes; nenhuma rotina automatizada escreve no banco do
  salão.
- Auditoria de ações administrativas e histórico por agendamento.
- Nenhuma credencial privada é exposta no bundle do navegador.
- Dados pessoais limitados ao necessário; exclusão de conta não é automática
  (atendimento manual/LGPD).

---

## Estrutura

```
src/
  actions/            Server Actions (auth, booking, admin)
  app/
    (site)/           Agendamento (raiz), atalho /agendar e catálogo
    (auth)/           Entrar, criar conta, recuperar/redefinir senha
    painel/           Área da cliente
    admin/            Administração
    api/              Disponibilidade e exportação CSV
  components/
    ui/               shadcn/ui (Base UI)
    site/ booking/ painel/ admin/ shared/
  lib/
    auth/             Sessão, senha, reset, guards
    booking/          Motor de disponibilidade, reservas e consultas
    db/               Drizzle schema + conexão (PostgreSQL/Neon)
    validation/       Schemas Zod
scripts/              Seed, admin, migrações, reset E2E
tests/                Unitários, integração, E2E
drizzle/              Migrações SQL
```

---

## Licença

Projeto privado. © Daniel Ortega Pereira.
