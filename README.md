# Oficina Mecânica - Vercel + Supabase

Sistema em Next.js para uma oficina mecânica gerenciar clientes, veículos, serviços e ordens de serviço.

## Funções

- Dashboard com totais operacionais
- Cadastro de clientes
- Cadastro de veículos por cliente
- Cadastro de serviços
- Abertura de ordem de serviço
- Atualização rápida de OS para finalizada
- Integração server-side com Supabase

## Como rodar local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra: http://localhost:3000

## Supabase

1. Crie um projeto no Supabase.
2. Vá em SQL Editor.
3. Cole o conteúdo de `supabase/schema.sql`.
4. Execute o SQL.
5. Pegue as variáveis:
   - Project URL
   - service_role key

## .env.local

```env
NEXT_PUBLIC_APP_NAME="Oficina Mecânica"
NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
```ff

A chave `SUPABASE_SERVICE_ROLE_KEY` não deve ser colocada no frontend. Neste projeto ela é usada apenas nas rotas API do Next.js.

## Deploy na Vercel

1. Suba este projeto para o GitHub.
2. Importe o repositório na Vercel.
3. Em Settings > Environment Variables, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_NAME`
4. Faça o deploy.

## Segurança

Este projeto está pronto como ponto de partida funcional. Para produção real, adicione login, permissões por usuário, políticas RLS no Supabase e auditoria das alterações feitas nas ordens de serviço.
