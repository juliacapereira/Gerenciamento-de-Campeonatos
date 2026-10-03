import express from "express";
import cors from "cors";
import pool from "./database.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensagem: "API funcionando"
  });
});

// Rota para listar esportes
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

// Rota para listar times
app.get('/api/times', async (req, res) => {
  try {
    const [times] = await pool.query('SELECT * FROM time');
    res.json(times);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar times' });
  }
});

// Rota para cadastrar Time
app.post('/api/times', async (req, res) => {
  const { id_esporte, nome, escudo_url, descricao } = req.body;
  
  try {
    const query = 'INSERT INTO time (id_esporte, nome, escudo_url, descricao) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(query, [id_esporte, nome, escudo_url, descricao]);
    
    res.status(201).json({ mensagem: 'Time cadastrado com sucesso!', id_time: result.insertId });
  } catch (err) {
    console.error('Erro ao cadastrar time:', err);
    res.status(500).json({ erro: 'Erro ao salvar o time no banco de dados.' });
  }
});

// Rota para cadastrar Atleta e vincular no elenco
app.post('/api/atletas', async (req, res) => {
  const { nome, data_nascimento, documento, foto_url, id_time, posicao, numero_camisa } = req.body;
  
  try {
    const queryJogador = 'INSERT INTO jogador (nome, data_nascimento, documento, foto_url) VALUES (?, ?, ?, ?)';
    const [resultJogador] = await pool.query(queryJogador, [nome, data_nascimento || null, documento, foto_url || null]);

    const id_jogador = resultJogador.insertId;

    if (id_time) {
      const queryElenco = 'INSERT INTO elenco (id_time, id_jogador, posicao, numero_camisa) VALUES (?, ?, ?, ?)';
      await pool.query(queryElenco, [id_time, id_jogador, posicao || null, numero_camisa || null]);
      
      return res.status(201).json({ mensagem: 'Atleta cadastrado e vinculado ao time com sucesso!' });
    }

    res.status(201).json({ mensagem: 'Atleta cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao cadastrar atleta:', err);
    res.status(500).json({ erro: 'Erro ao salvar os dados do atleta.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});