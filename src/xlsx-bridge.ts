// Ponte entre arquivos xlsx/csv e o modelo de dados do Univer.
//
// Por que isso existe: o Univer tem um recurso de import/export "de fábrica",
// mas ele depende dos pacotes @univerjs-pro (exchange-client) e de um backend
// de conversão — ou seja, não é grátis nem 100% local. Como o requisito aqui é
// abrir/salvar um arquivo local sem servidor e sem licença, lemos e escrevemos
// o xlsx/csv nós mesmos com o SheetJS (tudo roda no navegador) e convertemos
// pro formato de dados que o Univer entende (IWorkbookData).

import * as XLSX from 'xlsx'
import type { ICellData, IWorkbookData } from '@univerjs/presets'

const SHEET_ID_PADRAO = 'sheet-01'

/** Lê um arquivo .xlsx, .xls ou .csv e devolve os dados prontos pro Univer carregar. */
export async function lerArquivoParaWorkbook(arquivo: File): Promise<Partial<IWorkbookData>> {
  const buffer = await arquivo.arrayBuffer()
  const livro = XLSX.read(buffer, { type: 'array', cellStyles: false })

  const sheetOrder: string[] = []
  const sheets: IWorkbookData['sheets'] = {}

  livro.SheetNames.forEach((nomeAba, indice) => {
    const planilha = livro.Sheets[nomeAba]
    const linhas = XLSX.utils.sheet_to_json<unknown[]>(planilha, {
      header: 1,
      raw: true,
      defval: undefined,
    })

    const id = `${SHEET_ID_PADRAO}-${indice}`
    sheetOrder.push(id)
    sheets[id] = {
      id,
      name: nomeAba || `Planilha ${indice + 1}`,
      cellData: linhasParaCellData(linhas),
      rowCount: Math.max(linhas.length, 100),
      columnCount: Math.max(maiorNumeroDeColunas(linhas), 26),
    }
  })

  return {
    id: `workbook-${Date.now()}`,
    name: arquivo.name.replace(/\.(xlsx|xls|csv)$/i, ''),
    appVersion: '0.0.1',
    sheetOrder,
    sheets,
  }
}

function maiorNumeroDeColunas(linhas: unknown[][]): number {
  return linhas.reduce((maior, linha) => Math.max(maior, linha.length), 0)
}

/** Converte a matriz de linhas (formato do SheetJS) pro dicionário linha/coluna do Univer. */
function linhasParaCellData(linhas: unknown[][]): Record<number, Record<number, ICellData>> {
  const cellData: Record<number, Record<number, ICellData>> = {}

  linhas.forEach((linha, indiceLinha) => {
    if (!linha || linha.length === 0) return
    const linhaConvertida: Record<number, ICellData> = {}

    linha.forEach((valor, indiceColuna) => {
      if (valor === undefined || valor === null || valor === '') return
      linhaConvertida[indiceColuna] = { v: valor as string | number | boolean }
    })

    if (Object.keys(linhaConvertida).length > 0) {
      cellData[indiceLinha] = linhaConvertida
    }
  })

  return cellData
}

export type FormatoExportacao = 'xlsx' | 'csv'

/** Pega o snapshot atual do workbook (via workbook.save()) e baixa como xlsx ou csv. */
export function exportarWorkbook(
  dados: IWorkbookData,
  formato: FormatoExportacao,
  nomeArquivo: string,
) {
  const livro = XLSX.utils.book_new()

  dados.sheetOrder.forEach((id) => {
    const aba = dados.sheets[id]
    if (!aba) return
    const matriz = cellDataParaLinhas(aba.cellData ?? {})
    const planilha = XLSX.utils.aoa_to_sheet(matriz)
    XLSX.utils.book_append_sheet(livro, planilha, aba.name || id)
  })

  const nomeBase = nomeArquivo.replace(/\.(xlsx|xls|csv)$/i, '') || 'planilha'

  if (formato === 'csv') {
    // csv só suporta uma aba — exporta a primeira
    const primeiraAba = livro.Sheets[livro.SheetNames[0]]
    const csv = XLSX.utils.sheet_to_csv(primeiraAba)
    baixarBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${nomeBase}.csv`)
    return
  }

  const arrayBuffer = XLSX.write(livro, { bookType: 'xlsx', type: 'array', compression: true })
  baixarBlob(
    new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${nomeBase}.xlsx`,
  )
}

function cellDataParaLinhas(cellData: Record<number, Record<number, ICellData>>): unknown[][] {
  const indicesLinha = Object.keys(cellData).map(Number)
  if (indicesLinha.length === 0) return [[]]

  const maiorLinha = Math.max(...indicesLinha)
  const linhas: unknown[][] = []

  for (let l = 0; l <= maiorLinha; l++) {
    const linhaDados = cellData[l]
    if (!linhaDados) {
      linhas.push([])
      continue
    }
    const indicesColuna = Object.keys(linhaDados).map(Number)
    const maiorColuna = Math.max(0, ...indicesColuna)
    const linha: unknown[] = []
    for (let c = 0; c <= maiorColuna; c++) {
      linha[c] = linhaDados[c]?.v ?? ''
    }
    linhas.push(linha)
  }

  return linhas
}

function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
