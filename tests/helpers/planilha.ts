import ExcelJS from 'exceljs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COLUNAS, type Coluna } from '../../scripts/conteudo/ler-planilha';

export type LinhaTeste = Partial<Record<Coluna, unknown>>;

export function pastaTemporaria(): string {
  return mkdtempSync(join(tmpdir(), 'consulta-'));
}

/** Cria um .xlsx temporário com cabeçalho COLUNAS. `{}` gera uma linha vazia. */
export async function criarPlanilhaTeste(linhas: LinhaTeste[]): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Infrações');
  ws.addRow([...COLUNAS]);
  for (const l of linhas) {
    ws.addRow(COLUNAS.map((c) => (l[c] === undefined ? null : l[c])));
  }
  const caminho = join(pastaTemporaria(), 'teste.xlsx');
  await wb.xlsx.writeFile(caminho);
  return caminho;
}

export function linhaValida(extra: LinhaTeste = {}): LinhaTeste {
  return {
    'Código': '763-31',
    'Descrição': 'Dirigir usando celular',
    'Artigo': 'CTB art. 252, par. único',
    'Gravidade': 'Gravíssima',
    'Pontos': 7,
    'Valor (R$)': 293.47,
    'Medida administrativa': 'NÃO CONSTA',
    'Quando autuar': 'Quando autuar.',
    'Quando não autuar': 'Quando não autuar.',
    'Procedimento': 'Procedimento.',
    'O que registrar': 'O que registrar.',
    'Categoria': 'Condução e circulação',
    'Sinônimos': 'celular; Telefone ; ',
    'Fonte': 'MBFT, ficha 763-31',
    'Status': 'Conferido',
    'Data de conferência': '17/11/2026',
    ...extra,
  };
}
