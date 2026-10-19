import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerCalendarRoutes } from '../calendario.js';
const createApp = pool => { const app = express(); registerCalendarRoutes(app, pool); return app; };
const route = (pool, path) => createApp(pool).router.stack.find(layer => layer.route?.path === path && layer.route.methods.get).route.stack[0].handle;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } });
const next = error => { throw error; };
test('calendário recusa filtros inválidos antes de consultar SQL', async () => {
  for (const query of [{ campeonato: '1 OR 1=1' }, { esporte: ['1', '2'] }, { time: '0' }, { status: 'INVALIDO' }, { inicio: '2026-02-30' }, { fim: 'foo' }, { inicio: '2026-10-15', fim: '2026-10-14' }]) {
    const res = response(); await route({}, '/api/jogos')({ query }, res, next); assert.equal(res.statusCode, 400);
  }
});
test('calendário parametriza filtros e inclui todo o último dia', async () => {
  let call;
  const pool = { execute: async (sql, values) => { call = { sql, values }; return [[]]; } };
  const res = response();
  await route(pool, '/api/jogos')({ query: { campeonato: '1', esporte: '2', time: '3', status: 'ENCERRADA', inicio: '2026-10-01', fim: '2026-10-14' } }, res, next);
  assert.deepEqual(call.values, ['1', '2', 'ENCERRADA', '3', '3', '2026-10-01 00:00:00', '2026-10-14']);
  assert.match(call.sql, /DATE_ADD\(\?, INTERVAL 1 DAY\)/);
  assert.match(call.sql, /ORDER BY p.data_hora, p.id_partida/);
  assert.deepEqual(res.body, []);
});
test('resumo distingue identificador inválido e campeonato inexistente', async () => {
  const invalid = response(); await route({}, '/api/campeonatos/:id/resumo')({ params: { id: 'x' } }, invalid, next); assert.equal(invalid.statusCode, 400);
  const missing = response(); await route({ execute: async () => [[]] }, '/api/campeonatos/:id/resumo')({ params: { id: '1' } }, missing, next); assert.equal(missing.statusCode, 404);
});
test('resumo conta situações, preserva placar zero e retorna resultados mais recentes primeiro', async () => {
  const games = ['ENCERRADA', 'CANCELADA', 'AGENDADA', 'ADIADA', 'EM_ANDAMENTO', 'ENCERRADA'].map((status, index) => ({ id_partida: index + 1, status, placar_time_a: status === 'ENCERRADA' ? 0 : null, placar_time_b: status === 'ENCERRADA' ? 0 : null }));
  for (const rows of [games, []]) {
    const pool = { execute: async sql => sql.includes('COUNT(*)') ? [[{ times: '2' }]] : sql.includes('FROM partida') ? [rows] : [[{ id_campeonato: 1 }]] };
    const res = response(); await route(pool, '/api/campeonatos/:id/resumo')({ params: { id: '1' } }, res, next);
    assert.equal(res.body.times, 2); assert.equal(res.body.partidas, rows.length);
    assert.deepEqual(res.body.proximos_jogos.map(game => game.id_partida), rows.length ? [3, 5] : []);
    assert.deepEqual(res.body.ultimos_resultados.map(game => game.id_partida), rows.length ? [6, 1] : []);
  }
});
test('falhas de banco chegam ao tratamento central', async () => {
  const error = new Error('falha');
  for (const path of ['/api/jogos', '/api/campeonatos/:id/resumo']) {
    let received;
    await route({ execute: async () => { throw error; } }, path)({ query: {}, params: { id: '1' } }, response(), value => { received = value; });
    assert.equal(received, error);
  }
});

test('resumo consolida nome, esporte, datas e status do campeonato', async () => {
  const campeonato = { id_campeonato: 1, nome: 'Copa', esporte: 'Futsal', data_inicial: '2026-10-01', data_fim: '2026-10-31', status: 'INSCRICOES' };
  const calls = [];
  const pool = { execute: async (sql, values) => {
    calls.push({ sql, values });
    return sql.includes('COUNT(*)') ? [[{ times: 0 }]] : sql.includes('FROM partida') ? [[]] : [[campeonato]];
  } };
  const res = response();
  await route(pool, '/api/campeonatos/:id/resumo')({ params: { id: '1' } }, res, next);
  assert.deepEqual(res.body.campeonato, campeonato);
  assert.match(calls[0].sql, /DATE_FORMAT\(c.data_inicial/);
  assert.match(calls[0].sql, /e.nome AS esporte/);
  assert.deepEqual(calls[0].values, ['1']);
});

test('classificação valida ID e existência e consulta a view do campeonato em ordem', async () => {
  const path = '/api/campeonatos/:id/classificacao';
  const invalid = response();
  await route({}, path)({ params: { id: '1 OR 1=1' } }, invalid, next);
  assert.equal(invalid.statusCode, 400);
  const missing = response();
  await route({ execute: async () => [[]] }, path)({ params: { id: '1' } }, missing, next);
  assert.equal(missing.statusCode, 404);
  for (const rows of [[], [{ posicao: 1, id_time: 2, time: 'Time A', pts: 0 }]]) {
    let query;
    const pool = { execute: async (sql, values) => {
      if (sql.includes('vw_classificacao')) { query = { sql, values }; return [rows]; }
      return [[{ id_campeonato: 1 }]];
    } };
    const res = response();
    await route(pool, path)({ params: { id: '1' } }, res, next);
    assert.deepEqual(res.body, rows);
    assert.deepEqual(query.values, ['1']);
    assert.match(query.sql, /WHERE id_campeonato = \? ORDER BY posicao/);
  }
});
