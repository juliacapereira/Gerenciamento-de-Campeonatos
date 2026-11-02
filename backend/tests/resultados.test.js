import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

function route(app, path, method) {
  return app.router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
}

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

const next = error => { throw error; };

function scoringPool({ athleteOnTeam = true } = {}) {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push('begin'),
    rollback: async () => calls.push('rollback'),
    commit: async () => calls.push('commit'),
    release: () => calls.push('release'),
    execute: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes('FOR UPDATE')) {
        return [[{ id_partida: 3, id_time_a: 10, id_time_b: 20, status: 'AGENDADA' }]];
      }
      if (sql.includes('FROM elenco')) {
        return [athleteOnTeam ? [{ id_jogador: 50 }] : []];
      }
      if (sql.trimStart().startsWith('INSERT INTO pontuacao')) return [{ insertId: 7 }];
      if (sql.startsWith('UPDATE partida')) return [{ affectedRows: 1 }];
      if (sql.includes('SUM(CASE')) return [[{ time_a: 1, time_b: 0 }]];
      throw new Error(`SQL inesperado: ${sql}`);
    },
  };

  return { calls, getConnection: async () => connection };
}

const scoringPath = '/api/partidas/:id/pontuacoes';

test('registra pontuação com o atleta do elenco ativo do time', async () => {
  const pool = scoringPool();
  const res = response();

  await route(createApp(pool), scoringPath, 'post')({
    params: { id: '3' },
    body: { id_time: 10, id_jogador: 50, minuto: 12, quantidade: 1 },
  }, res, next);

  assert.equal(res.statusCode, 201);
  const insert = pool.calls.find(call => typeof call === 'object' && call.sql.trimStart().startsWith('INSERT INTO pontuacao'));
  assert.deepEqual(insert.values, [3, 10, 50, 1, 12]);
  assert.ok(pool.calls.includes('commit'));
});

test('exige atleta e rejeita atleta fora do elenco ativo do time', async () => {
  const missingPool = scoringPool();
  const missing = response();
  await route(createApp(missingPool), scoringPath, 'post')({
    params: { id: '3' },
    body: { id_time: 10, minuto: 12 },
  }, missing, next);
  assert.equal(missing.statusCode, 400);
  assert.match(missing.body.erro, /atleta/);
  assert.equal(missingPool.calls.length, 0);

  const unrelatedPool = scoringPool({ athleteOnTeam: false });
  const unrelated = response();
  await route(createApp(unrelatedPool), scoringPath, 'post')({
    params: { id: '3' },
    body: { id_time: 10, id_jogador: 50, minuto: 12 },
  }, unrelated, next);
  assert.equal(unrelated.statusCode, 400);
  assert.match(unrelated.body.erro, /elenco ativo/);
  assert.ok(unrelatedPool.calls.includes('rollback'));
  assert.ok(!unrelatedPool.calls.some(call => typeof call === 'object' && call.sql.trimStart().startsWith('INSERT INTO pontuacao')));
});

test('endpoint de placar inclui elenco ativo separado por time', async () => {
  const partida = { id_partida: 3, id_time_a: 10, id_time_b: 20, time_a: 'Azul', time_b: 'Verde' };
  const roster = [
    { id_time: 10, id_jogador: 50, nome: 'Ana', numero_camisa: 8 },
    { id_time: 20, id_jogador: 60, nome: 'Bia', numero_camisa: 4 },
  ];
  const pool = {
    execute: async sql => {
      if (sql.includes('FROM partida p')) return [[partida]];
      if (sql.includes('FROM resultado')) return [[]];
      if (sql.includes('FROM pontuacao pt')) return [[]];
      if (sql.includes('FROM elenco e')) return [roster];
      if (sql.includes('SUM(CASE')) return [[{ time_a: 0, time_b: 0 }]];
      throw new Error(`SQL inesperado: ${sql}`);
    },
  };
  const res = response();
  await route(createApp(pool), '/api/partidas/:id/placar', 'get')({ params: { id: '3' } }, res, next);

  assert.deepEqual(res.body.escalacoes.time_a.map(atleta => atleta.id_jogador), [50]);
  assert.deepEqual(res.body.escalacoes.time_b.map(atleta => atleta.id_jogador), [60]);
});
