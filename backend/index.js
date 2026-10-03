import pool from './database.js';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT || 3001);
createApp(pool).listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
