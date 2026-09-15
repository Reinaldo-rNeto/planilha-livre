// Substitui `franc-min` (biblioteca de detecção de idioma por trigramas, ~600KB+
// com os dicionários de todos os idiomas suportados) por um "não sei" fixo.
//
// Por que dá pra fazer isso sem quebrar nada: o Univer só usa `franc()` pra escolher
// qual dicionário de hifenização carregar quando o parágrafo tem hifenização automática
// ligada (`autoHyphenation`). Isso é um recurso de texto rico pra justificar parágrafo —
// não afeta como uma célula de planilha quebra linha ou é editada, e o app não expõe
// nenhum jeito de ativar hifenização automática. Sem isso, o valor de `franc()` só
// alimenta esse recurso desligado; "und" (idioma indeterminado, código ISO 639-3) faz
// o Univer cair no mesmo caminho de "não hifenizar" que já seguia por padrão.
//
// Ver node_modules/@univerjs/engine-render/lib/es/index.js, LanguageDetector.detect().
export function franc(_texto: string): string {
  return 'und'
}
