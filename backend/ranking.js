const validId = value =>
  /^[1-9]\d*$/.test(String(value)) &&
  Number.isSafeInteger(Number(value));

export function registerRankingRoutes(app, pool) {
  app.get('/api/campeonatos/:id/ranking', async (req, res, next) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ erro: 'Identificador inválido.' });
    }

    try {
      const [championships] = await pool.execute(
        'SELECT id_campeonato FROM campeonato WHERE id_campeonato = ?',
        [req.params.id]
      );

      if (!championships.length) {
        return res.status(404).json({ erro: 'Campeonato não encontrado.' });
      }

      const [rows] = await pool.execute(
        `SELECT
          j.id_jogador,
          j.nome AS jogador_nome,
          COALESCE(el.posicao, j.posicao) AS jogador_posicao,
          t.id_time,
          t.nome AS time_nome,
          SUM(pt.quantidade) AS total_pontos
        FROM pontuacao pt
        INNER JOIN partida p ON p.id_partida = pt.id_partida
        INNER JOIN jogador j ON j.id_jogador = pt.id_jogador
        INNER JOIN time t ON t.id_time = pt.id_time
        LEFT JOIN elenco el
          ON el.id_jogador = j.id_jogador
          AND el.id_time = t.id_time
          AND el.ativo = TRUE
        WHERE p.id_campeonato = ?
          AND pt.id_jogador IS NOT NULL
        GROUP BY j.id_jogador, j.nome, el.posicao, j.posicao, t.id_time, t.nome
        ORDER BY total_pontos DESC, jogador_nome ASC, time_nome ASC`,
        [req.params.id]
      );

      res.set('Cache-Control', 'no-store');
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });
}
