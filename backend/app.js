import express from 'express';
import cors from 'cors';
import { validate } from './validation.js';
import { registerPlayerRoutes } from './jogadores.js';
  import { registerSquadRoutes } from './elenco.js';

export function createApp(pool) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '32kb' }));
  app.get('/', (req, res) => res.json({ mensagem: 'API funcionando' }));
  app.get('/api/esportes', async (req, res, next) => {
    try { const [rows] = await pool.query('SELECT id_esporte, nome FROM esporte ORDER BY nome'); res.json(rows); }
    catch (error) { next(error); }
  });
  for (const kind of ['campeonatos', 'times']) {
    const championship = kind === 'campeonatos';
    const table = championship ? 'campeonato' : 'time';
    const id = championship ? 'id_campeonato' : 'id_time';
    app.get(`/api/${kind}`, async (req, res, next) => {
      try {
        const [rows] = await pool.query(`SELECT t.*, e.nome AS esporte${championship ? ", DATE_FORMAT(t.data_inicial, '%Y-%m-%d') AS data_inicial, DATE_FORMAT(t.data_fim, '%Y-%m-%d') AS data_fim" : ''} FROM ${table} t LEFT JOIN esporte e ON e.id_esporte = t.id_esporte ORDER BY t.criado_em DESC, t.${id} DESC`);
        res.json(rows);
      } catch (error) { next(error); }
    });
    const fields = championship ? ['id_esporte', 'nome', 'descricao', 'data_inicial', 'data_fim', 'status'] : ['id_esporte', 'nome', 'nome_abreviado', 'cidade', 'descricao', 'escudo_url'];
    const select = `SELECT t.*, e.nome AS esporte${championship ? ", DATE_FORMAT(t.data_inicial, '%Y-%m-%d') AS data_inicial, DATE_FORMAT(t.data_fim, '%Y-%m-%d') AS data_fim" : ''} FROM ${table} t LEFT JOIN esporte e ON e.id_esporte = t.id_esporte`;
    const validId = value => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
    app.get(`/api/${kind}/:id`, async (req, res, next) => {
      if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
      try {
        const [rows] = await pool.execute(`${select} WHERE t.${id} = ?`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ erro: 'Cadastro não encontrado.' });
        res.json(rows[0]);
      } catch (error) { next(error); }
    });
    app.put(`/api/${kind}/:id`, async (req, res, next) => {
      if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
      const error = validate(kind, req.body);
      if (error) return res.status(400).json({ erro: error });
      try {
        const [existing] = await pool.execute(`SELECT ${id} FROM ${table} WHERE ${id} = ?`, [req.params.id]);
        if (!existing.length) return res.status(404).json({ erro: 'Cadastro não encontrado.' });
        const values = fields.map(field => typeof req.body[field] === 'string' ? req.body[field].trim() || null : req.body[field] ?? null);
        const [result] = await pool.execute(`UPDATE ${table} SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE ${id} = ?`, [...values, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ erro: 'Cadastro não encontrado.' });
        res.json({ [id]: Number(req.params.id), mensagem: championship ? 'Campeonato atualizado com sucesso!' : 'Time atualizado com sucesso!' });
      } catch (error) { next(error); }
    });
    app.delete(`/api/${kind}/:id`, async (req, res, next) => {
      if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
      let connection;
      try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [existing] = await connection.execute(`SELECT ${id} FROM ${table} WHERE ${id} = ? FOR UPDATE`, [req.params.id]);
        if (!existing.length) { await connection.rollback(); return res.status(404).json({ erro: 'Cadastro não encontrado.' }); }
        // Locking the parent also prevents concurrent foreign-key inserts during deletion.
        const relations = championship
          ? [['campeonato_time', 'id_campeonato'], ['partida', 'id_campeonato']]
          : [['campeonato_time', 'id_time'], ['elenco', 'id_time'], ['partida', 'id_time_a'], ['partida', 'id_time_b'], ['pontuacao', 'id_time'], ['acontecimento', 'id_time']];
        for (const [relatedTable, column] of relations) {
          const [linked] = await connection.execute(`SELECT 1 FROM ${relatedTable} WHERE ${column} = ? LIMIT 1`, [req.params.id]);
          if (linked.length) {
            await connection.rollback();
            return res.status(409).json({ erro: championship ? 'Este campeonato possui times inscritos ou partidas. Remova esses vínculos antes de excluí-lo.' : 'Este time está vinculado a campeonatos, jogadores ou partidas. Remova esses vínculos antes de excluí-lo.' });
          }
        }
        await connection.execute(`DELETE FROM ${table} WHERE ${id} = ?`, [req.params.id]);
        await connection.commit();
        res.json({ mensagem: championship ? 'Campeonato excluído com sucesso!' : 'Time excluído com sucesso!' });
      } catch (error) { if (connection) await connection.rollback(); next(error); }
      finally { connection?.release(); }
    });
    app.post(`/api/${kind}`, async (req, res, next) => {
      const error = validate(kind, req.body);
      if (error) return res.status(400).json({ erro: error });
      const values = fields.map(field => typeof req.body[field] === 'string' ? req.body[field].trim() || null : req.body[field] ?? null);
      try {
        const [result] = await pool.execute(`INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, values);
        res.status(201).json({ [id]: result.insertId, mensagem: championship ? 'Campeonato criado com sucesso!' : 'Time cadastrado com sucesso!' });
      } catch (error) { next(error); }
    });
  }

    registerPlayerRoutes(app, pool);
    registerSquadRoutes(app, pool);

  app.use((error, req, res, next) => {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: req.path.includes('campeonatos') ? 'Já existe um campeonato com esse nome, esporte e data inicial.' : req.path.includes('jogadores') ? 'Já existe um jogador cadastrado com esse documento.' : 'Já existe um time com esse nome.' });    
    if (error.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ erro: 'Este cadastro possui vínculos e não pode ser excluído.' });
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ erro: 'O esporte selecionado não existe.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ erro: 'Dados JSON inválidos.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ erro: 'Os dados enviados excedem o limite permitido.' });
    console.error('Erro na API:', error.code || error.message);
    res.status(500).json({ erro: 'Não foi possível acessar o banco. Tente novamente mais tarde.' });
  });
  return app;
}
