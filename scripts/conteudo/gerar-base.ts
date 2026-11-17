import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Base } from '../../src/dominio/tipos';
import { lerPlanilha } from './ler-planilha';
import { validar, type Problema, type ResultadoValidacao } from './validar';

export const ENTRADA_PADRAO = 'content/infracoes.xlsx';
export const SAIDA_PADRAO = 'public/data/infracoes.json';

/** Lê, valida e grava a base. Só grava sem erros e com ao menos uma ficha conferida. */
export async function gerarBase(
  entrada: string,
  saida: string,
  agora: Date = new Date(),
): Promise<ResultadoValidacao> {
  const r = validar(await lerPlanilha(entrada));
  if (r.erros.length === 0 && r.infracoes.length === 0) {
    r.erros.push({ linha: 0, campo: 'Status', mensagem: 'nenhuma ficha conferida' });
  }
  if (r.erros.length) return r;

  const infracoes = [...r.infracoes].sort((a, b) => a.codigo.localeCompare(b.codigo));
  const versao = createHash('sha256').update(JSON.stringify(infracoes)).digest('hex').slice(0, 12);
  const base: Base = { versao, geradaEm: agora.toISOString().slice(0, 10), infracoes };
  mkdirSync(dirname(saida), { recursive: true });
  writeFileSync(saida, JSON.stringify(base));
  return r;
}

function argumento(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const fmt = (p: Problema) => `  Linha ${p.linha}, ${p.campo}: ${p.mensagem}`;

async function principal() {
  const entrada = argumento('entrada') ?? ENTRADA_PADRAO;
  const saida = argumento('saida') ?? SAIDA_PADRAO;
  const r = await gerarBase(entrada, saida);
  const publicadas = r.erros.length ? 0 : r.infracoes.length;
  console.log(`${publicadas} fichas conferidas publicadas, ${r.rascunhos} rascunhos ignorados`);
  if (r.avisos.length) console.log(`\nAvisos (rascunhos):\n${r.avisos.map(fmt).join('\n')}`);
  if (r.erros.length) {
    console.error(`\nERROS — nada foi publicado:\n${r.erros.map(fmt).join('\n')}`);
    process.exit(1);
  }
  console.log(`Base gravada em ${saida}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => {
    console.error(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
