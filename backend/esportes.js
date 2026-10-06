// US03 - Cadastro de esportes.
// Mesmo padrão de elenco.js e inscricoes.js: o pool é recebido por parâmetro e os erros vão para o tratador final do app.js.
const empty = value => value === undefined || value === null || value === '';

export function validateSport(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Dados inválidos.';
  if (typeof body.nome !== 'string' || body.nome.trim().length < 2 || body.nome.trim().length > 100) {
    return 'Informe o nome do esporte entre 2 e 100 caracteres.';
  }
  if (!empty(body.descricao) && (typeof body.descricao !== 'string' || body.descricao.trim().length > 5000)) {
    return 'A descrição deve ter até 5000 caracteres.';
  }
  return null;
}

export function registerSportRoutes(app, pool) {
  app.post('/api/esportes', async (req, res, next) => {
    const error = validateSport(req.body);
    if (error) return res.status(400).json({ erro: error });

    const nome = req.body.nome.trim();
    const descricao = empty(req.body.descricao) ? null : req.body.descricao.trim() || null;

    try {
      // Verificação prévia de duplicidade (a tarefa pede para varrer o banco e devolver conflito).
      const [existing] = await pool.execute('SELECT id_esporte FROM esporte WHERE nome = ? LIMIT 1', [nome]);
      if (existing.length) return res.status(409).json({ erro: 'Já existe um esporte com esse nome.' });

      const [result] = await pool.execute('INSERT INTO esporte (nome, descricao) VALUES (?, ?)', [nome, descricao]);
      res.status(201).json({ id_esporte: result.insertId, mensagem: 'Esporte cadastrado com sucesso!' });
    } catch (error) {
      // Rede de segurança caso dois cadastros iguais cheguem ao mesmo tempo (UNIQUE do banco).
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Já existe um esporte com esse nome.' });
      next(error);
    }
  });
}