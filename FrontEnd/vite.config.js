import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Importe o NodeGlobalsPolyfillPlugin
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
// Importe o polyfill do 'buffer' para o ambiente do navegador
import { Buffer } from 'buffer' // Importar explicitamente, embora o plugin geralmente cuide disso

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  base: '/galeriloop/',

  // Configurações para o optimizeDeps do Vite (usado durante o desenvolvimento)
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global para globalThis do navegador
      define: {
        global: 'globalThis',
        // Define 'Buffer' para usar o polyfill que importamos
        Buffer: 'Buffer',
      },
      // Habilita plugins de polyfill do esbuild
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true, // Habilita o polyfill para Buffer
          process: true, // Opcional: se você também tiver problemas com 'process'
        }),
      ],
    },
  },

  // Configurações para o build final (produção)
  build: {
    rollupOptions: {
      // Garante que 'Buffer' seja tratado corretamente no build final
      // Adicione aqui outros plugins de Rollup se já os tiver
      // Por exemplo, se você precisar de polyfills mais abrangentes para Node.js,
      // você pode precisar de 'rollup-plugin-node-polyfills' aqui, mas
      // para 'Buffer' especificamente, a configuração acima geralmente resolve.
      // Se o erro persistir no build, você pode precisar adicionar um plugin aqui:
      // plugins: [
      //   // require('rollup-plugin-node-polyfills')() // Se for necessário um polyfill mais abrangente
      // ]
    },
  },
})