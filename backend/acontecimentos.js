// ============================================================
// US21 - HISTÓRICO DE ACONTECIMENTOS
//
// POST   /api/partidas/:id/acontecimentos                       -> admin
// DELETE /api/partidas/:id/acontecimentos/:id_acontecimento     -> admin
//
// A leitura (lista de acontecimentos de uma partida) já é feita por
// GET /api/partidas/:id (partidas.js), que devolve `acontecimentos`
// em ordem cronológica. A autenticação de POST/DELETE vem do
// middleware geral do app.js.
// ============================================================

export const TIPOS_ACONTECIMENTO = [
  'Cartão amarelo',
  'Cartão vermelho',
  'Falta',
  'Pênalti',
  'Lesão',
  'Substituição',
  'Impedimento',
  'Início da partida',
  'Intervalo',
  'Fim da partida',
  'Outro',
];

// Ocorrências que sempre envolvem um atleta
const EXIGE_JOGADOR = new Set([
  'Cartão amarelo',
  'Cartão vermelho',
  'Falta',
  'Pênalti',
  'Lesão',
]);

// Lances do jogo como um todo: não pertencem a um time/jogador
const SEM_JOGADOR = new Set([
  'Início da partida',
  'Intervalo',
  'Fim da partida',
]);

export function registerEventRoutes(app, pool) {
  const validId = value =>
    /^[1-9]\d*$/.test(String(value)) &&
    Number.isSafeInteger(Number(value));

  const inteiro = value => {
    if (value === undefined || value === null || value === '') return NaN;
    const numero = Number(value);
    return Number.isInteger(numero) ? numero : NaN;
  };


  // ============================================================
  // POST /api/partidas/:id/acontecimentos
  //
  // Corpo: { tipo, minuto, id_jogador?, id_time?, descricao? }
  // ============================================================

  app.post('/api/partidas/:id/acontecimentos', async (req, res, next) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ erro: 'Identificador de partida inválido.' });
    }

    const tipo = typeof req.body?.tipo === 'string' ? req.body.tipo.trim() : '';
    const minuto = inteiro(req.body?.minuto);
    const descricao =
      typeof req.body?.descricao === 'string' ? req.body.descricao.trim() : '';

    const temJogador =
      req.body?.id_jogador !== undefined &&
      req.body?.id_jogador !== null &&
      req.body?.id_jogador !== '';

    const temTime =
      req.body?.id_time !== undefined &&
      req.body?.id_time !== null &&
      req.body?.id_time !== '';

    const idJogador = temJogador ? inteiro(req.body.id_jogador) : null;
    const idTimeInformado = temTime ? inteiro(req.body.id_time) : null;

    if (!TIPOS_ACONTECIMENTO.includes(tipo)) {
      return res.status(400).json({ erro: 'Selecione um tipo de acontecimento válido.' });
    }

    if (Number.isNaN(minuto) || minuto < 0 || minuto > 300) {
      return res.status(400).json({
        erro: 'Informe o minuto como um número inteiro entre 0 e 300.',
      });
    }

    if (temJogador && !validId(idJogador)) {
      return res.status(400).json({ erro: 'Jogador inválido.' });
    }

    if (temTime && !validId(idTimeInformado)) {
      return res.status(400).json({ erro: 'Time inválido.' });
    }

    if (EXIGE_JOGADOR.has(tipo) && !temJogador) {
      return res.status(400).json({
        erro: `Informe o jogador envolvido para registrar "${tipo}".`,
      });
    }

    if (tipo === 'Outro' && !descricao) {
      return res.status(400).json({
        erro: 'Descreva o acontecimento quando o tipo for "Outro".',
      });
    }

    if (descricao.length > 500) {
      return res.status(400).json({
        erro: 'A descrição deve ter no máximo 500 caracteres.',
      });
    }

    try {
      const [partidas] = await pool.execute(
        `
          SELECT id_partida, id_time_a, id_time_b, status
          FROM partida
          WHERE id_partida = ?
        `,
        [req.params.id]
      );

      if (!partidas.length) {
        return res.status(404).json({ erro: 'Partida não encontrada.' });
      }

      const partida = partidas[0];

      if (partida.status === 'CANCELADA' || partida.status === 'ADIADA') {
        return res.status(409).json({
          erro: 'Não é possível registrar acontecimentos de uma partida cancelada ou adiada.',
        });
      }

      const idsTimes = [Number(partida.id_time_a), Number(partida.id_time_b)];

      let idTime = SEM_JOGADOR.has(tipo) ? null : idTimeInformado;
      let idJogadorFinal = SEM_JOGADOR.has(tipo) ? null : idJogador;

      // O time do acontecimento é sempre o time do jogador, assim
      // o histórico nunca fica com um jogador no time errado.
      if (idJogadorFinal !== null) {
        const [elenco] = await pool.execute(
          `
            SELECT id_time
            FROM elenco
            WHERE id_jogador = ?
              AND id_time IN (?, ?)
          `,
          [idJogadorFinal, idsTimes[0], idsTimes[1]]
        );

        if (!elenco.length) {
          return res.status(400).json({
            erro: 'O jogador informado não pertence a nenhum dos times desta partida.',
          });
        }

        idTime = Number(elenco[0].id_time);

        if (idTimeInformado !== null && idTimeInformado !== idTime) {
          return res.status(400).json({
            erro: 'O jogador informado não pertence ao time selecionado.',
          });
        }
      } else if (idTime !== null && !idsTimes.includes(idTime)) {
        return res.status(400).json({ erro: 'O time informado não joga esta partida.' });
      }

      const [resultado] = await pool.execute(
        `
          INSERT INTO acontecimento
            (id_partida, id_time, id_jogador, tipo, minuto, descricao)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          partida.id_partida,
          idTime,
          idJogadorFinal,
          tipo,
          minuto,
          descricao || null,
        ]
      );

      res.status(201).json({
        id_acontecimento: resultado.insertId,
        mensagem: 'Acontecimento registrado com sucesso!',
      });
    } catch (error) {
      next(error);
    }
  });


  // ============================================================
  // DELETE /api/partidas/:id/acontecimentos/:id_acontecimento
  // ============================================================

  app.delete(
    '/api/partidas/:id/acontecimentos/:id_acontecimento',
    async (req, res, next) => {
      if (!validId(req.params.id) || !validId(req.params.id_acontecimento)) {
        return res.status(400).json({ erro: 'Identificador inválido.' });
      }

      try {
        const [resultado] = await pool.execute(
          `
            DELETE FROM acontecimento
            WHERE id_acontecimento = ?
              AND id_partida = ?
          `,
          [req.params.id_acontecimento, req.params.id]
        );

        if (!resultado.affectedRows) {
          return res.status(404).json({ erro: 'Acontecimento não encontrado.' });
        }

        res.json({ mensagem: 'Acontecimento removido.' });
      } catch (error) {
        next(error);
      }
    }
  );
}