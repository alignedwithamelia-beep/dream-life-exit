import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Runs netlify/functions/*.mts inside the Vite dev server, so invites work with
 * `npm run dev` as well as `netlify dev`. Production still uses Netlify Functions.
 */
function netlifyFunctionsInDev(): Plugin {
  return {
    name: 'netlify-functions-in-dev',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions', async (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\/+/, '');
        const file = path.resolve('netlify/functions', `${name}.mts`);
        if (!/^[a-z-]+$/.test(name) || !fs.existsSync(file)) return next();
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
          const request = new Request(`http://${req.headers.host}/.netlify/functions/${name}`, {
            method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined,
          });
          const mod = await server.ssrLoadModule(file);
          const response: Response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          server.config.logger.error(`[functions/${name}] ${(e as Error).stack ?? e}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `The ${name} service crashed: ${(e as Error).message}` }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Server-only variables (SUPABASE_SECRET_KEY, RESEND_API_KEY…) for the dev functions.
  // They are never exposed to the browser: only VITE_* variables are.
  for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ''))) process.env[k] ??= v;
  return { plugins: [react(), tailwindcss(), netlifyFunctionsInDev()] };
});
