import MiniSearch from 'minisearch';
import { CATEGORIAS, type Infracao } from '../dominio/tipos';

/** Palavras que não ajudam a achar a ficha e atrapalham a busca com AND. */
const PALAVRAS_VAZIAS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'com', 'para', 'por', 'um', 'uma', 'ao', 'aos',
]);

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface Indice {
  readonly infracoes: Infracao[];
  readonly mini: MiniSearch<Infracao>;
}

const rotuloCategoria = new Map(CATEGORIAS.map((c) => [c.slug, c.rotulo]));

export function criarIndice(infracoes: Infracao[]): Indice {
  const mini = new MiniSearch<Infracao>({
    idField: 'codigo',
    fields: ['descricao', 'sinonimos', 'categoria'],
    extractField: (doc, campo) => {
      if (campo === 'sinonimos') return doc.sinonimos.join(' ');
      if (campo === 'categoria') return rotuloCategoria.get(doc.categoria) ?? '';
      return (doc as unknown as Record<string, string>)[campo];
    },
    processTerm: (termo) => {
      const t = normalizar(termo);
      return t && !PALAVRAS_VAZIAS.has(t) ? t : null;
    },
  });
  mini.addAll(infracoes);
  return { infracoes, mini };
}

const soDigitos = (s: string) => s.replace(/\D/g, '');

export function buscar(indice: Indice, consulta: string, limite = 20): Infracao[] {
  const q = normalizar(consulta);
  if (!q) return [];

  if (/^\d{3}-?\d{0,2}$/.test(q)) {
    const d = soDigitos(q);
    return indice.infracoes.filter((i) => soDigitos(i.codigo).startsWith(d)).slice(0, limite);
  }

  const art = /^art(?:igo)?\.?\s*(\d+)(-[a-z])?/.exec(q);
  if (art) {
    const alvo = new RegExp(`\\bart\\.?\\s*${art[1]}${art[2] ?? ''}(?![\\w-])`);
    return indice.infracoes.filter((i) => alvo.test(normalizar(i.artigo))).slice(0, limite);
  }

  const opcoes = {
    boost: { sinonimos: 2, descricao: 1.5 },
    prefix: true,
    fuzzy: 0.2,
  };
  let resultados = indice.mini.search(q, { ...opcoes, combineWith: 'AND' });
  if (resultados.length === 0) resultados = indice.mini.search(q, { ...opcoes, combineWith: 'OR' });

  const porCodigo = new Map(indice.infracoes.map((i) => [i.codigo, i]));
  return resultados.slice(0, limite).map((r) => porCodigo.get(r.id as string)!);
}
