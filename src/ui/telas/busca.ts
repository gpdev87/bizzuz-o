import { buscar } from '../../busca/busca';
import { EMAIL_CONTATO, NOME_APP } from '../../config';
import { ROTULO_GRAVIDADE } from '../../dominio/tipos';
import type { Contexto } from '../contexto';
import { esc, mailto } from '../html';

function resultados(ctx: Contexto, consulta: string): string {
  const q = consulta.trim();
  if (!q) {
    return `<a class="atalho" href="#/categorias">Ver por categoria</a>`;
  }
  const achados = buscar(ctx.indice, q);
  if (achados.length === 0) {
    return `<p class="vazio">Nenhuma infração encontrada para “${esc(q)}”.</p>
      <a class="link" href="${esc(mailto(EMAIL_CONTATO, `Não encontrei: ${q}`))}">Avisar que não encontrei</a>`;
  }
  return `<ul class="lista">${achados
    .map(
      (i) => `<li><a class="item" href="#/infracao/${esc(i.codigo)}">
        <span class="item-codigo">${esc(i.codigo)} · ${ROTULO_GRAVIDADE[i.gravidade]} · ${i.pontos} pts</span>
        <span class="item-titulo">${esc(i.descricao)}</span>
      </a></li>`,
    )
    .join('')}</ul>`;
}

export function renderBusca(el: HTMLElement, ctx: Contexto, consultaInicial: string): void {
  el.innerHTML = `
    <header class="topo"><h1>${NOME_APP}</h1></header>
    <input type="search" class="campo-busca" aria-label="Buscar infração"
      placeholder="Infração, código ou artigo" autocomplete="off" enterkeyhint="search" />
    <div class="resultados" aria-live="polite"></div>
    <footer class="rodape">Iniciativa independente · não substitui a norma oficial · <a href="#/sobre">Sobre</a></footer>`;

  const campo = el.querySelector<HTMLInputElement>('.campo-busca')!;
  const saida = el.querySelector<HTMLElement>('.resultados')!;
  const mostrar = () => {
    saida.innerHTML = resultados(ctx, campo.value);
  };

  campo.value = consultaInicial;
  mostrar();
  campo.addEventListener('input', () => {
    mostrar();
    const q = campo.value.trim();
    history.replaceState(null, '', q ? `#/?q=${encodeURIComponent(q)}` : '#/');
  });
  campo.focus();
}
