import express from "express";
import cors from "cors";
import pool from "./database.js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensagem: "API funcionando"
  });
});

app.get("/api/esportes", async (req, res) => {
  try {
    const [esportes] = await pool.query(
      "SELECT * FROM esporte ORDER BY nome"
    );

    res.json(esportes);
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      erro: "Erro ao consultar esportes"
    });
  }
});

// US10 - INSCRIÇÃO DE TIMES EM CAMPEONATOS

app.post("/api/times/:id_time/jogadores", async (req, res) => {
  const { id_time } = req.params;
  const { id_jogador, numero_camisa, posicao } = req.body;

  if (!id_jogador) {
    return res.status(400).json({ erro: "O ID do jogador é obrigatório." });
  }

  try {
    const [timeExiste] = await pool.query("SELECT id_time FROM time WHERE id_time = ?", [id_time]);
    if (timeExiste.length === 0) {
      return res.status(404).json({ erro: "Equipa não encontrada." });
    }

    const [jogadorExiste] = await pool.query("SELECT id_jogador FROM jogador WHERE id_jogador = ?", [id_jogador]);
    if (jogadorExiste.length === 0) {
      return res.status(404).json({ erro: "Jogador não encontrado." });
    }

    const [resultado] = await pool.query(
      "INSERT INTO elenco (id_time, id_jogador, numero_camisa, posicao) VALUES (?, ?, ?, ?)",
      [id_time, id_jogador, numero_camisa || null, posicao || null]
    );

    res.status(201).json({
      mensagem: "Jogador adicionado à equipa com sucesso!",
      id_elenco: resultado.insertId,
      id_time: Number(id_time),
      id_jogador,
      numero_camisa,
      posicao
    });
  } catch (erro) {
    console.error(erro);
    if (erro.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ erro: "Este jogador já está vinculado a esta equipa." });
    }
    res.status(500).json({ erro: "Erro ao adicionar jogador à equipa." });
  }
});

app.get("/api/times/:id_time/jogadores", async (req, res) => {
  const { id_time } = req.params;

  try {
    const [jogadores] = await pool.query(
      `SELECT e.id_elenco, e.id_time, e.id_jogador, e.numero_camisa, e.posicao, e.ativo, e.data_entrada,
              j.nome, j.documento, j.foto_url
       FROM elenco e
       INNER JOIN jogador j ON e.id_jogador = j.id_jogador
       WHERE e.id_time = ? AND e.ativo = TRUE
       ORDER BY e.numero_camisa ASC, j.nome ASC`,
      [id_time]
    );

    res.json(jogadores);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao consultar jogadores da equipa." });
  }
});

app.delete("/api/times/:id_time/jogadores/:id_jogador", async (req, res) => {
  const { id_time, id_jogador } = req.params;

  try {
    const [resultado] = await pool.query(
      "DELETE FROM elenco WHERE id_time = ? AND id_jogador = ?",
      [id_time, id_jogador]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: "Vínculo de jogador não encontrado nesta equipa." });
    }

    res.json({ mensagem: "Jogador removido da equipa com sucesso." });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao remover jogador da equipa." });
  }
});


// US10 - INSCRIÇÃO DE TIMES EM CAMPEONATOS

app.post("/api/campeonatos/:id_campeonato/times", async (req, res) => {
  const { id_campeonato } = req.params;
  const { id_time } = req.body;

  if (!id_time) {
    return res.status(400).json({ erro: "O ID da equipa é obrigatório." });
  }

  try {
    const [campeonatoExiste] = await pool.query("SELECT id_campeonato FROM campeonato WHERE id_campeonato = ?", [id_campeonato]);
    if (campeonatoExiste.length === 0) {
      return res.status(404).json({ erro: "Campeonato não encontrado." });
    }

    const [timeExiste] = await pool.query("SELECT id_time FROM time WHERE id_time = ?", [id_time]);
    if (timeExiste.length === 0) {
      return res.status(404).json({ erro: "Equipa não encontrada." });
    }

    const [resultado] = await pool.query(
      "INSERT INTO campeonato_time (id_campeonato, id_time) VALUES (?, ?)",
      [id_campeonato, id_time]
    );

    res.status(201).json({
      mensagem: "Equipa inscrita no campeonato com sucesso!",
      id_campeonato_time: resultado.insertId,
      id_campeonato: Number(id_campeonato),
      id_time
    });
  } catch (erro) {
    console.error(erro);
    if (erro.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ erro: "Esta equipa já se encontra inscrita neste campeonato." });
    }
    res.status(500).json({ erro: "Erro ao inscrever equipa no campeonato." });
  }
});

app.get("/api/campeonatos/:id_campeonato/times", async (req, res) => {
  const { id_campeonato } = req.params;

  try {
    const [times] = await pool.query(
      `SELECT ct.id_campeonato_time, ct.id_campeonato, ct.id_time, ct.data_inscricao,
              t.nome, t.nome_abreviado, t.cidade, t.escudo_url
       FROM campeonato_time ct
       INNER JOIN time t ON ct.id_time = t.id_time
       WHERE ct.id_campeonato = ?
       ORDER BY t.nome ASC`,
      [id_campeonato]
    );

    res.json(times);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao consultar equipas do campeonato." });
  }
});

app.delete("/api/campeonatos/:id_campeonato/times/:id_time", async (req, res) => {
  const { id_campeonato, id_time } = req.params;

  try {
    const [resultado] = await pool.query(
      "DELETE FROM campeonato_time WHERE id_campeonato = ? AND id_time = ?",
      [id_campeonato, id_time]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: "Inscrição da equipa não encontrada neste campeonato." });
    }

    res.json({ mensagem: "Inscrição da equipa removida do campeonato com sucesso." });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao remover inscrição da equipa." });
  }
});

// ------------------------------------------------------------
// FINAL DO FICHEIRO (Fica igual)
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});