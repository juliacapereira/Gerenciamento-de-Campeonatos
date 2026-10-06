import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

// Mesmo padrão dos outros testes: chama os handlers direto, com um pool falso (nenhum banco real é usado).
function route(app, path, method) {
  return app.router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
const next = error => { throw error; };
const path = '/api/campeonatos/:id/times';

test('inscreve time no campeonato com SQL parametrizado', async () => {
  const calls = [];
  const app = createApp({ execute: async (sql, values) => { calls.push({ sql, values }); return sql.startsWith('INSERT') ? [{ insertId: 3 }] : [[{ id: 1, id_esporte: 1, esporte: 'Futebol' }]]; } });
  const res = response();
  await route(app, path, 'post')({ params: { id: '1' }, body: { id_time: 2 } }, res, next);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.id_campeonato_time, 3);
  assert.deepEqual(calls.at(-1).values, ['1', 2]);
  assert.ok(calls.at(-1).sql.includes('VALUES (?, ?)'));
});

test('inscrição: 400 para dados inválidos, 404 para ausentes e 409 para repetida', async () => {
  const noSql = createApp({ execute: () => { throw new Error('Não deve executar SQL'); } });
  for (const [params, body] of [[{ id: 'x' }, { id_time: 2 }], [{ id: '1' }, {}], [{ id: '1' }, { id_time: '2 OR 1=1' }], [{ id: '1' }, undefined]]) {
    const res = response();
    await route(noSql, path, 'post')({ params, body }, res, next);
    assert.equal(res.statusCode, 400);
  }
  const noChampionship = response();
  await route(createApp({ execute: async () => [[]] }), path, 'post')({ params: { id: '1' }, body: { id_time: 2 } }, noChampionship, next);
  assert.equal(noChampionship.statusCode, 404);
  const noTeam = response();
  await route(createApp({ execute: async (sql, values) => (sql.includes('FROM campeonato') ? [[{ id: 1, id_esporte: 1, esporte: 'Futebol' }]] : [[]]) }), path, 'post')({ params: { id: '1' }, body: { id_time: 2 } }, noTeam, next);
  assert.equal(noTeam.statusCode, 404);
  const dup = response();
  const pool = { execute: async sql => { if (sql.startsWith('INSERT')) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }); return [[{ id: 1, id_esporte: 1, esporte: 'Futebol' }]]; } };
  await route(createApp(pool), path, 'post')({ params: { id: '1' }, body: { id_time: 2 } }, dup, next);
  assert.equal(dup.statusCode, 409);
  assert.match(dup.body.erro, /inscrito/);
});

test('lista times inscritos (400, 404 e 200)', async () => {
  const rows = [{ id_time: 2, nome: 'Time A' }];
  const ok = response();
  await route(createApp({ execute: async sql => (sql.includes('FROM campeonato WHERE') ? [[{ id: 1, id_esporte: 1, esporte: 'Futebol' }]] : [rows]) }), path, 'get')({ params: { id: '1' } }, ok, next);
  assert.deepEqual(ok.body, rows);
  const invalid = response();
  await route(createApp({}), path, 'get')({ params: { id: 'x' } }, invalid, next);
  assert.equal(invalid.statusCode, 400);
  const missing = response();
  await route(createApp({ execute: async () => [[]] }), path, 'get')({ params: { id: '1' } }, missing, next);
  assert.equal(missing.statusCode, 404);
});

test('remove inscrição e trata ausente', async () => {
  const ok = response();
  await route(createApp({ execute: async () => [{ affectedRows: 1 }] }), `${path}/:teamId`, 'delete')({ params: { id: '1', teamId: '2' } }, ok, next);
  assert.equal(ok.statusCode, 200);
  const missing = response();
  await route(createApp({ execute: async () => [{ affectedRows: 0 }] }), `${path}/:teamId`, 'delete')({ params: { id: '1', teamId: '2' } }, missing, next);
  assert.equal(missing.statusCode, 404);
  const invalid = response();
  await route(createApp({}), `${path}/:teamId`, 'delete')({ params: { id: '1', teamId: 'x' } }, invalid, next);
  assert.equal(invalid.statusCode, 400);
});

test('inscrição: recusa time de outro esporte ou sem esporte', async () => {
  const poolFor = teamRow => ({ execute: async sql => {
    if (sql.startsWith('INSERT')) throw new Error('Não deve inscrever');
    return sql.includes('FROM campeonato') ? [[{ id_esporte: 1, esporte: 'Futebol' }]] : [[teamRow]];
  } });
  const other = response();
  await route(createApp(poolFor({ id_esporte: 4, esporte: 'Vôlei' })), path, 'post')({ params: { id: '1' }, body: { id_time: 2 } }, other, next);
  assert.equal(other.statusCode, 400);
  assert.match(other.body.erro, /Futebol.*Vôlei/);
  const none = response();
  await route(createApp(poolFor({ id_esporte: null, esporte: null })), path, 'post')({ params: { id: '1' }, body: { id_time: 2 } }, none, next);
  assert.equal(none.statusCode, 400);
  assert.match(none.body.erro, /esporte definido/);
});