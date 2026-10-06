import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { validateSquad } from '../elenco.js';

// Mesmo padrão dos outros testes: chama os handlers direto, com um pool falso (nenhum banco real é usado).
function route(app, path, method) {
  return app.router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
const next = error => { throw error; };

test('valida elenco: posição e camisa opcionais, limites e jogador obrigatório', () => {
  assert.equal(validateSquad({ id_jogador: 3, posicao: 'Goleiro', numero_camisa: 1 }, { needsPlayer: true }), null);
  assert.equal(validateSquad({ id_jogador: '3' }, { needsPlayer: true }), null);
  assert.equal(validateSquad({ posicao: '', numero_camisa: '' }), null);
  assert.ok(validateSquad({}, { needsPlayer: true }));
  assert.ok(validateSquad({ id_jogador: '1 OR 1=1' }, { needsPlayer: true }));
  assert.ok(validateSquad({ posicao: 'a'.repeat(81) }));
  for (const numero_camisa of [-1, 1000, 'dez', 1.5]) assert.ok(validateSquad({ numero_camisa }), String(numero_camisa));
  assert.ok(validateSquad(null));
});

test('adiciona jogador ao elenco com SQL parametrizado', async () => {
  const calls = [];
  const app = createApp({ execute: async (sql, values) => { calls.push({ sql, values }); return sql.startsWith('INSERT') ? [{ insertId: 1 }] : [[{ id: 1 }]]; } });
  const res = response();
  await route(app, '/api/times/:id/jogadores', 'post')({ params: { id: '2' }, body: { id_jogador: 5, posicao: '  Pivô ', numero_camisa: '10' } }, res, next);
  assert.equal(res.statusCode, 201);
  const insert = calls.at(-1);
  assert.ok(insert.sql.includes('VALUES (?, ?, ?, ?)'));
  assert.deepEqual(insert.values, ['2', 5, 'Pivô', 10]);
});

test('elenco: 400 para dados inválidos, 404 para time ou jogador ausente, 409 para repetido', async () => {
  const bad = response();
  await route(createApp({ execute: () => { throw new Error('Não deve executar SQL'); } }), '/api/times/:id/jogadores', 'post')({ params: { id: '2' }, body: {} }, bad, next);
  assert.equal(bad.statusCode, 400);
  const noTeam = response();
  await route(createApp({ execute: async () => [[]] }), '/api/times/:id/jogadores', 'post')({ params: { id: '2' }, body: { id_jogador: 5 } }, noTeam, next);
  assert.equal(noTeam.statusCode, 404);
  const noPlayer = response();
  await route(createApp({ execute: async sql => (sql.includes('FROM time') ? [[{ id_time: 2 }]] : [[]]) }), '/api/times/:id/jogadores', 'post')({ params: { id: '2' }, body: { id_jogador: 5 } }, noPlayer, next);
  assert.equal(noPlayer.statusCode, 404);
  const dup = response();
  const pool = { execute: async sql => { if (sql.startsWith('INSERT')) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }); return [[{ id: 1 }]]; } };
  await route(createApp(pool), '/api/times/:id/jogadores', 'post')({ params: { id: '2' }, body: { id_jogador: 5 } }, dup, next);
  assert.equal(dup.statusCode, 409);
  assert.match(dup.body.erro, /elenco/);
});

test('lista o elenco do time (400, 404 e 200)', async () => {
  const rows = [{ id_jogador: 5, nome: 'Ana Souza', posicao: 'Ala', numero_camisa: 7 }];
  const ok = response();
  await route(createApp({ execute: async sql => (sql.includes('FROM time') ? [[{ id_time: 2 }]] : [rows]) }), '/api/times/:id/jogadores', 'get')({ params: { id: '2' } }, ok, next);
  assert.deepEqual(ok.body, rows);
  const invalid = response();
  await route(createApp({}), '/api/times/:id/jogadores', 'get')({ params: { id: 'x' } }, invalid, next);
  assert.equal(invalid.statusCode, 400);
  const missing = response();
  await route(createApp({ execute: async () => [[]] }), '/api/times/:id/jogadores', 'get')({ params: { id: '2' } }, missing, next);
  assert.equal(missing.statusCode, 404);
});

test('edita e remove jogador do elenco', async () => {
  let update;
  const app = createApp({ execute: async (sql, values) => {
    if (sql.startsWith('SELECT')) return [[{ id_elenco: 1 }]];
    if (sql.startsWith('UPDATE')) update = values;
    return [{ affectedRows: 1 }];
  } });
  const put = response();
  await route(app, '/api/times/:id/jogadores/:playerId', 'put')({ params: { id: '2', playerId: '5' }, body: { posicao: '', numero_camisa: 9 } }, put, next);
  assert.equal(put.statusCode, 200);
  assert.deepEqual(update, [null, 9, '2', '5']);
  const del = response();
  await route(app, '/api/times/:id/jogadores/:playerId', 'delete')({ params: { id: '2', playerId: '5' } }, del, next);
  assert.equal(del.statusCode, 200);
  const missing = response();
  await route(createApp({ execute: async () => [{ affectedRows: 0 }] }), '/api/times/:id/jogadores/:playerId', 'delete')({ params: { id: '2', playerId: '5' } }, missing, next);
  assert.equal(missing.statusCode, 404);
});