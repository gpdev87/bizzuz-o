// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { lerPlanilha } from '../../scripts/conteudo/ler-planilha';
import { validar } from '../../scripts/conteudo/validar';
import { criarPlanilhaTeste, linhaValida, type LinhaTeste } from '../helpers/planilha';

async function validarLinhas(linhas: LinhaTeste[]) {
  return validar(await lerPlanilha(await criarPlanilhaTeste(linhas)));
}

describe('validar', () => {
  test('linha conferida válida vira uma infração sem erros', async () => {
    const r = await validarLinhas([linhaValida()]);
    expect(r.erros).toEqual([]);
    expect(r.infracoes).toHaveLength(1);
    expect(r.infracoes[0]).toMatchObject({
      codigo: '763-31',
      gravidade: 'gravissima',
      pontos: 7,
      valorCentavos: 29347,
      medidaAdministrativa: null,
      categoria: 'conducao',
      sinonimos: ['celular', 'telefone'],
      conferidoEm: '2026-11-17',
    });
  });

  test('rascunho com problema conta como rascunho e gera aviso, não erro', async () => {
    const r = await validarLinhas([linhaValida({ Status: 'Rascunho', Pontos: 5 })]);
    expect(r.rascunhos).toBe(1);
    expect(r.erros).toEqual([]);
    expect(r.avisos).toHaveLength(1);
    expect(r.infracoes).toEqual([]);
  });

  test('pontos incompatíveis com a gravidade dão erro na linha certa', async () => {
    const r = await validarLinhas([linhaValida({ Pontos: 5 })]);
    expect(r.erros).toEqual([expect.objectContaining({ linha: 2, campo: 'Pontos' })]);
  });

  test('valor aceita número e texto em reais', async () => {
    const r = await validarLinhas([
      linhaValida({ 'Valor (R$)': 'R$ 293,47' }),
      linhaValida({ 'Código': '763-32', 'Valor (R$)': 293.47 }),
      linhaValida({ 'Código': '763-33', 'Valor (R$)': '1.467,35' }),
    ]);
    expect(r.erros).toEqual([]);
    expect(r.infracoes.map((i) => i.valorCentavos)).toEqual([29347, 29347, 146735]);
  });

  test('data aceita Date e texto DD/MM/AAAA', async () => {
    const r = await validarLinhas([
      linhaValida({ 'Data de conferência': new Date(2026, 10, 17) }),
      linhaValida({ 'Código': '763-32', 'Data de conferência': '17/11/2026' }),
    ]);
    expect(r.erros).toEqual([]);
    expect(r.infracoes.map((i) => i.conferidoEm)).toEqual(['2026-11-17', '2026-11-17']);
  });

  test('linha vazia no meio não desloca o número da linha do erro', async () => {
    const r = await validarLinhas([linhaValida(), {}, linhaValida({ 'Código': '763-32', Pontos: 5 })]);
    expect(r.erros).toEqual([expect.objectContaining({ linha: 4, campo: 'Pontos' })]);
  });

  test('NÃO CONSTA em qualquer caixa vira null', async () => {
    const r = await validarLinhas([linhaValida({ Procedimento: 'não consta' })]);
    expect(r.infracoes[0].procedimento).toBeNull();
  });

  test('campo de texto vazio em ficha conferida é erro com mensagem exata', async () => {
    const r = await validarLinhas([linhaValida({ Procedimento: '' })]);
    expect(r.erros).toEqual([
      { linha: 2, campo: 'Procedimento', mensagem: 'vazio — preencha ou escreva NÃO CONSTA' },
    ]);
  });

  test('código repetido entre conferidas dá erro nas duas linhas', async () => {
    const r = await validarLinhas([linhaValida(), linhaValida()]);
    expect(r.erros.filter((e) => e.campo === 'Código').map((e) => e.linha)).toEqual([2, 3]);
  });
});

describe('pontuação não computável', () => {
  test('"Não computável" vira pontos null sem erro', async () => {
    const r = await validarLinhas([linhaValida({ Pontos: 'Não Computável' })]);
    expect(r.erros).toEqual([]);
    expect(r.infracoes[0].pontos).toBeNull();
  });

  test('texto qualquer em Pontos é erro', async () => {
    const r = await validarLinhas([linhaValida({ Pontos: 'sete' })]);
    expect(r.erros).toEqual([expect.objectContaining({ campo: 'Pontos' })]);
  });
});
