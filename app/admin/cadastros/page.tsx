'use client';

import { useState } from 'react';

// Exemplo de dados de esportes e suas posições específicas
const ESPORTES_CONFIG: Record<string, { posicoes: string[]; tipoEquipe: string }> = {
  'Futebol de Campo': {
    posicoes: ['Goleiro', 'Zagueiro', 'Lateral', 'Meio-campo', 'Atacante'],
    tipoEquipe: '11 jogadores em campo'
  },
  'Futsal': {
    posicoes: ['Goleiro', 'Fixo', 'Ala', 'Pivô'],
    tipoEquipe: '5 jogadores em quadra'
  },
  'Vôlei de Praia': {
    posicoes: ['Bloqueador', 'Defensor'],
    tipoEquipe: 'Dupla'
  },
  'Basquete': {
    posicoes: ['Armador', 'Ala-armador', 'Ala', 'Ala-pivô', 'Pivô'],
    tipoEquipe: '5 jogadores em quadra'
  }
};

export default function PaginaCadastrosDinamicos() {
  const [esporteSelecionado, setEsporteSelecionado] = useState('');
  const [tipoCadastro, setTipoCadastro] = useState<'time' | 'atleta' | ''>('');

  const [nomeTime, setNomeTime] = useState('');
  const [descricaoTime, setDescricaoTime] = useState('');
  const [fotoTime, setFotoTime] = useState('');

  const [nomeAtleta, setNomeAtleta] = useState('');
  const [identificacaoAtleta, setIdentificacaoAtleta] = useState('');
  const [generoAtleta, setGeneroAtleta] = useState('');
  const [idadeAtleta, setIdadeAtleta] = useState('');
  const [posicaoAtleta, setPosicaoAtleta] = useState('');
  const [fotoAtleta, setFotoAtleta] = useState('');

  const reiniciarFluxo = () => {
    setEsporteSelecionado('');
    setTipoCadastro('');
    setNomeTime('');
    setDescricaoTime('');
    setFotoTime('');
    setNomeAtleta('');
    setIdentificacaoAtleta('');
    setGeneroAtleta('');
    setIdadeAtleta('');
    setPosicaoAtleta('');
    setFotoAtleta('');
  };

  const MAPA_IDS_ESPORTES: Record<string, number> = {
    'Futebol': 1,
    'Futsal': 2,
    'Basquete': 3,
    'Vôlei': 4
  };

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (tipoCadastro === 'time') {
        const dadosTime = {
          id_esporte: MAPA_IDS_ESPORTES[esporteSelecionado] || 1,
          nome: nomeTime,
          escudo_url: fotoTime,
          descricao: descricaoTime
        };

        const resposta = await fetch('http://localhost:3001/api/times', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosTime)
        });

        if (!resposta.ok) throw new Error('Erro ao salvar time');

        alert(`Equipa "${nomeTime}" cadastrada com sucesso no banco de dados!`);
      } else {
        const dadosAtleta = {
          nome: nomeAtleta,
          documento: identificacaoAtleta,
          foto_url: fotoAtleta,
          posicao: posicaoAtleta
        };

        const resposta = await fetch('http://localhost:3001/api/atletas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosAtleta)
        });

        if (!resposta.ok) throw new Error('Erro ao salvar atleta');

        alert(`Atleta "${nomeAtleta}" cadastrado com sucesso no banco de dados!`);
      }

      reiniciarFluxo();
    } catch (erro) {
      console.error(erro);
      alert('Ocorreu um erro ao comunicar com o servidor.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">

      {/* Cabeçalho Único Inspirado no Design do Site Principal */}
      <header className="relative overflow-hidden bg-[#112d21] text-white p-8 rounded-2xl border border-[#1c3b2c] shadow-lg flex items-center justify-between">
        <div className="absolute right-0 top-0 w-64 h-64 bg-radial from-[#315d42]/30 to-transparent pointer-events-none rounded-full blur-2xl"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 text-[#d7f36a] flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
            GT
          </div>
          <div>
            <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-[#d7f36a] bg-[#1b392b] px-3 py-1 rounded-full mb-2">
              Assistente de Cadastro
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Novo Registro Esportivo
            </h1>
          </div>
        </div>
        {(esporteSelecionado || tipoCadastro) && (
          <button 
            onClick={reiniciarFluxo}
            className="relative z-10 text-xs text-emerald-300 hover:text-white underline transition-colors bg-[#1b392b] px-3 py-1.5 rounded-lg border border-[#315d42] shrink-0"
          >
            Recomeçar
          </button>
        )}
      </header>

      {/* PASSO 1: Selecionar o Esporte */}
      {!esporteSelecionado && (
        <section className="bg-white border border-slate-200/80 p-8 rounded-2xl shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            1. Selecione a Modalidade Esportiva
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.keys(ESPORTES_CONFIG).map((esporte) => (
              <button
                key={esporte}
                onClick={() => setEsporteSelecionado(esporte)}
                className="p-5 text-left border border-slate-200 rounded-xl hover:border-[#315d42] hover:bg-emerald-50/20 transition-all group shadow-sm hover:shadow-md"
              >
                <span className="font-semibold text-slate-800 group-hover:text-[#112d21] block text-base">
                  {esporte}
                </span>
                <span className="text-xs text-slate-500 mt-1 block">
                  Formato: {ESPORTES_CONFIG[esporte].tipoEquipe}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* PASSO 2: Selecionar se é Time ou Atleta */}
      {esporteSelecionado && !tipoCadastro && (
        <section className="bg-white border border-slate-200/80 p-8 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">
              2. O que deseja registar em <span className="text-[#315d42]">{esporteSelecionado}</span>?
            </h2>
            <button onClick={() => setEsporteSelecionado('')} className="text-xs text-emerald-700 hover:underline font-semibold">
              Mudar esporte
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => setTipoCadastro('time')}
              className="p-6 text-center border border-slate-200 rounded-xl hover:border-[#315d42] hover:bg-emerald-50/20 transition-all font-semibold text-slate-800 shadow-sm hover:shadow-md group"
            >
              <span className="block text-base group-hover:text-[#112d21]">Cadastrar uma Equipe (Time)</span>
              <span className="text-xs text-slate-500 font-normal mt-1 block">Criar escudo, nome e histórico</span>
            </button>
            <button
              onClick={() => setTipoCadastro('atleta')}
              className="p-6 text-center border border-slate-200 rounded-xl hover:border-[#315d42] hover:bg-emerald-50/20 transition-all font-semibold text-slate-800 shadow-sm hover:shadow-md group"
            >
              <span className="block text-base group-hover:text-[#112d21]">Cadastrar um Atleta (Jogador)</span>
              <span className="text-xs text-slate-500 font-normal mt-1 block">Registar dados e posições</span>
            </button>
          </div>
        </section>
      )}

      {/* PASSO 3A: Formulário de Time */}
      {esporteSelecionado && tipoCadastro === 'time' && (
        <form onSubmit={lidarComEnvio} className="bg-white border border-slate-200/80 p-8 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                {esporteSelecionado}
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Cadastro de Equipe</h2>
            </div>
            <button type="button" onClick={() => setTipoCadastro('')} className="text-xs text-emerald-700 hover:underline font-semibold">
              Voltar
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nome Oficial do Time *
              </label>
              <input 
                type="text" 
                value={nomeTime}
                onChange={(e) => setNomeTime(e.target.value)}
                placeholder="Ex: Atlético da Vila"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#315d42] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                URL do Escudo / Foto do Time
              </label>
              <input 
                type="url" 
                value={fotoTime}
                onChange={(e) => setFotoTime(e.target.value)}
                placeholder="https://exemplo.com/escudo.png"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#315d42] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Descrição Opcional
              </label>
              <textarea 
                value={descricaoTime}
                onChange={(e) => setDescricaoTime(e.target.value)}
                placeholder="Histórico ou informações da equipe..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#315d42] text-sm resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={!nomeTime.trim()}
              className="w-full bg-[#112d21] hover:bg-[#1b392b] text-white font-medium py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm"
            >
              Concluir Cadastro da Equipe
            </button>
          </div>
        </form>
      )}

      {/* PASSO 3B: Formulário de Atleta */}
      {esporteSelecionado && tipoCadastro === 'atleta' && (
        <form onSubmit={lidarComEnvio} className="bg-white border border-slate-200/80 p-8 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                {esporteSelecionado}
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Cadastro de Atleta</h2>
            </div>
            <button type="button" onClick={() => setTipoCadastro('')} className="text-xs text-emerald-700 hover:underline font-semibold">
              Voltar
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome Completo *
                </label>
                <input 
                  type="text" 
                  value={nomeAtleta}
                  onChange={(e) => setNomeAtleta(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#315d42] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Identificação / Documento *
                </label>
                <input 
                  type="text" 
                  value={identificacaoAtleta}
                  onChange={(e) => setIdentificacaoAtleta(e.target.value)}
                  placeholder="Ex: RG ou CPF"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#315d42] text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gênero
                </label>
                <select 
                  value={generoAtleta}
                  onChange={(e) => setGeneroAtleta(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#315d42] text-sm"
                >
                  <option value="">Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Idade
                </label>
                <input 
                  type="number" 
                  value={idadeAtleta}
                  onChange={(e) => setIdadeAtleta(e.target.value)}
                  placeholder="Ex: 22"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#315d42] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Posição ({esporteSelecionado})
                </label>
                <select 
                  value={posicaoAtleta}
                  onChange={(e) => setPosicaoAtleta(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#315d42] text-sm"
                >
                  <option value="">Selecione...</option>
                  {ESPORTES_CONFIG[esporteSelecionado].posicoes.map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                URL da Foto do Atleta
              </label>
              <input 
                type="url" 
                value={fotoAtleta}
                onChange={(e) => setFotoAtleta(e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#315d42] text-sm"
              />
            </div>

            <button 
              type="submit"
              disabled={!nomeAtleta.trim() || !identificacaoAtleta.trim()}
              className="w-full bg-[#112d21] hover:bg-[#1b392b] text-white font-medium py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm"
            >
              Concluir Cadastro do Atleta
            </button>
          </div>
        </form>
      )}

    </div>
  );
}