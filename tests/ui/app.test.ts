import { beforeEach, describe, expect, test, vi } from 'vitest';
import { formatarData } from '../../src/dominio/formatar';
import type { Base } from '../../src/dominio/tipos';
import { montarApp } from '../../src/ui/app';
import { esc } from '../../src/ui/html';
import { baseFixture } from '../fixtures/base';

const AGORA = Date.UTC(2026, 10, 17);

function montar(base: Base = baseFixture, verificadoEm: number | null = AGORA) {
  const raiz = document.createElement('div');
  document.body.replaceChildren(raiz);
  const app = montarApp(raiz, { tipo: 'pronto', base, verificadoEm }, { tentarNovamente: () => {}, agora: () => AGORA });
  return { raiz, app };
}

function digitar(raiz: HTMLElement, texto: string) {
  const campo = raiz.querySelector<HTMLInputElement>('input[type="search"]')!;
  campo.value = texto;
  campo.dispatchEvent(new Event('input'));
}

beforeEach(() => {
  history.replaceState(null, '', '#/');
});

describe('tela de busca', () => {
  test('digitar "celular" mostra link para a ficha', () => {
    const { raiz } = montar();
    digitar(raiz, 'celular');
    expect(raiz.querySelector('a[href="#/infracao/763-31"]')).not.toBeNull();
  });

  test('sem resultado mostra mensagem e link para avisar', () => {
    const { raiz } = montar();
    digitar(raiz, 'xyzqwk');
    expect(raiz.textContent).toContain('Nenhuma infração encontrada para “xyzqwk”.');
    const link = raiz.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')!;
    expect(link.textContent).toBe('Avisar que não encontrei');
    expect(link.getAttribute('href')).toContain(`subject=${encodeURIComponent('Não encontrei: xyzqwk')}`);
  });

  test('grava a consulta no endereço para o voltar restaurar', () => {
    const { raiz } = montar();
    digitar(raiz, 'celular');
    expect(location.hash).toBe('#/?q=celular');
    const outra = montar();
    expect(outra.raiz.querySelector<HTMLInputElement>('input[type="search"]')!.value).toBe('celular');
  });

  test('texto de infração com HTML é exibido como texto', () => {
    const base: Base = {
      ...baseFixture,
      infracoes: [{ ...baseFixture.infracoes[0], descricao: 'celular <script>alert(1)</script>' }],
    };
    const { raiz } = montar(base);
    digitar(raiz, 'celular');
    expect(raiz.querySelector('script')).toBeNull();
    expect(raiz.textContent).toContain('<script>');
  });
});

describe('aviso de base desatualizada', () => {
  test('aparece quando nunca verificada', () => {
    const { raiz } = montar(baseFixture, null);
    expect(raiz.textContent).toContain(
      `Base de ${formatarData(baseFixture.geradaEm)} — conecte-se para verificar atualizações`,
    );
  });

  test('não aparece quando verificada agora', () => {
    const { raiz } = montar(baseFixture, AGORA);
    expect(raiz.textContent).not.toContain('conecte-se para verificar atualizações');
  });
});

describe('atualização da base', () => {
  test('mostra "Base atualizada" quando a versão muda', () => {
    const { raiz, app } = montar();
    app.atualizar({ tipo: 'pronto', base: { ...baseFixture, versao: 'v2' }, verificadoEm: AGORA }, true);
    expect(raiz.textContent).toContain('Base atualizada');
  });
});

describe('tela sem base', () => {
  test('mostra a mensagem e o botão tenta de novo', () => {
    const raiz = document.createElement('div');
    const tentarNovamente = vi.fn();
    montarApp(raiz, { tipo: 'sem-base' }, { tentarNovamente });
    expect(raiz.textContent).toContain(
      'Para usar sem internet, abra o app uma vez conectado para baixar a base.',
    );
    raiz.querySelector<HTMLButtonElement>('button')!.click();
    expect(tentarNovamente).toHaveBeenCalled();
  });
});

describe('esc', () => {
  test('escapa caracteres de HTML', () => {
    expect(esc('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  });
});

describe('robustez da abertura', () => {
  test('link malformado não quebra o app', () => {
    history.replaceState(null, '', '#/infracao/%');
    const { raiz } = montar();
    expect(raiz.querySelector('main')!.textContent).toContain('Ficha não encontrada.');
  });
});

describe('reavaliar', () => {
  test('mostra o aviso quando o app volta do segundo plano depois de 30 dias', () => {
    let agora = AGORA;
    const raiz = document.createElement('div');
    const app = montarApp(
      raiz,
      { tipo: 'pronto', base: baseFixture, verificadoEm: AGORA },
      { tentarNovamente: () => {}, agora: () => agora },
    );
    expect(raiz.textContent).not.toContain('conecte-se para verificar atualizações');
    agora = AGORA + 31 * 24 * 60 * 60 * 1000;
    app.reavaliar();
    expect(raiz.textContent).toContain('conecte-se para verificar atualizações');
  });
});
