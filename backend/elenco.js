// Elenco: vínculo de um jogador com um time (posição e número da camisa).
// O esporte do jogador vem do time. Mesmo padrão de app.js: o pool é recebido por parâmetro.
import { positionsBySport, positionsFor } from './posicoes.js';

const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
const splitPositions = value => String(value).split(',').map(item => item.trim()).filter(Boolean);
const empty = value => value === undefined || value === null || value === '';

export function validateSquad(body, { needsPlayer = false, sport } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Dados inválidos.';
  if (needsPlayer && !validId(body.id_jogador)) return 'Selecione um jogador.';
  if (!empty(body.posicao)) {
    if (typeof body.posicao !== 'string' || body.posicao.trim().length > 80) return 'A posição deve ter até 80 caracteres.';
    // Esportes com lista própria só aceitam posições dela (pode haver mais de uma, separadas por vírgula).
    const allowed = positionsFor(sport);
    if (allowed) {
      const chosen = splitPositions(body.posicao);
      if (new Set(chosen).size !== chosen.length || chosen.some(position => !allowed.includes(position))) return `Escolha posições válidas para ${sport}: ${allowed.join(', ')}.`;
    }
  }
  if (!empty(body.numero_camisa) && !/^\d{1,3}$/.test(String(body.numero_camisa).trim())) return 'O número da camisa deve ser um inteiro de 0 a 999.';
  return null;
}

const clean = body => [
  typeof body.posicao === 'string' ? splitPositions(body.posicao).join(', ') || null : null,
  empty(body.numero_camisa) ? null : Number(String(body.numero_camisa).trim()),
];

export function registerSquadRoutes(app, pool) {
  const findTeam = async id => (await pool.execute('SELECT t.id_time, e.nome AS esporte FROM time t LEFT JOIN esporte e ON e.id_esporte = t.id_esporte WHERE t.id_time = ?', [id]))[0][0];

  app.get('/api/posicoes', (req, res) => res.json(positionsBySport));

  app.get('/api/times/:id/jogadores', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    try {
      if (!(await findTeam(req.params.id))) return res.status(404).json({ erro: 'Time não encontrado.' });
      const [rows] = await pool.execute('SELECT el.id_elenco, el.id_jogador, j.nome, j.foto_url, el.posicao, el.numero_camisa FROM elenco el JOIN jogador j ON j.id_jogador = el.id_jogador WHERE el.id_time = ? ORDER BY j.nome', [req.params.id]);
      res.json(rows);
    } catch (error) { next(error); }
  });

  app.post('/api/times/:id/jogadores', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    const error = validateSquad(req.body, { needsPlayer: true });
    if (error) return res.status(400).json({ erro: error });
    try {
      const team = await findTeam(req.params.id);
      if (!team) return res.status(404).json({ erro: 'Time não encontrado.' });
      const positionError = validateSquad(req.body, { needsPlayer: true, sport: team.esporte });
      if (positionError) return res.status(400).json({ erro: positionError });
      const [player] = await pool.execute('SELECT id_jogador FROM jogador WHERE id_jogador = ?', [req.body.id_jogador]);
      if (!player.length) return res.status(404).json({ erro: 'Jogador não encontrado.' });
      await pool.execute('INSERT INTO elenco (id_time, id_jogador, posicao, numero_camisa) VALUES (?, ?, ?, ?)', [req.params.id, req.body.id_jogador, ...clean(req.body)]);
      res.status(201).json({ mensagem: 'Jogador adicionado ao elenco!' });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Este jogador já faz parte do elenco deste time.' });
      next(error);
    }
  });

  app.put('/api/times/:id/jogadores/:playerId', async (req, res, next) => {
    if (!validId(req.params.id) || !validId(req.params.playerId)) return res.status(400).json({ erro: 'Identificador inválido.' });
    const error = validateSquad(req.body);
    if (error) return res.status(400).json({ erro: error });
    try {
      const team = await findTeam(req.params.id);
      if (!team) return res.status(404).json({ erro: 'Time não encontrado.' });
      const positionError = validateSquad(req.body, { sport: team.esporte });
      if (positionError) return res.status(400).json({ erro: positionError });
      const [existing] = await pool.execute('SELECT id_elenco FROM elenco WHERE id_time = ? AND id_jogador = ?', [req.params.id, req.params.playerId]);
      if (!existing.length) return res.status(404).json({ erro: 'Este jogador não faz parte do elenco.' });
      await pool.execute('UPDATE elenco SET posicao = ?, numero_camisa = ? WHERE id_time = ? AND id_jogador = ?', [...clean(req.body), req.params.id, req.params.playerId]);
      res.json({ mensagem: 'Elenco atualizado com sucesso!' });
    } catch (error) { next(error); }
  });

  app.delete('/api/times/:id/jogadores/:playerId', async (req, res, next) => {
    if (!validId(req.params.id) || !validId(req.params.playerId)) return res.status(400).json({ erro: 'Identificador inválido.' });
    try {
      const [result] = await pool.execute('DELETE FROM elenco WHERE id_time = ? AND id_jogador = ?', [req.params.id, req.params.playerId]);
      if (!result.affectedRows) return res.status(404).json({ erro: 'Este jogador não faz parte do elenco.' });
      res.json({ mensagem: 'Jogador removido do elenco.' });
    } catch (error) { next(error); }
  });
}