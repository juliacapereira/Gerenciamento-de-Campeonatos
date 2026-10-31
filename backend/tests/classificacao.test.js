import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { calculateStandings, registerStandingRoutes } from '../classificacao.js';
const teams = [1, 2, 3].map(id_time => ({ id_time, time: `Time ${id_time}` }));
const rules = { pontos_vitoria: 3, pontos_empate: 1, pontos_derrota: 0 };
const game = (a, b, x, y, status = 'ENCERRADA') => ({ id_time_a: a, id_time_b: b, placar_time_a: x, placar_time_b: y, status });

test('calcula todos os indicadores e mantém inscritos sem partidas', () => {
  const rows = calculateStandings(teams, [game(1, 2, 3, 1), game(2, 1, 0, 0)], rules);
  assert.deepEqual(rows[0], { posicao: 1, ...teams[0], pj: 2, v: 1, e: 1, d: 0, gp: 3, gs: 1, sg: 2, pts: 4 });
  assert.deepEqual(rows[1], { posicao: 2, ...teams[1], pj: 2, v: 0, e: 1, d: 1, gp: 1, gs: 3, sg: -2, pts: 1 });
  assert.equal(rows[2].pj, 0);
  assert.equal(rows[2].pts, 0);
});
test('ignora partidas sem resultado final ou não encerradas e aplica pesos do esporte', () => {
  const rows = calculateStandings(teams, [game(1, 2, 2, 0), game(1, 2, null, null), ...['AGENDADA', 'EM_ANDAMENTO', 'ADIADA', 'CANCELADA'].map(s => game(1, 2, 9, 0, s))], { pontos_vitoria: 2, pontos_empate: 0, pontos_derrota: 1 });
  assert.equal(rows[0].pj, 1);
  assert.equal(rows[0].pts, 2);
  assert.equal(rows[1].pts, 1);
});
test('correção de placar recalcula sem acumular resultados anteriores', () => {
  assert.equal(calculateStandings(teams, [game(1, 2, 1, 0)], rules)[0].id_time, 1);
  const corrected = calculateStandings(teams, [game(1, 2, 0, 2)], rules);
  assert.equal(corrected[0].id_time, 2);
  assert.equal(corrected[0].pts, 3);
  assert.equal(corrected.find(row => row.id_time === 1).pts, 0);
});
test('respeita a prioridade dos critérios cadastrados antes do desempate estável', () => {
  const matches = [game(1, 3, 5, 4), game(2, 3, 1, 0)];
  assert.equal(calculateStandings(teams, matches, rules, [{ criterio: 'GP' }, { criterio: 'GS' }])[0].id_time, 1);
  assert.equal(calculateStandings(teams, matches, rules, [{ criterio: 'gols sofridos' }, { criterio: 'GP' }])[0].id_time, 2);
  assert.deepEqual(calculateStandings([...teams].reverse(), [], rules).map(row => row.id_time), [1, 2, 3]);
  assert.throws(() => calculateStandings(teams, [], rules, [{ criterio: 'inexistente' }]));
});
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, set() {}, json(body) { this.body = body; } });
const handler = pool => { const app = express(); registerStandingRoutes(app, pool); return app.router.stack[0].route.stack[0].handle; };
test('endpoint valida ID, existência, regras e critérios sem retornar classificação incorreta', async () => {
  for (const [id, data, expected] of [['x', [], 400], ['1', [], 404], ['1', [{}], 409]]) {
    const res = response();
    await handler({ execute: async () => [data] })({ params: { id } }, res, e => { throw e; });
    assert.equal(res.statusCode, expected);
  }
  const queries = [];
  const answers = [[rules], teams, [game(1, 2, 1, 0)], [{ criterio: 'SG' }]];
  const res = response();
  await handler({ execute: async (sql, values) => { queries.push({ sql, values }); return [answers.shift()]; } })({ params: { id: '7' } }, res, e => { throw e; });
  assert.equal(res.body[0].pts, 3);
  assert.ok(queries.every(q => q.values[0] === '7'));
  assert.match(queries[3].sql, /ORDER BY ordem/);
});
