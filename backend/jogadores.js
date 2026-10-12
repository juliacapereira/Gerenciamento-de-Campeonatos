// US07 - Cadastro de jogadores (CRUD).
// Segue o mesmo padrão de app.js: o pool é recebido por parâmetro e os
// erros são repassados para o tratador de erros no final do createApp.
import { validate } from './validation.js';

const fields = ['nome', 'data_nascimento', 'documento', 'foto_url', 'posicao'];
const select = "SELECT id_jogador, nome, DATE_FORMAT(data_nascimento, '%Y-%m-%d') AS data_nascimento, documento, foto_url, posicao FROM jogador";
const squads = 'SELECT t.id_time, t.nome AS time, e.nome AS esporte, el.posicao, el.numero_camisa FROM elenco el JOIN time t ON t.id_time = el.id_time LEFT JOIN esporte e ON e.id_esporte = t.id_esporte WHERE el.id_jogador = ? ORDER BY t.nome';
const validId = value => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
const clean = body => fields.map(field => typeof body[field] === 'string' ? body[field].trim() || null : body[field] ?? null);
// O elenco apaga o vínculo em cascata, então bloqueamos a exclusão aqui para não perder dados sem avisar.
const relations = [['elenco', 'id_jogador'], ['pontuacao', 'id_jogador'], ['acontecimento', 'id_jogador']];

export function registerPlayerRoutes(app, pool) {
  app.get('/api/jogadores', async (req, res, next) => {
    try {
      const [rows] = await pool.query(`${select} ORDER BY nome`);
      res.json(rows);
    } catch (error) { next(error); }
  });

  app.get('/api/jogadores/:id', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    try {
      const [rows] = await pool.execute(`${select} WHERE id_jogador = ?`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ erro: 'Cadastro não encontrado.' });
      // Times em que o jogador atua (o esporte vem do time; um jogador pode estar em vários).
      const [times] = await pool.execute(squads, [req.params.id]);
      res.json({ ...rows[0], times });    } catch (error) { next(error); }
  });

  app.post('/api/jogadores', async (req, res, next) => {
    const error = validate('jogadores', req.body);
    if (error) return res.status(400).json({ erro: error });
    try {
      const [result] = await pool.execute(`INSERT INTO jogador (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, clean(req.body));
      res.status(201).json({ id_jogador: result.insertId, mensagem: 'Jogador cadastrado com sucesso!' });
    } catch (error) { next(error); }
  });

  app.put('/api/jogadores/:id', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    const error = validate('jogadores', req.body);
    if (error) return res.status(400).json({ erro: error });
    try {
      const [existing] = await pool.execute('SELECT id_jogador FROM jogador WHERE id_jogador = ?', [req.params.id]);
      if (!existing.length) return res.status(404).json({ erro: 'Cadastro não encontrado.' });
      const [result] = await pool.execute(`UPDATE jogador SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id_jogador = ?`, [...clean(req.body), req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ erro: 'Cadastro não encontrado.' });
      res.json({ id_jogador: Number(req.params.id), mensagem: 'Jogador atualizado com sucesso!' });
    } catch (error) { next(error); }
  });

  app.delete('/api/jogadores/:id', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      const [existing] = await connection.execute('SELECT id_jogador FROM jogador WHERE id_jogador = ? FOR UPDATE', [req.params.id]);
      if (!existing.length) { await connection.rollback(); return res.status(404).json({ erro: 'Cadastro não encontrado.' }); }
      for (const [table, column] of relations) {
        const [linked] = await connection.execute(`SELECT 1 FROM ${table} WHERE ${column} = ? LIMIT 1`, [req.params.id]);
        if (linked.length) {
          await connection.rollback();
          return res.status(409).json({ erro: 'Este jogador está vinculado a um time ou a partidas. Remova esses vínculos antes de excluí-lo.' });
        }
      }
      await connection.execute('DELETE FROM jogador WHERE id_jogador = ?', [req.params.id]);
      await connection.commit();
      res.json({ mensagem: 'Jogador excluído com sucesso!' });
    } catch (error) { if (connection) await connection.rollback(); next(error); }
    finally { connection?.release(); }
  });
}