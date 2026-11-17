import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerRankingRoutes } from '../ranking.js';

const response = () => ({
  statusCode: 200,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  set(name, value) { this.headers[name] = value; return this; },
  json(body) { this.body = body; },
});

const handler = pool => {
  const app = express();
  registerRankingRoutes(app, pool);
  return app.router.stack[0].route.stack[0].handle;
};

test('ranking valida ID e distingue campeonato inexistente', async () => {
  const invalid = response();
  await handler({})({ params: { id: '0 OR 1=1' } }, invalid, error => { throw error; });
  assert.equal(invalid.statusCode, 400);

  const missing = response();
  await handler({ execute: async () => [[]] })({ params: { id: '1' } }, missing, error => { throw error; });
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(missing.body, { erro: 'Campeonato não encontrado.' });
});

test('ranking soma pontuações de jogador/time e ordena os resultados', async () => {
  const rows = [
    { id_jogador: 2, jogador_nome: 'Ana', jogador_posicao: 'Atacante', id_time: 1, time_nome: 'Time A', total_pontos: '4' },
  ];
  const queries = [];
  const res = response();
  await handler({
    execute: async (sql, values) => {
      queries.push({ sql, values });
      return [queries.length === 1 ? [{ id_campeonato: 7 }] : rows];
    },
  })({ params: { id: '7' } }, res, error => { throw error; });

  assert.deepEqual(res.body, rows);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.deepEqual(queries.map(query => query.values), [['7'], ['7']]);
  assert.match(queries[1].sql, /FROM pontuacao pt/);
  assert.match(queries[1].sql, /SUM\(pt\.quantidade\) AS total_pontos/);
  assert.match(queries[1].sql, /COALESCE\(el\.posicao, j\.posicao\) AS jogador_posicao/);
  assert.match(queries[1].sql, /el\.id_time = t\.id_time/);
  assert.match(queries[1].sql, /pt\.id_jogador IS NOT NULL/);
  assert.match(queries[1].sql, /ORDER BY total_pontos DESC, jogador_nome ASC/);
});

test('falhas do banco são encaminhadas ao tratamento central', async () => {
  const error = new Error('falha');
  let received;
  await handler({ execute: async () => { throw error; } })(
    { params: { id: '1' } },
    response(),
    value => { received = value; }
  );
  assert.equal(received, error);
});
