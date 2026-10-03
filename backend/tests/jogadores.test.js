import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { validate } from '../validation.js';

// Mesmo padrão de api.test.js: chama os handlers direto, com um pool falso (nenhum banco real é usado).
function route(app, path, method) {
  return app.router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
const player = { nome: '  Carlos Eduardo  ', documento: ' 123.456.789-00 ', data_nascimento: '2000-05-10', foto_url: 'https://example.com/foto.jpg' };

test('valida jogador: aceita dados corretos e campos opcionais vazios', () => {
  assert.equal(validate('jogadores', player), null);
  assert.equal(validate('jogadores', { nome: 'Ana Souza', documento: '12345' }), null);
  assert.equal(validate('jogadores', { nome: 'Ana Souza', documento: '12345', data_nascimento: '', foto_url: '' }), null);
});

test('valida jogador: rejeita nome, documento, data e foto inválidos', () => {
  assert.ok(validate('jogadores', null));
  assert.ok(validate('jogadores', { documento: '12345' }));
  assert.ok(validate('jogadores', { nome: '  ', documento: '12345' }));
  assert.ok(validate('jogadores', { nome: 'Ana Souza' }));
  assert.ok(validate('jogadores', { nome: 'Ana Souza', documento: 'a'.repeat(31) }));
  for (const data_nascimento of ['2020-02-31', '31/12/2000', '1800-01-01', '2999-01-01']) {
    assert.ok(validate('jogadores', { ...player, data_nascimento }), data_nascimento);
  }
  for (const foto_url of ['javascript:alert(1)', 'file:///tmp/foto', 'url inválida']) {
    assert.ok(validate('jogadores', { ...player, foto_url }), foto_url);
  }
});

test('cadastra jogador com SQL parametrizado e valores aparados', async () => {
  let captured;
  const app = createApp({ execute: async (sql, values) => { captured = { sql, values }; return [{ insertId: 9 }]; } });
  const res = response();
  await route(app, '/api/jogadores', 'post')({ body: player }, res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.id_jogador, 9);
  assert.ok(captured.sql.includes('VALUES (?, ?, ?, ?)'));
  assert.deepEqual(captured.values, ['Carlos Eduardo', '2000-05-10', '123.456.789-00', 'https://example.com/foto.jpg']);
});

test('dados inválidos de jogador não chegam ao banco', async () => {
  const app = createApp({ execute: () => { throw new Error('Não deve executar SQL'); } });
  const res = response();
  await route(app, '/api/jogadores', 'post')({ body: { nome: 'Ana Souza' } }, res, error => { throw error; });
  assert.equal(res.statusCode, 400);
});

test('lista jogadores e consulta por id (400, 404 e 200)', async () => {
  const rows = [{ id_jogador: 1, nome: 'Ana Souza' }];
  const app = createApp({ query: async () => [rows], execute: async () => [rows] });
  const list = response();
  await route(app, '/api/jogadores', 'get')({}, list, error => { throw error; });
  assert.deepEqual(list.body, rows);
  const found = response();
  await route(app, '/api/jogadores/:id', 'get')({ params: { id: '1' } }, found, error => { throw error; });
  assert.deepEqual(found.body, { ...rows[0], times: rows });
  const invalid = response();
  await route(app, '/api/jogadores/:id', 'get')({ params: { id: '1 OR 1=1' } }, invalid, error => { throw error; });
  assert.equal(invalid.statusCode, 400);
  const missing = response();
  await route(createApp({ execute: async () => [[]] }), '/api/jogadores/:id', 'get')({ params: { id: '1' } }, missing, error => { throw error; });
  assert.equal(missing.statusCode, 404);
});

test('edita jogador, permite limpar opcionais e trata ausente', async () => {
  let mutation;
  const app = createApp({ execute: async (sql, values) => {
    if (sql.startsWith('SELECT')) return [[{ id_jogador: 4 }]];
    mutation = { sql, values };
    return [{ affectedRows: 1 }];
  } });
  const res = response();
  await route(app, '/api/jogadores/:id', 'put')({ params: { id: '4' }, body: { nome: 'Ana Souza', documento: '12345', data_nascimento: '', foto_url: '' } }, res, error => { throw error; });
  assert.equal(res.statusCode, 200);
  assert.ok(mutation.sql.startsWith('UPDATE jogador'));
  assert.deepEqual(mutation.values, ['Ana Souza', null, '12345', null, '4']);
  const missing = response();
  await route(createApp({ execute: async () => [[]] }), '/api/jogadores/:id', 'put')({ params: { id: '4' }, body: { nome: 'Ana Souza', documento: '12345' } }, missing, error => { throw error; });
  assert.equal(missing.statusCode, 404);
});

test('documento repetido vira 409 com mensagem do jogador', () => {
  const handler = createApp({}).router.stack.at(-1).handle;
  const res = response();
  handler({ code: 'ER_DUP_ENTRY' }, { path: '/api/jogadores' }, res, () => {});
  assert.equal(res.statusCode, 409);
  assert.match(res.body.erro, /jogador/);
});

function deletionPool({ exists = true, linked = false } = {}) {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push('begin'),
    rollback: async () => calls.push('rollback'),
    commit: async () => calls.push('commit'),
    release: () => calls.push('release'),
    execute: async sql => {
      calls.push(sql);
      if (sql.includes('FOR UPDATE')) return [exists ? [{ id: 4 }] : []];
      if (sql.startsWith('SELECT')) return [linked ? [{ related: 1 }] : []];
      return [{ affectedRows: 1 }];
    },
  };
  return { calls, getConnection: async () => connection };
}

test('exclui jogador sem vínculos e confirma a transação', async () => {
  const pool = deletionPool();
  const res = response();
  await route(createApp(pool), '/api/jogadores/:id', 'delete')({ params: { id: '4' } }, res, error => { throw error; });
  assert.equal(res.statusCode, 200);
  assert.ok(pool.calls.some(call => call.startsWith('DELETE FROM jogador')));
  assert.deepEqual(pool.calls.slice(-2), ['commit', 'release']);
});

test('não exclui jogador com vínculos nem inexistente', async () => {
  for (const config of [{ linked: true }, { exists: false }]) {
    const pool = deletionPool(config);
    const res = response();
    await route(createApp(pool), '/api/jogadores/:id', 'delete')({ params: { id: '4' } }, res, error => { throw error; });
    assert.equal(res.statusCode, config.linked ? 409 : 404);
    assert.ok(!pool.calls.some(call => call.startsWith('DELETE FROM')));
    assert.deepEqual(pool.calls.slice(-2), ['rollback', 'release']);
  }
});