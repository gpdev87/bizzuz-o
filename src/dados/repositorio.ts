import { get, set } from 'idb-keyval';
import { CATEGORIAS, GRAVIDADES, type Base, type Infracao } from '../dominio/tipos';

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

function ehInfracao(x: unknown): x is Infracao {
  if (typeof x !== 'object' || x === null) return false;
  const i = x as Record<string, unknown>;
  return (
    ehTexto(i.codigo) &&
    ehTexto(i.descricao) &&
    ehTexto(i.artigo) &&
    (GRAVIDADES as readonly unknown[]).includes(i.gravidade) &&
    typeof i.pontos === 'number' &&
    typeof i.valorCentavos === 'number' &&
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
    ehTexto(i.conferidoEm)
  );
}

export function ehBase(x: unknown): x is Base {
  if (typeof x !== 'object' || x === null) return false;
  const b = x as Record<string, unknown>;
  return ehTexto(b.versao) && ehTexto(b.geradaEm) && Array.isArray(b.infracoes) && b.infracoes.every(ehInfracao);
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

export async function iniciarDados(o: {
  armazenamento: Armazenamento;
  baixar: () => Promise<Base>;
  agora: () => number;
  aoAtualizar: (e: EstadoPronto, mudouVersao: boolean) => void;
}): Promise<EstadoDados> {
  const salvo = await o.armazenamento.ler();

  if (salvo) {
    void o
      .baixar()
      .then(async (base) => {
        const novo: Salvo = { base, verificadoEm: o.agora() };
        await o.armazenamento.salvar(novo);
        o.aoAtualizar({ tipo: 'pronto', ...novo }, base.versao !== salvo.base.versao);
      })
      .catch(() => {
        /* sem rede ou resposta inválida: mantém a base que já está no aparelho */
      });
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
