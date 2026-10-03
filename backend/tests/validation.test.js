import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../validation.js';
const championship = { nome: 'Copa Regional', id_esporte: 1, data_inicial: '2026-04-01', data_fim: '2026-05-01', status: 'PLANEJADO' };
test('aceita campeonato e time válidos', () => {
  assert.equal(validate('campeonatos', championship), null);
  assert.equal(validate('times', { nome: 'União FC', id_esporte: 1, escudo_url: 'https://example.com/escudo.png' }), null);
});
test('rejeita datas invertidas e inexistentes', () => {
  assert.ok(validate('campeonatos', { ...championship, data_fim: '2026-03-01' }));
  assert.ok(validate('campeonatos', { ...championship, data_inicial: '2026-02-30' }));
  assert.ok(validate('campeonatos', { ...championship, data_inicial: '0000-01-01' }));
});
test('rejeita nome vazio, esporte inválido, status inválido e limites excedidos', () => {
  assert.ok(validate('times', { nome: '  ', id_esporte: 1 }));
  assert.ok(validate('times', { nome: 'Time', id_esporte: '1' }));
  assert.ok(validate('campeonatos', { ...championship, status: 'INVALIDO' }));
  assert.ok(validate('times', { nome: 'Time', id_esporte: 1, cidade: 'a'.repeat(101) }));
  assert.ok(validate('times', null));
});
test('rejeita protocolos perigosos e URLs inválidas', () => {
  for (const escudo_url of ['javascript:alert(1)', 'file:///tmp/escudo', 'url inválida']) {
    assert.ok(validate('times', { nome: 'Time', id_esporte: 1, escudo_url }));
  }
});
