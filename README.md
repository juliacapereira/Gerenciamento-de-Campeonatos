# Arena Local — Gerenciamento de Campeonatos

Projeto acadêmico para gerenciar campeonatos de esportes amadores, desenvolvido com Next.js, React, Express e MySQL.

## Executar o site

Na pasta do projeto:

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Executar a API e configurar o banco

Em outro terminal:

```bash
cd backend
npm install
```

Crie `backend/.env` com os dados de um banco MySQL compatível com a configuração TLS de `database.js` (o projeto foi configurado para Aiven):

```dotenv
DB_HOST=seu-host
DB_PORT=3306
DB_USER=seu-usuario
DB_PASSWORD=sua-senha
DB_NAME=seu-banco
PORT=3001
```

Para um banco novo, execute `node executarBanco.js`. O script cria as tabelas e os esportes definidos em `banco.sql`. Depois inicie a API:

```bash
npm run dev
```

O site encaminha `/api/*` para `http://127.0.0.1:3001`. Para usar outra URL, defina `API_URL` em `.env.local` na raiz e reinicie o Next.js. Os formulários e listagens precisam da API e do banco disponíveis.

## Histórias implementadas

- `/campeonatos`: listagem com busca e filtros de esporte e status.
- `/campeonatos/novo`: criação com nome, esporte, período, status e descrição.
- `/times`: listagem com busca por nome/cidade e filtro de esporte.
- `/times/novo`: cadastro com nome, esporte, sigla, cidade, descrição e link do escudo.
- `/campeonatos/[id]` e `/times/[id]`: detalhes do cadastro, com ações de edição e exclusão.
- `/campeonatos/[id]/editar` e `/times/[id]/editar`: formulários preenchidos com os dados atuais.

Na listagem, clique no nome ou em “Ver campeonato/time” para abrir o cadastro. Clique em “Editar” para alterar as informações. A exclusão requer confirmação e é bloqueada quando há inscrições, partidas ou elencos vinculados, preservando os dados relacionados.

Os registros são persistidos nas tabelas `campeonato` e `time`. Os formulários mostram confirmação de sucesso e mensagens de falha, preservando os campos quando o envio falha. A API valida os dados e trata duplicidades conforme as restrições do banco. As rotas `/api/campeonatos/:id` e `/api/times/:id` aceitam GET, PUT e DELETE. Não é necessária uma migração de banco para usar os novos fluxos.

Após atualizar o código, reinicie a API (`Ctrl+C` e `npm run dev` no terminal de `backend/`) para carregar as novas rotas.

A página inicial mostra campeonatos e times cadastrados na API, com links para seus detalhes. Jogos, classificação e jogadores ainda usam dados de demonstração. Autenticação e inscrição de times em campeonatos não fazem parte destas duas histórias. As rotas de cadastro estão acessíveis sem autenticação nesta etapa do projeto.

## Verificação

```bash
npx tsc --noEmit
npm run build
# Alternativa se o ambiente bloquear o Turbopack:
# npm run build -- --webpack
cd backend
npm test
```
