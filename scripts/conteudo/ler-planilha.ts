import ExcelJS from 'exceljs';

export const COLUNAS = [
  'Código',
  'Descrição',
  'Artigo',
  'Gravidade',
  'Pontos',
  'Valor (R$)',
  'Medida administrativa',
  'Quando autuar',
  'Quando não autuar',
  'Procedimento',
  'O que registrar',
  'Categoria',
  'Sinônimos',
  'Fonte',
  'Status',
  'Data de conferência',
] as const;

export type Coluna = (typeof COLUNAS)[number];

export type LinhaBruta = { linha: number; valores: Record<Coluna, unknown> };

/** Reduz os formatos de célula do ExcelJS (rich text, fórmula, link) a um valor simples. */
function primitivo(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v !== 'object') return v;
  const o = v as Record<string, unknown>;
  if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((p) => p.text).join('');
  if ('result' in o) return primitivo(o.result);
  if ('text' in o) return primitivo(o.text);
  return null;
}

function vazio(v: unknown): boolean {
  return v === null || (typeof v === 'string' && v.trim() === '');
}

/** Lê a primeira aba. Pula linhas totalmente vazias; `linha` é o número da linha no Excel. */
export async function lerPlanilha(caminho: string): Promise<LinhaBruta[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(caminho);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('a planilha não tem nenhuma aba');

  const indice = new Map<Coluna, number>();
  ws.getRow(1).eachCell((cell, col) => {
    const nome = String(primitivo(cell.value) ?? '').trim();
    if ((COLUNAS as readonly string[]).includes(nome)) indice.set(nome as Coluna, col);
  });
  const faltando = COLUNAS.filter((c) => !indice.has(c));
  if (faltando.length) throw new Error(`coluna(s) ausente(s) no cabeçalho: ${faltando.join(', ')}`);

  const linhas: LinhaBruta[] = [];
  ws.eachRow({ includeEmpty: false }, (row, numero) => {
    if (numero === 1) return;
    const valores = {} as Record<Coluna, unknown>;
    for (const c of COLUNAS) valores[c] = primitivo(row.getCell(indice.get(c)!).value);
    if (COLUNAS.every((c) => vazio(valores[c]))) return;
    linhas.push({ linha: numero, valores });
  });
  return linhas;
}
