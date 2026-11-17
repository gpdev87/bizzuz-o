# Consulta Operacional

## O que é

Um app de consulta rápida de infrações de trânsito para policiais do serviço operacional. Funciona sem internet depois do primeiro acesso, é instalável no celular (PWA) e mostra, para cada infração, as medidas a tomar e o que registrar no AIT.

É uma iniciativa independente. As informações vêm de fontes públicas (CTB e MBFT), e o app não substitui a norma oficial.

## Desenvolvimento

```bash
npm install
npm test          # testes
npm run dev       # servidor local
npm run build     # versão de produção em dist/
```

Para ter dados ao rodar localmente, gere uma base fictícia de desenvolvimento:

```bash
npx tsx scripts/conteudo/planilha-dev.ts
npm run conteudo -- --entrada tests/fixtures/planilha-dev.xlsx
```

## Como atualizar o conteúdo, sem programar

1. Edite o arquivo `content/infracoes.xlsx` no Excel. Se preferir o Google Planilhas, edite lá e baixe como `.xlsx` com esse mesmo nome (*Arquivo → Fazer download → Microsoft Excel*).
2. No GitHub, abra a pasta `content` do repositório e clique em *Add file → Upload files*. Envie o arquivo e clique em *Commit changes*.
3. Acompanhe na aba *Actions*:
   - **verde**: o conteúdo foi publicado, e os celulares recebem a atualização na próxima vez que abrirem o app com internet;
   - **vermelho**: nada foi publicado. Abra o log e leia a lista de erros no formato `Linha L, Campo: mensagem`, corrija a planilha e envie de novo.

## Regras da planilha

1. Uma linha por código de enquadramento.
2. Copie o texto do MBFT fielmente. Não reescreva.
3. Se a fonte não traz orientação para um campo, escreva NÃO CONSTA.
4. Sinônimos: palavras que o policial digitaria, separadas por ponto e vírgula.
5. Só mude o Status para Conferido depois de comparar a linha inteira com a fonte, e preencha a Data de conferência.
6. Só as linhas Conferido aparecem no app.
7. Pontos: quando a ficha do MBFT diz "Não computável" ou "Não aplicável", copie esse texto.
