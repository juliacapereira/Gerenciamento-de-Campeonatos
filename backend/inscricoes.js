// US10 - Inscrição de times em campeonatos (tabela campeonato_time).
// Mesmo padrão de app.js: o pool é recebido por parâmetro e erros vão para o tratador final.
const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));

export function registerEntryRoutes(app, pool) {
  const exists = async (table, column, id) => (await pool.execute(`SELECT ${column} FROM ${table} WHERE ${column} = ?`, [id]))[0].length > 0;

  app.get('/api/campeonatos/:id/times', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    try {
      if (!(await exists('campeonato', 'id_campeonato', req.params.id))) return res.status(404).json({ erro: 'Campeonato não encontrado.' });
      const [rows] = await pool.execute('SELECT ct.id_campeonato_time, ct.id_campeonato, ct.id_time, ct.data_inscricao, t.nome, t.nome_abreviado, t.cidade, t.escudo_url FROM campeonato_time ct JOIN time t ON t.id_time = ct.id_time WHERE ct.id_campeonato = ? ORDER BY t.nome', [req.params.id]);
      res.json(rows);
    } catch (error) { next(error); }
  });

  app.post('/api/campeonatos/:id/times', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    if (!req.body || !validId(req.body.id_time)) return res.status(400).json({ erro: 'Selecione um time válido.' });
    try {
      if (!(await exists('campeonato', 'id_campeonato', req.params.id))) return res.status(404).json({ erro: 'Campeonato não encontrado.' });
      if (!(await exists('time', 'id_time', req.body.id_time))) return res.status(404).json({ erro: 'Time não encontrado.' });
      const [result] = await pool.execute('INSERT INTO campeonato_time (id_campeonato, id_time) VALUES (?, ?)', [req.params.id, req.body.id_time]);
      res.status(201).json({ id_campeonato_time: result.insertId, mensagem: 'Time inscrito no campeonato com sucesso!' });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Este time já está inscrito neste campeonato.' });
      next(error);
    }
  });

  app.delete('/api/campeonatos/:id/times/:teamId', async (req, res, next) => {
    if (!validId(req.params.id) || !validId(req.params.teamId)) return res.status(400).json({ erro: 'Identificador inválido.' });
    try {
      const [result] = await pool.execute('DELETE FROM campeonato_time WHERE id_campeonato = ? AND id_time = ?', [req.params.id, req.params.teamId]);
      if (!result.affectedRows) return res.status(404).json({ erro: 'Inscrição não encontrada neste campeonato.' });
      res.json({ mensagem: 'Inscrição removida do campeonato.' });
    } catch (error) { next(error); }
  });
}
