import pool from './database.js';

async function verificar() {
  try {
    const [rows] = await pool.query(`
      SHOW COLUMNS FROM usuario
    `);

    console.table(rows);

  } catch (error) {
    console.error(error);

  } finally {
    await pool.end();
  }
}

verificar();