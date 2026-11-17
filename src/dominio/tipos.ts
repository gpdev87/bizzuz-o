export type Gravidade = 'leve' | 'media' | 'grave' | 'gravissima';

export type SlugCategoria =
  | 'habilitacao'
  | 'documentacao'
  | 'equipamentos'
  | 'alcoolemia'
  | 'estacionamento'
  | 'velocidade'
  | 'conducao'
  | 'outras';

export interface Infracao {
  codigo: string;
  descricao: string;
  artigo: string;
  gravidade: Gravidade;
  /** null = sem pontuação: o MBFT diz "Não computável" ou "Não aplicável" */
  pontos: number | null;
  valorCentavos: number;
  /** null = a fonte não traz orientação para este ponto */
  medidaAdministrativa: string | null;
  quandoAutuar: string | null;
  quandoNaoAutuar: string | null;
  procedimento: string | null;
  oQueRegistrar: string | null;
  categoria: SlugCategoria;
  sinonimos: string[];
  fonte: string;
  /** data ISO (AAAA-MM-DD) da conferência humana */
  conferidoEm: string;
}

export interface Base {
  versao: string;
  geradaEm: string;
  infracoes: Infracao[];
}

export const GRAVIDADES: readonly Gravidade[] = ['leve', 'media', 'grave', 'gravissima'];

export const PONTOS: Record<Gravidade, number> = { leve: 3, media: 4, grave: 5, gravissima: 7 };

/** CTB art. 258 — valores base em centavos */
export const VALOR_BASE_CENTAVOS: Record<Gravidade, number> = {
  leve: 8838,
  media: 13016,
  grave: 19523,
  gravissima: 29347,
};

export const FATORES_VALOR: readonly number[] = [0.5, 1, 2, 3, 5, 10, 20, 60];

export function valorValido(g: Gravidade, centavos: number): boolean {
  const base = VALOR_BASE_CENTAVOS[g];
  return FATORES_VALOR.some((f) => Math.round(base * f) === centavos);
}

export const CATEGORIAS: readonly { slug: SlugCategoria; rotulo: string }[] = [
  { slug: 'habilitacao', rotulo: 'Habilitação' },
  { slug: 'documentacao', rotulo: 'Documentação do veículo' },
  { slug: 'equipamentos', rotulo: 'Equipamentos e segurança' },
  { slug: 'alcoolemia', rotulo: 'Álcool e substâncias' },
  { slug: 'estacionamento', rotulo: 'Estacionamento e parada' },
  { slug: 'velocidade', rotulo: 'Velocidade' },
  { slug: 'conducao', rotulo: 'Condução e circulação' },
  { slug: 'outras', rotulo: 'Outras' },
];

export function rotuloPontos(pontos: number | null): string {
  return pontos === null ? 'sem pontuação' : `${pontos} pts`;
}

export const ROTULO_GRAVIDADE: Record<Gravidade, string> = {
  leve: 'Leve',
  media: 'Média',
  grave: 'Grave',
  gravissima: 'Gravíssima',
};
