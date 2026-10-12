// US09 - Posições disponíveis por esporte. Os nomes seguem os esportes do banco.sql.
// Um esporte cadastrado depois (sem lista aqui) aceita texto livre até ganhar a sua lista.
export const positionsBySport = {
  Futebol: ['Goleiro', 'Zagueiro', 'Lateral', 'Volante', 'Meio-campo', 'Atacante'],
  Futsal: ['Goleiro', 'Fixo', 'Ala', 'Pivô'],
  Basquete: ['Armador', 'Ala-armador', 'Ala', 'Ala-pivô', 'Pivô'],
  'Vôlei': ['Levantador', 'Ponteiro', 'Oposto', 'Central', 'Líbero'],
};

const normalize = text => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export function positionsFor(sport) {
  const name = Object.keys(positionsBySport).find(key => normalize(key) === normalize(sport));
  return name ? positionsBySport[name] : null;
}
