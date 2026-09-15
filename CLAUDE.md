# Contexto do projeto

Projeto_PlanilhaLivre — app open source (PWA) para visualizar/editar xlsx e csv no navegador, offline-first, sem login. Posicionamento: alternativa mais simples e mobile-first ao LibreOffice Calc/OnlyOffice (não concorre de frente com Excel/Google Sheets). Ver README.md para escopo completo do MVP, requisitos não-negociáveis (performance com arquivos grandes, mobile-first, zero fricção) e stack técnica (Univer como motor, Apache 2.0).

Preferências de código do Reynas (aplicar sempre): comentários mínimos mas humanos, sem emojis na UI, interações mobile-first, arquitetura offline-first (localStorage/IndexedDB antes de sync em nuvem).

## Decisão técnica importante (não reverter sem entender o motivo)

O import/export de xlsx/csv NÃO usa o recurso nativo do Univer — aquilo depende dos pacotes `@univerjs-pro/*` (Univer Pro, comercial) e de um backend de conversão. Usamos SheetJS pra ler/escrever os arquivos no navegador e uma ponte manual em `src/xlsx-bridge.ts` que converte pro `IWorkbookData` do Univer. Ver README.md, seção "Stack técnica", para o detalhe completo.

## Skills relevantes para este projeto

Usar estas skills nos momentos certos do desenvolvimento (não instalar/rodar tudo de uma vez):

- **seguranca-antes-de-lancar** — rodar antes de qualquer deploy ou publicação pública do app (segredos, auth, inputs, infraestrutura)
- **mcps-essenciais-projeto-novo** — consultar ao configurar o stack inicial e as ferramentas de dev (GitHub, Playwright, etc.)
- **skills-design-frontend-projeto-novo** — consultar ao construir a interface, para fugir do visual genérico de IA
