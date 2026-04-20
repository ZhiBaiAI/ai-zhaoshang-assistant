import { loadWorkerConfig } from './config';
import { runWorkerLoop } from './worker';

async function main(): Promise<void> {
  const config = loadWorkerConfig();
  console.log(`worker-service started for project ${config.projectId}`);
  console.log(`api-service: ${config.apiBaseUrl}`);
  await runWorkerLoop(config);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
