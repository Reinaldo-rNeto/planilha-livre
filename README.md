# PlanilhaLivre

Repositório: https://github.com/Reinaldo-rNeto/planilha-livre

App open source para visualizar e editar arquivos `.xlsx` e `.csv` direto no navegador (PWA), sem precisar de licença de Excel e sem depender de Google Drive/Sheets.

## Objetivo

Ser uma alternativa mais simples, leve e mobile-first ao LibreOffice Calc e ao OnlyOffice — não uma tentativa de bater de frente com Excel ou Google Sheets. O foco é resolver na prática o incômodo de quem mexe com planilhas no dia a dia (ciência de dados, freelas, PMEs) sem licença de Office e sem querer passar pelo fluxo Drive/Sheets só pra abrir ou editar algo rápido.

## Requisitos não-negociáveis

- Aguentar bem arquivos grandes — dezenas de milhares de linhas — sem travar.
- Mobile-first de verdade: interface e interações desenhadas pra toque desde o início.
- Zero fricção: abrir e salvar um arquivo local, sem conta, sem login, sem passar por nuvem por padrão.

## Escopo do MVP

- Abrir, editar e salvar `.xlsx` e `.csv` inteiramente no navegador (client-side, sem servidor)
- Fórmulas comuns (soma, média, se, procv etc.)
- Formatação básica de células
- Funciona offline (PWA, service worker)
- Sem conta/login obrigatório; dados ficam no dispositivo (IndexedDB/localStorage), com sync em nuvem opcional no futuro

Fora do escopo por enquanto: macros/VBA, tabelas dinâmicas, gráficos avançados, colaboração em tempo real.

## Stack técnica

- **Motor de planilha:** [Univer](https://github.com/dream-num/univer) (Apache 2.0) — engine de fórmulas própria e renderização em canvas, o que permite rolar planilhas grandes sem travar o navegador. Pacotes: `@univerjs/presets` + `@univerjs/preset-sheets-core`.
- **Import/export de xlsx/csv:** feito com **SheetJS**, não com o recurso nativo do Univer — o import/export de fábrica do Univer depende dos pacotes `@univerjs-pro` (camada comercial) e de um backend de conversão, o que quebraria os requisitos de open source e zero servidor. `src/xlsx-bridge.ts` faz essa conversão manualmente pro formato de dados do Univer (`IWorkbookData`).
- **Offline:** PWA via `vite-plugin-pwa` (service worker com auto-update).
- **Por que não HyperFormula:** é licenciado em GPLv3 (grátis só se o produto todo for GPL) ou pago; o motor de fórmulas próprio do Univer já é Apache 2.0.

## Como rodar

```bash
npm install
npm run dev       # ambiente de desenvolvimento
npm run build     # build de produção (gera dist/)
npm run preview   # serve o build de produção
```

Nota: o pacote `xlsx` do registro público do npm está desatualizado (0.18.5); a SheetJS recomenda instalar a versão atual direto do CDN deles (`npm install https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`). Ficou pendente porque o ambiente onde isso foi montado bloqueia esse domínio.

## Validado até agora

- **Performance:** csv de 50.000 linhas × 12 colunas abre em ~1,85s e exporta pra xlsx em ~2,8s (arquivo final ~8,5MB); dados conferidos byte a byte no round-trip.
- **Mobile:** edição por toque (duplo toque + digitar + Enter) testada em viewports de 360×740 e 390×844; o ribbon do Univer colapsa bem em tela estreita.
- **Offline:** app carrega normalmente depois de simular perda de internet, com o service worker já tendo feito o precache.
- Suporte a instalação (`beforeinstallprompt` no Android/desktop, meta tags de `apple-mobile-web-app-*` no iOS), com ícone próprio (grade de planilha com a célula ativa em destaque, não é mais o placeholder de letras).
- **Fórmulas sobrevivem ao salvar/reabrir:** antes, qualquer fórmula (nossa ou de um arquivo importado) virava só o último valor calculado — `sheet_to_json` descarta fórmula. Agora a leitura e a escrita são feitas célula por célula preservando o campo `f`; testado digitando `=SUM(A1:A2)`, exportando e reabrindo — a fórmula continua lá, não só o número.
- **Peso do que fica cacheado pra uso offline:** o Univer carrega ~77 arquivos de padrões de hifenização (um por idioma, usados só pra justificar parágrafo em texto rico) via import dinâmico — nenhum é necessário pra abrir/editar/salvar planilha. Sem filtrar isso, o service worker baixava e guardava ~11MB de uma vez só pra instalar o app; ajustando o `workbox.globPatterns` no `vite.config.ts` pra só precachear o que o app de fato usa (bundle principal, css, ícones, manifest), caiu pra ~6,2MB. Reconferido com o teste de carga depois da mudança: sem regressão (50k linhas seguem abrindo em ~1,4-1,85s).

Tudo isso testado em Chromium via Playwright — ainda falta testar num navegador/celular real.

## Pendências conhecidas

- **Fórmulas digitadas em português (SOMA, MÉDIA, SE, PROCV) ainda não funcionam** — o Univer só reconhece os nomes em inglês (SUM, AVERAGE, IF, VLOOKUP) quando você digita direto no app; dá erro `#NAME?`. Investigado a fundo: existe um hook oficial (`univerAPI.addEvent(univerAPI.Event.BeforeCommandExecute, ...)`), mas a edição de célula no editor passa por comandos internos do editor de texto rico (`doc.mutation.rich-text-editing`), não por um comando único com a fórmula em texto plano — não achei um ponto seguro pra reescrever "SOMA" → "SUM" antes do Univer processar, sem risco de quebrar a edição normal. Isso só afeta digitação ao vivo: um arquivo `.xlsx` real (mesmo feito no Excel em português) já guarda a fórmula em inglês internamente — o Excel só traduz na hora de exibir — então abrir arquivos existentes funciona bem.
- **Código que o navegador baixa pra rodar o app ainda é grande:** ~6,2MB (1,77MB gzip) — isso é diferente do que fica em cache offline (resolvido acima); esse número é o preset completo do Univer (editor de texto rico, formatação e atalhos embutidos), que precisa ser baixado e executado de qualquer forma pra app funcionar. Resolver de verdade exigiria importar pacotes de nível mais baixo do Univer em vez do preset completo (refactor maior, com risco de quebrar funcionalidade que já validamos — não fiz sem avaliar com calma).
- Ainda falta testar num navegador/celular real, não só em Chromium via Playwright.

## Status

Esqueleto funcional: abrir/editar/salvar xlsx e csv de ponta a ponta, com performance, mobile, offline, instalação (com ícone próprio) e persistência de fórmulas validados por teste automatizado, e só 1 vulnerabilidade "high" restante no `npm audit` (era 95 — as outras 94 eram o `nanoid` desatualizado usado por dependências internas do Univer que nem chegamos a importar; corrigido travando a versão via `overrides` no `package.json`). A que restou é o pacote `xlsx` desatualizado do registro do npm, que resolve trocando pelo tarball do CDN da SheetJS. Fórmulas digitadas funcionam em inglês; tradução pra nomes em português ainda não foi feita. O que ainda depende de decisão/ambiente que não tenho aqui: testar num aparelho real, e decidir se vale o refactor pra reduzir o bundle de código.
