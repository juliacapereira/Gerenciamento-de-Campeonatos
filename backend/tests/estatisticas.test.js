import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerStatsRoutes, validateStats } from '../estatisticas.js';

const response = () => ({
  statusCode: 200,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  set(name, value) { this.headers[name] = value; return this; },
  json(body) { this.body = body; },
});

// Rotas registradas: [0] GET, [1] PUT, [2] DELETE
const handler = (pool, index = 0) => {
  const app = express();
  registerStatsRoutes(app, pool);
  return app.router.stack[index].route.stack[0].handle;
};

const valido = { gols: 2, partidas: 3, cartoes_amarelos: 1, cartoes_vermelhos: 0 };

test('validação aceita inteiros de 0 a 999 e recusa o resto', () => {
  assert.equal(validateStats(valido), null);
  assert.equal(validateStats({ ...valido, observacao: 'Conferido na súmula' }), null);
  assert.match(validateStats({ ...valido, gols: -1 }), /gols\/pontos/);
  assert.match(validateStats({ ...valido, partidas: 1.5 }), /partidas jogadas/);
  assert.match(validateStats({ ...valido, cartoes_amarelos: '2' }), /cartões amarelos/);
  assert.match(validateStats({ ...valido, cartoes_vermelhos: 1000 }), /cartões vermelhos/);
  assert.match(validateStats({ ...valido, observacao: 'x'.repeat(256) }), /255 caracteres/);
  assert.equal(validateStats(null), 'Dados inválidos.');
});

test('estatísticas validam ID e distinguem jogador inexistente', async () => {
  const invalid = response();
  await handler({})({ params: { id: '0 OR 1=1' } }, invalid, error => { throw error; });
  assert.equal(invalid.statusCode, 400);

  const missing = response();
  await handler({ query: async () => [[]], execute: async () => [[]] })(
    { params: { id: '1' } }, missing, error => { throw error; }
  );
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(missing.body, { erro: 'Jogador não encontrado.' });
});

test('correção recusa valores inválidos antes de acessar o banco', async () => {
  const res = response();
  await handler({}, 1)(
    { params: { id: '1', id_campeonato: '1' }, body: { ...valido, gols: -3 } },
    res,
    error => { throw error; }
  );
  assert.equal(res.statusCode, 400);
});

test('correção guarda a diferença entre o valor final e o calculado', async () => {
  const queries = [];
  const pool = {
    query: async () => [[]],
    execute: async (sql, values) => {
      queries.push({ sql, values });
      if (sql.includes('FROM jogador')) return [[{ id_jogador: 1, nome: 'Ana', posicao: null }]];
      if (sql.includes('FROM campeonato WHERE')) return [[{ id_campeonato: 4, nome: 'Copa' }]];
      if (sql.includes('SUM(pt.quantidade)')) return [[{ id_campeonato: 4, total: '2' }]];
      if (sql.includes('COUNT(DISTINCT p.id_partida)')) return [[{ id_campeonato: 4, total: 1 }]];
      if (sql.includes('FROM acontecimento')) return [[{ id_campeonato: 4, amarelos: '1', vermelhos: '0' }]];
      return [{ affectedRows: 1 }];
    },
  };

  const res = response();
  await handler(pool, 1)(
    {
      params: { id: '1', id_campeonato: '4' },
      body: { gols: 2, partidas: 3, cartoes_amarelos: 2, cartoes_vermelhos: 0, observacao: ' súmula ' },
      usuario: { id_usuario: 9 },
    },
    res,
    error => { throw error; }
  );

  assert.equal(res.statusCode, 200);
  const insert = queries.find(q => q.sql.includes('INSERT INTO ajuste_estatistica'));
  // gols 2-2=0, partidas 3-1=2, amarelos 2-1=1, vermelhos 0-0=0
  assert.deepEqual(insert.values, ['1', '4', 0, 2, 1, 0, 'súmula', 9]);
});

test('falhas do banco são encaminhadas ao tratamento central', async () => {
  const error = new Error('falha');
  let received;
  await handler({ query: async () => { throw error; } })(
    { params: { id: '1' } },
    response(),
    value => { received = value; }
  );
  assert.equal(received, error);
});
