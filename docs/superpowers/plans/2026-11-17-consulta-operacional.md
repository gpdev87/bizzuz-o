# Consulta Operacional — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** Construir uma PWA offline de consulta rápida de infrações de trânsito para policiais do operacional. O conteúdo é mantido numa planilha e convertido por script.

**Arquitetura:** Uma página estática (Vite + TypeScript, sem framework de UI) com roteamento por hash. Um script Node lê `content/infracoes.xlsx`, valida, mantém só as fichas "Conferido" e gera `public/data/infracoes.json`. O app guarda essa base no IndexedDB, renderiza a partir dela e, quando houver rede, baixa a versão nova em segundo plano. O service worker (vite-plugin-pwa) pré-carrega só o app; os dados não passam pelo service worker. A busca roda no aparelho (MiniSearch).

**Stack:** Node 26, TypeScript, Vite, vite-plugin-pwa, MiniSearch, idb-keyval, ExcelJS (script), tsx (rodar scripts), Vitest + jsdom, @vite-pwa/assets-generator (ícones), GitHub Pages via GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-11-17-consulta-operacional-design.md](../specs/2026-11-17-consulta-operacional-design.md)

## Restrições globais

- Toda a interface fica em português (pt-BR). Os identificadores de código também ficam em português, como neste plano.
- Nome do app: **Consulta Operacional** (short_name: **Consulta**). Nenhum brasão, nome em destaque ou identidade visual da PMMG.
- Sem login, sem analytics e sem cookies. Os únicos dados guardados no aparelho são a base e o carimbo `verificadoEm`.
- Só fichas com status **Conferido** chegam ao app.
- Um campo marcado `NÃO CONSTA` na planilha vira `null` e aparece no app como **"A fonte não traz orientação para este ponto."** Um campo vazio numa ficha conferida é erro de validação.
- Base desatualizada significa `verificadoEm` nulo ou com mais de **30 dias**. Nesse caso o app mostra o aviso **"Base de DD/MM/AAAA — conecte-se para verificar atualizações"**, com a data `geradaEm` da base.
- Pontos por gravidade: Leve 3, Média 4, Grave 5, Gravíssima 7.
- Valores base em centavos: Leve 8838, Média 13016, Grave 19523, Gravíssima 29347. O valor válido é a base × fator, com fator ∈ {0,5; 1; 2; 3; 5; 10; 20; 60}. *(O executor confere esses valores no CTB art. 258 vigente antes da Task 3; se mudaram, atualiza a constante e avisa.)*
- Código de enquadramento no formato `NNN-NN` (ex.: `763-31`).
- Interface: fonte base 18px, alvos de toque ≥ 48px, alto contraste, modo escuro via `prefers-color-scheme`.
- O e-mail de contato fica em `src/config.ts` (`EMAIL_CONTATO`). É um e-mail do projeto, que o usuário cria e informa antes do deploy.

## Foco de revisão

1. **Busca com variações de digitação.** Maiúsculas, falta de acento e erro leve ("CELULAR", "habilitacao", "embriagues") precisam encontrar a ficha certa. Teste na Task 5.
2. **Busca sem resultado.** Mostra "Nenhuma infração encontrada para “X”." e o link "Avisar que não encontrei", nunca uma tela vazia. Teste na Task 7.
3. **Planilha com manias do Excel.** Valor como número (`293.47`) ou texto (`R$ 293,47`, `1.467,35`), data como objeto `Date` ou texto `17/11/2026`, espaços sobrando e linhas vazias no meio, tudo precisa ser aceito ou dar erro apontando a linha. Teste na Task 3.
4. **Primeiro acesso sem internet.** O app mostra a tela "sem base" com a mensagem e o botão "Tentar novamente", nunca uma tela em branco. Testes nas Tasks 6 e 7.
5. **Resposta de rede quebrada.** Uma página 404 em HTML, um JSON inválido ou um JSON com formato errado nunca sobrescreve a base boa que já está no aparelho. Teste na Task 6.

---

## Estrutura de arquivos

```
package.json, tsconfig.json, vite.config.ts, index.html, .gitignore, README.md
content/infracoes.xlsx              planilha real (versionada)
scripts/conteudo/
  ler-planilha.ts                   xlsx → linhas brutas
  validar.ts                        linhas brutas → Infracao[] + erros/avisos
  gerar-base.ts                     CLI: lê, valida, grava JSON
  modelo-planilha.ts                CLI: cria planilha vazia formatada
src/
  config.ts                         nome, e-mail, URL dos dados
  dominio/tipos.ts                  Infracao, Base, Gravidade, CATEGORIAS, regras de valor/pontos
  dominio/formatar.ts               valor, data, gravidade
  busca/busca.ts                    índice + buscar
  dados/repositorio.ts              IndexedDB, download, desatualização, iniciarDados
  ui/html.ts                        esc() e helpers
  ui/app.ts                         roteador + casca
  ui/telas/{busca,ficha,categorias,sobre,instalar,sem-base}.ts
  ui/estilo.css
  main.ts
public/icone.svg (+ PNGs gerados)
public/data/infracoes.json          gerado (ignorado pelo git)
tests/fixtures/base.ts              base fictícia para testes
tests/helpers/planilha.ts           cria xlsx temporário para testes
.github/workflows/deploy.yml
```

