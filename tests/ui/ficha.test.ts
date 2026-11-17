import { afterEach, describe, expect, test, vi } from 'vitest';
import { criarIndice } from '../../src/busca/busca';
import { formatarData } from '../../src/dominio/formatar';
import type { Contexto } from '../../src/ui/contexto';
import { renderFicha } from '../../src/ui/telas/ficha';
import { baseFixture } from '../fixtures/base';

const ctx: Contexto = {
  base: baseFixture,
  indice: criarIndice(baseFixture.infracoes),
  verificadoEm: null,
  agora: () => 0,
};

function ficha(codigo: string) {
  const el = document.createElement('div');
  renderFicha(el, ctx, codigo);
  return el;
}

afterEach(() => vi.unstubAllGlobals());

describe('ficha', () => {
  test('mostra valor, gravidade e pontos', () => {
    const el = ficha('763-31');
    expect(el.textContent).toContain('R$ 293,47');
    expect(el.textContent).toContain('763-31 · Gravíssima · 7 pts');
  });

  test('campo nulo mostra que a fonte não traz orientação', () => {
    const el = ficha('763-31');
    const procedimento = el.querySelector('[data-campo="procedimento"]')!;
    expect(procedimento.textContent).toContain('A fonte não traz orientação para este ponto.');
  });

  test('mostra a data de conferência formatada', () => {
    expect(ficha('763-31').textContent).toContain(`Conferido em ${formatarData('2026-11-10')}`);
  });

  test('link de reporte leva o código no assunto', () => {
    const link = [...ficha('763-31').querySelectorAll('a')].find((a) => a.textContent === 'Reportar erro nesta ficha')!;
    expect(link.getAttribute('href')).toContain(`subject=${encodeURIComponent('Erro na ficha 763-31')}`);
  });

  test('Copiar copia o texto de "O que registrar" e confirma', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const el = ficha('763-31');
    const botao = el.querySelector<HTMLButtonElement>('button.copiar')!;
    botao.click();
    await vi.waitFor(() => expect(botao.textContent).toBe('Copiado!'));
    expect(writeText).toHaveBeenCalledWith(baseFixture.infracoes[0].oQueRegistrar);
  });

  test('sem texto em "O que registrar" não mostra o botão Copiar', () => {
    const original = ctx.base;
    ctx.base = { ...original, infracoes: [{ ...original.infracoes[0], oQueRegistrar: null }] };
    try {
      expect(ficha('763-31').querySelector('button.copiar')).toBeNull();
    } finally {
      ctx.base = original;
    }
  });

  test('código inexistente mostra ficha não encontrada', () => {
    expect(ficha('999-99').textContent).toContain('Ficha não encontrada.');
  });
});

describe('ficha com pontuação não computável', () => {
  test('mostra "pontuação não computável" no lugar dos pontos', () => {
    const original = ctx.base;
    ctx.base = { ...original, infracoes: [{ ...original.infracoes[1], pontos: null }] };
    try {
      const t = ficha('501-00').textContent!;
      expect(t).toContain('501-00 · Gravíssima · pontuação não computável');
      expect(t).not.toContain('null');
    } finally {
      ctx.base = original;
    }
  });
});
