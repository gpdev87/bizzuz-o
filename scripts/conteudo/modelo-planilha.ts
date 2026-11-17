import ExcelJS from 'exceljs';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CATEGORIAS, GRAVIDADES, ROTULO_GRAVIDADE } from '../../src/dominio/tipos';
import { COLUNAS, type Coluna } from './ler-planilha';

export const INSTRUCOES = [
  'Uma linha por código de enquadramento.',
  'Copie o texto do MBFT fielmente. Não reescreva.',
  'Se a fonte não traz orientação para um campo, escreva NÃO CONSTA.',
  'Sinônimos: palavras que o policial digitaria, separadas por ponto e vírgula.',
  'Só mude o Status para Conferido depois de comparar a linha inteira com a fonte, e preencha a Data de conferência.',
  'Só as linhas Conferido aparecem no app.',
  'Pontos: quando a ficha do MBFT diz "Não computável", escreva Não computável.',
];

const LARGURA: Partial<Record<Coluna, number>> = {
  'Código': 10,
  'Gravidade': 13,
  'Pontos': 8,
  'Valor (R$)': 12,
  'Status': 12,
  'Data de conferência': 14,
  'Categoria': 24,
};

const ULTIMA_LINHA = 2000;

function letra(indice: number): string {
  let s = '';
  for (let n = indice; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function lista(ws: ExcelJS.Worksheet, coluna: Coluna, opcoes: string[]) {
  const l = letra(COLUNAS.indexOf(coluna) + 1);
  // `dataValidations.add` existe no ExcelJS 4.4, mas falta nos tipos publicados.
  const dv = (ws as unknown as { dataValidations: { add(faixa: string, v: ExcelJS.DataValidation): void } })
    .dataValidations;
  dv.add(`${l}2:${l}${ULTIMA_LINHA}`, {
    type: 'list',
    allowBlank: true,
    formulae: [`"${opcoes.join(',')}"`],
    showErrorMessage: true,
    errorTitle: 'Valor inválido',
    error: `Escolha um de: ${opcoes.join(', ')}`,
  });
}

/** Cria a planilha de conteúdo vazia e formatada. Recusa sobrescrever. */
export async function criarModelo(caminho: string): Promise<void> {
  if (existsSync(caminho)) throw new Error(`${caminho} já existe — não vou sobrescrever`);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Infrações', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = COLUNAS.map((c) => ({
    header: c,
    key: c,
    width: LARGURA[c] ?? 40,
    style: { alignment: { wrapText: true, vertical: 'top' } },
  }));
  ws.getRow(1).font = { bold: true };

  lista(ws, 'Gravidade', GRAVIDADES.map((g) => ROTULO_GRAVIDADE[g]));
  lista(ws, 'Categoria', CATEGORIAS.map((c) => c.rotulo));
  lista(ws, 'Status', ['Rascunho', 'Conferido']);

  const inst = wb.addWorksheet('Instruções');
  inst.getColumn(1).width = 110;
  INSTRUCOES.forEach((t, i) => inst.addRow([`${i + 1}. ${t}`]));

  mkdirSync(dirname(caminho), { recursive: true });
  await wb.xlsx.writeFile(caminho);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const caminho = process.argv[2] ?? 'content/infracoes.xlsx';
  criarModelo(caminho)
    .then(() => console.log(`Planilha criada em ${caminho}`))
    .catch((e) => {
      console.error(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    });
}
