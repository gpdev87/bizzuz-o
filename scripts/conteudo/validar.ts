import { CATEGORIAS, PONTOS, valorValido, type Gravidade, type Infracao } from '../../src/dominio/tipos';
import type { Coluna, LinhaBruta } from './ler-planilha';

export const MARCADOR_NAO_CONSTA = 'NÃO CONSTA';

export interface Problema {
  linha: number;
  campo: string;
  mensagem: string;
}

export interface ResultadoValidacao {
  infracoes: Infracao[];
  erros: Problema[];
  avisos: Problema[];
  rascunhos: number;
}

const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const GRAVIDADE_POR_TEXTO: Record<string, Gravidade> = {
  leve: 'leve',
  media: 'media',
  grave: 'grave',
  gravissima: 'gravissima',
};

const MSG_VAZIO = `vazio — preencha ou escreva ${MARCADOR_NAO_CONSTA}`;

function texto(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function paraCentavos(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v * 100);
  const t = texto(v).replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t.replace(/\./g, '').replace(',', '.')) * 100);
}

function paraDataIso(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${v.getUTCFullYear()}-${p(v.getUTCMonth() + 1)}-${p(v.getUTCDate())}`;
  }
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto(v));
  if (!m) return null;
  const [, d, mes, a] = m;
  const dt = new Date(Date.UTC(+a, +mes - 1, +d));
  if (dt.getUTCDate() !== +d || dt.getUTCMonth() !== +mes - 1) return null;
  return `${a}-${mes.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Valida uma linha. Devolve a infração (se não houver problemas) e a lista de problemas. */
function validarLinha(l: LinhaBruta): { infracao: Infracao | null; problemas: Problema[] } {
  const v = l.valores;
  const problemas: Problema[] = [];
  const problema = (campo: Coluna, mensagem: string) =>
    problemas.push({ linha: l.linha, campo, mensagem });

  const obrigatorio = (campo: Coluna): string => {
    const t = texto(v[campo]);
    if (!t) problema(campo, 'vazio — campo obrigatório');
    else if (semAcento(t) === semAcento(MARCADOR_NAO_CONSTA)) {
      problema(campo, `não aceita ${MARCADOR_NAO_CONSTA}`);
    }
    return t;
  };
  const textoDaFonte = (campo: Coluna): string | null => {
    const t = texto(v[campo]);
    if (!t) {
      problema(campo, MSG_VAZIO);
      return null;
    }
    return semAcento(t) === semAcento(MARCADOR_NAO_CONSTA) ? null : t;
  };

  const codigo = texto(v['Código']);
  if (!/^\d{3}-\d{2}$/.test(codigo)) problema('Código', 'formato inválido — use NNN-NN, ex.: 763-31');

  const descricao = obrigatorio('Descrição');
  const artigo = obrigatorio('Artigo');
  const fonte = obrigatorio('Fonte');

  const gravidade = GRAVIDADE_POR_TEXTO[semAcento(texto(v['Gravidade']))];
  if (!gravidade) problema('Gravidade', 'use Leve, Média, Grave ou Gravíssima');

  const naoComputavel = ['nao computavel', 'nao aplicavel'].includes(semAcento(texto(v['Pontos'])));
  const pontos = naoComputavel ? null : Number(v['Pontos']);
  if (gravidade && pontos !== null && pontos !== PONTOS[gravidade]) {
    problema('Pontos', `infração ${texto(v['Gravidade'])} vale ${PONTOS[gravidade]} pontos`);
  }

  const valorCentavos = paraCentavos(v['Valor (R$)']);
  if (valorCentavos === null) problema('Valor (R$)', 'valor inválido — ex.: 293,47');
  else if (gravidade && !valorValido(gravidade, valorCentavos)) {
    problema('Valor (R$)', 'valor não corresponde à gravidade (CTB art. 258) com nenhum fator multiplicador');
  }

  const medidaAdministrativa = textoDaFonte('Medida administrativa');
  const quandoAutuar = textoDaFonte('Quando autuar');
  const quandoNaoAutuar = textoDaFonte('Quando não autuar');
  const procedimento = textoDaFonte('Procedimento');
  const oQueRegistrar = textoDaFonte('O que registrar');

  const categoria = CATEGORIAS.find((c) => semAcento(c.rotulo) === semAcento(texto(v['Categoria'])));
  if (!categoria) problema('Categoria', `use uma de: ${CATEGORIAS.map((c) => c.rotulo).join(', ')}`);

  const sinonimos = [
    ...new Set(
      texto(v['Sinônimos'])
        .split(';')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  const conferidoEm = paraDataIso(v['Data de conferência']);
  if (!conferidoEm) problema('Data de conferência', 'data inválida ou vazia — use DD/MM/AAAA');

  if (problemas.length) return { infracao: null, problemas };
  return {
    infracao: {
      codigo,
      descricao,
      artigo,
      gravidade,
      pontos,
      valorCentavos: valorCentavos!,
      medidaAdministrativa,
      quandoAutuar,
      quandoNaoAutuar,
      procedimento,
      oQueRegistrar,
      categoria: categoria!.slug,
      sinonimos,
      fonte,
      conferidoEm: conferidoEm!,
    },
    problemas,
  };
}

export function validar(linhas: LinhaBruta[]): ResultadoValidacao {
  const r: ResultadoValidacao = { infracoes: [], erros: [], avisos: [], rascunhos: 0 };
  const conferidas: { linha: number; codigo: string }[] = [];

  for (const l of linhas) {
    const status = semAcento(texto(l.valores['Status']));
    if (status === 'rascunho') {
      r.rascunhos++;
      // Rascunho ainda não tem data de conferência; isso não é problema.
      const { problemas } = validarLinha(l);
      r.avisos.push(...problemas.filter((p) => p.campo !== 'Data de conferência'));
      continue;
    }
    if (status !== 'conferido') {
      r.erros.push({ linha: l.linha, campo: 'Status', mensagem: 'use Rascunho ou Conferido' });
      continue;
    }
    const { infracao, problemas } = validarLinha(l);
    r.erros.push(...problemas);
    conferidas.push({ linha: l.linha, codigo: texto(l.valores['Código']) });
    if (infracao) r.infracoes.push(infracao);
  }

  const contagem = new Map<string, number>();
  for (const c of conferidas) contagem.set(c.codigo, (contagem.get(c.codigo) ?? 0) + 1);
  for (const c of conferidas) {
    if ((contagem.get(c.codigo) ?? 0) > 1) {
      r.erros.push({ linha: c.linha, campo: 'Código', mensagem: `código ${c.codigo} repetido` });
    }
  }
  r.erros.sort((a, b) => a.linha - b.linha);
  return r;
}