---

### Task 1: Estrutura do projeto

**Arquivos:**
- Criar: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `.gitignore`, `tests/smoke.test.ts`

**Interfaces:**
- Produz: os scripts npm `dev`, `build`, `preview`, `test`, `conteudo` (`tsx scripts/conteudo/gerar-base.ts`) e `planilha:modelo` (`tsx scripts/conteudo/modelo-planilha.ts`).

- [ ] **Passo 1:** Rodar `git init` em `c:\Users\guilh\projetos-apps\Operacional` e criar a branch `main`.
- [ ] **Passo 2:** Criar o projeto Vite vanilla-ts à mão (não usar o template interativo) com as dependências `minisearch`, `idb-keyval` e as devDependencies `vite`, `typescript`, `vitest`, `jsdom`, `vite-plugin-pwa`, `exceljs`, `tsx`, `@vite-pwa/assets-generator`, nas versões estáveis atuais. Em `vite.config.ts`: `base: './'` e `test.environment: 'jsdom'`. No `.gitignore`: `node_modules`, `dist`, `public/data/`.
- [ ] **Passo 3:** Escrever `tests/smoke.test.ts` com `expect(1 + 1).toBe(2)`, para validar a configuração.
- [ ] **Passo 4:** Rodar `npm test`. Esperado: 1 teste passando. Rodar `npm run build`. Esperado: `dist/` criado sem erros.
- [ ] **Passo 5:** Commit `chore: estrutura inicial do projeto`. Mover a spec e o plano para o primeiro commit também.

### Task 2: Domínio e formatação

**Arquivos:**
- Criar: `src/dominio/tipos.ts`, `src/dominio/formatar.ts`, `tests/fixtures/base.ts`
- Teste: `tests/dominio/formatar.test.ts`, `tests/dominio/tipos.test.ts`

**Interfaces — Produz:**
```ts
export type Gravidade = 'leve' | 'media' | 'grave' | 'gravissima';
export interface Infracao {
  codigo: string;                    // "763-31"
  descricao: string;
  artigo: string;                    // "CTB art. 252, par. único"
  gravidade: Gravidade;
  pontos: number;
  valorCentavos: number;
  medidaAdministrativa: string | null;   // null = não consta na fonte
  quandoAutuar: string | null;
  quandoNaoAutuar: string | null;
  procedimento: string | null;
  oQueRegistrar: string | null;
  categoria: SlugCategoria;
  sinonimos: string[];
  fonte: string;                     // "MBFT, ficha 763-31"
  conferidoEm: string;               // ISO "2026-11-17"
}
export interface Base { versao: string; geradaEm: string; infracoes: Infracao[] }
export const PONTOS: Record<Gravidade, number>;
export const VALOR_BASE_CENTAVOS: Record<Gravidade, number>;
export const FATORES_VALOR: readonly number[];          // [0.5,1,2,3,5,10,20,60]
export function valorValido(g: Gravidade, centavos: number): boolean;
export const CATEGORIAS: readonly { slug: SlugCategoria; rotulo: string }[];
// slugs/rótulos: habilitacao "Habilitação", documentacao "Documentação do veículo",
// equipamentos "Equipamentos e segurança", alcoolemia "Álcool e substâncias",
// estacionamento "Estacionamento e parada", velocidade "Velocidade",
// conducao "Condução e circulação", outras "Outras"
export const ROTULO_GRAVIDADE: Record<Gravidade, string>; // Leve, Média, Grave, Gravíssima

// formatar.ts
export function formatarValor(centavos: number): string;  // 29347 → "R$ 293,47"; 146735 → "R$ 1.467,35"
export function formatarData(iso: string): string;        // "2026-11-17" → "17/11/2026"
```
`tests/fixtures/base.ts` exporta `baseFixture: Base` com três infrações **fictícias, só para teste**:
- `763-31`: celular, gravíssima, 7 pontos, 29347, conducao, sinônimos `["celular","telefone","whatsapp"]`, `procedimento: null`
- `501-00`: dirigir sem CNH, gravíssima ×3 (88041), habilitacao, sinônimos `["sem cnh","sem carteira","inabilitado"]`
- `516-91`: dirigir sob influência de álcool, gravíssima ×10 (293470), alcoolemia, artigo `"CTB art. 165"`, sinônimos `["bafometro","embriaguez","etilometro"]`

Todos os textos preenchidos, exceto o `null` indicado, e `versao: "teste1"`.

