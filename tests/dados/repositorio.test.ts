import { describe, expect, test, vi } from 'vitest';
import {
  armazenamentoMemoria,
  baixarBase,
  estaDesatualizada,
  iniciarDados,
  type EstadoDados,
} from '../../src/dados/repositorio';
import type { Base } from '../../src/dominio/tipos';
import { baseFixture } from '../fixtures/base';

const DIA = 24 * 60 * 60 * 1000;
const AGORA = Date.UTC(2026, 10, 17);
const baseNova: Base = { ...baseFixture, versao: 'teste2' };

function fetchFalso(status: number, corpo: string): typeof fetch {
  return (async () => new Response(corpo, { status })) as typeof fetch;
}

describe('estaDesatualizada', () => {
  test('nunca verificada está desatualizada', () => {
    expect(estaDesatualizada(null, AGORA)).toBe(true);
  });
  test('29 dias não está desatualizada', () => {
    expect(estaDesatualizada(AGORA - 29 * DIA, AGORA)).toBe(false);
  });
  test('31 dias está desatualizada', () => {
    expect(estaDesatualizada(AGORA - 31 * DIA, AGORA)).toBe(true);
  });
});

describe('baixarBase', () => {
  test('aceita base válida', async () => {
    await expect(baixarBase('x', fetchFalso(200, JSON.stringify(baseFixture)))).resolves.toEqual(baseFixture);
  });
  test.each([
    ['404', fetchFalso(404, 'não encontrado')],
    ['HTML', fetchFalso(200, '<html>página</html>')],
    ['formato errado', fetchFalso(200, JSON.stringify({ versao: 1 }))],
    [
      'infração incompleta',
      fetchFalso(200, JSON.stringify({ ...baseFixture, infracoes: [{ codigo: '763-31' }] })),
    ],
  ])('rejeita resposta com %s', async (_nome, f) => {
    await expect(baixarBase('x', f)).rejects.toThrow();
  });
});

describe('iniciarDados', () => {
  test('com base salva e download falhando, mantém a base antiga', async () => {
    const armazenamento = armazenamentoMemoria({ base: baseFixture, verificadoEm: AGORA - DIA });
    const aoAtualizar = vi.fn();
    const estado = await iniciarDados({
      armazenamento,
      baixar: () => Promise.reject(new Error('sem rede')),
      agora: () => AGORA,
      aoAtualizar,
    });
    expect(estado).toEqual({ tipo: 'pronto', base: baseFixture, verificadoEm: AGORA - DIA });
    await new Promise((r) => setTimeout(r, 0));
    expect(aoAtualizar).not.toHaveBeenCalled();
    expect(await armazenamento.ler()).toEqual({ base: baseFixture, verificadoEm: AGORA - DIA });
  });

  test('com base salva e versão nova, salva e avisa que mudou', async () => {
    const armazenamento = armazenamentoMemoria({ base: baseFixture, verificadoEm: null });
    const chamada = new Promise<[EstadoDados, boolean]>((resolve) => {
      void iniciarDados({
        armazenamento,
        baixar: async () => baseNova,
        agora: () => AGORA,
        aoAtualizar: (e, mudou) => resolve([e, mudou]),
      });
    });
    const [estado, mudou] = await chamada;
    expect(mudou).toBe(true);
    expect(estado).toEqual({ tipo: 'pronto', base: baseNova, verificadoEm: AGORA });
    expect(await armazenamento.ler()).toEqual({ base: baseNova, verificadoEm: AGORA });
  });

  test('com mesma versão, só atualiza a data de verificação', async () => {
    const armazenamento = armazenamentoMemoria({ base: baseFixture, verificadoEm: null });
    const mudou = await new Promise<boolean>((resolve) => {
      void iniciarDados({
        armazenamento,
        baixar: async () => baseFixture,
        agora: () => AGORA,
        aoAtualizar: (_e, m) => resolve(m),
      });
    });
    expect(mudou).toBe(false);
    expect((await armazenamento.ler())?.verificadoEm).toBe(AGORA);
  });

  test('sem base salva e sem rede, fica sem base', async () => {
    const estado = await iniciarDados({
      armazenamento: armazenamentoMemoria(),
      baixar: () => Promise.reject(new Error('sem rede')),
      agora: () => AGORA,
      aoAtualizar: () => {},
    });
    expect(estado).toEqual({ tipo: 'sem-base' });
  });

  test('sem base salva e com rede, baixa e salva', async () => {
    const armazenamento = armazenamentoMemoria();
    const estado = await iniciarDados({
      armazenamento,
      baixar: async () => baseFixture,
      agora: () => AGORA,
      aoAtualizar: () => {},
    });
    expect(estado).toEqual({ tipo: 'pronto', base: baseFixture, verificadoEm: AGORA });
    expect(await armazenamento.ler()).toEqual({ base: baseFixture, verificadoEm: AGORA });
  });
});
