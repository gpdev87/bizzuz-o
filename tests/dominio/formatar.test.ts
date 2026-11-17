import { describe, expect, test } from 'vitest';
import { formatarData, formatarValor } from '../../src/dominio/formatar';

describe('formatarValor', () => {
  test('formata centavos em reais', () => {
    expect(formatarValor(29347)).toBe('R$ 293,47');
  });
  test('usa ponto como separador de milhar', () => {
    expect(formatarValor(146735)).toBe('R$ 1.467,35');
  });
});

describe('formatarData', () => {
  test('converte ISO em DD/MM/AAAA', () => {
    expect(formatarData('2026-11-17')).toBe('17/11/2026');
  });
});
