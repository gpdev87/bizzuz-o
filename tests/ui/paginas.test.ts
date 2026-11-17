import { describe, expect, test } from 'vitest';
import { criarIndice } from '../../src/busca/busca';
import type { Contexto } from '../../src/ui/contexto';
import { renderCategoria, renderCategorias } from '../../src/ui/telas/categorias';
import { renderInstalar } from '../../src/ui/telas/instalar';
import { renderSobre } from '../../src/ui/telas/sobre';
import { baseFixture } from '../fixtures/base';

const ctx: Contexto = {
  base: baseFixture,
  indice: criarIndice(baseFixture.infracoes),
  verificadoEm: null,
  agora: () => 0,
};
const novo = () => document.createElement('div');

describe('categorias', () => {
  test('lista só as categorias com infrações, com contagem', () => {
    const el = novo();
    renderCategorias(el, ctx);
    const itens = [...el.querySelectorAll('li')].map((li) => li.textContent!.replace(/\s+/g, ' ').trim());
    expect(itens).toHaveLength(3);
    expect(itens).toContain('Álcool e substâncias 1');
  });

  test('categoria lista suas infrações', () => {
    const el = novo();
    renderCategoria(el, ctx, 'alcoolemia');
    expect(el.querySelector('a[href="#/infracao/516-91"]')).not.toBeNull();
    expect(el.querySelectorAll('a[href^="#/infracao/"]')).toHaveLength(1);
  });

  test('slug inválido volta para a lista de categorias', () => {
    location.hash = '#/categoria/nada';
    renderCategoria(novo(), ctx, 'nada');
    expect(location.hash).toBe('#/categorias');
  });
});

describe('sobre', () => {
  test('traz o aviso de iniciativa independente e o resumo da base', () => {
    const el = novo();
    renderSobre(el, ctx);
    const t = el.textContent!;
    expect(t).toContain('é uma iniciativa independente');
    expect(t).toContain('Este app não substitui a norma oficial');
    expect(t).toContain('com 3 infrações');
    expect(el.querySelector('a[href="#/instalar"]')).not.toBeNull();
  });
});

describe('instalar', () => {
  test('explica a instalação no iPhone e no Android', () => {
    const el = novo();
    renderInstalar(el);
    expect(el.textContent).toContain('Adicionar à Tela de Início');
    expect(el.textContent).toContain('Instalar app');
  });
});
