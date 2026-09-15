import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PlanilhaLivre',
        short_name: 'PlanilhaLivre',
        description: 'Abra e edite planilhas xlsx e csv direto no navegador, sem conta e sem internet.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2f6feb',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // arquivo principal é grande (bundle do Univer) — evita estourar o limite padrão de cache
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // o Univer carrega ~77 chunks de padrões de hifenização (um por idioma, usados só
        // pra justificar parágrafo em texto rico) via import dinâmico, sob demanda — não
        // fazem parte do carregamento inicial e quase nenhum usuário de planilha vai
        // precisar deles. Sem esse filtro o precache (o que o app baixa de uma vez pra
        // funcionar offline) ficava com ~11MB; só a lista abaixo já cobre tudo que o app
        // usa pra abrir/editar/salvar planilha offline, caindo pra ~6,3MB.
        globPatterns: [
          'index.html',
          'manifest.webmanifest',
          'assets/index-*.{js,css}',
          'icons/**/*.png',
        ],
      },
    }),
  ],
})
