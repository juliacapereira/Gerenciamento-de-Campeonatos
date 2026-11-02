import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

// Mesmo padrão dos outros testes: chama o handler direto, com um pool falso.
function route(app, path, method) {
  return app.router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
const next = error => { throw error; };

const postPath = '/api/partidas/:id/acontecimentos';
const deletePath = '/api/partidas/:id/acontecimentos/:id_acontecimento';
const partida = { id_partida: 1, id_time_a: 10, id_time_b: 20, status: 'EM_ANDAMENTO' };

function poolFalso({ partidaRow = partida, elenco = [{ id_time: 10 }], calls = [] } = {}) {
  return {
    execute: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes('FROM partida')) return [partidaRow ? [partidaRow] : []];
      if (sql.includes('FROM elenco')) return [elenco];
      if (sql.trim().startsWith('INSERT')) return [{ insertId: 7 }];
      throw new Error(`SQL inesperado: ${sql}`);
    },
  };
}

async function enviar(pool, body, params = { id: '1' }) {
  const res = response();
  await route(createApp(pool), postPath, 'post')({ params, body }, res, next);
  return res;
}

test('registra acontecimento com jogador e deduz o time pelo elenco', async () => {
  const calls = [];
  const res = await enviar(poolFalso({ calls }), { tipo: 'Cartão amarelo', minuto: 23, id_jogador: 5, descricao: '  falta dura  ' });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.id_acontecimento, 7);
  const insert = calls.at(-1);
  assert.ok(insert.sql.includes('VALUES (?, ?, ?, ?, ?, ?)'));
  assert.deepEqual(insert.values, [1, 10, 5, 'Cartão amarelo', 23, 'falta dura']);
});

test('lances da partida inteira não guardam time nem jogador', async () => {
  const calls = [];
  const res = await enviar(poolFalso({ calls }), { tipo: 'Intervalo', minuto: 45, id_jogador: 5, id_time: 10 });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(calls.at(-1).values, [1, null, null, 'Intervalo', 45, null]);
});

test('rejeita dados inválidos antes de consultar o banco', async () => {
  const semSql = { execute: () => { throw new Error('Não deve executar SQL'); } };
  const casos = [
    [{ minuto: 10 }, /tipo/],
    [{ tipo: 'Inventado', minuto: 10 }, /tipo/],
    [{ tipo: 'Falta' }, /minuto/],
    [{ tipo: 'Falta', minuto: -1, id_jogador: 5 }, /minuto/],
    [{ tipo: 'Falta', minuto: 301, id_jogador: 5 }, /minuto/],
    [{ tipo: 'Falta', minuto: 1.5, id_jogador: 5 }, /minuto/],
    [{ tipo: 'Falta', minuto: 10 }, /jogador/],
    [{ tipo: 'Falta', minuto: 10, id_jogador: '5 OR 1=1' }, /Jogador inválido/],
    [{ tipo: 'Outro', minuto: 10 }, /Descreva/],
    [{ tipo: 'Outro', minuto: 10, descricao: 'x'.repeat(501) }, /500/],
    [undefined, /tipo/],
  ];
  for (const [body, mensagem] of casos) {
    const res = await enviar(semSql, body);
    assert.equal(res.statusCode, 400, JSON.stringify(body));
    assert.match(res.body.erro, mensagem);
  }
  const idInvalido = await enviar(semSql, { tipo: 'Falta', minuto: 1, id_jogador: 5 }, { id: 'x' });
  assert.equal(idInvalido.statusCode, 400);
});

test('404 para partida ausente e 409 para cancelada ou adiada', async () => {
  const ausente = await enviar(poolFalso({ partidaRow: null }), { tipo: 'Intervalo', minuto: 45 });
  assert.equal(ausente.statusCode, 404);
  for (const status of ['CANCELADA', 'ADIADA']) {
    const res = await enviar(poolFalso({ partidaRow: { ...partida, status } }), { tipo: 'Intervalo', minuto: 45 });
    assert.equal(res.statusCode, 409);
  }
});

test('permite registrar em partida encerrada (correção posterior)', async () => {
  const res = await enviar(poolFalso({ partidaRow: { ...partida, status: 'ENCERRADA' } }), { tipo: 'Intervalo', minuto: 45 });
  assert.equal(res.statusCode, 201);
});

test('jogador de fora da partida ou de outro time é rejeitado', async () => {
  const fora = await enviar(poolFalso({ elenco: [] }), { tipo: 'Falta', minuto: 5, id_jogador: 99 });
  assert.equal(fora.statusCode, 400);
  assert.match(fora.body.erro, /não pertence a nenhum/);

  const outroTime = await enviar(poolFalso({ elenco: [{ id_time: 10 }] }), { tipo: 'Falta', minuto: 5, id_jogador: 5, id_time: 20 });
  assert.equal(outroTime.statusCode, 400);
  assert.match(outroTime.body.erro, /não pertence ao time/);

  const timeEstranho = await enviar(poolFalso(), { tipo: 'Substituição', minuto: 60, id_time: 99 });
  assert.equal(timeEstranho.statusCode, 400);
  assert.match(timeEstranho.body.erro, /não joga/);
});

test('remove acontecimento e trata ausente ou id inválido', async () => {
  const calls = [];
  const ok = response();
  await route(createApp({ execute: async (sql, values) => { calls.push({ sql, values }); return [{ affectedRows: 1 }]; } }), deletePath, 'delete')({ params: { id: '1', id_acontecimento: '3' } }, ok, next);
  assert.equal(ok.statusCode, 200);
  assert.deepEqual(calls[0].values, ['3', '1']);

  const ausente = response();
  await route(createApp({ execute: async () => [{ affectedRows: 0 }] }), deletePath, 'delete')({ params: { id: '1', id_acontecimento: '3' } }, ausente, next);
  assert.equal(ausente.statusCode, 404);

  const invalido = response();
  await route(createApp({}), deletePath, 'delete')({ params: { id: '1', id_acontecimento: 'x' } }, invalido, next);
  assert.equal(invalido.statusCode, 400);
});