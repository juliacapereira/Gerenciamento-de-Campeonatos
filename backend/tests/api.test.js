import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

// Invoke the registered handlers directly with a fake pool; no live database is modified.
function route(app, path, method) {
  return app.router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
test('cria campeonato com parâmetros SQL e retorna 201', async () => {
  let captured;
  const app = createApp({ execute: async (sql, values) => { captured = { sql, values }; return [{ insertId: 7 }]; } });
  const res = response();
  await route(app, '/api/campeonatos', 'post')({ body: { nome: "  Copa d'Água  ", id_esporte: 1, data_inicial: '2026-04-01', data_fim: '2026-05-01', status: 'PLANEJADO' } }, res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.id_campeonato, 7);
  assert.ok(captured.sql.includes('VALUES (?, ?, ?, ?, ?, ?)'));
  assert.equal(captured.values[1], "Copa d'Água");
  assert.equal(captured.values[2], null);
});
test('cria time e lista registros salvos pelo pool', async () => {
  const rows = [{ id_time: 2, nome: 'União FC', esporte: 'Futebol' }];
  const app = createApp({ execute: async () => [{ insertId: 2 }], query: async () => [rows] });
  const res = response();
  await route(app, '/api/times', 'post')({ body: { nome: 'União FC', id_esporte: 1 } }, res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.id_time, 2);
  const list = response();
  await route(app, '/api/times', 'get')({}, list, error => { throw error; });
  assert.deepEqual(list.body, rows);
});
test('dados inválidos não chegam ao banco', async () => {
  const app = createApp({ execute: () => { throw new Error('Não deve executar SQL'); } });
  const res = response();
  await route(app, '/api/times', 'post')({ body: { nome: '  ', id_esporte: 1 } }, res, error => { throw error; });
  assert.equal(res.statusCode, 400);
});
test('trata duplicidades e esportes inexistentes sem expor o banco', () => {
  const app = createApp({});
  const handler = app.router.stack.at(-1).handle;
  for (const [code, expected] of [['ER_DUP_ENTRY', 409], ['ER_NO_REFERENCED_ROW_2', 400]]) {
    const res = response();
    handler({ code }, { path: '/api/times' }, res, () => {});
    assert.equal(res.statusCode, expected);
    assert.ok(res.body.erro);
  }
});

test('detalhes retornam o cadastro, 404 para ausente e 400 para ID inválido', async () => {
  for (const kind of ['campeonatos', 'times']) {
    const record = { nome: 'Registro', id_esporte: 1 };
    const app = createApp({ execute: async () => [[record]] });
    const handler = route(app, `/api/${kind}/:id`, 'get');
    const res = response();
    await handler({ params: { id: '4' } }, res, error => { throw error; });
    assert.deepEqual(res.body, record);
    const invalid = response();
    await handler({ params: { id: '4 OR 1=1' } }, invalid, error => { throw error; });
    assert.equal(invalid.statusCode, 400);
    const missing = createApp({ execute: async () => [[]] });
    const absent = response();
    await route(missing, `/api/${kind}/:id`, 'get')({ params: { id: '4' } }, absent, error => { throw error; });
    assert.equal(absent.statusCode, 404);
  }
});

test('edição persiste campos completos e permite limpar opcionais', async () => {
  for (const kind of ['campeonatos', 'times']) {
    let mutation;
    const app = createApp({ execute: async (sql, values) => {
      if (sql.startsWith('SELECT')) return [[{ id: 4 }]];
      mutation = { sql, values };
      return [{ affectedRows: 1 }];
    } });
    const body = kind === 'campeonatos'
      ? { nome: 'Copa atualizada', id_esporte: 1, data_inicial: '2026-04-01', data_fim: '2026-05-01', status: 'INSCRICOES', descricao: '' }
      : { nome: 'Time atualizado', id_esporte: 1, descricao: '', cidade: '', nome_abreviado: '', escudo_url: '' };
    const res = response();
    await route(app, `/api/${kind}/:id`, 'put')({ params: { id: '4' }, body }, res, error => { throw error; });
    assert.equal(res.statusCode, 200);
    assert.ok(mutation.sql.startsWith('UPDATE'));
    assert.ok(mutation.sql.endsWith(' = ?'));
    assert.equal(mutation.values.at(-1), '4');
    assert.equal(mutation.values[2], null);
  }
});

test('edição rejeita cadastro ausente e dados inválidos antes de alterar', async () => {
  const app = createApp({ execute: async () => [[]] });
  const handler = route(app, '/api/times/:id', 'put');
  const missing = response();
  await handler({ params: { id: '1' }, body: { nome: 'Time', id_esporte: 1 } }, missing, error => { throw error; });
  assert.equal(missing.statusCode, 404);
  const invalid = response();
  await handler({ params: { id: '1' }, body: { nome: '', id_esporte: 1 } }, invalid, error => { throw error; });
  assert.equal(invalid.statusCode, 400);
});

function deletionPool({ exists = true, linked = false, failure = false } = {}) {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push('begin'),
    rollback: async () => calls.push('rollback'),
    commit: async () => calls.push('commit'),
    release: () => calls.push('release'),
    execute: async (sql, values) => {
      calls.push(sql);
      assert.deepEqual(values, ['4']);
      if (sql.includes('FOR UPDATE')) return [exists ? [{ id: 4 }] : []];
      if (sql.startsWith('SELECT')) return [linked ? [{ related: 1 }] : []];
      if (failure) throw new Error('Falha simulada');
      return [{ affectedRows: 1 }];
    },
  };
  return { calls, getConnection: async () => connection };
}

test('exclusão remove somente cadastros sem vínculos e confirma transação', async () => {
  for (const kind of ['campeonatos', 'times']) {
    const pool = deletionPool();
    const res = response();
    await route(createApp(pool), `/api/${kind}/:id`, 'delete')({ params: { id: '4' } }, res, error => { throw error; });
    assert.equal(res.statusCode, 200);
    assert.ok(pool.calls.some(call => call.startsWith('DELETE FROM')));
    assert.deepEqual(pool.calls.slice(-2), ['commit', 'release']);
  }
});

test('exclusão protege vínculos, trata ausentes e libera a conexão', async () => {
  for (const kind of ['campeonatos', 'times']) {
    for (const config of [{ linked: true }, { exists: false }]) {
      const pool = deletionPool(config);
      const res = response();
      await route(createApp(pool), `/api/${kind}/:id`, 'delete')({ params: { id: '4' } }, res, error => { throw error; });
      assert.equal(res.statusCode, config.linked ? 409 : 404);
      assert.ok(!pool.calls.some(call => call.startsWith('DELETE FROM')));
      assert.deepEqual(pool.calls.slice(-2), ['rollback', 'release']);
    }
  }
});

test('falha durante exclusão desfaz a transação', async () => {
  const pool = deletionPool({ failure: true });
  let captured;
  await route(createApp(pool), '/api/times/:id', 'delete')({ params: { id: '4' } }, response(), error => { captured = error; });
  assert.equal(captured.message, 'Falha simulada');
  assert.deepEqual(pool.calls.slice(-2), ['rollback', 'release']);
});
