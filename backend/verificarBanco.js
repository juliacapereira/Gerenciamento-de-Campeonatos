import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)), quiet: true });

const missing = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
  .filter(key => !process.env[key]);
if (missing.length || !Number.isInteger(Number(process.env.DB_PORT)) || Number(process.env.DB_PORT) < 1 || Number(process.env.DB_PORT) > 65535) {
  console.error(missing.length ? `Variáveis ausentes no backend/.env: ${missing.join(', ')}` : 'DB_PORT deve ser uma porta válida.');
  process.exit(1);
}

let pool;
try {
  ({ default: pool } = await import('./database.js'));
  console.log('Testando conexão com o MySQL (limite de conexão: 20 segundos)...');
  await pool.query('SELECT 1');
  console.log('Conexão e consulta realizadas com sucesso. Você pode iniciar o backend com npm run dev.');
} catch (error) {
  const hints = {
    ETIMEDOUT: 'Sem resposta do banco. Confira o estado do serviço no Aiven, host, porta, restrições de IP e sua rede.',
    EAI_AGAIN: 'Falha temporária de DNS. Confira sua conexão de rede e tente novamente.',
    ENOTFOUND: 'Endereço do banco não encontrado. Confira DB_HOST.',
    ECONNREFUSED: 'Conexão recusada. Confira a porta e se o serviço está disponível.',
    ER_ACCESS_DENIED_ERROR: 'Autenticação recusada. Confira DB_USER e DB_PASSWORD.',
    ER_BAD_DB_ERROR: 'Banco não encontrado. Confira DB_NAME.',
    ENOENT: 'Certificado não encontrado. Confira backend/certs/ca.pem.',
  };
  console.error(`Falha na conexão (${error.code || 'sem código'}).`);
  console.error(hints[error.code] || 'Confira as credenciais e o certificado TLS do serviço no Aiven.');
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
