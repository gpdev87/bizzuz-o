import { describe, expect, test } from 'vitest';
import { buscar, criarIndice } from '../../src/busca/busca';
import { baseFixture } from '../fixtures/base';

const indice = criarIndice(baseFixture.infracoes);
const codigos = (q: string) => buscar(indice, q).map((i) => i.codigo);

describe('buscar', () => {
  test.each(['celular', 'CELULAR', 'Celular '])('"%s" encontra a ficha do celular primeiro', (q) => {
    expect(codigos(q)[0]).toBe('763-31');
  });

  test('tolera erro de digitação', () => {
    expect(codigos('embriagues')).toContain('516-91');
  });

  test('sinônimo de várias palavras', () => {
    expect(codigos('sem carteira')[0]).toBe('501-00');
  });

  test('ignora acento ao buscar pela categoria', () => {
    expect(codigos('habilitacao')).toContain('501-00');
  });

  test.each(['763', '76331', '763-3'])('código "%s" encontra 763-31', (q) => {
    expect(codigos(q)).toEqual(['763-31']);
  });

  test.each(['art 165', 'art. 165', 'artigo 165'])('artigo "%s" encontra 516-91', (q) => {
    expect(codigos(q)).toEqual(['516-91']);
  });

  test('artigo não casa por prefixo de número', () => {
    expect(codigos('art 16')).toEqual([]);
  });

  test('sem resultado devolve lista vazia', () => {
    expect(codigos('xyzqwk')).toEqual([]);
  });

  test('consulta vazia devolve lista vazia', () => {
    expect(codigos('')).toEqual([]);
    expect(codigos('   ')).toEqual([]);
  });
});
