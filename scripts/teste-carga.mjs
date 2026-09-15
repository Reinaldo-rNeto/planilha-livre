// Teste de carga: abre o arquivo grande gerado por gerar-csv-teste.mjs dentro do app
// de verdade (via navegador headless) e mede quanto tempo leva pra abrir.
//
// Antes de rodar: `npm run build`, depois `npm run preview` (deixa rodando em outro
// terminal) e `npm run gerar:teste-grande` pra criar o arquivo de teste.
// Se for a primeira vez usando o Playwright na máquina: `npx playwright install chromium`.
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const raizProjeto = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const arquivoTeste = path.join(raizProjeto, 'teste-50k-linhas.csv')

const browser = await chromium.launch()
const page = await browser.newPage()

const erros = []
page.on('pageerror', (e) => erros.push(String(e)))
page.on('console', (msg) => {
  if (msg.type() === 'error') erros.push(msg.text())
})

await page.goto('http://localhost:4173', { waitUntil: 'networkidle' })
await page.waitForSelector('#univer-container canvas', { timeout: 15000 })
console.log('App carregou e o canvas do Univer apareceu.')

const inicio = Date.now()
await page.setInputFiles('#input-arquivo', arquivoTeste)

await page.waitForFunction(
  () => document.querySelector('#status')?.textContent?.includes('Aberto em'),
  { timeout: 60000 },
)
const statusTexto = await page.textContent('#status')
const tempoTotalPlaywright = Date.now() - inicio

console.log(`Status reportado pelo app: "${statusTexto}"`)
console.log(`Tempo total (incluindo overhead do Playwright): ${tempoTotalPlaywright}ms`)

const nomeArquivo = await page.textContent('#nome-arquivo')
console.log(`Nome do arquivo mostrado na barra: ${nomeArquivo}`)
await page.screenshot({ path: path.join(raizProjeto, 'teste-carga-screenshot.png') })

if (erros.length) {
  console.log('--- erros no console/página ---')
  erros.forEach((e) => console.log(e))
  process.exitCode = 1
} else {
  console.log('Nenhum erro no console.')
}

await browser.close()
