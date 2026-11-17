import type { Indice } from '../busca/busca';
import type { Base } from '../dominio/tipos';

export interface Contexto {
  base: Base;
  indice: Indice;
  verificadoEm: number | null;
  agora: () => number;
}
