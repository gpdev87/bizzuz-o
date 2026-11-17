// Gera uma planilha de DESENVOLVIMENTO a partir do fixture de testes (dados fictícios).
import ExcelJS from 'exceljs';
import { CATEGORIAS, ROTULO_GRAVIDADE } from '../../src/dominio/tipos';
import { baseFixture } from '../../tests/fixtures/base';
import { COLUNAS } from './ler-planilha';

const caminho = process.argv[2] ?? 'tests/fixtures/planilha-dev.xlsx';
const nc = (v: string | null) => v ?? 'NÃO CONSTA';
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Infrações');
ws.addRow([...COLUNAS]);
for (const i of baseFixture.infracoes) {
  const [a, m, d] = i.conferidoEm.split('-');
  ws.addRow([
    i.codigo, i.descricao, i.artigo, ROTULO_GRAVIDADE[i.gravidade], i.pontos, i.valorCentavos / 100,
    nc(i.medidaAdministrativa), nc(i.quandoAutuar), nc(i.quandoNaoAutuar), nc(i.procedimento), nc(i.oQueRegistrar),
    CATEGORIAS.find((c) => c.slug === i.categoria)!.rotulo, i.sinonimos.join('; '), i.fonte, 'Conferido', `${d}/${m}/${a}`,
  ]);
}
await wb.xlsx.writeFile(caminho);
console.log(`Planilha de desenvolvimento criada em ${caminho}`);
