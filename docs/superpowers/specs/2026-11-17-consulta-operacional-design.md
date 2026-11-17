# Consulta Operacional — Design

Data: 2026-11-17
Status: rascunho para aprovação

## 1. Intenção e o porquê

App de consulta rápida para policiais militares do serviço operacional da PMMG.
É uma iniciativa pessoal, sem vínculo oficial com a corporação, mas pensada para
alcançar um grande número de militares.

Quando surge uma dúvida no meio da ocorrência, o policial hoje recorre ao Google,
que é lento, depende de sinal e mistura fontes, ou a um colega mais experiente,
que é confiável mas nem sempre está por perto.

O app precisa ser **mais rápido que o Google e tão confiável quanto o colega antigo**:
a resposta certa, de fonte identificada, em poucos segundos, mesmo sem internet.

A dúvida real do policial não é só "qual o código", e sim:
1. **Quais medidas tomar** naquela situação.
2. **O que registrar**: os principais pontos para o campo de observações do AIT
   (Auto de Infração de Trânsito) ou para o histórico do REDS.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos (v1)**
- Lançar com as **~50 infrações de trânsito mais comuns no dia a dia operacional**,
  todas conferidas pelo mantenedor contra a fonte, e ampliar a base aos poucos
  depois do lançamento. Cada ficha traz: código de enquadramento, descrição,
  artigo, gravidade, pontos, valor, medida administrativa, **medidas a tomar**
  (quando autuar, quando não autuar, procedimento) e **o que registrar** no campo
  de observações do AIT.
- Busca como porta de entrada: texto livre ("celular dirigindo", "sem cinto",
  "embriaguez"), código ("763-31") ou artigo ("art. 252").
- Funcionamento 100% offline depois do primeiro acesso.
- Toda ficha mostra a fonte e a data da última conferência.

**Não-objetivos (v1)**
- Crimes, contravenções e leis especiais: ficam para a fase 2, quando houver
  alguém para revisar o conteúdo redigido (ver seção 7).
- Orientações internas da PMMG (POPs, normas internas). Só fontes públicas.
- Consulta a bases de pessoas e veículos, ou integração com qualquer sistema oficial.
- Login, contas, favoritos sincronizados, perfil do usuário.
- Publicação nas lojas de apps.

**Anti-objetivos (resultados que tornam o app um fracasso, mesmo funcionando)**
- O policial agir com base em informação **errada ou desatualizada** sem perceber.
  Por isso a fonte e a data aparecem sempre, e nenhum texto redigido sem revisão
  é publicado.
- Parecer um app **oficial da PMMG**. Sem brasão, sem nome ou identidade visual da
  corporação. Um aviso claro de que é uma iniciativa independente e não substitui
  a norma oficial.
- Coletar dados de quem consulta o quê.
- Ser mais lento que abrir o Google: se a resposta exigir vários toques ou depender
  de rede, o app falhou.

## 3. Restrições

- **Uso real:** na rua, com uma mão, sinal fraco ou inexistente, às vezes à noite
  ou sob sol forte. Exige tela legível, alvos de toque grandes e modo escuro.
- **Custo:** perto de zero. Hospedagem estática gratuita.
- **Fontes:** só material público. Base principal: CTB (Lei 9.503/1997) e o
  Manual Brasileiro de Fiscalização de Trânsito (MBFT) **na edição vigente**,
  junto com a tabela oficial de enquadramentos da SENATRAN. O construtor deve
  confirmar qual é a resolução do CONTRAN vigente do MBFT antes de extrair dados.
- **Mantenedor:** uma pessoa, sem equipe. A atualização de conteúdo precisa ser
  simples e não pode exigir mexer no código do app.

## 4. Abordagens consideradas

| Abordagem | Prós | Contras |
|---|---|---|
| **A. App nativo nas lojas** (React Native/Expo, Android + iOS) | Presença na loja, instalação familiar, offline robusto | US$ 25 (Google) + US$ 99/ano (Apple), revisão de loja a cada versão, risco de rejeição na Apple por "informação de aparência oficial" |
| **B. PWA, app web instalável** ✅ escolhida | Custo zero, sem loja, correções chegam a todos na hora, divulgação por link (WhatsApp) | Não aparece nas lojas, instalação no iPhone menos intuitiva |
| C. Android nativo apenas | — | Descartada: corta usuários de iPhone sem economia relevante |

**Escolha: B.** A prioridade agora é validar se os policiais usam e confiam no
app, e conseguir corrigir conteúdo rapidamente. Se a adesão crescer, o conteúdo
e boa parte do código podem ser reaproveitados num app de loja (A).

## 5. Design decidido

### 5.1 Experiência

