import { createServer } from 'http';
import { createApp } from './app';
import { loadConfig } from './config';
import { getRequestPath, HttpError, readJsonBody, sendJson } from './http';

const config = loadConfig();
const port = config.port;
const handle = createApp(undefined, { apiToken: config.apiToken });

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type, authorization',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
      });
      res.end();
      return;
    }

    const body = req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : await readJsonBody(req);
    const response = await handle({
      method: req.method || 'GET',
      path: getRequestPath(req),
      body,
      headers: req.headers,
    });
    sendJson(res, response);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    sendJson(res, {
      status,
      body: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

server.listen(port, () => {
  console.log(`api-service listening on http://127.0.0.1:${port}`);
});
