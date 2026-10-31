// US20: consolidação recalculada a cada consulta, inclusive após correções de placar.
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/[\s-]+/g, '_');
const criteria = {
  V: ['v', -1], VITORIAS: ['v', -1], NUMERO_VITORIAS: ['v', -1],
  SG: ['sg', -1], SALDO: ['sg', -1], SALDO_GOLS: ['sg', -1], SALDO_DE_GOLS: ['sg', -1], SALDO_PONTOS: ['sg', -1],
  GP: ['gp', -1], GOLS_PRO: ['gp', -1], GOLS_MARCADOS: ['gp', -1], PONTOS_PRO: ['gp', -1],
  GS: ['gs', 1], GOLS_SOFRIDOS: ['gs', 1], PONTOS_CONTRA: ['gs', 1],
  D: ['d', 1], DERROTAS: ['d', 1], E: ['e', -1], EMPATES: ['e', -1],
};

export function calculateStandings(teams, matches, rules, tiebreakers = []) {
  const order = tiebreakers.length ? tiebreakers.map(item => {
    const criterion = criteria[normalize(item.criterio)];
    if (!criterion) throw new Error(`Critério de desempate não suportado: ${item.criterio}.`);
    return criterion;
  }) : [criteria.V, criteria.SG, criteria.GP];
  const rows = new Map(teams.map(team => [String(team.id_time), {
    id_time: team.id_time, time: team.time, pj: 0, v: 0, e: 0, d: 0, gp: 0, gs: 0, sg: 0, pts: 0,
  }]));
  for (const match of matches) {
    if (match.status !== 'ENCERRADA' || match.placar_time_a == null || match.placar_time_b == null) continue;
    const a = Number(match.placar_time_a), b = Number(match.placar_time_b);
    for (const [id, scored, conceded] of [[match.id_time_a, a, b], [match.id_time_b, b, a]]) {
      const row = rows.get(String(id));
      if (!row) continue;
      row.pj++;
      row[scored > conceded ? 'v' : scored === conceded ? 'e' : 'd']++;
      row.gp += scored;
      row.gs += conceded;
    }
  }
  for (const row of rows.values()) {
    row.sg = row.gp - row.gs;
    row.pts = row.v * Number(rules.pontos_vitoria) + row.e * Number(rules.pontos_empate) + row.d * Number(rules.pontos_derrota);
  }
  return [...rows.values()].sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    for (const [field, direction] of order) {
      if (a[field] !== b[field]) return direction * (a[field] - b[field]);
    }
    // Empate completo: ordem estável, sem acrescentar critério esportivo implícito.
    return String(a.id_time).localeCompare(String(b.id_time), 'en', { numeric: true });
  }).map((row, index) => ({ posicao: index + 1, ...row }));
}

export function registerStandingRoutes(app, pool) {
  app.get('/api/campeonatos/:id/classificacao', async (req, res, next) => {
    const id = req.params.id;
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return res.status(400).json({ erro: 'Identificador inválido.' });
    try {
      const [championships] = await pool.execute(`SELECT c.id_campeonato, rp.pontos_vitoria, rp.pontos_empate, rp.pontos_derrota
        FROM campeonato c LEFT JOIN regra_pontuacao rp ON rp.id_esporte = c.id_esporte WHERE c.id_campeonato = ?`, [id]);
      if (!championships.length) return res.status(404).json({ erro: 'Campeonato não encontrado.' });
      if (championships[0].pontos_vitoria == null) return res.status(409).json({ erro: 'As regras de pontuação deste esporte ainda não foram configuradas.' });
      const [teams] = await pool.execute(`SELECT t.id_time, t.nome AS time FROM campeonato_time ct
        INNER JOIN time t ON t.id_time = ct.id_time WHERE ct.id_campeonato = ?`, [id]);
      const [matches] = await pool.execute(`SELECT p.id_time_a, p.id_time_b, p.status, r.placar_time_a, r.placar_time_b
        FROM partida p INNER JOIN resultado r ON r.id_partida = p.id_partida
        WHERE p.id_campeonato = ? AND p.status = 'ENCERRADA'`, [id]);
      const [tiebreakers] = await pool.execute('SELECT criterio FROM criterio_desempate WHERE id_campeonato = ? ORDER BY ordem', [id]);
      if (tiebreakers.some(item => !criteria[normalize(item.criterio)])) return res.status(409).json({ erro: 'O campeonato possui um critério de desempate não suportado. Revise sua configuração.' });
      res.set('Cache-Control', 'no-store');
      res.json(calculateStandings(teams, matches, championships[0], tiebreakers));
    } catch (error) { next(error); }
  });
}