- [ ] **Passo 1:** Escrever os testes: `formatarValor(29347) === "R$ 293,47"`, `formatarValor(146735) === "R$ 1.467,35"`, `formatarData("2026-11-17") === "17/11/2026"`, `valorValido('gravissima', 88041) === true`, `valorValido('gravissima', 30000) === false`, `valorValido('leve', 4419) === true` (fator 0,5).
- [ ] **Passo 2:** Rodar `npx vitest run tests/dominio`. Esperado: FAIL (módulos inexistentes).
- [ ] **Passo 3:** Implementar `tipos.ts`, `formatar.ts` e o fixture. Em `valorValido`, comparar `Math.round(base * fator)` com o valor.
- [ ] **Passo 4:** Rodar `npx vitest run tests/dominio`. Esperado: PASS.
- [ ] **Passo 5:** Commit `feat: tipos de domínio e formatação`.

### Task 3: Conversão da planilha em base

**Arquivos:**
- Criar: `scripts/conteudo/ler-planilha.ts`, `scripts/conteudo/validar.ts`, `scripts/conteudo/gerar-base.ts`, `tests/helpers/planilha.ts`
- Teste: `tests/conteudo/validar.test.ts`, `tests/conteudo/gerar-base.test.ts`

**Interfaces:**
- Consome: os tipos, `PONTOS`, `valorValido` e `CATEGORIAS` da Task 2.
- Produz:
```ts
export const COLUNAS = ['Código','Descrição','Artigo','Gravidade','Pontos','Valor (R$)',
  'Medida administrativa','Quando autuar','Quando não autuar','Procedimento',
  'O que registrar','Categoria','Sinônimos','Fonte','Status','Data de conferência'] as const;
export const MARCADOR_NAO_CONSTA = 'NÃO CONSTA';
export type LinhaBruta = { linha: number; valores: Record<(typeof COLUNAS)[number], unknown> };
export async function lerPlanilha(caminho: string): Promise<LinhaBruta[]>;   // 1ª aba; pula linhas 100% vazias; linha = nº no Excel
export interface Problema { linha: number; campo: string; mensagem: string }
export interface ResultadoValidacao { infracoes: Infracao[]; erros: Problema[]; avisos: Problema[]; rascunhos: number }
export function validar(linhas: LinhaBruta[]): ResultadoValidacao;
export async function gerarBase(entrada: string, saida: string, agora?: Date): Promise<ResultadoValidacao>; // grava só se erros.length === 0 e infracoes.length > 0
// CLI: npm run conteudo [-- --entrada X --saida Y]; padrão content/infracoes.xlsx → public/data/infracoes.json; exit 1 se houver erro
// tests/helpers/planilha.ts
export async function criarPlanilhaTeste(linhas: Partial<Record<(typeof COLUNAS)[number], unknown>>[]): Promise<string>; // caminho de xlsx temporário
```
Regras de `validar`:
- Status (sem diferenciar maiúsculas e acentos): `Conferido`, `Rascunho`, ou erro. As linhas Rascunho entram em `rascunhos++`, e os problemas delas viram **avisos**. Nas Conferido, viram **erros**.
- Código: `/^\d{3}-\d{2}$/`, depois de trim. Se repetir entre as conferidas, é erro nas duas linhas.
- Gravidade: Leve, Média, Grave ou Gravíssima, aceitando sem acento.
- Pontos igual a `PONTOS[gravidade]`, e `valorValido` precisa passar.
- Valor: aceita número ou texto (`R$ 293,47`, `293,47`, `1.467,35`) e converte para centavos com arredondamento.
- Categoria: precisa bater com um `rotulo` de `CATEGORIAS`.
- Campos de texto: trim. Igual a `NÃO CONSTA` (sem diferenciar maiúsculas e acentos) vira `null`. Vazio é erro com a mensagem `vazio — preencha ou escreva NÃO CONSTA`. Descrição, Artigo e Fonte não aceitam `NÃO CONSTA`.
- Sinônimos: separados por `;`, com trim, sem vazios e sem diferenciar maiúsculas.
- Data: aceita objeto `Date` ou texto `DD/MM/AAAA` e vira ISO. É obrigatória nas conferidas.
- `versao` = os 12 primeiros caracteres do sha256 de `JSON.stringify(infracoes)`. `geradaEm` = `agora` em ISO (só a data).

- [ ] **Passo 1:** Escrever `tests/conteudo/validar.test.ts`, criando planilhas com `criarPlanilhaTeste`, com estes casos: uma linha conferida válida gera 1 infração sem erros; uma linha rascunho com problemas gera `rascunhos === 1`, um aviso e nenhum erro; pontos 5 em gravíssima dá erro no campo `Pontos`, na linha certa; valor `"R$ 293,47"` e `293.47` viram 29347; valor `"1.467,35"` em gravíssima ×5 vira 146735; data `Date(2026,10,17)` e `"17/11/2026"` viram `"2026-11-17"`; uma linha vazia no meio não desloca o número da linha do erro seguinte; `Procedimento: "não consta"` vira `null`; `Procedimento: ""` dá erro com a mensagem exata; código repetido dá dois erros.
- [ ] **Passo 2:** Escrever `tests/conteudo/gerar-base.test.ts`: com 1 conferida válida, grava o JSON com `versao` de 12 caracteres e a infração; com erro, não grava o arquivo; com 0 conferidas, não grava e devolve o erro `{linha: 0, campo: 'Status', mensagem: 'nenhuma ficha conferida'}`.
- [ ] **Passo 3:** Rodar `npx vitest run tests/conteudo`. Esperado: FAIL.
- [ ] **Passo 4:** Implementar os módulos e a CLI. A CLI imprime `N fichas conferidas publicadas, M rascunhos ignorados`, depois os avisos (`Linha L, Campo: mensagem`) e os erros.
- [ ] **Passo 5:** Rodar `npx vitest run tests/conteudo`. Esperado: PASS.
- [ ] **Passo 6:** Commit `feat: conversão da planilha em base validada`.

