import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl =
    env.VITE_API_URL ||
    process.env.VITE_API_URL ||
    'https://intervix-ai-1.onrender.com';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.warn(`[Vite Proxy Warning]: Backend server at ${backendUrl} is currently unreachable.`);
              if (res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    success: false,
                    message: `INTERVIX AI backend is currently waking up or unreachable at ${backendUrl}. Please retry in a few moments.`,
                  })
                );
              }
            });
          },
        },
      },
    },
  };
});
