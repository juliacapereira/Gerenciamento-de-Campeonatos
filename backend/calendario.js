const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
const statuses = ['AGENDADA', 'EM_ANDAMENTO', 'ENCERRADA', 'ADIADA', 'CANCELADA'];
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

// DATETIME é horário local do campeonato: não converter para UTC.
const matches = `SELECT p.id_partida, p.id_campeonato, p.id_time_a, p.id_time_b,
  DATE_FORMAT(p.data_hora, '%Y-%m-%dT%H:%i:%s') AS data_hora,
  p.local, p.status, c.nome AS campeonato, e.nome AS esporte,
  a.nome AS time_a, b.nome AS time_b, r.placar_time_a, r.placar_time_b
  FROM partida p
  JOIN campeonato c ON c.id_campeonato = p.id_campeonato
  JOIN esporte e ON e.id_esporte = c.id_esporte
  JOIN time a ON a.id_time = p.id_time_a
  JOIN time b ON b.id_time = p.id_time_b
  LEFT JOIN resultado r ON r.id_partida = p.id_partida`;

export function registerCalendarRoutes(app, pool) {
  app.get('/api/jogos', async (req, res, next) => {
    const { campeonato, esporte, time, status, inicio, fim } = req.query;
    if ([campeonato, esporte, time].some(value => value !== undefined && !validId(value)) ||
        (status !== undefined && !statuses.includes(status)) ||
        [inicio, fim].some(value => value !== undefined && !validDate(value)) ||
        (inicio && fim && inicio > fim)) {
      return res.status(400).json({ erro: 'Filtros inválidos. Confira os identificadores, status e período.' });
    }
    const conditions = [], values = [];
    for (const [value, column] of [[campeonato, 'p.id_campeonato'], [esporte, 'c.id_esporte'], [status, 'p.status']]) {
      if (value !== undefined) { conditions.push(`${column} = ?`); values.push(value); }
    }
    if (time !== undefined) { conditions.push('(p.id_time_a = ? OR p.id_time_b = ?)'); values.push(time, time); }
    if (inicio) { conditions.push('p.data_hora >= ?'); values.push(`${inicio} 00:00:00`); }
    if (fim) { conditions.push('p.data_hora < DATE_ADD(?, INTERVAL 1 DAY)'); values.push(fim); }
    try {
      const [rows] = await pool.execute(`${matches}${conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''} ORDER BY p.data_hora, p.id_partida`, values);
      res.json(rows);
    } catch (error) { next(error); }
  });

  app.get('/api/campeonatos/:id/resumo', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    try {
      const [championships] = await pool.execute(`SELECT c.id_campeonato, c.nome, c.id_esporte, e.nome AS esporte,
        DATE_FORMAT(c.data_inicial, '%Y-%m-%d') AS data_inicial,
        DATE_FORMAT(c.data_fim, '%Y-%m-%d') AS data_fim, c.status
        FROM campeonato c JOIN esporte e ON e.id_esporte = c.id_esporte
        WHERE c.id_campeonato = ?`, [req.params.id]);
      if (!championships.length) return res.status(404).json({ erro: 'Campeonato não encontrado.' });
      const [counts] = await pool.execute('SELECT COUNT(*) AS times FROM campeonato_time WHERE id_campeonato = ?', [req.params.id]);
      const [games] = await pool.execute(`${matches} WHERE p.id_campeonato = ? ORDER BY p.data_hora, p.id_partida`, [req.params.id]);
      const totals = Object.fromEntries(statuses.map(status => [status, games.filter(game => game.status === status).length]));
      res.json({ campeonato: championships[0], times: Number(counts[0].times), partidas: games.length, status: totals,
        proximos_jogos: games.filter(game => ['AGENDADA', 'EM_ANDAMENTO'].includes(game.status)).slice(0, 5),
        ultimos_resultados: games.filter(game => game.status === 'ENCERRADA' && game.placar_time_a !== null && game.placar_time_b !== null).reverse().slice(0, 5) });
    } catch (error) { next(error); }
  });
  // Consulta a classificação já calculada pela view do projeto.
  app.get('/api/campeonatos/:id/classificacao', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    try {
      const [championships] = await pool.execute('SELECT id_campeonato FROM campeonato WHERE id_campeonato = ?', [req.params.id]);
      if (!championships.length) return res.status(404).json({ erro: 'Campeonato não encontrado.' });
      const [rows] = await pool.execute(`SELECT posicao, id_time, time, pj, v, e, d, gp, gs, sg, pts
        FROM vw_classificacao WHERE id_campeonato = ? ORDER BY posicao`, [req.params.id]);
      res.json(rows);
    } catch (error) { next(error); }
  });

}
