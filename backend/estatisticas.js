// ============================================================
// US24 - ESTATÍSTICAS DE JOGADORES
//
// GET    /api/jogadores/:id/estatisticas                    -> público
//        Totais e números por campeonato (gols/pontos, partidas
//        e cartões) + histórico de gols e cartões do atleta.
//
// PUT    /api/jogadores/:id/estatisticas/:id_campeonato     -> admin
//        Corrige os números do atleta em um campeonato.
//
// DELETE /api/jogadores/:id/estatisticas/:id_campeonato     -> admin
//        Desfaz a correção e volta aos valores calculados.
//
// Como os números são calculados:
//   - Gols/pontos: soma da tabela pontuacao (autoria da US18).
//   - Partidas:    jogos ENCERRADOS do campeonato em que o time do
//                  atleta jogou (ou em que ele marcou/levou cartão).
//                  O sistema não registra escalação, por isso é uma
//                  estimativa que o admin pode corrigir.
//   - Cartões:     tabela acontecimento, pelo tipo
//                  (contém "amarel" ou "vermelh").
//
// Correções do admin:
//   O admin informa o VALOR FINAL. O sistema guarda só a diferença
//   (ajuste) em relação ao calculado, na tabela ajuste_estatistica.
//   Assim, se o atleta marcar mais gols depois, eles continuam somando.
//
// A autenticação de PUT/DELETE é feita pelo middleware do app.js.
// Qualquer administrador logado pode corrigir qualquer atleta.
// ============================================================

const CAMPOS = ['gols', 'partidas', 'cartoes_amarelos', 'cartoes_vermelhos'];
const MAX_VALOR = 999;

const CRIAR_TABELA = `
  CREATE TABLE IF NOT EXISTS ajuste_estatistica (
    id_ajuste BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_jogador BIGINT UNSIGNED NOT NULL,
    id_campeonato BIGINT UNSIGNED NOT NULL,
    gols INT NOT NULL DEFAULT 0,
    partidas INT NOT NULL DEFAULT 0,
    cartoes_amarelos INT NOT NULL DEFAULT 0,
    cartoes_vermelhos INT NOT NULL DEFAULT 0,
    observacao VARCHAR(255),
    id_usuario BIGINT UNSIGNED,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ajuste_jogador FOREIGN KEY (id_jogador)
      REFERENCES jogador(id_jogador) ON DELETE CASCADE,
    CONSTRAINT fk_ajuste_campeonato FOREIGN KEY (id_campeonato)
      REFERENCES campeonato(id_campeonato) ON DELETE CASCADE,
    CONSTRAINT fk_ajuste_usuario FOREIGN KEY (id_usuario)
      REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    CONSTRAINT uq_ajuste_jogador_campeonato UNIQUE (id_jogador, id_campeonato)
  )
`;

const validId = value =>
  /^[1-9]\d*$/.test(String(value)) &&
  Number.isSafeInteger(Number(value));

const zerado = () => ({ gols: 0, partidas: 0, cartoes_amarelos: 0, cartoes_vermelhos: 0 });

export function validateStats(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Dados inválidos.';

  const nomes = {
    gols: 'gols/pontos',
    partidas: 'partidas jogadas',
    cartoes_amarelos: 'cartões amarelos',
    cartoes_vermelhos: 'cartões vermelhos',
  };

  for (const campo of CAMPOS) {
    const valor = body[campo];
    if (!Number.isInteger(valor) || valor < 0 || valor > MAX_VALOR) {
      return `O total de ${nomes[campo]} deve ser um número inteiro entre 0 e ${MAX_VALOR}.`;
    }
  }

  if (
    body.observacao !== undefined &&
    body.observacao !== null &&
    (typeof body.observacao !== 'string' || body.observacao.trim().length > 255)
  ) {
    return 'O motivo da correção deve ter até 255 caracteres.';
  }

  return null;
}

