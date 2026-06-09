import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        root: '.',
        server: {
            port: 3000,
            host: '0.0.0.0',
            allowedHosts: true,
            proxy: {
                '/api': {
                    target: env.VITE_API_URL || 'http://localhost:8000',
                    changeOrigin: true,
                },
                '/uploads': {
                    target: env.VITE_API_URL || 'http://localhost:8000',
                    changeOrigin: true,
                },
            },
        },
        plugins: [react()],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            }
        },
        build: {
            outDir: './dist',
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'src/index.html'),
                },
            },
        },
    };
});