- **Tela inicial = busca.** Campo de busca com foco ao abrir, e resultados
  aparecendo enquanto o policial digita. A busca tolera erros de digitação e
  ignora acentos, e entende sinônimos do jargão de rua ("celular", "falando ao
  telefone", "cinto", "capacete", "bafômetro", "recusa").
- **Ficha da infração**, nesta ordem de prioridade na tela:

```
┌──────────────────────────────────┐
│ Dirigir usando celular           │
│ 763-31 · Gravíssima · 7 pts      │
│ R$ 293,47 · Medida adm.: —       │
├──────────────────────────────────┤
│ ▸ MEDIDAS                        │
│   Quando autuar / quando não     │
│   autuar / procedimento          │
│ ▸ O QUE REGISTRAR                │
│   Pontos para o campo de         │
│   observações do AIT             │
│ ▸ Base legal e fonte (recolhido) │
│   CTB art. 252, par. único       │
│   MBFT ficha nº ... · conferido  │
│   em DD/MM/AAAA                  │
└──────────────────────────────────┘
```
(Os valores acima são só ilustrativos.)

- Botão **copiar** no bloco "O que registrar", para colar no sistema ou no bloco
  de notas.
- Navegação secundária por categoria (ex.: habilitação, documentação do veículo,
  equipamentos, alcoolemia, estacionamento, velocidade), para quem prefere navegar
  a buscar.
- Tela **Sobre**: aviso de iniciativa independente, fontes usadas, data da base
  de conteúdo, contato para reportar erro.
- **Reportar erro** em cada ficha: abre um canal simples (e-mail ou formulário
  externo) já com o código da ficha preenchido. Os próprios policiais são a
  revisão contínua do conteúdo.

### 5.2 Conteúdo

- O conteúdo fica **separado do código**, numa **planilha** (Excel ou Google
  Planilhas) com uma linha por enquadramento. É ali que o mantenedor, que não
  programa, edita. Um script valida a planilha (campos obrigatórios, formato de
  código, pontos e valor coerentes com a gravidade) e a converte no arquivo de
  dados que o app usa. Se a validação falhar, nada é publicado, e o erro aparece
  apontando a linha. Campos mínimos: código,
  desdobramento, descrição, artigo do CTB, gravidade, pontos, valor, medida
  administrativa, quando autuar, quando não autuar, procedimento, o que registrar,
  sinônimos para busca, referência na fonte, **status (rascunho / conferido)** e
  data de conferência.
- **Conferência:** o construtor (com ajuda de script ou IA) extrai as fichas para
  a planilha com status "rascunho". O mantenedor compara cada uma com o MBFT e
  marca como "conferido", com a data. **Só fichas conferidas são publicadas.** A
  "data de conferência" exibida no app é essa data de revisão humana, não a data
  da extração.
- A lista das ~50 infrações iniciais é definida pelo mantenedor, com base na
  frequência no dia a dia. O construtor pode sugerir uma lista de partida.
- A base é **extraída do MBFT e da tabela de enquadramentos**, não redigida. Onde
  o MBFT já traz o texto ("quando autuar", exemplos do campo de observações), ele
  é usado fielmente. A única parte de autoria livre são os sinônimos de busca.
- O app baixa a base inteira no primeiro acesso e a guarda no aparelho. Quando
  houver internet, verifica em segundo plano se existe versão nova da base e
  atualiza sozinho, mostrando a data da base em uso.

### 5.3 Técnica (decisões do construtor, já fixadas aqui)

- PWA com service worker, cache offline completo de app e dados, e manifest para
  instalação.
- Hospedagem estática gratuita (ex.: GitHub Pages, Cloudflare Pages ou Netlify),
  publicada a partir de um repositório git.
- Sem backend e sem banco de dados no servidor. A busca roda inteira no aparelho.
- Sem analytics que identifique usuário. Contagem anônima de acessos é aceitável,
  se for desejada no futuro.
- Uma página "Como instalar", com instruções para Android e iPhone, para divulgar
  junto com o link.

### 5.4 Decisões complementares (chamadas do designer, sujeitas a correção)

- **Campo sem texto na fonte:** se o MBFT não traz texto para um campo de uma
  ficha, a seção aparece com "A fonte não traz orientação para este ponto". Nunca
  se preenche com texto redigido. O modelo de dados distingue "vazio na fonte" de
  "ainda não extraído".
- **Base antiga:** se a base no aparelho não for verificada contra o servidor há
  mais de 30 dias, o app mostra um aviso visível no topo ("Base de DD/MM/AAAA —
  conecte-se para verificar atualizações").
- **Sinônimos de busca:** o construtor redige uma lista inicial. O mantenedor
  revisa e completa com o jargão de rua antes do lançamento. Os relatos de "não
  encontrei" vindos dos usuários alimentam a lista depois.
- **Canal de erro:** um e-mail criado só para o projeto (não pessoal), via link
  `mailto:` com o código da ficha no assunto. Nenhum formulário de terceiros na v1.

## 6. Deixado para o construtor

- Framework e ferramentas de build da PWA, desde que o resultado seja leve e
  abra rápido em celular básico.
- Biblioteca de busca (fuzzy e sem acentos).
- Formato exato do arquivo de dados e o processo de extração do MBFT (script ou
  extração manual assistida), desde que cada registro guarde a referência da fonte.
- Identidade visual: neutra, alto contraste, modo escuro, sem símbolos da PMMG.
- Escolha do provedor de hospedagem.

## 7. Fase 2 (fora do escopo, registrado para não se perder)

- **Crimes, contravenções e leis especiais** (Código Penal, CTB criminal, Lei de
  Drogas, Estatuto do Desarmamento, Maria da Penha etc.), com o mesmo formato
  "Medidas / O que registrar no histórico do REDS". Esse conteúdo precisa ser
  **redigido** a partir da lei e do CPP, e só entra quando houver um revisor
  definido.
- **Orientações da PMMG**, se um dia houver aval da corporação.
- Versão nas lojas de apps (abordagem A), se a adesão justificar.
