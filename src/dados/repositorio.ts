import { get, set } from 'idb-keyval';
import {
  CATEGORIAS,
  GRAVIDADES,
  PONTOS,
  valorValido,
  type Base,
  type Gravidade,
  type Infracao,
} from '../dominio/tipos';

export interface Salvo {
  base: Base;
  verificadoEm: number | null;
}

export interface Armazenamento {
  ler(): Promise<Salvo | null>;
  salvar(s: Salvo): Promise<void>;
}

const CHAVE = 'base';

/** IndexedDB. Se o navegador bloquear (modo privado, dados limpos), vira um armazenamento vazio. */
export function armazenamentoIndexedDB(): Armazenamento {
  return {
    async ler() {
      try {
        const s = (await get(CHAVE)) as Salvo | undefined;
        return s && ehBase(s.base) ? s : null;
      } catch {
        return null;
      }
    },
    async salvar(s) {
      try {
        await set(CHAVE, s);
      } catch {
        /* sem armazenamento: o app segue funcionando enquanto estiver aberto */
      }
    },
  };
}

export function armazenamentoMemoria(inicial?: Salvo): Armazenamento {
  let atual: Salvo | null = inicial ?? null;
  return {
    async ler() {
      return atual;
    },
    async salvar(s) {
      atual = s;
    },
  };
}

const ehTexto = (x: unknown): x is string => typeof x === 'string';
const ehTextoOuNulo = (x: unknown) => x === null || ehTexto(x);
const SLUGS = new Set<string>(CATEGORIAS.map((c) => c.slug));

const ehDataIso = (x: unknown) => ehTexto(x) && /^\d{4}-\d{2}-\d{2}$/.test(x);

/** Confere a forma E a coerência de cada ficha: o aparelho não confia cegamente no servidor. */
function ehInfracao(x: unknown): x is Infracao {
  if (typeof x !== 'object' || x === null) return false;
  const i = x as Record<string, unknown>;
  const g = i.gravidade as Gravidade;
  return (
    ehTexto(i.codigo) &&
    /^\d{3}-\d{2}$/.test(i.codigo) &&
    ehTexto(i.descricao) &&
    ehTexto(i.artigo) &&
    (GRAVIDADES as readonly unknown[]).includes(g) &&
    (i.pontos === null || i.pontos === PONTOS[g]) &&
    typeof i.valorCentavos === 'number' &&
    Number.isInteger(i.valorCentavos) &&
    valorValido(g, i.valorCentavos) &&
    ehTextoOuNulo(i.medidaAdministrativa) &&
    ehTextoOuNulo(i.quandoAutuar) &&
    ehTextoOuNulo(i.quandoNaoAutuar) &&
    ehTextoOuNulo(i.procedimento) &&
    ehTextoOuNulo(i.oQueRegistrar) &&
    ehTexto(i.categoria) &&
    SLUGS.has(i.categoria) &&
    Array.isArray(i.sinonimos) &&
    i.sinonimos.every(ehTexto) &&
    ehTexto(i.fonte) &&
    ehDataIso(i.conferidoEm)
  );
}

export function ehBase(x: unknown): x is Base {
  if (typeof x !== 'object' || x === null) return false;
  const b = x as Record<string, unknown>;
  if (!ehTexto(b.versao) || !ehDataIso(b.geradaEm) || !Array.isArray(b.infracoes)) return false;
  if (b.infracoes.length === 0 || !b.infracoes.every(ehInfracao)) return false;
  const codigos = new Set((b.infracoes as Infracao[]).map((i) => i.codigo));
  return codigos.size === b.infracoes.length;
}

export async function baixarBase(url: string, f: typeof fetch = fetch, timeoutMs = 8000): Promise<Base> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), timeoutMs);
  try {
    const resp = await f(url, { cache: 'no-store', signal: controle.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const dados: unknown = await resp.json();
    if (!ehBase(dados)) throw new Error('formato de base inválido');
    return dados;
  } finally {
    clearTimeout(timer);
  }
}

export const DIAS_DESATUALIZADA = 30;

export function estaDesatualizada(verificadoEm: number | null, agora: number): boolean {
  if (verificadoEm === null) return true;
  return agora - verificadoEm > DIAS_DESATUALIZADA * 24 * 60 * 60 * 1000;
}

export type EstadoPronto = { tipo: 'pronto'; base: Base; verificadoEm: number | null };
export type EstadoDados = EstadoPronto | { tipo: 'sem-base' };

export interface OpcoesDados {
  armazenamento: Armazenamento;
  baixar: () => Promise<Base>;
  agora: () => number;
  aoAtualizar: (e: EstadoPronto, mudouVersao: boolean) => void;
}

/** Tenta baixar a base. Se der certo, salva e avisa. Se falhar, mantém a base do aparelho. */
export async function verificarAtualizacao(o: OpcoesDados): Promise<void> {
  try {
    const antes = await o.armazenamento.ler();
    const base = await o.baixar();
    const novo: Salvo = { base, verificadoEm: o.agora() };
    await o.armazenamento.salvar(novo);
    o.aoAtualizar({ tipo: 'pronto', ...novo }, base.versao !== antes?.base.versao);
  } catch {
    /* sem rede ou resposta inválida: mantém a base que já está no aparelho */
  }
}

export async function iniciarDados(o: OpcoesDados): Promise<EstadoDados> {
  const salvo = await o.armazenamento.ler();

  if (salvo) {
    void verificarAtualizacao(o);
    return { tipo: 'pronto', ...salvo };
  }

  try {
    const base = await o.baixar();
    const novo: Salvo = { base, verificadoEm: o.agora() };
    await o.armazenamento.salvar(novo);
    return { tipo: 'pronto', ...novo };
  } catch {
    return { tipo: 'sem-base' };
  }
}
