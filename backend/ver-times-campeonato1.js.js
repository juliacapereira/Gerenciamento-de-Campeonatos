import pool from './database.js';

async function verificar() {
  try {
    const [rows] = await pool.query(`
      SELECT
        ct.id_campeonato,
        ct.id_time,
        t.nome
      FROM campeonato_time ct
      INNER JOIN time t
        ON t.id_time = ct.id_time
      WHERE ct.id_campeonato = 1
      ORDER BY t.nome
    `);

    console.table(rows);

  } catch (error) {
    console.error(error);

  } finally {
    await pool.end();
  }
}

verificar();