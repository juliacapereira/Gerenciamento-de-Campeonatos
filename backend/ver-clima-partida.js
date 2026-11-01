import pool from './database.js';

async function verificar() {
  try {
    const [rows] = await pool.query(`
      SHOW COLUMNS FROM partida
      LIKE 'clima'
    `);

    if (rows.length === 0) {
      console.log('A coluna clima NÃO existe na tabela partida.');
    } else {
      console.log('A coluna clima existe:');
      console.table(rows);
    }

  } catch (error) {
    console.error(error);

  } finally {
    await pool.end();
  }
}

verificar();