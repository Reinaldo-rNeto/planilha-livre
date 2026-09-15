import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCorePtBR from '@univerjs/preset-sheets-core/locales/pt-BR'
import '@univerjs/preset-sheets-core/lib/index.css'
import './style.css'
import { lerArquivoParaWorkbook, exportarWorkbook } from './xlsx-bridge'
import { registrarFormulasPtBr } from './formulas-ptbr'
import type { IWorkbookData } from '@univerjs/presets'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="toolbar">
    <button id="btn-abrir">📂 <span class="rotulo">Abrir</span></button>
    <button id="btn-salvar-xlsx" class="primary">💾 <span class="rotulo">Salvar .xlsx</span></button>
    <button id="btn-salvar-csv">💾 <span class="rotulo">Salvar .csv</span></button>
    <button id="btn-instalar" hidden>📲 <span class="rotulo">Instalar app</span></button>
    <span class="nome-arquivo" id="nome-arquivo">planilha sem título</span>
  </div>
  <div id="status"></div>
  <div id="univer-container"></div>
  <input type="file" id="input-arquivo" accept=".xlsx,.xls,.csv" hidden />
`

const { univerAPI } = createUniver({
  locale: LocaleType.PT_BR,
  locales: {
    [LocaleType.PT_BR]: mergeLocales(UniverPresetSheetsCorePtBR),
  },
  presets: [
    UniverSheetsCorePreset({
      container: 'univer-container',
    }),
  ],
})

univerAPI.createWorkbook({})

registrarFormulasPtBr(univerAPI)

let nomeArquivoAtual = 'planilha-sem-titulo'

const elStatus = document.querySelector<HTMLDivElement>('#status')!
const elNomeArquivo = document.querySelector<HTMLSpanElement>('#nome-arquivo')!
const inputArquivo = document.querySelector<HTMLInputElement>('#input-arquivo')!

function mostrarStatus(mensagem: string, duracaoMs = 2500) {
  elStatus.textContent = mensagem
  if (duracaoMs > 0) {
    setTimeout(() => {
      if (elStatus.textContent === mensagem) elStatus.textContent = ''
    }, duracaoMs)
  }
}

document.querySelector('#btn-abrir')!.addEventListener('click', () => inputArquivo.click())

inputArquivo.addEventListener('change', async () => {
  const arquivo = inputArquivo.files?.[0]
  if (!arquivo) return

  const inicio = performance.now()
  mostrarStatus(`Abrindo ${arquivo.name}…`, 0)

  try {
    const dados = await lerArquivoParaWorkbook(arquivo)
    // troca o workbook atual pelo que acabou de ser lido
    univerAPI.disposeUnit(univerAPI.getActiveWorkbook()!.getId())
    univerAPI.createWorkbook(dados)

    nomeArquivoAtual = arquivo.name.replace(/\.(xlsx|xls|csv)$/i, '')
    elNomeArquivo.textContent = arquivo.name
    mostrarStatus(`Aberto em ${Math.round(performance.now() - inicio)}ms`)
  } catch (erro) {
    console.error(erro)
    mostrarStatus('Não deu pra abrir esse arquivo — veja o console para detalhes.')
  } finally {
    inputArquivo.value = ''
  }
})

function salvarComo(formato: 'xlsx' | 'csv') {
  const workbook = univerAPI.getActiveWorkbook()
  if (!workbook) return
  const dados = workbook.save() as IWorkbookData
  exportarWorkbook(dados, formato, nomeArquivoAtual)
  mostrarStatus(`Salvo como .${formato}`)
}

document.querySelector('#btn-salvar-xlsx')!.addEventListener('click', () => salvarComo('xlsx'))
document.querySelector('#btn-salvar-csv')!.addEventListener('click', () => salvarComo('csv'))

// Android/desktop Chrome escondem o "instalar app" por padrão — sem esse botão próprio,
// quase ninguém descobre que dá pra instalar. iOS não dispara esse evento (lá o caminho
// é "Compartilhar → Adicionar à Tela de Início", não tem como automatizar).
let promptDeInstalacao: Event & { prompt?: () => void } | null = null
const btnInstalar = document.querySelector<HTMLButtonElement>('#btn-instalar')!

window.addEventListener('beforeinstallprompt', (evento) => {
  evento.preventDefault()
  promptDeInstalacao = evento
  btnInstalar.hidden = false
})

btnInstalar.addEventListener('click', async () => {
  await promptDeInstalacao?.prompt?.()
  btnInstalar.hidden = true
})

window.addEventListener('appinstalled', () => {
  btnInstalar.hidden = true
})
