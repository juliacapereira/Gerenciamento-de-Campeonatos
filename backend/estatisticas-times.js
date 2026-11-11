import { calculateStandings } from './classificacao.js';

export function calculateTeamStatistics(team, matches) {
  const configured = team.pontos_vitoria != null && Number(team.pontos_vitoria) > 0;
  const rules = configured ? team : { pontos_vitoria: 0, pontos_empate: 0, pontos_derrota: 0 };
  const [row] = calculateStandings([{ id_time: team.id_time, time: team.nome }], matches, rules);
  return {
    id_time: team.id_time,
    partidas: row.pj,
    vitorias: row.v,
    empates: row.e,
    derrotas: row.d,
    marcados: row.gp,
    sofridos: row.gs,
    saldo: row.sg,
    pontos: configured ? row.pts : null,
    aproveitamento: configured
      ? (row.pj ? Math.round(row.pts / (row.pj * Number(team.pontos_vitoria)) * 10000) / 100 : 0)
      : null,
  };
}

export function registerTeamStatisticsRoutes(app, pool) {
  app.get('/api/times/:id/estatisticas', async (req, res, next) => {
    const { id } = req.params;
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      return res.status(400).json({ erro: 'Identificador de time inválido.' });
    }
    try {
      const [teams] = await pool.execute(`SELECT t.id_time, t.nome,
        rp.pontos_vitoria, rp.pontos_empate, rp.pontos_derrota
        FROM time t LEFT JOIN regra_pontuacao rp ON rp.id_esporte = t.id_esporte
        WHERE t.id_time = ?`, [id]);
      if (!teams.length) return res.status(404).json({ erro: 'Time não encontrado.' });
      // O resumo é derivado dos resultados atuais, sem persistir totais que possam
      // ficar desatualizados ao encerrar uma partida ou corrigir seu placar.
      const [matches] = await pool.execute(`SELECT p.id_time_a, p.id_time_b, p.status,
        r.placar_time_a, r.placar_time_b
        FROM partida p INNER JOIN resultado r ON r.id_partida = p.id_partida
        WHERE (p.id_time_a = ? OR p.id_time_b = ?) AND p.status = 'ENCERRADA'`, [id, id]);
      res.set('Cache-Control', 'no-store');
      res.json(calculateTeamStatistics(teams[0], matches));
    } catch (error) { next(error); }
  });
}
