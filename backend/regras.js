// ============================================================
// US19 - REGRAS DE PONTUAÇÃO
//
// GET /api/regras-pontuacao                     -> público
//     Lista todos os esportes com a regra de cada um
//     (null quando o esporte ainda não tem regra).
//
// PUT /api/esportes/:id/regra-pontuacao         -> administrador
//     Cria ou atualiza os pesos de vitória, empate e derrota.
//
// Quem aplica essas regras é o cálculo da classificação
// (classificacao.js, US20), que lê a tabela regra_pontuacao
// a cada consulta. Por isso, qualquer alteração aqui já
// reflete na tabela de classificação na hora.
// ============================================================

const MIN_PONTOS = 0;
const MAX_PONTOS = 100;

export function validateRule(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Dados inválidos.';

  const campos = {
    pontos_vitoria: 'vitória',
    pontos_empate: 'empate',
    pontos_derrota: 'derrota',
  };

  for (const [campo, nome] of Object.entries(campos)) {
    const valor = body[campo];
    if (!Number.isInteger(valor) || valor < MIN_PONTOS || valor > MAX_PONTOS) {
      return `Os pontos por ${nome} devem ser um número inteiro entre ${MIN_PONTOS} e ${MAX_PONTOS}.`;
    }
  }

  // A vitória precisa valer mais que os outros resultados,
  // senão a classificação perde o sentido.
  if (body.pontos_vitoria <= body.pontos_empate || body.pontos_vitoria <= body.pontos_derrota) {
    return 'A vitória deve valer mais pontos que o empate e que a derrota.';
  }

  return null;
}

export function registerRuleRoutes(app, pool) {
  const validId = value =>
    /^[1-9]\d*$/.test(String(value)) &&
    Number.isSafeInteger(Number(value));


  // ==========================================================
  // GET /api/regras-pontuacao
  // ==========================================================

  app.get('/api/regras-pontuacao', async (req, res, next) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          e.id_esporte,
          e.nome AS esporte,
          rp.pontos_vitoria,
          rp.pontos_empate,
          rp.pontos_derrota
        FROM esporte e
        LEFT JOIN regra_pontuacao rp
          ON rp.id_esporte = e.id_esporte
        ORDER BY e.nome
      `);

      res.set('Cache-Control', 'no-store');
      res.json(rows.map(row => ({
        id_esporte: row.id_esporte,
        esporte: row.esporte,
        configurada: row.pontos_vitoria !== null,
        pontos_vitoria: row.pontos_vitoria,
        pontos_empate: row.pontos_empate,
        pontos_derrota: row.pontos_derrota,
      })));

    } catch (error) {
      next(error);
    }
  });


  // ==========================================================
  // PUT /api/esportes/:id/regra-pontuacao
  // ==========================================================

  app.put('/api/esportes/:id/regra-pontuacao', async (req, res, next) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ erro: 'Identificador de esporte inválido.' });
    }

    const error = validateRule(req.body);
    if (error) return res.status(400).json({ erro: error });

    const { pontos_vitoria, pontos_empate, pontos_derrota } = req.body;

    try {
      const [esportes] = await pool.execute(
        'SELECT id_esporte, nome FROM esporte WHERE id_esporte = ?',
        [req.params.id]
      );

      if (!esportes.length) {
        return res.status(404).json({ erro: 'Esporte não encontrado.' });
      }

      // id_esporte é UNIQUE em regra_pontuacao: insere ou atualiza.
      await pool.execute(
        `
          INSERT INTO regra_pontuacao
            (id_esporte, pontos_vitoria, pontos_empate, pontos_derrota)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            pontos_vitoria = VALUES(pontos_vitoria),
            pontos_empate = VALUES(pontos_empate),
            pontos_derrota = VALUES(pontos_derrota)
        `,
        [req.params.id, pontos_vitoria, pontos_empate, pontos_derrota]
      );

      res.json({
        mensagem: `Regras de ${esportes[0].nome} salvas. A classificação já usa os novos valores.`,
        id_esporte: Number(req.params.id),
        pontos_vitoria,
        pontos_empate,
        pontos_derrota,
      });

    } catch (error) {
      next(error);
    }
  });
}