### Task 4: Modelo de planilha para o mantenedor

**Arquivos:**
- Criar: `scripts/conteudo/modelo-planilha.ts`
- Teste: `tests/conteudo/modelo-planilha.test.ts`

**Interfaces:**
- Consome: `COLUNAS` e `lerPlanilha` da Task 3, `CATEGORIAS` da Task 2.
- Produz: `criarModelo(caminho: string): Promise<void>`. Lança `Error('já existe')` se o arquivo existir.

A planilha gerada tem a aba **"Infrações"** com o cabeçalho de `COLUNAS` em negrito, linha 1 congelada, larguras legíveis e quebra de texto nas colunas longas. Tem listas suspensas (validação de dados) em Gravidade, Categoria e Status (Rascunho, Conferido). E tem a aba **"Instruções"** com este texto exato, um item por linha:
1. Uma linha por código de enquadramento.
2. Copie o texto do MBFT fielmente. Não reescreva.
3. Se a fonte não traz orientação para um campo, escreva NÃO CONSTA.
4. Sinônimos: palavras que o policial digitaria, separadas por ponto e vírgula.
5. Só mude o Status para Conferido depois de comparar a linha inteira com a fonte, e preencha a Data de conferência.
6. Só as linhas Conferido aparecem no app.

- [ ] **Passo 1:** Escrever o teste: `criarModelo(tmp)` e depois `lerPlanilha(tmp)` devolvem `[]`, e o cabeçalho lido com ExcelJS é igual a `COLUNAS`. Uma segunda chamada lança `'já existe'`.
- [ ] **Passo 2:** Rodar o teste. Esperado: FAIL.
- [ ] **Passo 3:** Implementar e ligar ao script `npm run planilha:modelo`, que gera `content/infracoes.xlsx`.
- [ ] **Passo 4:** Rodar o teste. Esperado: PASS. Rodar `npm run planilha:modelo`. Esperado: o arquivo é criado.
- [ ] **Passo 5:** Commit `feat: modelo de planilha de conteúdo` (incluindo `content/infracoes.xlsx`).

### Task 5: Busca

**Arquivos:**
- Criar: `src/busca/busca.ts`
- Teste: `tests/busca/busca.test.ts`

**Interfaces:**
- Consome: `Infracao` e `CATEGORIAS`.
- Produz:
```ts
export function normalizar(texto: string): string;          // minúsculas, sem acento, espaços colapsados, trim
export type Indice;                                         // opaco
export function criarIndice(infracoes: Infracao[]): Indice;
export function buscar(indice: Indice, consulta: string, limite?: number): Infracao[]; // limite padrão 20
```
Algoritmo:
1. Consulta normalizada vazia → `[]`.
2. Casa `/^\d{3}-?\d{0,2}$/` → busca por prefixo do código, comparando só os dígitos (`76331` e `763-3` encontram `763-31`).
3. Casa `/^art(igo)?\.?\s*(\d+)(-[a-z])?/` → infrações cujo `artigo` normalizado contém `art. N` seguido de fronteira de palavra (`art 165` não encontra `art. 165-A`, exceto se o sufixo for digitado).
4. Senão → MiniSearch nos campos `descricao`, `sinonimos` (juntos), `categoria` (rótulo), com `processTerm: normalizar`, `boost {sinonimos: 2, descricao: 1.5}`, `prefix: true`, `fuzzy: 0.2`, `combineWith: 'AND'`. Se vier zero resultado, repete com `'OR'`.

- [ ] **Passo 1:** Escrever os testes com `baseFixture`: `"celular"`, `"CELULAR"` e `"Celular "` → primeiro resultado `763-31`; `"embriagues"` → contém `516-91`; `"sem carteira"` → primeiro `501-00`; `"habilitacao"` → contém `501-00`; `"763"` e `"76331"` → `[763-31]`; `"art 165"` e `"art. 165"` → `[516-91]`; `"art 16"` → `[]`; `"xyzqwk"` → `[]`; `""` → `[]`.
- [ ] **Passo 2:** Rodar `npx vitest run tests/busca`. Esperado: FAIL.
- [ ] **Passo 3:** Implementar.
- [ ] **Passo 4:** Rodar `npx vitest run tests/busca`. Esperado: PASS.
- [ ] **Passo 5:** Commit `feat: busca offline tolerante a acento e erro de digitação`.

