// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { gerarBase } from '../../scripts/conteudo/gerar-base';
import { criarPlanilhaTeste, linhaValida, pastaTemporaria } from '../helpers/planilha';

describe('gerarBase', () => {
  test('grava JSON com versão e infrações quando válido', async () => {
    const saida = join(pastaTemporaria(), 'infracoes.json');
    const r = await gerarBase(await criarPlanilhaTeste([linhaValida()]), saida, new Date('2026-11-17T12:00:00Z'));
    expect(r.erros).toEqual([]);
    const base = JSON.parse(readFileSync(saida, 'utf8'));
    expect(base.versao).toMatch(/^[0-9a-f]{12}$/);
    expect(base.geradaEm).toBe('2026-11-17');
    expect(base.infracoes).toHaveLength(1);
  });

  test('não grava quando há erro', async () => {
    const saida = join(pastaTemporaria(), 'infracoes.json');
    await gerarBase(await criarPlanilhaTeste([linhaValida({ Pontos: 5 })]), saida);
    expect(existsSync(saida)).toBe(false);
  });

  test('não grava quando nenhuma ficha está conferida', async () => {
    const saida = join(pastaTemporaria(), 'infracoes.json');
    const r = await gerarBase(await criarPlanilhaTeste([linhaValida({ Status: 'Rascunho' })]), saida);
    expect(existsSync(saida)).toBe(false);
    expect(r.erros).toContainEqual({ linha: 0, campo: 'Status', mensagem: 'nenhuma ficha conferida' });
  });
});
