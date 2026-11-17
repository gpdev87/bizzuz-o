import { NOME_APP } from '../../config';

export function renderSemBase(el: HTMLElement, tentarNovamente: () => void): void {
  el.innerHTML = `
    <header class="topo"><h1>${NOME_APP}</h1></header>
    <p class="mensagem">Para usar sem internet, abra o app uma vez conectado para baixar a base.</p>
    <button type="button" class="botao">Tentar novamente</button>`;
  el.querySelector('button')!.addEventListener('click', tentarNovamente);
}
