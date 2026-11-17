// @vitest-environment node
import ExcelJS from 'exceljs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { COLUNAS, lerPlanilha } from '../../scripts/conteudo/ler-planilha';
import { criarModelo } from '../../scripts/conteudo/modelo-planilha';
import { pastaTemporaria } from '../helpers/planilha';

describe('criarModelo', () => {
  test('cria planilha vazia com o cabeçalho esperado e a aba de instruções', async () => {
    const caminho = join(pastaTemporaria(), 'modelo.xlsx');
    await criarModelo(caminho);
    expect(await lerPlanilha(caminho)).toEqual([]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(caminho);
    const cabecalho = (wb.getWorksheet('Infrações')!.getRow(1).values as unknown[]).slice(1);
    expect(cabecalho).toEqual([...COLUNAS]);
    expect(wb.getWorksheet('Instruções')).toBeDefined();
  });

  test('não sobrescreve arquivo existente', async () => {
    const caminho = join(pastaTemporaria(), 'modelo.xlsx');
    await criarModelo(caminho);
    await expect(criarModelo(caminho)).rejects.toThrow('já existe');
  });
});