### Task 6: Dados no aparelho e atualização

**Arquivos:**
- Criar: `src/config.ts`, `src/dados/repositorio.ts`
- Teste: `tests/dados/repositorio.test.ts`

**Interfaces:**
- Consome: `Base`.
- Produz:
```ts
// config.ts
export const NOME_APP = 'Consulta Operacional';
export const EMAIL_CONTATO = 'DEFINIR@exemplo.invalid';   // trocado na Task 11
export const URL_DADOS = 'data/infracoes.json';
// repositorio.ts
export interface Salvo { base: Base; verificadoEm: number | null }
export interface Armazenamento { ler(): Promise<Salvo | null>; salvar(s: Salvo): Promise<void> }
export function armazenamentoIndexedDB(): Armazenamento;   // idb-keyval, chave 'base'; qualquer exceção → ler() devolve null, salvar() ignora
export function armazenamentoMemoria(inicial?: Salvo): Armazenamento;
export function ehBase(x: unknown): x is Base;            // confere a forma e cada campo de cada Infracao
export async function baixarBase(url: string, f?: typeof fetch, timeoutMs?: number): Promise<Base>; // cache:'no-store'; padrão 8000ms; lança se !ok, JSON inválido ou !ehBase
export const DIAS_DESATUALIZADA = 30;
export function estaDesatualizada(verificadoEm: number | null, agora: number): boolean;
export type EstadoDados = { tipo: 'pronto'; base: Base; verificadoEm: number | null } | { tipo: 'sem-base' };
export async function iniciarDados(o: {
  armazenamento: Armazenamento; baixar: () => Promise<Base>; agora: () => number;
  aoAtualizar: (e: EstadoDados & { tipo: 'pronto' }, mudouVersao: boolean) => void;
}): Promise<EstadoDados>;
```
Fluxo de `iniciarDados`: se houver base salva, devolve `pronto` na hora e dispara o download em segundo plano. Se o download der certo, salva com `verificadoEm = agora()` e chama `aoAtualizar(novoEstado, versao !== antiga)`. Se falhar, não faz nada. Se não houver base salva, espera o download: se der certo, salva e devolve `pronto`; se falhar, devolve `sem-base`.

- [ ] **Passo 1:** Escrever os testes: `estaDesatualizada(null, t) === true`; `estaDesatualizada` com 29 dias → false, com 31 dias → true. `baixarBase` com fetch falso devolvendo 404, devolvendo `"<html>"` ou devolvendo `{versao:1}` → rejeita. Com a base salva e um download que rejeita: devolve `pronto` com a base antiga, `aoAtualizar` não é chamado e o armazenamento continua igual. Com a base salva e um download de versão nova: `aoAtualizar` é chamado com `mudouVersao === true` e o armazenamento passa a ter a nova. Com mesma versão: `mudouVersao === false` e `verificadoEm` atualizado. Sem base salva e download que rejeita: `{tipo:'sem-base'}`. Sem base salva e download ok: `pronto` e salvo.
- [ ] **Passo 2:** Rodar `npx vitest run tests/dados`. Esperado: FAIL.
- [ ] **Passo 3:** Implementar. O timeout usa `AbortController`.
- [ ] **Passo 4:** Rodar `npx vitest run tests/dados`. Esperado: PASS.
- [ ] **Passo 5:** Commit `feat: base no aparelho com atualização em segundo plano`.

### Task 7: Casca do app, roteamento e tela de busca

**Arquivos:**
- Criar: `src/ui/html.ts`, `src/ui/app.ts`, `src/ui/telas/busca.ts`, `src/ui/telas/sem-base.ts`, `src/ui/estilo.css`. Modificar: `src/main.ts`, `index.html`
- Teste: `tests/ui/busca.test.ts`, `tests/ui/app.test.ts`

**Interfaces:**
- Consome: `criarIndice`, `buscar`, `iniciarDados`, `estaDesatualizada`, `formatarData`, a config.
- Produz:
```ts
export function esc(s: string): string;                   // escapa & < > " '
export interface Contexto { base: Base; indice: Indice; verificadoEm: number | null; agora: () => number }
export function montarApp(raiz: HTMLElement, estadoInicial: EstadoDados, opcoes: { tentarNovamente: () => void }): {
  atualizar(e: EstadoDados & { tipo: 'pronto' }, mudouVersao: boolean): void;
};
export function renderBusca(el: HTMLElement, ctx: Contexto, consultaInicial: string): void;
export function renderSemBase(el: HTMLElement, tentarNovamente: () => void): void;
```
Rotas por hash: `#/` (com `?q=` opcional), `#/infracao/:codigo`, `#/categorias`, `#/categoria/:slug`, `#/sobre`, `#/instalar`. Uma rota desconhecida cai em `#/`.

