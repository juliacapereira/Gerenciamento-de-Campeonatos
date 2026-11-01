import pool from './database.js';

async function ajustar() {
  try {
    await pool.query(`
      ALTER TABLE partida
      ADD COLUMN clima VARCHAR(150) NULL
    `);

    console.log(
      'Campo clima adicionado à tabela partida com sucesso.'
    );

  } catch (error) {
    console.error(error);

  } finally {
    await pool.end();
  }
}

ajustar();