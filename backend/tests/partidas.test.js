import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

// Mesmo padrão dos outros testes: chama o handler direto, com um pool falso.
function route(app, path, method) {
  return app.router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
const next = error => { throw error; };
const path = '/api/partidas/:id';

test('detalhes da partida: 400 para id inválido e 404 para partida ausente', async () => {
  const invalid = response();
  await route(createApp({}), path, 'get')({ params: { id: 'x' } }, invalid, next);
  assert.equal(invalid.statusCode, 400);

  const missing = response();
  await route(createApp({ execute: async () => [[]] }), path, 'get')({ params: { id: '9' } }, missing, next);
  assert.equal(missing.statusCode, 404);
});

test('detalhes da partida consolidam placar, gols, histórico e escalações', async () => {
  const partida = { id_partida: 1, id_campeonato: 1, id_time_a: 10, id_time_b: 20, status: 'ENCERRADA', placar_time_a: 2, placar_time_b: 1 };
  const pool = {
    execute: async sql => {
      if (sql.includes('FROM partida p')) return [[partida]];
      if (sql.includes('FROM acontecimento')) return [[{ id_acontecimento: 1, tipo: 'Cartão amarelo' }]];
      if (sql.includes('FROM pontuacao')) return [[{ id_pontuacao: 1, id_time: 10, quantidade: 1 }]];
      if (sql.includes('FROM elenco')) return [[{ id_time: 10, nome: 'Ana' }, { id_time: 20, nome: 'Bia' }, { id_time: 20, nome: 'Carla' }]];
      throw new Error(`SQL inesperado: ${sql}`);
    },
  };
  const res = response();
  await route(createApp(pool), path, 'get')({ params: { id: '1' } }, res, next);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.partida.status, 'ENCERRADA');
  assert.equal(res.body.acontecimentos.length, 1);
  assert.equal(res.body.pontuacoes.length, 1);
  assert.deepEqual(res.body.escalacoes.time_a.map(item => item.nome), ['Ana']);
  assert.deepEqual(res.body.escalacoes.time_b.map(item => item.nome), ['Bia', 'Carla']);
});