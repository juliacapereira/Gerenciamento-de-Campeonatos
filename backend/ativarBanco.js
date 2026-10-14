import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)), quiet: true });

const project = process.env.AIVEN_PROJECT;
const service = process.env.AIVEN_SERVICE;

if (!project || !service) {
  console.error('Preencha AIVEN_PROJECT e AIVEN_SERVICE no backend/.env com os nomes do painel Aiven.');
  process.exit(1);
}

for (const args of [
  ['service', 'update', service, '--project', project, '--power-on'],
  ['service', 'wait', service, '--project', project],
]) {
  const result = spawnSync('avn', args, { stdio: 'inherit', shell: false });
  if (result.error) {
    console.error(result.error.code === 'ENOENT'
      ? 'Instale a CLI oficial do Aiven (aiven-client) e faça login com avn user login antes de executar este comando.'
      : 'Não foi possível executar a CLI do Aiven.');
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log('Serviço iniciado. Execute npm run db:check para testar o acesso ao MySQL.');
