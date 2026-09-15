# Projeto_PlanilhaLivre

Repositório: https://github.com/Reinaldo-rNeto/planilha-livre

App open source para visualizar e editar arquivos `.xlsx` e `.csv` direto no navegador (PWA), sem precisar assinar o Excel e sem depender de conta Google/Google Sheets.

## Objetivo e posicionamento

Não é uma tentativa de bater de frente com Excel/Google Sheets/LibreOffice/OnlyOffice — é ser **o que o LibreOffice Calc e o OnlyOffice são, só que mais simples, mais leve e mobile-first**. O criador já usa LibreOffice/OnlyOffice e eles funcionam, mas a meta aqui é ter um produto próprio, competitivo nesse nicho, não apenas "resolver com o que já existe".

Dor original que motivou o projeto: trabalhar com ciência de dados e mexer bastante com planilhas, sem licença de Excel, e achar um saco ter que subir a planilha pro Google Drive/Sheets só pra dar uma olhada ou editar algo rápido. Público-alvo: qualquer pessoa nessa mesma situação — provavelmente muitas, dado que é uma dor comum em quem trabalha com dados sem licença corporativa de Office.

**Expectativa realista:** não é uma aposta de "viralizar". É construir algo genuinamente usável, que vá crescendo por ser bom no nicho (mobile, zero fricção, abre na hora), não por efeito de rede.

## Requisitos que vieram do usuário (não negociáveis no design)

- Precisa aguentar bem arquivos grandes — dezenas de milhares de linhas — sem travar. Isso é um requisito de performance desde o início, não algo pra depois.
- Mobile-first de verdade: a interface e as interações são desenhadas pensando em toque desde o começo, não adaptadas do desktop depois.
- Zero fricção: abrir e salvar um arquivo local, sem conta, sem login, sem passar por nuvem por padrão.

## Escopo do MVP

- Abrir, editar e salvar `.xlsx` e `.csv` inteiramente no navegador (client-side, sem servidor)
- Fórmulas comuns (SOMA, MÉDIA, SE, PROCV etc.)
- Formatação básica de células
- Performance validada com planilhas de dezenas de milhares de linhas (teste de carga cedo no desenvolvimento, não só no fim)
- Funciona offline (PWA, service worker)
- Sem conta/login obrigatório; dados ficam no dispositivo (IndexedDB/localStorage) com sync em nuvem opcional no futuro

**Fora do escopo do MVP** (fica para depois, se fizer sentido): macros/VBA, tabelas dinâmicas, gráficos avançados, colaboração em tempo real.

## Stack técnica

