import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { validate } from './validation.js';
import { autenticar } from './src/routes/administradores.js';

import { registerPlayerRoutes } from './jogadores.js';
import { registerSquadRoutes } from './elenco.js';
import { registerEntryRoutes } from './inscricoes.js';
import { registerSportRoutes } from './esportes.js';


export function createApp(pool, { adminRouter } = {}) {
  const app = express();


  // ============================================================
  // MIDDLEWARES GERAIS
  // ============================================================

  app.use(cors());

  app.use(
    express.json({
      limit: '32kb',
    })
  );

  // Necessário para ler o cookie HttpOnly da sessão administrativa.
  app.use(cookieParser());


  // ============================================================
  // ROTAS DE AUTENTICAÇÃO DO ADMINISTRADOR
  // ============================================================
  //
  // Precisam vir ANTES da proteção geral da API.
  //
  // Assim:
  //
  // POST /api/admin/cadastro
  // POST /api/admin/login
  //
  // continuam acessíveis sem autenticação.
  //
  // Já /me e /logout possuem suas próprias regras no
  // administradores.js.
  // ============================================================

  if (adminRouter) {
    app.use('/api/admin', adminRouter);
  }


  // ============================================================
  // PROTEÇÃO DAS OPERAÇÕES ADMINISTRATIVAS
  // ============================================================
  //
  // Consultas são públicas.
  //
  // Alterações no banco exigem sessão de administrador:
  //
  // POST
  // PUT
  // PATCH
  // DELETE
  //
  // Isso protege automaticamente as funcionalidades das
  // US03, US04, US05, US06, US07 e US08.
  // ============================================================

  app.use('/api', (req, res, next) => {
    const metodoPublico =
      req.method === 'GET' ||
      req.method === 'HEAD' ||
      req.method === 'OPTIONS';

    if (metodoPublico) {
      return next();
    }

    return autenticar(req, res, next);
  });


  // ============================================================
  // ROTA DE TESTE DA API
  // ============================================================

  app.get('/', (req, res) => {
    res.json({
      mensagem: 'API funcionando',
    });
  });


  // ============================================================
  // ESPORTES - LISTAGEM PÚBLICA
  // ============================================================

  app.get('/api/esportes', async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT
          id_esporte,
          nome,
          descricao
        FROM esporte
        ORDER BY nome
        `
      );

      res.json(rows);

    } catch (error) {
      next(error);
    }
  });


  // ============================================================
  // CAMPEONATOS E TIMES
  // ============================================================

  for (const kind of ['campeonatos', 'times']) {

    const championship = kind === 'campeonatos';

    const table = championship
      ? 'campeonato'
      : 'time';

    const id = championship
      ? 'id_campeonato'
      : 'id_time';


    // ----------------------------------------------------------
    // Campos aceitos
    // ----------------------------------------------------------

    const fields = championship
      ? [
          'id_esporte',
          'nome',
          'descricao',
          'data_inicial',
          'data_fim',
          'status',
        ]
      : [
          'id_esporte',
          'nome',
          'nome_abreviado',
          'cidade',
          'descricao',
          'escudo_url',
        ];


    // ----------------------------------------------------------
    // SELECT base
    // ----------------------------------------------------------

    const select = `
      SELECT
        t.*,
        e.nome AS esporte
        ${
          championship
            ? `,
              DATE_FORMAT(t.data_inicial, '%Y-%m-%d') AS data_inicial,
              DATE_FORMAT(t.data_fim, '%Y-%m-%d') AS data_fim
            `
            : ''
        }
      FROM ${table} t
      LEFT JOIN esporte e
        ON e.id_esporte = t.id_esporte
    `;


    // ----------------------------------------------------------
    // Validação de ID
    // ----------------------------------------------------------

    const validId = (value) =>
      /^[1-9]\d*$/.test(value) &&
      Number.isSafeInteger(Number(value));


    // ==========================================================
    // GET /api/campeonatos
    // GET /api/times
    //
    // PÚBLICO
    // ==========================================================

    app.get(`/api/${kind}`, async (req, res, next) => {
      try {
        const [rows] = await pool.query(`
          ${select}
          ORDER BY
            t.criado_em DESC,
            t.${id} DESC
        `);

        res.json(rows);

      } catch (error) {
        next(error);
      }
    });


    // ==========================================================
    // GET /api/campeonatos/:id
    // GET /api/times/:id
    //
    // PÚBLICO
    // ==========================================================

    app.get(`/api/${kind}/:id`, async (req, res, next) => {

      if (!validId(req.params.id)) {
        return res.status(400).json({
          erro: 'Identificador inválido.',
        });
      }

      try {
        const [rows] = await pool.execute(
          `
          ${select}
          WHERE t.${id} = ?
          `,
          [req.params.id]
        );

        if (!rows.length) {
          return res.status(404).json({
            erro: 'Cadastro não encontrado.',
          });
        }

        res.json(rows[0]);

      } catch (error) {
        next(error);
      }
    });


    // ==========================================================
    // POST /api/campeonatos
    // POST /api/times
    //
    // ADMINISTRADOR
    // ==========================================================

    app.post(`/api/${kind}`, async (req, res, next) => {

      const error = validate(kind, req.body);

      if (error) {
        return res.status(400).json({
          erro: error,
        });
      }

      const values = fields.map((field) => {
        const value = req.body[field];

        if (typeof value === 'string') {
          return value.trim() || null;
        }

        return value ?? null;
      });

      try {
        const [result] = await pool.execute(
          `
          INSERT INTO ${table}
            (${fields.join(', ')})
          VALUES
            (${fields.map(() => '?').join(', ')})
          `,
          values
        );

        res.status(201).json({
          [id]: result.insertId,

          mensagem: championship
            ? 'Campeonato criado com sucesso!'
            : 'Time cadastrado com sucesso!',
        });

      } catch (error) {
        next(error);
      }
    });


    // ==========================================================
    // PUT /api/campeonatos/:id
    // PUT /api/times/:id
    //
    // ADMINISTRADOR
    // ==========================================================

    app.put(`/api/${kind}/:id`, async (req, res, next) => {

      if (!validId(req.params.id)) {
        return res.status(400).json({
          erro: 'Identificador inválido.',
        });
      }

      const error = validate(kind, req.body);

      if (error) {
        return res.status(400).json({
          erro: error,
        });
      }

      try {
        const [existing] = await pool.execute(
          `
          SELECT ${id}
          FROM ${table}
          WHERE ${id} = ?
          `,
          [req.params.id]
        );

        if (!existing.length) {
          return res.status(404).json({
            erro: 'Cadastro não encontrado.',
          });
        }

        const values = fields.map((field) => {
          const value = req.body[field];

          if (typeof value === 'string') {
            return value.trim() || null;
          }

          return value ?? null;
        });

        const [result] = await pool.execute(
          `
          UPDATE ${table}
          SET ${fields.map((field) => `${field} = ?`).join(', ')}
          WHERE ${id} = ?
          `,
          [...values, req.params.id]
        );

        if (!result.affectedRows) {
          return res.status(404).json({
            erro: 'Cadastro não encontrado.',
          });
        }

        res.json({
          [id]: Number(req.params.id),

          mensagem: championship
            ? 'Campeonato atualizado com sucesso!'
            : 'Time atualizado com sucesso!',
        });

      } catch (error) {
        next(error);
      }
    });


    // ==========================================================
    // DELETE /api/campeonatos/:id
    // DELETE /api/times/:id
    //
    // ADMINISTRADOR
    // ==========================================================

    app.delete(`/api/${kind}/:id`, async (req, res, next) => {

      if (!validId(req.params.id)) {
        return res.status(400).json({
          erro: 'Identificador inválido.',
        });
      }

      let connection;

      try {
        connection = await pool.getConnection();

        await connection.beginTransaction();


        // Bloqueia temporariamente o registro principal enquanto
        // verificamos os vínculos.
        const [existing] = await connection.execute(
          `
          SELECT ${id}
          FROM ${table}
          WHERE ${id} = ?
          FOR UPDATE
          `,
          [req.params.id]
        );

        if (!existing.length) {
          await connection.rollback();

          return res.status(404).json({
            erro: 'Cadastro não encontrado.',
          });
        }


        // ------------------------------------------------------
        // Relações que impedem exclusão
        // ------------------------------------------------------

        const relations = championship
          ? [
              ['campeonato_time', 'id_campeonato'],
              ['partida', 'id_campeonato'],
            ]
          : [
              ['campeonato_time', 'id_time'],
              ['elenco', 'id_time'],
              ['partida', 'id_time_a'],
              ['partida', 'id_time_b'],
              ['pontuacao', 'id_time'],
              ['acontecimento', 'id_time'],
            ];


        for (const [relatedTable, column] of relations) {

          const [linked] = await connection.execute(
            `
            SELECT 1
            FROM ${relatedTable}
            WHERE ${column} = ?
            LIMIT 1
            `,
            [req.params.id]
          );

          if (linked.length) {
            await connection.rollback();

            return res.status(409).json({
              erro: championship
                ? 'Este campeonato possui times inscritos ou partidas. Remova esses vínculos antes de excluí-lo.'
                : 'Este time está vinculado a campeonatos, jogadores ou partidas. Remova esses vínculos antes de excluí-lo.',
            });
          }
        }


        // ------------------------------------------------------
        // Exclusão
        // ------------------------------------------------------

        await connection.execute(
          `
          DELETE FROM ${table}
          WHERE ${id} = ?
          `,
          [req.params.id]
        );

        await connection.commit();

        res.json({
          mensagem: championship
            ? 'Campeonato excluído com sucesso!'
            : 'Time excluído com sucesso!',
        });

      } catch (error) {

        if (connection) {
          await connection.rollback();
        }

        next(error);

      } finally {
        connection?.release();
      }
    });
  }


  // ============================================================
  // ROTAS DAS DEMAIS USER STORIES
  // ============================================================
  //
  // Como estas rotas são registradas DEPOIS do middleware de
  // autenticação:
  //
  // GET               -> público
  // POST/PUT/PATCH/
  // DELETE            -> administrador
  //
  // ============================================================

  registerPlayerRoutes(app, pool);
  registerSquadRoutes(app, pool);
  registerEntryRoutes(app, pool);
  registerSportRoutes(app, pool);


  // ============================================================
  // TRATAMENTO CENTRAL DE ERROS
  // ============================================================

  app.use((error, req, res, next) => {

    // ----------------------------------------------------------
    // Registro duplicado
    // ----------------------------------------------------------

    if (error.code === 'ER_DUP_ENTRY') {

      if (req.path.includes('campeonatos')) {
        return res.status(409).json({
          erro:
            'Já existe um campeonato com esse nome, esporte e data inicial.',
        });
      }

      if (req.path.includes('jogadores')) {
        return res.status(409).json({
          erro:
            'Já existe um jogador cadastrado com esse documento.',
        });
      }

      return res.status(409).json({
        erro: 'Já existe um time com esse nome.',
      });
    }


    // ----------------------------------------------------------
    // Registro possui relações
    // ----------------------------------------------------------

    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        erro:
          'Este cadastro possui vínculos e não pode ser excluído.',
      });
    }


    // ----------------------------------------------------------
    // Chave estrangeira inválida
    // ----------------------------------------------------------

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        erro:
          'O registro relacionado selecionado não existe.',
      });
    }


    // ----------------------------------------------------------
    // JSON inválido
    // ----------------------------------------------------------

    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({
        erro: 'Dados JSON inválidos.',
      });
    }


    // ----------------------------------------------------------
    // Payload muito grande
    // ----------------------------------------------------------

    if (error.type === 'entity.too.large') {
      return res.status(413).json({
        erro:
          'Os dados enviados excedem o limite permitido.',
      });
    }


    // ----------------------------------------------------------
    // Erro inesperado
    // ----------------------------------------------------------

    console.error(
      'Erro na API:',
      error.code || error.message
    );

    res.status(500).json({
      erro:
        'Não foi possível acessar o banco. Tente novamente mais tarde.',
    });
  });


  return app;
}