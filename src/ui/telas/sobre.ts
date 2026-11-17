import { EMAIL_CONTATO, NOME_APP } from '../../config';
import { formatarData } from '../../dominio/formatar';
import type { Contexto } from '../contexto';
import { esc, mailto } from '../html';

export function renderSobre(el: HTMLElement, ctx: Contexto): void {
  const b = ctx.base;
  el.innerHTML = `<a class="link" href="#/">‹ Busca</a>
    <h1 class="titulo-pagina">Sobre</h1>
    <p><strong>${NOME_APP}</strong> é uma iniciativa independente, sem vínculo com a Polícia Militar de Minas Gerais ou qualquer órgão público.</p>
    <p>As informações vêm de fontes públicas: o Código de Trânsito Brasileiro (Lei 9.503/1997) e o Manual Brasileiro de Fiscalização de Trânsito (MBFT). Cada ficha mostra a fonte e a data em que foi conferida.</p>
    <p>Este app não substitui a norma oficial. Em caso de dúvida, consulte a fonte.</p>
    <p>O app não pede login nem coleta dados de uso.</p>
    <p class="nota">Base de conteúdo: versão ${esc(b.versao)}, gerada em ${formatarData(b.geradaEm)}, com ${b.infracoes.length} infrações.</p>
    <p><a class="link" href="${esc(mailto(EMAIL_CONTATO, `${NOME_APP}: contato`))}">Fale conosco</a></p>
    <p><a class="link" href="#/instalar">Como instalar</a></p>`;
}