- **Motor de planilha (renderização + fórmulas + modelo de dados):** [Univer](https://github.com/dream-num/univer) — framework open source ativo, licença **Apache 2.0** (permissiva, sem copyleft), com engine de fórmulas próprio e renderização em **canvas** (mesma abordagem de Google Sheets/Excel Online, que é o que permite rolar planilhas grandes sem travar o navegador). Cobre o motor pesado, evitando reinventar parser/fórmula/renderer do zero. Pacotes usados: `@univerjs/presets` + `@univerjs/preset-sheets-core`.
- **Por que não HyperFormula:** é uma engine de fórmulas boa, mas é licenciada em GPLv3 (grátis só se todo o produto for GPL) ou paga. Como o Univer já traz motor de fórmulas próprio em Apache 2.0, evitamos essa complicação de licença.
- **⚠️ Import/export de xlsx/csv NÃO usa o recurso nativo do Univer.** Descoberto durante o setup: o import/export "de fábrica" do Univer (`@univerjs-pro/exchange-client` e afins) faz parte do **Univer Pro** (camada comercial) e depende de um backend de conversão — contradiz os dois requisitos centrais do projeto (open source e zero servidor). Por isso, `src/xlsx-bridge.ts` lê/escreve os arquivos com **SheetJS** (100% no navegador) e converte manualmente pro formato de dados do Univer (`IWorkbookData`). É mais código nosso, mas é o que garante "sem servidor, sem licença" de verdade.
- **Offline:** PWA via `vite-plugin-pwa` (service worker com auto-update).
- **O que é "nosso" nessa stack** (a parte que diferencia o produto, não o motor): a ponte de import/export com SheetJS, UI/UX mobile-first, fluxo de abrir/salvar local sem fricção, empacotamento como PWA instalável.

## Esqueleto atual (o que já existe)

Projeto Vite + TypeScript rodando. `src/main.ts` inicializa o Univer em pt-BR com uma barra de ações (Abrir / Salvar .xlsx / Salvar .csv); `src/xlsx-bridge.ts` faz a conversão xlsx/csv ↔ Univer.

Como rodar:
```bash
npm install
npm run dev       # ambiente de desenvolvimento
npm run build     # build de produção (gera dist/)
npm run preview   # serve o build de produção
```

**Nota sobre o SheetJS:** o pacote `xlsx` publicado no registro público do npm está desatualizado (0.18.5); a própria SheetJS recomenda instalar a versão atual direto do CDN deles (`npm install https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`). Isso ficou pendente porque o ambiente onde este esqueleto foi montado bloqueia esse domínio — vale trocar assim que continuar o projeto numa máquina sem essa restrição.

## Teste de carga (validação real, não estimativa)

Rodado com `npm run gerar:teste-grande` (gera um CSV de 50.000 linhas × 12 colunas) + `npm run teste:carga` / `npm run teste:exportar` (abrem o app num Chromium headless via Playwright e cronometram):

- **Abrir** o CSV de 50k linhas: **~1,85s** (medido dentro do próprio app, do clique até o grid renderizado)
- **Exportar** de volta pra `.xlsx`: **~2,8s**, arquivo final de **~8,5MB** (com compressão ativada no SheetJS)
- Conferido byte a byte: as 50.000 linhas voltam intactas no round-trip csv → app → xlsx
- Nenhum erro no console durante o teste

Ou seja, o requisito de "aguentar arquivos grandes" está validado na prática, não só na teoria — mas vale testar depois com planilhas ainda maiores (100k+ linhas) e com mais colunas de texto/fórmulas, que pesam mais que números.

## Mobile e offline — também validados na prática (não só no papel)

Testado com Playwright emulando um Android comum (viewport 360×740) e depois um iPhone-ish (390×844):

- **Toque funciona de ponta a ponta:** dar duplo toque numa célula, digitar e apertar Enter grava o valor de verdade — testado e confirmado visualmente, não só "parece que funciona".
- **A UI nativa do Univer se adapta melhor do que eu esperava** — isso corrige o que eu tinha registrado antes como pendência: em tela estreita, o ribbon já colapsa pra menos abas (Início/Fórmulas/Dados) e a navegação entre planilhas ganha setas ‹ › pra caber no espaço. Não é um app mobile-first desenhado do zero, mas está bem mais utilizável em toque do que a suposição inicial.
- **Offline de verdade, testado, não assumido:** carreguei o app uma vez (o service worker faz o precache), depois simulei ficar sem internet e recarreguei a página — abriu normalmente, sem erro. O requisito "funciona offline" está validado, não é só o plugin de PWA estar instalado.
- Adicionei suporte a instalação: um botão "Instalar app" aparece quando o navegador permite (Android/desktop Chrome; iOS não expõe esse evento — lá o caminho continua sendo Compartilhar → Adicionar à Tela de Início) e as meta tags que faltavam pro "adicionar à tela de início" funcionar direito no iOS (o iOS ignora o `manifest.json` nesse ponto e exige tags `apple-mobile-web-app-*` próprias).

## Pendências conhecidas (achados durante o setup, não escondidos)

- **Bundle inicial pesado:** o `dist/assets/index-*.js` ficou em ~6,2MB (1,77MB gzip) — o preset do Univer já vem com editor de texto rico, formatação, atalhos etc. embutidos. A opção `lazy` do pacote só se aplica ao build UMD/CDN, não ajuda no nosso build via Vite/ESM — então isso continua sem solução simples; a saída real seria importar os pacotes de nível mais baixo do Univer à mão em vez do preset completo, o que é um refactor maior, não uma configuração.
- **95 vulnerabilidades "high" no `npm audit`:** quase todas vêm de dependências internas do próprio Univer (ex: `nanoid` desatualizado usado por pacotes `@univerjs-pro/*` que nem chegamos a importar). Sem correção disponível no momento — é algo pra rodar pela skill de segurança antes do lançamento e reavaliar quando o Univer atualizar essas dependências.
- Ícones do manifest do PWA (`public/icons/`) são placeholders gerados na hora — trocar por uma identidade visual de verdade antes de publicar.
- Tudo isso foi testado em Chromium (via Playwright) — ainda não em Safari/iOS ou Chrome Android reais. Vale testar num celular de verdade antes de considerar "pronto".

## Status

Esqueleto funcional rodando: abrir/editar/salvar xlsx e csv funcionando de ponta a ponta, com performance, toque/edição mobile e modo offline todos validados por teste automatizado (não só no papel). Próximos passos: testar num celular real, revisar o tamanho do bundle, e decidir o que entra na próxima leva de funcionalidades (fórmulas mais avançadas, formatação, etc.).
