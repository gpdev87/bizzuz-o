import { describe, expect, test } from 'vitest';
import { valorValido } from '../../src/dominio/tipos';

describe('valorValido', () => {
  test('aceita gravíssima ×3', () => {
    expect(valorValido('gravissima', 88041)).toBe(true);
  });
  test('recusa valor fora da tabela', () => {
    expect(valorValido('gravissima', 30000)).toBe(false);
  });
  test('aceita leve com fator 0,5', () => {
    expect(valorValido('leve', 4419)).toBe(true);
  });
});
