# Deploy — Dashboard de Funil (Clínica Magras)

## 1. Criar o projeto no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto
   (região São Paulo, se disponível).
2. No painel do projeto, vá em **SQL Editor** → **New query**, cole todo o
   conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e rode. Isso cria
   as tabelas `profiles`, `daily_entries`, `goals`, o gatilho que cria a
   profile automaticamente (como "pendente") quando alguém se cadastra, e as
   políticas de RLS.
   - Se você já tinha rodado uma versão anterior deste arquivo, pode rodar de
     novo sem problema — o script foi escrito pra ser seguro de repetir.
3. Em **Authentication → Providers → Email**, desative a opção **"Confirm
   email"**. O login do app é por e-mail + senha (não depende de link nem
   código por e-mail), então essa confirmação só adiciona um passo a mais —
   e sofre do mesmo problema de "link pré-carregado pelo Gmail" que tivemos
   ao testar o magic link antes.
4. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   (Não precisa mais da `service_role` key — o app não usa mais rota de
   convite/admin.)

## 2. Bootstrap do primeiro gestor (você, Jacson)

1. Rode o app (local ou já publicado) e crie sua própria conta em
   `/signup` normalmente (nome, e-mail, senha). Ela entra como **pendente**.
2. No **SQL Editor** do Supabase, rode:
   ```sql
   update public.profiles set role = 'gestor' where email = 'seu@email.com';
   ```
3. Faça login de novo em `/login` — agora você é gestor e vê a tela
   **Usuários**, onde pode promover qualquer pessoa que se cadastrar depois
   (SDR, dona da clínica, convidados) escolhendo o cargo dela numa lista.

## 3. Variáveis de ambiente

Preencha `.env.local` (uso local) com os dois valores da etapa 1:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 4. Publicar na Vercel

1. Suba este projeto para um repositório Git (GitHub/GitLab).
2. Em [vercel.com](https://vercel.com), importe o repositório.
3. Em **Environment Variables**, adicione as duas variáveis da etapa 3
   (os mesmos valores do `.env.local`).
4. Deploy.

## 5. Uso no dia a dia

- Cada pessoa cria sua própria conta em `/signup` (nome, e-mail, senha).
- Ela fica **pendente** (sem acesso a nada) até o gestor entrar em
  **Usuários** e escolher o cargo dela: SDR, dona da clínica, gestor ou
  convidado.
- SDR e gestor preenchem `/lancamento` todo dia.
- Todos com cargo definido acessam `/dashboard` para ver o funil, custos,
  tendência e comparativo com meta.
- Gestor ajusta metas em `/metas` e cargos em `/usuarios`.

## Fora do MVP (roadmap futuro, não bloqueia o uso hoje)

Lembrete automático de preenchimento, alerta automático de meta abaixo do
esperado, integração com Meta Marketing API, rastreamento por coorte,
comparativo por campanha/criativo, recuperação de senha — ver seção 7 do
documento de especificação original.
