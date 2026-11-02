import pool from './database.js';

async function listar() {
  try {
    const [usuarios] = await pool.query(`
      SELECT
        id_usuario,
        nome,
        email
      FROM usuario
      ORDER BY id_usuario
    `);

    console.table(usuarios);

  } catch (error) {
    console.error(error);

  } finally {
    await pool.end();
  }
}

listar();