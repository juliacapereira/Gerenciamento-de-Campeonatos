export const statuses = ['PLANEJADO', 'INSCRICOES', 'EM_ANDAMENTO', 'ENCERRADO'];
export function validate(kind, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Dados inválidos.';
    if (kind === 'jogadores') return validatePlayer(body);
  const text = (key, max, required = false) =>
    (!required && (body[key] === undefined || body[key] === null || body[key] === '')) ||
    (typeof body[key] === 'string' && body[key].trim().length <= max && (!required || body[key].trim().length >= 2));
  if (!text('nome', 150, true)) return 'Informe um nome entre 2 e 150 caracteres.';
  if (!Number.isSafeInteger(body.id_esporte) || body.id_esporte < 1) return 'Selecione um esporte válido.';
  if (!text('descricao', 5000)) return 'A descrição deve ter até 5000 caracteres.';
  if (kind === 'campeonatos') {
    const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1000 && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!date(body.data_inicial) || !date(body.data_fim)) return 'Informe datas válidas.';
    if (body.data_fim < body.data_inicial) return 'A data final deve ser igual ou posterior à data inicial.';
    if (!statuses.includes(body.status)) return 'Selecione um status válido.';
  } else {
    if (!text('nome_abreviado', 30) || !text('cidade', 100)) return 'Confira a sigla (até 30 caracteres) e a cidade (até 100).';
    if (!text('escudo_url', 500)) return 'A URL do escudo deve ter até 500 caracteres.';
    if (body.escudo_url) {
      try { if (!['http:', 'https:'].includes(new URL(body.escudo_url).protocol)) return 'Use uma URL HTTP ou HTTPS para o escudo.'; }
      catch { return 'Informe uma URL válida para o escudo.'; }
    }
  }
  return null;
}

function validatePlayer(body) {
  const text = (key, max, min = 0) => typeof body[key] === 'string' && body[key].trim().length >= min && body[key].trim().length <= max;
  const empty = key => body[key] === undefined || body[key] === null || body[key] === '';
  if (!text('nome', 150, 2)) return 'Informe o nome completo entre 2 e 150 caracteres.';
  if (!text('documento', 30, 3)) return 'Informe o documento (RG ou CPF) com 3 a 30 caracteres.';
  if (!empty('data_nascimento')) {
    const value = body.data_nascimento;
    const valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900 && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!valid) return 'Informe uma data de nascimento válida.';
    if (value > new Date().toISOString().slice(0, 10)) return 'A data de nascimento não pode estar no futuro.';
  }
  if (!empty('foto_url')) {
    if (!text('foto_url', 500)) return 'A URL da foto deve ter até 500 caracteres.';
    try { if (!['http:', 'https:'].includes(new URL(body.foto_url).protocol)) return 'Use uma URL HTTP ou HTTPS para a foto.'; }
    catch { return 'Informe uma URL válida para a foto.'; }
  }
  return null;
}
