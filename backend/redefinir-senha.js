import bcrypt from 'bcryptjs';
import pool from './database.js';

async function redefinir() {
  const email = 'juliacp@gmail.com';
  const novaSenha = 'SenhaTeste123!';

  try {
    const [usuarios] = await pool.execute(
      `
        SELECT
          id_usuario,
          nome,
          email
        FROM usuario
        WHERE email = ?
      `,
      [email]
    );

    if (!usuarios.length) {
      console.log('Usuário não encontrado.');
      return;
    }

    const hash = await bcrypt.hash(
      novaSenha,
      10
    );

    await pool.execute(
      `
        UPDATE usuario
        SET senha_hash = ?
        WHERE email = ?
      `,
      [
        hash,
        email
      ]
    );

    console.log('Senha redefinida com sucesso.');

    console.table([
      {
        id_usuario: usuarios[0].id_usuario,
        nome: usuarios[0].nome,
        email: usuarios[0].email,
        nova_senha: novaSenha
      }
    ]);

  } catch (error) {
    console.error(error);

  } finally {
    await pool.end();
  }
}

redefinir();