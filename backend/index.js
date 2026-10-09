import pool from './database.js';
import { createApp } from './app.js';
import administradoresRouter from './src/routes/administradores.js';

const PORT = Number(process.env.PORT || 3001);

createApp(pool, {
  adminRouter: administradoresRouter,
}).listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});