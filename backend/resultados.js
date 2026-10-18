// ============================================================
// US16 - REGISTRO DO PLACAR FINAL
// US17 - CADASTRO DE GOLS OU PONTOS
//
// GET    /api/partidas/:id/placar                       -> público
// PUT    /api/partidas/:id/resultado                    -> admin (US16)
// POST   /api/partidas/:id/pontuacoes                   -> admin (US17)
// DELETE /api/partidas/:id/pontuacoes/:id_pontuacao     -> admin (US17)
//
// A autenticação de POST/PUT/DELETE já é feita pelo middleware
// geral do app.js. Qualquer administrador logado pode alterar
// qualquer partida.
// ============================================================

export function registerResultRoutes(app, pool) {
  const validId = value =>
    /^[1-9]\d*$/.test(String(value)) &&
    Number.isSafeInteger(Number(value));

  // Converte para inteiro. Devolve NaN se não for um inteiro.
  const inteiro = value => {
    if (value === undefined || value === null || value === '') return NaN;
    const numero = Number(value);
    return Number.isInteger(numero) ? numero : NaN;
  };


  // ------------------------------------------------------------
  // Busca a partida e trava a linha (FOR UPDATE) até o fim da
  // transação. Qualquer administrador logado pode alterar
  // qualquer partida, por isso não há checagem de dono.
  // ------------------------------------------------------------

  async function buscarPartida(connection, idPartida) {
    const [rows] = await connection.execute(
      `
        SELECT
          p.id_partida,
          p.id_time_a,
          p.id_time_b,
          p.status
        FROM partida p
        WHERE p.id_partida = ?
        FOR UPDATE
      `,
      [idPartida]
    );

    return rows[0] ?? null;
  }


  // ------------------------------------------------------------
  // Soma os gols/pontos registrados de cada time (US17).
  // ------------------------------------------------------------

  async function placarAcumulado(connection, partida) {
    const [rows] = await connection.execute(
      `
        SELECT
          COALESCE(SUM(CASE WHEN id_time = ? THEN quantidade END), 0) AS time_a,
          COALESCE(SUM(CASE WHEN id_time = ? THEN quantidade END), 0) AS time_b
        FROM pontuacao
        WHERE id_partida = ?
      `,
      [partida.id_time_a, partida.id_time_b, partida.id_partida]
    );

    return {
      time_a: Number(rows[0].time_a),
      time_b: Number(rows[0].time_b),
    };
  }


  // ------------------------------------------------------------
  // Erros lançados pelos triggers do banco (SIGNAL '45000')
  // viram 409 com a mensagem do próprio trigger.
  // ------------------------------------------------------------

  function tratarErro(error, res, next) {
    if (error.sqlState === '45000') {
      return res.status(409).json({ erro: error.sqlMessage });
    }

    next(error);
  }


  // ============================================================
  // GET /api/partidas/:id/placar
  //
  // Público. Devolve a partida, o placar final (se houver),
  // o placar acumulado e a lista de gols/pontos.
  // ============================================================

  app.get('/api/partidas/:id/placar', async (req, res, next) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ erro: 'Identificador de partida inválido.' });
    }

    try {
      const [partidas] = await pool.execute(
        `
          SELECT
            p.id_partida,
            p.id_campeonato,
            p.id_time_a,
            p.id_time_b,
            p.data_hora,
            p.local,
            p.status,
            ta.nome AS time_a,
            tb.nome AS time_b
          FROM partida p
          INNER JOIN time ta ON ta.id_time = p.id_time_a
          INNER JOIN time tb ON tb.id_time = p.id_time_b
          WHERE p.id_partida = ?
        `,
        [req.params.id]
      );

      if (!partidas.length) {
        return res.status(404).json({ erro: 'Partida não encontrada.' });
      }

      const partida = partidas[0];

      const [resultados] = await pool.execute(
        `
          SELECT placar_time_a, placar_time_b, registrado_em, atualizado_em
          FROM resultado
          WHERE id_partida = ?
        `,
        [partida.id_partida]
      );

      // Ordem cronológica: pelo minuto e, em caso de empate, pela ordem de cadastro
      const [pontuacoes] = await pool.execute(
        `
          SELECT
            pt.id_pontuacao,
            pt.id_time,
            t.nome AS time,
            pt.id_jogador,
            j.nome AS jogador,
            pt.quantidade,
            pt.minuto
          FROM pontuacao pt
          INNER JOIN time t ON t.id_time = pt.id_time
          LEFT JOIN jogador j ON j.id_jogador = pt.id_jogador
          WHERE pt.id_partida = ?
          ORDER BY pt.minuto IS NULL, pt.minuto ASC, pt.id_pontuacao ASC
        `,
        [partida.id_partida]
      );

      res.json({
        partida,
        resultado: resultados[0] ?? null,
        placar_acumulado: await placarAcumulado(pool, partida),
        pontuacoes,
      });

    } catch (error) {
      next(error);
    }
  });


  // ============================================================
  // PUT /api/partidas/:id/resultado          (US16)
  //
  // Registra ou corrige o placar final e encerra a partida.
  // ============================================================

  app.put('/api/partidas/:id/resultado', async (req, res, next) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ erro: 'Identificador de partida inválido.' });
    }

    const placarA = inteiro(req.body?.placar_time_a);
    const placarB = inteiro(req.body?.placar_time_b);

    if (
      Number.isNaN(placarA) || placarA < 0 || placarA > 999 ||
      Number.isNaN(placarB) || placarB < 0 || placarB > 999
    ) {
      return res.status(400).json({
        erro: 'Informe o placar dos dois times com números inteiros entre 0 e 999.',
      });
    }

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const partida = await buscarPartida(connection, req.params.id);

      if (!partida) {
        await connection.rollback();
        return res.status(404).json({ erro: 'Partida não encontrada.' });
      }

      if (partida.status === 'CANCELADA' || partida.status === 'ADIADA') {
        await connection.rollback();
        return res.status(409).json({
          erro: 'Não é possível registrar placar de uma partida cancelada ou adiada.',
        });
      }

      // Regra entre US16 e US17: o placar final não pode ser menor
      // que os gols/pontos já cadastrados durante a partida.
      const acumulado = await placarAcumulado(connection, partida);

      if (placarA < acumulado.time_a || placarB < acumulado.time_b) {
        await connection.rollback();
        return res.status(409).json({
          erro:
            `O placar final não pode ser menor que os gols/pontos já cadastrados ` +
            `(${acumulado.time_a} x ${acumulado.time_b}). Remova os registros errados antes.`,
        });
      }

      // Insere ou atualiza (id_partida é UNIQUE na tabela resultado)
      await connection.execute(
        `
          INSERT INTO resultado (id_partida, placar_time_a, placar_time_b)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            placar_time_a = ?,
            placar_time_b = ?
        `,
        [partida.id_partida, placarA, placarB, placarA, placarB]
      );

      // O trigger do banco já encerra a partida. Fazemos também aqui
      // para garantir, caso o trigger não exista no banco.
      await connection.execute(
        `
          UPDATE partida
          SET status = 'ENCERRADA'
          WHERE id_partida = ?
            AND status <> 'ENCERRADA'
        `,
        [partida.id_partida]
      );

      await connection.commit();

      res.json({
        mensagem: 'Placar final registrado. Partida encerrada.',
        id_partida: partida.id_partida,
        placar_time_a: placarA,
        placar_time_b: placarB,
        status: 'ENCERRADA',
      });

    } catch (error) {
      if (connection) await connection.rollback();
      tratarErro(error, res, next);
    } finally {
      connection?.release();
    }
  });


  // ============================================================
  // POST /api/partidas/:id/pontuacoes        (US17)
  //
  // Registra um gol/ponto: time beneficiado, minuto e quantidade.
  // ============================================================

  app.post('/api/partidas/:id/pontuacoes', async (req, res, next) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ erro: 'Identificador de partida inválido.' });
    }

    const idTime = inteiro(req.body?.id_time);
    const minuto = inteiro(req.body?.minuto);
    const quantidade =
      req.body?.quantidade === undefined || req.body?.quantidade === null || req.body?.quantidade === ''
        ? 1
        : inteiro(req.body.quantidade);

    if (!validId(idTime)) {
      return res.status(400).json({ erro: 'Selecione o time que marcou.' });
    }

    if (Number.isNaN(minuto) || minuto < 0 || minuto > 300) {
      return res.status(400).json({ erro: 'Informe o minuto como um número inteiro entre 0 e 300.' });
    }

    if (Number.isNaN(quantidade) || quantidade < 1 || quantidade > 100) {
      return res.status(400).json({ erro: 'A quantidade deve ser um número inteiro entre 1 e 100.' });
    }

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const partida = await buscarPartida(connection, req.params.id);

      if (!partida) {
        await connection.rollback();
        return res.status(404).json({ erro: 'Partida não encontrada.' });
      }

      if (partida.status === 'ENCERRADA') {
        await connection.rollback();
        return res.status(409).json({
          erro: 'Esta partida já está encerrada. Não é possível cadastrar novos gols/pontos.',
        });
      }

      if (partida.status === 'CANCELADA' || partida.status === 'ADIADA') {
        await connection.rollback();
        return res.status(409).json({
          erro: 'Não é possível cadastrar gols/pontos em uma partida cancelada ou adiada.',
        });
      }

      if (idTime !== Number(partida.id_time_a) && idTime !== Number(partida.id_time_b)) {
        await connection.rollback();
        return res.status(400).json({ erro: 'O time informado não joga esta partida.' });
      }

      const [result] = await connection.execute(
        `
          INSERT INTO pontuacao (id_partida, id_time, quantidade, minuto)
          VALUES (?, ?, ?, ?)
        `,
        [partida.id_partida, idTime, quantidade, minuto]
      );

      // Primeiro gol/ponto registrado: a partida passa a "em andamento"
      if (partida.status === 'AGENDADA') {
        await connection.execute(
          `UPDATE partida SET status = 'EM_ANDAMENTO' WHERE id_partida = ?`,
          [partida.id_partida]
        );
      }

      const acumulado = await placarAcumulado(connection, partida);

      await connection.commit();

      res.status(201).json({
        mensagem: 'Gol/ponto registrado com sucesso!',
        id_pontuacao: result.insertId,
        placar_acumulado: acumulado,
      });

    } catch (error) {
      if (connection) await connection.rollback();
      tratarErro(error, res, next);
    } finally {
      connection?.release();
    }
  });


  // ============================================================
  // DELETE /api/partidas/:id/pontuacoes/:id_pontuacao   (US17)
  //
  // Remove um registro feito por engano.
  // ============================================================

  app.delete('/api/partidas/:id/pontuacoes/:id_pontuacao', async (req, res, next) => {
    if (!validId(req.params.id) || !validId(req.params.id_pontuacao)) {
      return res.status(400).json({ erro: 'Identificador inválido.' });
    }

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const partida = await buscarPartida(connection, req.params.id);

      if (!partida) {
        await connection.rollback();
        return res.status(404).json({ erro: 'Partida não encontrada.' });
      }

      if (partida.status === 'ENCERRADA') {
        await connection.rollback();
        return res.status(409).json({
          erro: 'Esta partida já está encerrada. Os gols/pontos não podem mais ser removidos.',
        });
      }

      const [result] = await connection.execute(
        `DELETE FROM pontuacao WHERE id_pontuacao = ? AND id_partida = ?`,
        [req.params.id_pontuacao, partida.id_partida]
      );

      if (!result.affectedRows) {
        await connection.rollback();
        return res.status(404).json({ erro: 'Registro não encontrado nesta partida.' });
      }

      const acumulado = await placarAcumulado(connection, partida);

      await connection.commit();

      res.json({
        mensagem: 'Registro removido.',
        placar_acumulado: acumulado,
      });

    } catch (error) {
      if (connection) await connection.rollback();
      tratarErro(error, res, next);
    } finally {
      connection?.release();
    }
  });
}