Comportamento:
- O campo de busca recebe foco ao abrir. A busca roda a cada `input` e grava a consulta em `#/?q=` com `history.replaceState`, para o "voltar" da ficha restaurar a busca.
- Cada resultado mostra o código, a descrição, a gravidade e os pontos, e é um link para a ficha (alvo ≥ 48px).
- Sem resultado: `Nenhuma infração encontrada para “X”.` e o link `Avisar que não encontrei` (`mailto:EMAIL_CONTATO?subject=` + `encodeURIComponent('Não encontrei: X')`).
- Consulta vazia: mostra o atalho "Ver por categoria".
- Rodapé fixo da tela inicial: `Iniciativa independente · não substitui a norma oficial · Sobre` (com link para `#/sobre`).
- Aviso no topo de todas as telas quando `estaDesatualizada(...)`: `Base de DD/MM/AAAA — conecte-se para verificar atualizações`.
- `atualizar(..., true)` recria o índice, re-renderiza a rota atual e mostra por 3s o aviso flutuante `Base atualizada`.
- Tela sem base: `Para usar sem internet, abra o app uma vez conectado para baixar a base.` e o botão `Tentar novamente`.
- `main.ts` liga tudo com `armazenamentoIndexedDB()` e `baixarBase(URL_DADOS)`.
- CSS: variáveis de cor com tema claro e escuro, fonte base 18px, contraste AA, sem cores ou símbolos institucionais.

- [ ] **Passo 1:** Escrever os testes em jsdom, montando com `baseFixture`: digitar "celular" mostra um link para `#/infracao/763-31`; digitar "xyzqwk" mostra a frase exata de "nenhuma encontrada" e um `a[href^="mailto:"]` com o assunto codificado; com `verificadoEm: null` o aviso de base aparece com `formatarData(base.geradaEm)`; com `verificadoEm` = agora ele não aparece; `montarApp` com `{tipo:'sem-base'}` mostra a mensagem e o botão chama `tentarNovamente`; `esc('<b>"x"</b>')` não contém `<b>`; um texto de infração com `<script>` é exibido como texto.
- [ ] **Passo 2:** Rodar `npx vitest run tests/ui`. Esperado: FAIL.
- [ ] **Passo 3:** Implementar.
- [ ] **Passo 4:** Rodar `npx vitest run tests/ui`. Esperado: PASS.
- [ ] **Passo 5:** Gerar a base de desenvolvimento com uma planilha de fixture: `npm run conteudo -- --entrada <xlsx criado pelo helper com as 3 linhas do fixture>`. Rodar `npm run dev`, abrir no navegador com largura de celular (375px) e conferir a busca. Esperado: resultados aparecem enquanto se digita.
- [ ] **Passo 6:** Commit `feat: casca do app e tela de busca`.

### Task 8: Tela da ficha

**Arquivos:**
- Criar: `src/ui/telas/ficha.ts`
- Teste: `tests/ui/ficha.test.ts`

**Interfaces:**
- Consome: `Contexto`, `esc`, `formatarValor`, `formatarData`, `ROTULO_GRAVIDADE`, `EMAIL_CONTATO`.
- Produz: `renderFicha(el: HTMLElement, ctx: Contexto, codigo: string): void`. Código inexistente mostra `Ficha não encontrada.` e um link para a busca.

Layout, em ordem:
1. Botão voltar (`history.back()`, ou `#/` se não houver histórico).
2. Título com a descrição. Linha `763-31 · Gravíssima · 7 pts`. Linha `R$ 293,47 · Medida adm.: <texto>`.
3. `<details open>` **Medidas**, com os subtítulos *Quando autuar*, *Quando não autuar* e *Procedimento*.
4. `<details open>` **O que registrar**, com o texto e o botão `Copiar` (`navigator.clipboard.writeText`; se não houver, usa um `textarea` com `execCommand('copy')`). Depois de copiar, o botão mostra `Copiado!` por 2s. O botão não aparece se o campo for `null`.
5. `<details>` (fechado) **Base legal e fonte**: o artigo, a fonte e `Conferido em DD/MM/AAAA`.
6. Link `Reportar erro nesta ficha`: `mailto:EMAIL_CONTATO?subject=` + `encodeURIComponent('Erro na ficha 763-31')`.

Qualquer campo `null` mostra exatamente `A fonte não traz orientação para este ponto.` Os textos preservam as quebras de linha da planilha (`white-space: pre-line`).

- [ ] **Passo 1:** Escrever os testes com `baseFixture`: a ficha `763-31` mostra `R$ 293,47`, `Gravíssima`, `7 pts`, a frase de "não consta" no lugar do Procedimento e `Conferido em` com a data formatada; o link de reporte tem o assunto `Erro na ficha 763-31` codificado; clicar em Copiar chama um `writeText` falso com `oQueRegistrar` e muda o rótulo para `Copiado!`; o código `999-99` mostra `Ficha não encontrada.`.
- [ ] **Passo 2:** Rodar `npx vitest run tests/ui/ficha.test.ts`. Esperado: FAIL.
- [ ] **Passo 3:** Implementar e ligar a rota `#/infracao/:codigo` em `app.ts`.
- [ ] **Passo 4:** Rodar `npx vitest run tests/ui`. Esperado: PASS.
- [ ] **Passo 5:** Commit `feat: tela da ficha da infração`.

