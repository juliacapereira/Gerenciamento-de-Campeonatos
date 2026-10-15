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
                  id_time_b
                )
              VALUES (?, ?, ?)
            `,
            [
              idCampeonato,
              idTimeA,
              idTimeB,
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
}