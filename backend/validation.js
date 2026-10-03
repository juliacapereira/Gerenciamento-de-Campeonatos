export const statuses = ['PLANEJADO', 'INSCRICOES', 'EM_ANDAMENTO', 'ENCERRADO'];
export function validate(kind, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Dados inválidos.';
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
