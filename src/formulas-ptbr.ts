// O Univer só reconhece nomes de função em inglês (SUM, AVERAGE, IF, VLOOKUP) quando
// você digita a fórmula direto no app — dá #NAME? se tentar SOMA, MÉDIA, SE ou PROCV.
// Isso é só na digitação: um arquivo .xlsx real (mesmo feito no Excel em português) já
// guarda a fórmula em inglês por dentro, então abrir arquivo existente funciona bem.
//
// A edição de célula passa pelos comandos internos do editor de texto rico do Univer
// (doc.mutation.rich-text-editing), não por um comando único com a fórmula em texto
// plano — não tem um jeito seguro de "traduzir" o texto antes do Univer processar sem
// arriscar quebrar a digitação normal.
//
// Em vez de interceptar a digitação, registramos SOMA/MÉDIA/SE/PROCV como funções
// próprias (a mesma API pública que o Univer oferece pra função customizada/UDF) que
// fazem a própria conta. O Univer entrega os argumentos já calculados (número, texto,
// booleano ou matriz pra intervalo) e espera de volta um valor simples ou uma matriz —
// ver @univerjs/sheets-formula/facade.js (FFormula.registerFunction) e os tipos em
// @univerjs/engine-formula (FormulaFunctionValueType / FormulaFunctionResultValueType).
//
// Limitação: PROCV aqui só cobre os dois casos comuns — correspondência exata e
// aproximada assumindo a primeira coluna já ordenada crescente (não implementa toda a
// semântica de erro/borda do VLOOKUP oficial).
import type { FUniver } from '@univerjs/presets'
import type { FormulaFunctionResultValueType, FormulaFunctionValueType, PrimitiveValueType } from '@univerjs/engine-formula'

function achatar(valor: FormulaFunctionValueType): PrimitiveValueType[] {
  if (Array.isArray(valor)) return valor.flat() as PrimitiveValueType[]
  if (valor !== null && typeof valor === 'object') return [] // BaseValueObject não deveria chegar aqui, mas não quebra se chegar
  return [valor]
}

function paraNumero(valor: PrimitiveValueType): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  if (typeof valor === 'string') {
    const normalizado = valor.trim().replace(',', '.')
    if (normalizado === '') return null
    const numero = Number(normalizado)
    return Number.isFinite(numero) ? numero : null
  }
  return null
}

function soma(...args: FormulaFunctionValueType[]): FormulaFunctionResultValueType {
  return args.flatMap(achatar).reduce((total: number, valor) => {
    const numero = paraNumero(valor)
    return numero === null ? total : total + numero
  }, 0)
}

function media(...args: FormulaFunctionValueType[]): FormulaFunctionResultValueType {
  const numeros = args
    .flatMap(achatar)
    .map(paraNumero)
    .filter((n): n is number => n !== null)
  if (numeros.length === 0) return '#DIV/0!'
  return numeros.reduce((total, n) => total + n, 0) / numeros.length
}

function se(
  condicao: FormulaFunctionValueType,
  valorSeVerdadeiro: FormulaFunctionValueType,
  valorSeFalso: FormulaFunctionValueType,
): FormulaFunctionResultValueType {
  const resultado = (condicao ? valorSeVerdadeiro : valorSeFalso) as FormulaFunctionResultValueType
  return resultado ?? null
}

function procv(
  valorProcurado: FormulaFunctionValueType,
  matriz: FormulaFunctionValueType,
  indiceColuna: FormulaFunctionValueType,
  procurarIntervalo: FormulaFunctionValueType = true,
): FormulaFunctionResultValueType {
  if (valorProcurado === null || typeof valorProcurado === 'object') return '#VALOR!'

  const linhas: PrimitiveValueType[][] = Array.isArray(matriz)
    ? matriz.map((linha) => (Array.isArray(linha) ? linha : [linha]))
    : []
  const coluna = Math.trunc(Number(indiceColuna)) - 1
  if (coluna < 0) return '#VALOR!'

  const aproximado = procurarIntervalo !== false && procurarIntervalo !== 0

  if (!aproximado) {
    const encontrada = linhas.find((linha) => linha[0] === valorProcurado)
    return encontrada ? (encontrada[coluna] ?? '#REF!') : '#N/A'
  }

  // correspondência aproximada: assume a 1ª coluna ordenada crescente, pega a última
  // linha cuja chave é <= valor procurado (mesmo comportamento do VLOOKUP com o
  // 4º argumento omitido/VERDADEIRO)
  let melhor: PrimitiveValueType[] | null = null
  for (const linha of linhas) {
    const chave = linha[0]
    if (chave === null || chave === undefined || typeof chave !== typeof valorProcurado) continue
    if (chave <= valorProcurado) melhor = linha
    else break
  }
  return melhor ? (melhor[coluna] ?? '#REF!') : '#N/A'
}

/** Registra SOMA, MÉDIA, SE e PROCV como funções que o app entende ao digitar direto. */
export function registrarFormulasPtBr(univerAPI: FUniver) {
  const formula = univerAPI.getFormula()
  formula.registerFunction('SOMA', soma, 'Soma os valores de um intervalo — equivalente a SUM.')
  formula.registerFunction('MÉDIA', media, 'Média dos valores de um intervalo — equivalente a AVERAGE.')
  formula.registerFunction('SE', se, 'Testa uma condição e devolve um valor pra verdadeiro, outro pra falso — equivalente a IF.')
  formula.registerFunction(
    'PROCV',
    procv,
    'Procura um valor na primeira coluna de um intervalo e devolve o valor de outra coluna na mesma linha — equivalente a VLOOKUP.',
  )
}
