import express from "express";
import cors from "cors";
import pool from "./database.js";
import cookieParser from "cookie-parser";
import administradoresRouter from "./src/routes/administradores.js";

const app = express();
const PORT = 3000;

// Configuração CORS
app.use(cors({
  origin: "http://localhost:3001",
  credentials: true
}));

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Rotas de administradores
app.use("/api/admin", administradoresRouter);

// Rota inicial
app.get("/", (req, res) => {
  res.json({
    mensagem: "API funcionando"
  });
});

// Listagem de esportes
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

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});