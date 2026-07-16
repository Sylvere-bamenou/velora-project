import { createApp } from './app.js';
import { env } from './lib/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`velora-api · http://localhost:${env.PORT} · ${env.NODE_ENV}`);
  if (env.FRAUD_ENFORCEMENT === 'shadow') {
    console.log('anti-fraude · shadow mode — scoring journalisé, aucun blocage');
  }
});

// Railway envoie SIGTERM au redéploiement : on laisse les requêtes en cours
// se terminer plutôt que de couper au milieu d'une soumission de commande.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
