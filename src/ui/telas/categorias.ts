import { CATEGORIAS } from '../../dominio/tipos';
import type { Contexto } from '../contexto';
import { listaInfracoes } from './item';

const VOLTAR_BUSCA = '<a class="link" href="#/">‹ Busca</a>';

export function renderCategorias(el: HTMLElement, ctx: Contexto): void {
  const itens = CATEGORIAS.map((c) => ({
    ...c,
    total: ctx.base.infracoes.filter((i) => i.categoria === c.slug).length,
  })).filter((c) => c.total > 0);

  el.innerHTML = `${VOLTAR_BUSCA}
    <h1 class="titulo-pagina">Categorias</h1>
    <ul class="lista">${itens
      .map(
        (c) => `<li><a class="item item-categoria" href="#/categoria/${c.slug}">
          <span class="item-titulo">${c.rotulo}</span> <span class="contagem">${c.total}</span>
        </a></li>`,
      )
      .join('')}</ul>`;
}

export function renderCategoria(el: HTMLElement, ctx: Contexto, slug: string): void {
  const categoria = CATEGORIAS.find((c) => c.slug === slug);
  if (!categoria) {
    location.replace('#/categorias');
    return;
  }
  const infracoes = ctx.base.infracoes
    .filter((i) => i.categoria === slug)
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
  el.innerHTML = `<a class="link" href="#/categorias">‹ Categorias</a>
    <h1 class="titulo-pagina">${categoria.rotulo}</h1>
    ${infracoes.length ? listaInfracoes(infracoes) : '<p class="mensagem">Nenhuma infração nesta categoria.</p>'}`;
}
