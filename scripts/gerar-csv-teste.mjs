// Gera um CSV grande só pra testar performance de abertura (não faz parte do app).
import { writeFileSync } from 'node:fs'

const LINHAS = 50_000
const COLUNAS = 12
const cabecalho = Array.from({ length: COLUNAS }, (_, c) => `coluna_${c + 1}`).join(',')
const partes = [cabecalho]

for (let l = 0; l < LINHAS; l++) {
  const linha = []
  for (let c = 0; c < COLUNAS; c++) {
    linha.push(c === 0 ? l : Math.round(Math.random() * 100000) / 100)
  }
  partes.push(linha.join(','))
}

writeFileSync('teste-50k-linhas.csv', partes.join('\n'))
console.log(`Gerado teste-50k-linhas.csv com ${LINHAS} linhas x ${COLUNAS} colunas`)
