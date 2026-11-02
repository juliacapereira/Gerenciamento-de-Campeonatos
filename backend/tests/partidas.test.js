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

const climaPath = '/api/partidas/:id/clima';

function poolClima({ partida = [{ id_partida: 1, id_campeonato: 2, id_usuario: 7 }], erroUpdate = null } = {}) {
  const calls = [];

  const connection = {
    beginTransaction: async () => calls.push('begin'),
    commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'),
    release: () => calls.push('release'),
    execute: async (sql, values) => {
      calls.push({ sql, values });

      if (sql.includes('SELECT')) {
        return [partida];
      }

      if (sql.includes('UPDATE partida')) {
        if (erroUpdate) throw erroUpdate;
        return [{ affectedRows: 1 }];
      }

      throw new Error(`SQL inesperado: ${sql}`);
    },
  };

  return {
    calls,
    pool: {
      getConnection: async () => connection,
    },
  };
}

test('US22: proprietário registra condições climáticas e confirma transação', async () => {
  const fake = poolClima();
  const res = response();

  await route(createApp(fake.pool), climaPath, 'patch')(
    {
      params: { id: '1' },
      body: { clima: '  Ensolarado  ' },
      usuario: { id_usuario: 7 },
    },
    res,
    next
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.clima, 'Ensolarado');
  assert.ok(fake.calls.some(c => c.sql?.includes('UPDATE partida')));
  assert.ok(fake.calls.some(c => c.values?.[0] === 'Ensolarado'));
  assert.ok(fake.calls.includes('commit'));
  assert.ok(!fake.calls.includes('rollback'));
  assert.ok(fake.calls.includes('release'));
});

test('US22: campo vazio remove as condições climáticas', async () => {
  const fake = poolClima();
  const res = response();

  await route(createApp(fake.pool), climaPath, 'patch')(
    {
      params: { id: '1' },
      body: { clima: '   ' },
      usuario: { id_usuario: 7 },
    },
    res,
    next
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.clima, null);
  assert.ok(fake.calls.some(c => c.sql?.includes('UPDATE partida') && c.values[0] === null));
  assert.ok(fake.calls.includes('commit'));
  assert.ok(fake.calls.includes('release'));
});

test('US22: rejeita ID inválido e descrição acima de 150 caracteres', async () => {
  const fake = poolClima();
  const handler = route(createApp(fake.pool), climaPath, 'patch');

  const invalidId = response();
  await handler(
    {
      params: { id: 'abc' },
      body: { clima: 'Ensolarado' },
      usuario: { id_usuario: 7 },
    },
    invalidId,
    next
  );

  assert.equal(invalidId.statusCode, 400);

  const invalidClima = response();
  await handler(
    {
      params: { id: '1' },
      body: { clima: 'A'.repeat(151) },
      usuario: { id_usuario: 7 },
    },
    invalidClima,
    next
  );

  assert.equal(invalidClima.statusCode, 400);
  assert.equal(fake.calls.length, 0);
});

test('US22: retorna 404 quando a partida não existe', async () => {
  const fake = poolClima({ partida: [] });
  const res = response();

  await route(createApp(fake.pool), climaPath, 'patch')(
    {
      params: { id: '1' },
      body: { clima: 'Chuvoso' },
      usuario: { id_usuario: 7 },
    },
    res,
    next
  );

  assert.equal(res.statusCode, 404);
  assert.ok(fake.calls.includes('rollback'));
  assert.ok(fake.calls.includes('release'));
  assert.ok(!fake.calls.includes('commit'));
});

test('US22: impede administrador que não é proprietário do campeonato', async () => {
  const fake = poolClima();
  const res = response();

  await route(createApp(fake.pool), climaPath, 'patch')(
    {
      params: { id: '1' },
      body: { clima: 'Chuvoso' },
      usuario: { id_usuario: 99 },
    },
    res,
    next
  );

  assert.equal(res.statusCode, 403);
  assert.ok(fake.calls.includes('rollback'));
  assert.ok(fake.calls.includes('release'));
  assert.ok(!fake.calls.some(c => c.sql?.includes('UPDATE partida')));
});

test('US22: erro ao atualizar clima provoca rollback e libera conexão', async () => {
  const fake = poolClima({ erroUpdate: new Error('Falha simulada no banco') });
  const res = response();
  let erroRecebido;

  await route(createApp(fake.pool), climaPath, 'patch')(
    {
      params: { id: '1' },
      body: { clima: 'Nublado' },
      usuario: { id_usuario: 7 },
    },
    res,
    error => { erroRecebido = error; }
  );

  assert.equal(erroRecebido?.message, 'Falha simulada no banco');
  assert.ok(fake.calls.includes('rollback'));
  assert.ok(fake.calls.includes('release'));
  assert.ok(!fake.calls.includes('commit'));
});
