import pool from './database.js';

async function verificar() {
  const email = 'juliacp@gmail.com';

  try {
    const [rows] = await pool.query(`
      SELECT
        p.id_partida,
        p.id_campeonato,
        c.nome AS campeonato,
        ta.nome AS time_a,
        tb.nome AS time_b,
        p.data_hora,
        p.local,
        p.clima
      FROM partida p
      INNER JOIN campeonato c
        ON c.id_campeonato = p.id_campeonato
      INNER JOIN usuario u
        ON u.id_usuario = c.id_usuario
      INNER JOIN time ta
        ON ta.id_time = p.id_time_a
      INNER JOIN time tb
        ON tb.id_time = p.id_time_b
      WHERE u.email = ?
      ORDER BY p.id_partida
    `, [email]);

    if (!rows.length) {
      console.log('Esse usuário ainda não possui partidas cadastradas.');
      return;
    }

    console.table(rows);

  } catch (error) {
    console.error(error);

  } finally {
    await pool.end();
  }
}

verificar();