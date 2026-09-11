# Sistema de Gestão de Diárias — FUERN

Sistema de controle de diárias de viagem, implementado a partir do Decreto
Estadual nº 29.444/2020 (RN), da alteração dada pelo Decreto nº 32.688/2023,
e da Portaria nº 293/2020 - GP/FUERN.

## Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + PostgreSQL
- Tailwind CSS
- Autenticação por sessão JWT em cookie (bcrypt + jose), sem dependências
  externas de OAuth

## Setup local

```bash
npm install
cp .env.example .env   # ajuste DATABASE_URL e AUTH_SECRET
npx prisma migrate deploy
npm run db:seed
npm run dev
```

O seed cria um usuário administrador de acesso inicial:

- **Email:** `admin@fuern.rn.gov.br`
- **Senha:** `TrocarEssaSenha123!` (troque assim que possível — não há tela
  de troca de senha própria ainda; atualize via `usuario.senhaHash` ou crie
  um novo usuário admin e remova este)

## Testes

```bash
npm test        # testes unitários do motor de regras (lib/*.ts)
npm run lint
npm run build
```

Os testes cobrem exclusivamente as regras de negócio puras (cálculo de
diária, limites, prazo, prestação de contas, dedup de CPF) — são a parte
mais crítica do sistema, já que envolvem dinheiro público e uma leitura
literal do decreto.

## Regras de negócio implementadas

Toda a lógica de domínio fica em `lib/*.ts`, isolada de banco de dados e UI,
para poder ser testada e auditada independentemente:

- `lib/diaria-calculo.ts` — cálculo de diárias por pernoite (Art. 12,
  redação dada pelo Decreto 32.688/2023), incluindo as exclusões de
  distância mínima (40 km, Art. 17-I) e duração mínima (6h, Art. 17-III).
- `lib/limites.ts` — limite mensal de 10 diárias (Art. 15) e limite anual
  de dias por categoria (Art. 16 — 60 dias padrão, customizável por
  categoria para casos como motoristas, 90 dias).
- `lib/prazo.ts` — trava total para lançamento retroativo e trava de
  justificativa para prazo abaixo do mínimo configurado (Art. 13).
- `lib/prestacao-contas.ts` — relatório de viagem, prazo em dias úteis,
  bloqueio de novos pedidos por pendência e devolução de valores (Art.
  33-39).
- `lib/cpf.ts` — validação de CPF e deduplicação de beneficiário por CPF
  idêntico ou por nome idêntico com CPF a até 2 posições de distância
  (erro provável de digitação).

Parâmetros como limite mensal, prazos, km mínimo e duração mínima são
configuráveis pelo administrador em `/admin/configuracoes`, já que o
decreto pode ser alterado. Categorias de beneficiário e tipos de destino
(e a matriz de valores entre eles) também são cadastros livres do
administrador, sem hierarquia fixa no código — a distância entre sede e
destino é autodeclarada pelo demandante no pedido e conferida
manualmente pelo administrador (sem integração automática com serviço de
mapas).

## Estrutura

```
app/(app)/          páginas autenticadas (dashboard, pedidos, beneficiários, admin)
app/login/          tela de login
lib/actions/        server actions (mutações)
lib/*.ts            motor de regras de negócio, puro e testado
prisma/schema.prisma modelo de dados
prisma/seed.ts       dados iniciais (categorias, destinos e valores da Portaria 293/2020-FUERN)
```
