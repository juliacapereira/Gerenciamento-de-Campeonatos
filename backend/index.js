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

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});