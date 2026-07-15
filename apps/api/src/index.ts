import Fastify from 'fastify';
import cors from '@fastify/cors';
import { aiRoutes } from './routes/ai.routes.js';
import { nearbyRoutes } from './routes/nearby.routes.js';

const app = Fastify({ logger: true });

app.register(cors, {
  origin: true,
  methods: ['GET', 'POST'],
});

app.get('/v1/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

app.register(aiRoutes, { prefix: '/v1' });
app.register(nearbyRoutes, { prefix: '/v1' });

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`API ready at http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
