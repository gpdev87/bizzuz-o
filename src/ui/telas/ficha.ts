import { EMAIL_CONTATO } from '../../config';
import { formatarData, formatarValor } from '../../dominio/formatar';
import { ROTULO_GRAVIDADE, rotuloPontos } from '../../dominio/tipos';
import type { Contexto } from '../contexto';
import { esc, mailto } from '../html';

export const SEM_ORIENTACAO = 'A fonte não traz orientação para este ponto.';
const DURACAO_COPIADO_MS = 2000;

function bloco(campo: string, valor: string | null): string {
  return valor === null
    ? `<p class="texto sem-orientacao" data-campo="${campo}">${SEM_ORIENTACAO}</p>`
    : `<p class="texto" data-campo="${campo}">${esc(valor)}</p>`;
}

async function copiar(texto: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

function voltar(): void {
  if (history.length > 1) history.back();
  else location.hash = '#/';
}

export function renderFicha(el: HTMLElement, ctx: Contexto, codigo: string): void {
  const i = ctx.base.infracoes.find((x) => x.codigo === codigo);
  if (!i) {
    el.innerHTML = `<p class="mensagem">Ficha não encontrada.</p><a class="link" href="#/">Voltar para a busca</a>`;
    return;
  }

  el.innerHTML = `
    <button type="button" class="voltar" aria-label="Voltar">‹ Voltar</button>
    <article class="ficha">
      <h1 class="ficha-titulo">${esc(i.descricao)}</h1>
      <p class="ficha-meta">${esc(i.codigo)} · ${ROTULO_GRAVIDADE[i.gravidade]} · ${rotuloPontos(i.pontos)}</p>
      <p class="ficha-meta">${formatarValor(i.valorCentavos)} · Medida adm.: ${
        i.medidaAdministrativa === null ? SEM_ORIENTACAO : esc(i.medidaAdministrativa)
      }</p>

      <details class="secao" open>
        <summary>Medidas</summary>
        <h2>Quando autuar</h2>${bloco('quandoAutuar', i.quandoAutuar)}
        <h2>Quando não autuar</h2>${bloco('quandoNaoAutuar', i.quandoNaoAutuar)}
        <h2>Procedimento</h2>${bloco('procedimento', i.procedimento)}
      </details>

      <details class="secao" open>
        <summary>O que registrar</summary>
        ${bloco('oQueRegistrar', i.oQueRegistrar)}
        ${i.oQueRegistrar === null ? '' : '<button type="button" class="botao copiar">Copiar</button>'}
      </details>

      <details class="secao">
        <summary>Base legal e fonte</summary>
        <p class="texto">${esc(i.artigo)}</p>
        <p class="texto">${esc(i.fonte)}</p>
        <p class="texto">Conferido em ${formatarData(i.conferidoEm)}</p>
      </details>

      <a class="link" href="${esc(mailto(EMAIL_CONTATO, `Erro na ficha ${i.codigo}`))}">Reportar erro nesta ficha</a>
    </article>`;

  el.querySelector('.voltar')!.addEventListener('click', voltar);

  const botao = el.querySelector<HTMLButtonElement>('button.copiar');
  const texto = i.oQueRegistrar;
  if (botao && texto !== null) {
    botao.addEventListener('click', () => {
      copiar(texto)
        .then(() => {
          botao.textContent = 'Copiado!';
          setTimeout(() => (botao.textContent = 'Copiar'), DURACAO_COPIADO_MS);
        })
        .catch(() => {
          botao.textContent = 'Não foi possível copiar';
        });
    });
  }
}