### Task 9: Categorias, Sobre e Como instalar

**Arquivos:**
- Criar: `src/ui/telas/categorias.ts`, `src/ui/telas/sobre.ts`, `src/ui/telas/instalar.ts`
- Teste: `tests/ui/paginas.test.ts`

**Interfaces — Produz:** `renderCategorias(el, ctx)`, `renderCategoria(el, ctx, slug)`, `renderSobre(el, ctx)`, `renderInstalar(el)`. Todas recebem `el: HTMLElement` e `ctx: Contexto`.

- **Categorias:** lista só as categorias que têm infrações, com a contagem. A tela de uma categoria lista as infrações ordenadas por código. Um slug inválido volta para `#/categorias`.
- **Sobre** (texto exato):
  > **Consulta Operacional** é uma iniciativa independente, sem vínculo com a Polícia Militar de Minas Gerais ou qualquer órgão público.
  > As informações vêm de fontes públicas: o Código de Trânsito Brasileiro (Lei 9.503/1997) e o Manual Brasileiro de Fiscalização de Trânsito (MBFT). Cada ficha mostra a fonte e a data em que foi conferida.
  > Este app não substitui a norma oficial. Em caso de dúvida, consulte a fonte.
  > O app não pede login nem coleta dados de uso.

  Em seguida: `Base de conteúdo: versão <versao>, gerada em DD/MM/AAAA, com N infrações.`, o link `Fale conosco` (mailto) e o link `Como instalar`.
- **Como instalar** (texto exato):
  > **Android (Chrome):** abra o link, toque no menu ⋮ e escolha "Instalar app" ou "Adicionar à tela inicial".
  > **iPhone (Safari):** abra o link no Safari, toque em Compartilhar (quadrado com seta) e escolha "Adicionar à Tela de Início".
  > Depois de instalado, abra o app uma vez com internet. A partir daí ele funciona sem conexão.

- [ ] **Passo 1:** Escrever os testes: a tela de categorias com o fixture lista 3 categorias com contagem 1; `renderCategoria(..., 'alcoolemia')` lista `516-91`; Sobre contém `iniciativa independente`, `não substitui a norma oficial` e `com 3 infrações`; Instalar contém `Adicionar à Tela de Início`.
- [ ] **Passo 2:** Rodar `npx vitest run tests/ui/paginas.test.ts`. Esperado: FAIL.
- [ ] **Passo 3:** Implementar e ligar as rotas.
- [ ] **Passo 4:** Rodar `npm test`. Esperado: tudo PASS.
- [ ] **Passo 5:** Commit `feat: categorias, sobre e instruções de instalação`.

### Task 10: PWA instalável e offline

**Arquivos:**
- Criar: `public/icone.svg`. Modificar: `vite.config.ts`, `index.html`, `package.json`

**Interfaces — Produz:** um `dist/` com o manifest, o service worker e os ícones.

- [ ] **Passo 1:** Criar `public/icone.svg` com uma lupa sobre uma folha, em cores neutras e sem símbolos institucionais. Adicionar o script `"icones": "pwa-assets-generator --preset minimal-2023 public/icone.svg"`, rodar e versionar os PNGs.
- [ ] **Passo 2:** Configurar o `VitePWA`: `registerType: 'autoUpdate'`; manifest com `name: 'Consulta Operacional'`, `short_name: 'Consulta'`, `lang: 'pt-BR'`, `display: 'standalone'`, `start_url: '.'`, `scope: '.'`, `theme_color` e `background_color` iguais aos do CSS e os ícones gerados; `workbox.globPatterns: ['**/*.{js,css,html,svg,png,woff2}']` (**sem json**); `navigateFallback: 'index.html'`. Registrar o SW em `main.ts` via `virtual:pwa-register`.
- [ ] **Passo 3:** Rodar `npm run build`. Esperado: `dist/sw.js` e `dist/manifest.webmanifest` existem, e `grep -c infracoes.json dist/sw.js` dá `0`.
- [ ] **Passo 4:** Verificar à mão: `npm run preview`, abrir no Chrome, conferir no DevTools > Application se o manifest não tem erros e o SW está ativo, marcar **Offline** e recarregar. Esperado: o app abre e a busca funciona. Limpar os dados do site, deixar offline e recarregar. Esperado: aparece a tela "sem base" (o navegador também pode mostrar a própria página offline, já que o SW foi limpo; nesse caso, registrar como observação e seguir).
- [ ] **Passo 5:** Commit `feat: PWA instalável com funcionamento offline`.

### Task 11: Publicação no GitHub Pages

**Arquivos:**
- Criar: `.github/workflows/deploy.yml`, `README.md`. Modificar: `src/config.ts`

