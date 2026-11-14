export function registerSearchRoutes(app, pool) {

  app.get('/api/busca', async (req, res, next) => {

    try {

      const termo =
        typeof req.query.q === 'string'
          ? req.query.q.trim()
          : '';


      if (!termo) {
        return res.json({
          times: [],
          jogadores: [],
        });
      }


      if (termo.length > 100) {
        return res.status(400).json({
          erro: 'O termo de busca é muito longo.',
        });
      }


      const busca =
        `%${termo}%`;


      const [times] =
        await pool.execute(
          `
            SELECT
              t.id_time,
              t.nome,
              t.nome_abreviado,
              t.cidade,
              e.nome AS esporte

            FROM time t

            LEFT JOIN esporte e
              ON e.id_esporte =
                 t.id_esporte

            WHERE
              t.nome LIKE ?
              OR
              t.nome_abreviado LIKE ?
              OR
              t.cidade LIKE ?

            ORDER BY
              t.nome ASC

            LIMIT 20
          `,
          [
            busca,
            busca,
            busca,
          ]
        );


      const [jogadores] =
        await pool.execute(
          `
            SELECT
              j.id_jogador,
              j.nome,
              j.posicao

            FROM jogador j

            WHERE
              j.nome LIKE ?
              OR
              j.posicao LIKE ?

            ORDER BY
              j.nome ASC

            LIMIT 20
          `,
          [
            busca,
            busca,
          ]
        );


      res.set(
        'Cache-Control',
        'no-store'
      );


      return res.json({
        times,
        jogadores,
      });

    } catch (error) {

      next(error);

    }

  });

}