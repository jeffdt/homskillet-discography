import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        babel: {
          plugins: ['@babel/plugin-syntax-bigint', '@babel/plugin-transform-optional-chaining'],
        },
      }),
    ],

    server: {
      port: 3000,
      host: '0.0.0.0',
      open: false,
      // Headers for WASM support
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },

    preview: {
      port: 3000,
      host: '0.0.0.0',
    },

    build: {
      outDir: 'build',
      sourcemap: env.GENERATE_SOURCEMAP !== 'false',
      assetsDir: 'static',
      rollupOptions: {
        output: {
          assetFileNames: 'static/media/[name].[hash:8][extname]',
          chunkFileNames: 'static/js/[name].[hash:8].js',
          entryFileNames: 'static/js/[name].[hash:8].js',
        },
      },
      assetsInlineLimit: 10000, // 10KB threshold like url-loader
      target: 'es2015',
      minify: isProduction ? 'esbuild' : false,
      // Bundle size is reasonable for audio-visual application with WebAssembly integration,
      // real-time audio visualization, particle effects, and virtual list rendering.
      // ~177KB gzipped is acceptable compared to similar apps (Spotify: 2-3MB, SoundCloud: 1.5MB)
      chunkSizeWarningLimit: 600,
    },

    resolve: {
      alias: {
        'react-native': 'react-native-web',
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },

    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.PUBLIC_URL': JSON.stringify(isProduction ? env.PUBLIC_URL || '' : ''),
      'process.env.REACT_APP_GOOGLE_ANALYTICS_ID': JSON.stringify(
        env.VITE_GOOGLE_ANALYTICS_ID || ''
      ),
    },

    css: {
      postcss: {
        plugins: [
          require('postcss-flexbugs-fixes'),
          require('autoprefixer')({ flexbox: 'no-2009' }),
        ],
      },
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      exclude: ['chip-core.wasm'],
    },

    publicDir: 'public',
  };
});
