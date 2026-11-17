import { criarIndice } from '../busca/busca';
import { estaDesatualizada, type EstadoDados, type EstadoPronto } from '../dados/repositorio';
import { formatarData } from '../dominio/formatar';
import type { Contexto } from './contexto';
import { renderBusca } from './telas/busca';
import { renderSemBase } from './telas/sem-base';

export type { Contexto } from './contexto';

const DURACAO_AVISO_MS = 3000;

interface Rota {
  nome: string;
  param: string;
  consulta: string;
}

function lerRota(): Rota {
  const h = location.hash.replace(/^#/, '') || '/';
  const [caminho, query = ''] = h.split('?');
  const consulta = new URLSearchParams(query).get('q') ?? '';
  const partes = caminho.split('/').filter(Boolean);
  return { nome: partes[0] ?? '', param: decodeURIComponent(partes[1] ?? ''), consulta };
}

function desenhar(el: HTMLElement, ctx: Contexto, rota: Rota): void {
  switch (rota.nome) {
    default:
      renderBusca(el, ctx, rota.consulta);
  }
  if (rota.nome) window.scrollTo?.(0, 0);
}

export function montarApp(
  raiz: HTMLElement,
  estadoInicial: EstadoDados,
  opcoes: { tentarNovamente: () => void; agora?: () => number },
): { atualizar(e: EstadoPronto, mudouVersao: boolean): void } {
  const agora = opcoes.agora ?? Date.now;

  if (estadoInicial.tipo === 'sem-base') {
    raiz.innerHTML = '<main class="tela"></main>';
    renderSemBase(raiz.querySelector('main')!, opcoes.tentarNovamente);
    return { atualizar: () => opcoes.tentarNovamente() };
  }

  raiz.innerHTML = `
    <div class="aviso-base" role="status" hidden></div>
    <main class="tela"></main>
    <div class="aviso-flutuante" role="status" hidden></div>`;
  const aviso = raiz.querySelector<HTMLElement>('.aviso-base')!;
  const tela = raiz.querySelector<HTMLElement>('main')!;
  const flutuante = raiz.querySelector<HTMLElement>('.aviso-flutuante')!;

  const ctx: Contexto = {
    base: estadoInicial.base,
    indice: criarIndice(estadoInicial.base.infracoes),
    verificadoEm: estadoInicial.verificadoEm,
    agora,
  };

  const atualizarAviso = () => {
    const velha = estaDesatualizada(ctx.verificadoEm, agora());
    aviso.hidden = !velha;
    aviso.textContent = velha
      ? `Base de ${formatarData(ctx.base.geradaEm)} — conecte-se para verificar atualizações`
      : '';
  };
  const rotear = () => desenhar(tela, ctx, lerRota());

  atualizarAviso();
  rotear();
  window.addEventListener('hashchange', rotear);

  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    atualizar(e, mudouVersao) {
      ctx.verificadoEm = e.verificadoEm;
      atualizarAviso();
      if (!mudouVersao) return;
      ctx.base = e.base;
      ctx.indice = criarIndice(e.base.infracoes);
      rotear();
      flutuante.textContent = 'Base atualizada';
      flutuante.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(() => (flutuante.hidden = true), DURACAO_AVISO_MS);
    },
  };
}
