import { ROTULO_GRAVIDADE, rotuloPontos, type Infracao } from '../../dominio/tipos';
import { esc } from '../html';

/** Lista de infrações com link para a ficha (usada na busca e nas categorias). */
export function listaInfracoes(infracoes: Infracao[]): string {
  return `<ul class="lista">${infracoes
    .map(
      (i) => `<li><a class="item" href="#/infracao/${esc(i.codigo)}">
        <span class="item-codigo">${esc(i.codigo)} · ${ROTULO_GRAVIDADE[i.gravidade]} · ${rotuloPontos(i.pontos)}</span>
        <span class="item-titulo">${esc(i.descricao)}</span>
      </a></li>`,
    )
    .join('')}</ul>`;
}