- [ ] **Passo 1:** O workflow roda em `push` na `main` e em `workflow_dispatch`, nesta ordem: `actions/checkout`, `actions/setup-node` (Node 26, cache npm), `npm ci`, `npm test`, `npm run conteudo`, `npm run build`, `actions/upload-pages-artifact` (`dist`) e `actions/deploy-pages`. Permissões: `pages: write`, `id-token: write`. Adicionar um passo antes do build que falha se `src/config.ts` contiver `exemplo.invalid`, com a mensagem `Defina EMAIL_CONTATO em src/config.ts`.
- [ ] **Passo 2:** Escrever o `README.md` com estas seções: **O que é**; **Desenvolvimento** (`npm install`, `npm test`, `npm run dev`); **Como atualizar o conteúdo, sem programar** (1. editar `content/infracoes.xlsx` no Excel, ou baixar do Google Planilhas como .xlsx com esse nome; 2. no GitHub, abrir a pasta `content`, *Add file → Upload files*, enviar o arquivo e confirmar; 3. acompanhar na aba *Actions*: verde significa publicado, vermelho significa abrir o log e ler a lista `Linha L, Campo: mensagem`); **Regras da planilha** (as mesmas da aba Instruções).
- [ ] **Passo 3: AÇÃO DO USUÁRIO.** Pedir ao usuário: (a) o e-mail criado para o projeto, para colocar em `EMAIL_CONTATO`; (b) uma conta no GitHub e um repositório criado (público, por causa do Pages gratuito); (c) a ativação de Pages > Source: *GitHub Actions*. Não continuar sem isso.
- [ ] **Passo 4:** Atualizar o `config.ts`, configurar o remote, fazer push. Esperado: o workflow **falha** no passo `npm run conteudo` com `nenhuma ficha conferida`. Isso é o comportamento correto até a Task 12 terminar. Registrar isso para o usuário.
- [ ] **Passo 5:** Commit `chore: publicação automática no GitHub Pages`.

### Task 12: Extração das ~50 fichas iniciais (rascunho)

Esta task produz conteúdo, não código. Não tem ciclo de teste; a verificação é a validação do script.

- [ ] **Passo 1:** Identificar a edição vigente do MBFT (resolução do CONTRAN em vigor) e a tabela de enquadramentos da SENATRAN no site oficial (gov.br). Registrar a resolução e a data de acesso para usar na coluna Fonte (formato `MBFT (Res. CONTRAN nº X/AAAA), ficha NNN-NN`).
- [ ] **Passo 2:** Propor uma lista de ~50 enquadramentos frequentes no policiamento de trânsito urbano e rodoviário estadual (ex.: celular, cinto, capacete, sem CNH, CNH vencida, veículo não licenciado, alcoolemia, recusa ao etilômetro, velocidade, avanço de sinal, estacionamento irregular, criança sem dispositivo de retenção, película, placa, faróis, ultrapassagem proibida). Gravar em `content/lista-inicial.md` e **pedir ao usuário que ajuste a lista** antes de extrair.
- [ ] **Passo 3:** Para cada enquadramento aprovado, preencher uma linha em `content/infracoes.xlsx` com **Status = Rascunho**, copiando fielmente do MBFT: descrição, artigo, gravidade, pontos, valor, medida administrativa, quando autuar, quando não autuar, definições e procedimentos (em Procedimento) e o exemplo do campo de observações (em O que registrar). Usar `NÃO CONSTA` onde a ficha não traz o texto. Escrever 3 a 8 sinônimos de jargão de rua por linha. Não preencher a Data de conferência.
- [ ] **Passo 4:** Rodar `npm run conteudo`. Esperado: `0 fichas conferidas publicadas, ~50 rascunhos ignorados`, com a lista de avisos zerada (corrigir até zerar) e o erro `nenhuma ficha conferida`.
- [ ] **Passo 5:** Commit `content: rascunho das fichas iniciais`.
- [ ] **Passo 6: AÇÃO DO USUÁRIO.** Entregar ao usuário a planilha para conferência: cada linha comparada com o MBFT, os sinônimos revisados, Status → Conferido e a Data preenchida. Depois do upload, o deploy passa a publicar.

### Task 13: Verificação final

- [ ] **Passo 1:** Rodar `npm test`. Esperado: tudo PASS. Rodar `npm run build`. Esperado: sem erros nem avisos de TypeScript.
- [ ] **Passo 2:** Com pelo menos uma ficha conferida publicada, abrir a URL do Pages num **celular Android real** e num **iPhone real** (se possível). Instalar seguindo a tela "Como instalar", abrir uma vez online, ativar o modo avião, fechar e reabrir o app, buscar "celular" e abrir uma ficha. Esperado: tudo funciona offline.
- [ ] **Passo 3:** Mudar uma ficha na planilha, publicar e reabrir o app online. Esperado: o aviso `Base atualizada` aparece e a ficha mostra o novo texto.
- [ ] **Passo 4:** Relatar ao usuário o resultado de cada verificação, incluindo qualquer falha.
