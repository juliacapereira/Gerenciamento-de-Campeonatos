export function registerMatchRoutes(app, pool) {
  const validId = value =>
    /^[1-9]\d*$/.test(String(value)) &&
    Number.isSafeInteger(Number(value));

  // ============================================================
  // GET /api/campeonatos/:id/partidas
  //
  // Público
  // ============================================================

  app.get(
    '/api/campeonatos/:id/partidas',
    async (req, res, next) => {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          erro: 'Identificador de campeonato inválido.',
        });
      }

      try {
        const [campeonato] = await pool.execute(
          `
            SELECT id_campeonato
            FROM campeonato
            WHERE id_campeonato = ?
          `,
          [req.params.id]
        );

        if (!campeonato.length) {
          return res.status(404).json({
            erro: 'Campeonato não encontrado.',
          });
        }

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

            INNER JOIN time ta
              ON ta.id_time = p.id_time_a

            INNER JOIN time tb
              ON tb.id_time = p.id_time_b

            WHERE p.id_campeonato = ?

            ORDER BY p.id_partida DESC
          `,
          [req.params.id]
        );

        res.json(partidas);

      } catch (error) {
        next(error);
      }
    }
  );


  // ============================================================
  // POST /api/campeonatos/:id/partidas
  //
  // Administrador proprietário do campeonato
  // ============================================================

  app.post(
    '/api/campeonatos/:id/partidas',
    async (req, res, next) => {
      const idCampeonato =
        Number(req.params.id);

      const idTimeA =
        Number(req.body.id_time_a);

      const idTimeB =
        Number(req.body.id_time_b);

        const { data_hora, local } = req.body;

      if (!validId(idCampeonato)) {
        return res.status(400).json({
          erro: 'Identificador de campeonato inválido.',
        });
      }

      if (
        !validId(idTimeA) ||
        !validId(idTimeB)
      ) {
        return res.status(400).json({
          erro: 'Selecione os dois times da partida.',
        });
      }

      if (idTimeA === idTimeB) {
        return res.status(400).json({
          erro: 'Os times da partida devem ser diferentes.',
        });
      }

      if (!data_hora) {
        return res.status(400).json({
          erro: 'Informe a data e o horário da partida.',
        });
      }

      let connection;

      try {
        connection =
          await pool.getConnection();

        await connection.beginTransaction();


        // ------------------------------------------------------
        // Confere se campeonato existe e pertence ao admin
        // ------------------------------------------------------

        const [campeonatos] =
          await connection.execute(
            `
              SELECT
                id_campeonato,
                id_usuario
              FROM campeonato
              WHERE id_campeonato = ?
              FOR UPDATE
            `,
            [idCampeonato]
          );

        if (!campeonatos.length) {
          await connection.rollback();

          return res.status(404).json({
            erro: 'Campeonato não encontrado.',
          });
        }

        if (
          Number(
            campeonatos[0].id_usuario
          ) !==
          Number(
            req.usuario.id_usuario
          )
        ) {
          await connection.rollback();

          return res.status(403).json({
            erro:
              'Você não tem permissão para cadastrar partidas neste campeonato.',
          });
        }


        // ------------------------------------------------------
        // Confere se os dois times estão inscritos
        // ------------------------------------------------------

        const [timesInscritos] =
          await connection.execute(
            `
              SELECT id_time
              FROM campeonato_time
              WHERE id_campeonato = ?
                AND id_time IN (?, ?)
            `,
            [
              idCampeonato,
              idTimeA,
              idTimeB,
            ]
          );

        if (timesInscritos.length !== 2) {
          await connection.rollback();

          return res.status(400).json({
            erro:
              'Os dois times precisam estar inscritos neste campeonato.',
          });
        }

        const [conflitos] = await connection.execute(
          `
            SELECT id_partida 
            FROM partida 
            WHERE data_hora = ? 
              AND (id_time_a IN (?, ?) OR id_time_b IN (?, ?))
          `,
          [data_hora, idTimeA, idTimeB, idTimeA, idTimeB]
        );

        if (conflitos.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            erro: 'Conflito de agenda: Um dos times já possui partida agendada neste mesmo horário.',
          });
        }


        // ------------------------------------------------------
        // Cadastra a partida
        // ------------------------------------------------------

        const [result] =
          await connection.execute(
            `
              INSERT INTO partida
                (
                  id_campeonato,
                  id_time_a,
                  id_time_b,
                  data_hora, 
                  local
                )
              VALUES (?, ?, ?, ?, ?)
            `,
            [
              idCampeonato,
              idTimeA,
              idTimeB,
              data_hora,
            local?.trim() || null
            ]
          );

        await connection.commit();

        res.status(201).json({
          id_partida:
            result.insertId,

          mensagem:
            'Partida cadastrada com sucesso!',
        });

      } catch (error) {
        if (connection) {
          await connection.rollback();
        }

        next(error);

      } finally {
        connection?.release();
      }
    }
  );

  // ============================================================
  // GET /api/partidas/:id
  // Detalhes consolidados de uma partida
  // Público
  // ============================================================

  app.get(
    '/api/partidas/:id',
    async (req, res, next) => {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          erro: 'Identificador de partida inválido.',
        });
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
              p.criado_em,
              p.atualizado_em,

              ta.nome AS time_a,
              tb.nome AS time_b,

              r.id_resultado,
              r.placar_time_a,
              r.placar_time_b,
              r.registrado_em AS resultado_registrado_em,
              r.atualizado_em AS resultado_atualizado_em

            FROM partida p

            INNER JOIN time ta
              ON ta.id_time = p.id_time_a

            INNER JOIN time tb
              ON tb.id_time = p.id_time_b

            LEFT JOIN resultado r
              ON r.id_partida = p.id_partida

            WHERE p.id_partida = ?
            LIMIT 1
          `,
          [req.params.id]
        );

        if (!partidas.length) {
          return res.status(404).json({
            erro: 'Partida não encontrada.',
          });
        }
                const partida = partidas[0];

        const [acontecimentos] = await pool.execute(
          `
            SELECT
              a.id_acontecimento,
              a.id_time,
              a.id_jogador,
              j.nome AS jogador,
              a.tipo,
              a.minuto,
              a.descricao,
              a.criado_em
            FROM acontecimento a
            LEFT JOIN jogador j
              ON j.id_jogador = a.id_jogador
            WHERE a.id_partida = ?
            ORDER BY
              a.minuto IS NULL ASC,
              a.minuto ASC,
              a.criado_em ASC
          `,
          [req.params.id]
        );

        const [pontuacoes] = await pool.execute(
          `
            SELECT
              pt.id_pontuacao,
              pt.id_time,
              pt.id_jogador,
              j.nome AS jogador,
              pt.quantidade,
              pt.minuto,
              pt.criado_em
            FROM pontuacao pt
            LEFT JOIN jogador j
              ON j.id_jogador = pt.id_jogador
            WHERE pt.id_partida = ?
            ORDER BY
              pt.minuto IS NULL ASC,
              pt.minuto ASC,
              pt.criado_em ASC
          `,
          [req.params.id]
        );

        // Não há tabela de escalação por partida: usa-se o elenco ativo
        // de cada time (US08), que é o que está disponível no banco.
        const [elenco] = await pool.execute(
          `
            SELECT
              e.id_time,
              j.id_jogador,
              j.nome,
              j.foto_url,
              e.numero_camisa,
              COALESCE(e.posicao, j.posicao) AS posicao
            FROM elenco e
            INNER JOIN jogador j
              ON j.id_jogador = e.id_jogador
            WHERE e.id_time IN (?, ?)
              AND e.ativo = TRUE
            ORDER BY
              e.numero_camisa IS NULL ASC,
              e.numero_camisa ASC,
              j.nome ASC
          `,
          [partida.id_time_a, partida.id_time_b]
        );

        return res.json({
          partida,
          acontecimentos,
          pontuacoes,
          escalacoes: {
            time_a: elenco.filter(
              item => item.id_time === partida.id_time_a
            ),
            time_b: elenco.filter(
              item => item.id_time === partida.id_time_b
            ),
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );
}