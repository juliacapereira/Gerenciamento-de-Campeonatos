import express from 'express';
import cookieParser from 'cookie-parser';
import pool from './database.js';
import { createApp } from './app.js';
import administradoresRouter from './src/routes/administradores.js';

// Login/cadastro de administradores (cookie HttpOnly). O Next encaminha /api/* para cá,
// então o navegador fala só com o mesmo endereço do site e não precisa de CORS com credenciais.
const admin = express.Router();
admin.use(cookieParser());
admin.use(administradoresRouter);

const PORT = Number(process.env.PORT || 3001);
createApp(pool, { adminRouter: admin }).listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
