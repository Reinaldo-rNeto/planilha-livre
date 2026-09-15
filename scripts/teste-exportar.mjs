// Testa o caminho de exportação: abre o arquivo grande de teste, clica em
// "Salvar .xlsx" e confere que o download acontece num tempo razoável.
// Mesmos pré-requisitos do teste-carga.mjs.
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const raizProjeto = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const arquivoTeste = path.join(raizProjeto, 'teste-50k-linhas.csv')

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('ERRO:', String(e)))

await page.goto('http://localhost:4173', { waitUntil: 'networkidle' })
await page.waitForSelector('#univer-container canvas')

await page.setInputFiles('#input-arquivo', arquivoTeste)
await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('Aberto em'), { timeout: 60000 })

const inicio = Date.now()
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  page.click('#btn-salvar-xlsx'),
])
const tempoExportacao = Date.now() - inicio
console.log(`Export disparado em ${tempoExportacao}ms, arquivo: ${download.suggestedFilename()}`)

await download.saveAs(path.join(raizProjeto, 'teste-exportado.xlsx'))
await browser.close()
