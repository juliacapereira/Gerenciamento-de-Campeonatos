import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { calculateTeamStatistics, registerTeamStatisticsRoutes } from '../estatisticas-times.js';

const team = { id_time: 1, nome: 'Equipe', pontos_vitoria: 3, pontos_empate: 1, pontos_derrota: 0 };
const game = (a, b, x, y, status = 'ENCERRADA') => ({ id_time_a: a, id_time_b: b, placar_time_a: x, placar_time_b: y, status });

test('consolida mandante e visitante, empate sem gols e derrota', () => {
  assert.deepEqual(calculateTeamStatistics(team, [game(1, 2, 3, 1), game(3, 1, 0, 0), game(4, 1, 2, 1)]), {
    id_time: 1, partidas: 3, vitorias: 1, empates: 1, derrotas: 1,
    marcados: 4, sofridos: 3, saldo: 1, pontos: 4, aproveitamento: 44.44,
  });
});

test('ignora partidas pendentes, canceladas, sem placar e de outros times', () => {
  const matches = ['AGENDADA', 'EM_ANDAMENTO', 'ADIADA', 'CANCELADA'].map(status => game(1, 2, 8, 0, status));
  const stats = calculateTeamStatistics(team, [...matches, game(1, 2, null, 1), game(2, 3, 9, 8)]);
  assert.equal(stats.partidas, 0);
  assert.equal(stats.marcados, 0);
  assert.equal(stats.aproveitamento, 0);
});

test('aplica os pesos do esporte e preserva métricas sem regra configurada', () => {
  const matches = [game(1, 2, 80, 70), game(3, 1, 90, 75)];
  assert.equal(calculateTeamStatistics({ ...team, pontos_vitoria: 2, pontos_derrota: 1 }, matches).aproveitamento, 75);
  const stats = calculateTeamStatistics({ ...team, pontos_vitoria: null }, matches);
  assert.equal(stats.aproveitamento, null);
  assert.equal(stats.pontos, null);
  assert.equal(stats.marcados, 155);
});

function handler(pool) {
  const app = express();
  registerTeamStatisticsRoutes(app, pool);
  return app.router.stack[0].route.stack[0].handle;
}
function response() {
  return { statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; },
    set(key, value) { this.headers[key] = value; }, json(body) { this.body = body; } };
}
const next = error => { throw error; };

test('valida identificador e retorna 404 para time inexistente', async () => {
  for (const id of ['0', '-1', 'abc', '1 OR 1=1', '9007199254740992']) {
    const res = response();
    await handler({ execute() { assert.fail('Não deveria consultar o banco'); } })({ params: { id } }, res, next);
    assert.equal(res.statusCode, 400);
  }
  const res = response();
  await handler({ execute: async () => [[]] })({ params: { id: '1' } }, res, next);
  assert.equal(res.statusCode, 404);
});

test('nova consulta reflete encerramento e correção sem acumular totais antigos', async () => {
  let matches = [game(1, 2, 2, 0, 'EM_ANDAMENTO')];
  const queries = [];
  const route = handler({ execute: async (sql, params) => {
    queries.push({ sql, params });
    return [sql.includes('FROM time t') ? [team] : matches];
  } });
  const read = async () => {
    const res = response();
    await route({ params: { id: '1' } }, res, next);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    return res.body;
  };
  assert.equal((await read()).partidas, 0);
  matches = [game(1, 2, 2, 0)];
  assert.equal((await read()).aproveitamento, 100);
  matches = [game(1, 2, 0, 2)];
  const corrected = await read();
  assert.equal(corrected.partidas, 1);
  assert.equal(corrected.vitorias, 0);
  assert.equal(corrected.derrotas, 1);
  assert.equal(corrected.aproveitamento, 0);
  assert.deepEqual(queries[1].params, ['1', '1']);
  assert.match(queries[1].sql, /p.status = 'ENCERRADA'/);
});

test('encaminha falhas do banco ao tratamento de erros da API', async () => {
  const failure = new Error('Banco indisponível');
  let captured;
  await handler({ execute: async () => { throw failure; } })({ params: { id: '1' } }, response(), error => { captured = error; });
  assert.equal(captured, failure);
});