export function registerStatsRoutes(app, pool) {
  // A tabela de ajustes é criada sozinha na primeira vez que for usada,
  // para ninguém da equipe precisar rodar script no banco.
  let tabelaPronta = null;

  function garantirTabela() {
    if (!tabelaPronta) {
      tabelaPronta = pool.query(CRIAR_TABELA).catch(error => {
        tabelaPronta = null;
        throw error;
      });
    }
    return tabelaPronta;
  }


  // ------------------------------------------------------------
  // Números calculados pelo sistema, agrupados por campeonato
  // ------------------------------------------------------------

  async function calcular(idJogador, idCampeonato = null) {
    const filtro = idCampeonato ? 'AND p.id_campeonato = ?' : '';
    const extra = idCampeonato ? [idCampeonato] : [];
    const porCampeonato = new Map();
    const linha = id => {
      const chave = String(id);
      if (!porCampeonato.has(chave)) porCampeonato.set(chave, zerado());
      return porCampeonato.get(chave);
    };

    const [gols] = await pool.execute(
      `
        SELECT p.id_campeonato, SUM(pt.quantidade) AS total
        FROM pontuacao pt
        INNER JOIN partida p ON p.id_partida = pt.id_partida
        WHERE pt.id_jogador = ? ${filtro}
        GROUP BY p.id_campeonato
      `,
      [idJogador, ...extra]
    );
    for (const g of gols) linha(g.id_campeonato).gols = Number(g.total);

    const [partidas] = await pool.execute(
      `
        SELECT p.id_campeonato, COUNT(DISTINCT p.id_partida) AS total
        FROM partida p
        WHERE p.status = 'ENCERRADA' ${filtro}
          AND (
            EXISTS (
              SELECT 1 FROM elenco el
              WHERE el.id_jogador = ?
                AND el.id_time IN (p.id_time_a, p.id_time_b)
            )
            OR EXISTS (
              SELECT 1 FROM pontuacao pt
              WHERE pt.id_partida = p.id_partida AND pt.id_jogador = ?
            )
            OR EXISTS (
              SELECT 1 FROM acontecimento a
              WHERE a.id_partida = p.id_partida AND a.id_jogador = ?
            )
          )
        GROUP BY p.id_campeonato
      `,
      [...extra, idJogador, idJogador, idJogador]
    );
    for (const p of partidas) linha(p.id_campeonato).partidas = Number(p.total);

    const [cartoes] = await pool.execute(
      `
        SELECT
          p.id_campeonato,
          SUM(a.tipo LIKE '%amarel%') AS amarelos,
          SUM(a.tipo LIKE '%vermelh%') AS vermelhos
        FROM acontecimento a
        INNER JOIN partida p ON p.id_partida = a.id_partida
        WHERE a.id_jogador = ? ${filtro}
        GROUP BY p.id_campeonato
      `,
      [idJogador, ...extra]
    );
    for (const c of cartoes) {
      linha(c.id_campeonato).cartoes_amarelos = Number(c.amarelos ?? 0);
      linha(c.id_campeonato).cartoes_vermelhos = Number(c.vermelhos ?? 0);
    }

    return porCampeonato;
  }


  async function buscarJogador(id) {
    const [rows] = await pool.execute(
      'SELECT id_jogador, nome, posicao FROM jogador WHERE id_jogador = ?',
      [id]
    );
    return rows[0] ?? null;
  }


  // ==========================================================
  // GET /api/jogadores/:id/estatisticas
  // ==========================================================

  app.get('/api/jogadores/:id/estatisticas', async (req, res, next) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ erro: 'Identificador inválido.' });
    }

    const id = req.params.id;

    try {
      await garantirTabela();

      const jogador = await buscarJogador(id);
      if (!jogador) return res.status(404).json({ erro: 'Jogador não encontrado.' });

      // Campeonatos em que o atleta aparece: pelo time inscrito,
      // por gols, por cartões ou por correção feita pelo admin.
      const [campeonatos] = await pool.execute(
        `
          SELECT c.id_campeonato, c.nome, c.status, e.nome AS esporte,
                 DATE_FORMAT(c.data_inicial, '%Y-%m-%d') AS data_inicial
          FROM campeonato c
          LEFT JOIN esporte e ON e.id_esporte = c.id_esporte
          WHERE c.id_campeonato IN (
            SELECT ct.id_campeonato
            FROM campeonato_time ct
            INNER JOIN elenco el ON el.id_time = ct.id_time
            WHERE el.id_jogador = ?
            UNION
            SELECT p.id_campeonato
            FROM pontuacao pt
            INNER JOIN partida p ON p.id_partida = pt.id_partida
            WHERE pt.id_jogador = ?
            UNION
            SELECT p.id_campeonato
            FROM acontecimento a
            INNER JOIN partida p ON p.id_partida = a.id_partida
            WHERE a.id_jogador = ?
            UNION
            SELECT id_campeonato FROM ajuste_estatistica WHERE id_jogador = ?
          )
          ORDER BY c.data_inicial DESC, c.nome
        `,
        [id, id, id, id]
      );

      const calculados = await calcular(id);

      const [ajustes] = await pool.execute(
        `
          SELECT aj.*, u.nome AS alterado_por
          FROM ajuste_estatistica aj
          LEFT JOIN usuario u ON u.id_usuario = aj.id_usuario
          WHERE aj.id_jogador = ?
        `,
        [id]
      );
      const ajustePorCampeonato = new Map(ajustes.map(a => [String(a.id_campeonato), a]));

      const totalGeral = zerado();

      const porCampeonato = campeonatos.map(c => {
        const calculado = calculados.get(String(c.id_campeonato)) ?? zerado();
        const aj = ajustePorCampeonato.get(String(c.id_campeonato));
        const total = {};

        for (const campo of CAMPOS) {
          total[campo] = Math.max(0, calculado[campo] + Number(aj?.[campo] ?? 0));
          totalGeral[campo] += total[campo];
        }

        return {
          id_campeonato: c.id_campeonato,
          campeonato: c.nome,
          esporte: c.esporte,
          status: c.status,
          calculado,
          total,
          corrigido: Boolean(aj && CAMPOS.some(campo => Number(aj[campo]) !== 0)),
          correcao: aj
            ? {
                observacao: aj.observacao,
                alterado_por: aj.alterado_por,
                atualizado_em: aj.atualizado_em,
              }
            : null,
        };
      });

      // Histórico: gols/pontos e cartões, do mais recente para o mais antigo
      const [historico] = await pool.execute(
        `
          SELECT * FROM (
            SELECT
              'PONTUACAO' AS tipo,
              pt.quantidade,
              pt.minuto,
              p.id_partida,
              p.data_hora,
              c.nome AS campeonato,
              ta.nome AS time_a,
              tb.nome AS time_b,
              pt.id_time
            FROM pontuacao pt
            INNER JOIN partida p ON p.id_partida = pt.id_partida
            INNER JOIN campeonato c ON c.id_campeonato = p.id_campeonato
            INNER JOIN time ta ON ta.id_time = p.id_time_a
            INNER JOIN time tb ON tb.id_time = p.id_time_b
            WHERE pt.id_jogador = ?

            UNION ALL

            SELECT
              CASE
                WHEN a.tipo LIKE '%vermelh%' THEN 'CARTAO_VERMELHO'
                ELSE 'CARTAO_AMARELO'
              END AS tipo,
              1 AS quantidade,
              a.minuto,
              p.id_partida,
              p.data_hora,
              c.nome AS campeonato,
              ta.nome AS time_a,
              tb.nome AS time_b,
              a.id_time
            FROM acontecimento a
            INNER JOIN partida p ON p.id_partida = a.id_partida
            INNER JOIN campeonato c ON c.id_campeonato = p.id_campeonato
            INNER JOIN time ta ON ta.id_time = p.id_time_a
            INNER JOIN time tb ON tb.id_time = p.id_time_b
            WHERE a.id_jogador = ?
              AND (a.tipo LIKE '%amarel%' OR a.tipo LIKE '%vermelh%')
          ) eventos
          ORDER BY data_hora DESC, minuto DESC
          LIMIT 50
        `,
        [id, id]
      );

      res.set('Cache-Control', 'no-store');
      res.json({
        jogador,
        total: totalGeral,
        campeonatos: porCampeonato,
        historico,
      });

    } catch (error) {
      next(error);
    }
  });


  // ==========================================================
  // PUT /api/jogadores/:id/estatisticas/:id_campeonato
  //
  // Corpo: valores FINAIS que devem aparecer.
  // { gols, partidas, cartoes_amarelos, cartoes_vermelhos, observacao }
  // ==========================================================

  app.put('/api/jogadores/:id/estatisticas/:id_campeonato', async (req, res, next) => {
    if (!validId(req.params.id) || !validId(req.params.id_campeonato)) {
      return res.status(400).json({ erro: 'Identificador inválido.' });
    }

    const error = validateStats(req.body);
    if (error) return res.status(400).json({ erro: error });

    const { id, id_campeonato: idCampeonato } = req.params;

    try {
      await garantirTabela();

      const jogador = await buscarJogador(id);
      if (!jogador) return res.status(404).json({ erro: 'Jogador não encontrado.' });

      const [campeonatos] = await pool.execute(
        'SELECT id_campeonato, nome FROM campeonato WHERE id_campeonato = ?',
        [idCampeonato]
      );
      if (!campeonatos.length) return res.status(404).json({ erro: 'Campeonato não encontrado.' });

      const calculado = (await calcular(id, idCampeonato)).get(String(idCampeonato)) ?? zerado();

      // Guarda só a diferença entre o valor final e o calculado
      const ajuste = Object.fromEntries(
        CAMPOS.map(campo => [campo, req.body[campo] - calculado[campo]])
      );

      const observacao =
        typeof req.body.observacao === 'string' && req.body.observacao.trim()
          ? req.body.observacao.trim()
          : null;

      await pool.execute(
        `
          INSERT INTO ajuste_estatistica
            (id_jogador, id_campeonato, gols, partidas, cartoes_amarelos, cartoes_vermelhos, observacao, id_usuario)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            gols = VALUES(gols),
            partidas = VALUES(partidas),
            cartoes_amarelos = VALUES(cartoes_amarelos),
            cartoes_vermelhos = VALUES(cartoes_vermelhos),
            observacao = VALUES(observacao),
            id_usuario = VALUES(id_usuario)
        `,
        [
          id,
          idCampeonato,
          ajuste.gols,
          ajuste.partidas,
          ajuste.cartoes_amarelos,
          ajuste.cartoes_vermelhos,
          observacao,
          req.usuario?.id_usuario ?? null,
        ]
      );

      res.json({
        mensagem: `Estatísticas de ${jogador.nome} em ${campeonatos[0].nome} atualizadas.`,
        calculado,
        total: Object.fromEntries(CAMPOS.map(campo => [campo, req.body[campo]])),
      });

    } catch (error) {
      next(error);
    }
  });


  // ==========================================================
  // DELETE /api/jogadores/:id/estatisticas/:id_campeonato
  // ==========================================================

  app.delete('/api/jogadores/:id/estatisticas/:id_campeonato', async (req, res, next) => {
    if (!validId(req.params.id) || !validId(req.params.id_campeonato)) {
      return res.status(400).json({ erro: 'Identificador inválido.' });
    }

    try {
      await garantirTabela();

      const [result] = await pool.execute(
        'DELETE FROM ajuste_estatistica WHERE id_jogador = ? AND id_campeonato = ?',
        [req.params.id, req.params.id_campeonato]
      );

      if (!result.affectedRows) {
        return res.status(404).json({ erro: 'Este atleta não tem correção neste campeonato.' });
      }

      res.json({ mensagem: 'Correção removida. Os valores calculados pelo sistema voltaram a valer.' });

    } catch (error) {
      next(error);
    }
  });
}
