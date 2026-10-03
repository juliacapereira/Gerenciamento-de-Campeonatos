// Elenco: vínculo de um jogador com um time (posição e número da camisa).
// O esporte do jogador vem do time. Mesmo padrão de app.js: o pool é recebido por parâmetro.
const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
const empty = value => value === undefined || value === null || value === '';

export function validateSquad(body, { needsPlayer = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Dados inválidos.';
  if (needsPlayer && !validId(body.id_jogador)) return 'Selecione um jogador.';
  if (!empty(body.posicao) && (typeof body.posicao !== 'string' || body.posicao.trim().length > 80)) return 'A posição deve ter até 80 caracteres.';
  if (!empty(body.numero_camisa) && !/^\d{1,3}$/.test(String(body.numero_camisa).trim())) return 'O número da camisa deve ser um inteiro de 0 a 999.';
  return null;
}

const clean = body => [
  typeof body.posicao === 'string' ? body.posicao.trim() || null : null,
  empty(body.numero_camisa) ? null : Number(String(body.numero_camisa).trim()),
];

export function registerSquadRoutes(app, pool) {
  const teamExists = async id => (await pool.execute('SELECT id_time FROM time WHERE id_time = ?', [id]))[0].length > 0;

  app.get('/api/times/:id/elenco', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    try {
      if (!(await teamExists(req.params.id))) return res.status(404).json({ erro: 'Time não encontrado.' });
      const [rows] = await pool.execute('SELECT el.id_jogador, j.nome, j.foto_url, el.posicao, el.numero_camisa FROM elenco el JOIN jogador j ON j.id_jogador = el.id_jogador WHERE el.id_time = ? ORDER BY j.nome', [req.params.id]);
      res.json(rows);
    } catch (error) { next(error); }
  });

  app.post('/api/times/:id/elenco', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    const error = validateSquad(req.body, { needsPlayer: true });
    if (error) return res.status(400).json({ erro: error });
    try {
      if (!(await teamExists(req.params.id))) return res.status(404).json({ erro: 'Time não encontrado.' });
      const [player] = await pool.execute('SELECT id_jogador FROM jogador WHERE id_jogador = ?', [req.body.id_jogador]);
      if (!player.length) return res.status(404).json({ erro: 'Jogador não encontrado.' });
      await pool.execute('INSERT INTO elenco (id_time, id_jogador, posicao, numero_camisa) VALUES (?, ?, ?, ?)', [req.params.id, req.body.id_jogador, ...clean(req.body)]);
      res.status(201).json({ mensagem: 'Jogador adicionado ao elenco!' });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Este jogador já faz parte do elenco deste time.' });
      next(error);
    }
  });

  app.put('/api/times/:id/elenco/:playerId', async (req, res, next) => {
    if (!validId(req.params.id) || !validId(req.params.playerId)) return res.status(400).json({ erro: 'Identificador inválido.' });
    const error = validateSquad(req.body);
    if (error) return res.status(400).json({ erro: error });
    try {
      const [existing] = await pool.execute('SELECT id_elenco FROM elenco WHERE id_time = ? AND id_jogador = ?', [req.params.id, req.params.playerId]);
      if (!existing.length) return res.status(404).json({ erro: 'Este jogador não faz parte do elenco.' });
      await pool.execute('UPDATE elenco SET posicao = ?, numero_camisa = ? WHERE id_time = ? AND id_jogador = ?', [...clean(req.body), req.params.id, req.params.playerId]);
      res.json({ mensagem: 'Elenco atualizado com sucesso!' });
    } catch (error) { next(error); }
  });

  app.delete('/api/times/:id/elenco/:playerId', async (req, res, next) => {
    if (!validId(req.params.id) || !validId(req.params.playerId)) return res.status(400).json({ erro: 'Identificador inválido.' });
    try {
      const [result] = await pool.execute('DELETE FROM elenco WHERE id_time = ? AND id_jogador = ?', [req.params.id, req.params.playerId]);
      if (!result.affectedRows) return res.status(404).json({ erro: 'Este jogador não faz parte do elenco.' });
      res.json({ mensagem: 'Jogador removido do elenco.' });
    } catch (error) { next(error); }
  });
}