import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { loadConfig } from './config';

async function main(): Promise<void> {
  const config = loadConfig();
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  const sqlPaths = [
    path.resolve(__dirname, '../../../packages/rag/sql/001_knowledge_schema.sql'),
    path.resolve(__dirname, '../sql/002_conversations_leads.sql'),
  ];
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    for (const sqlPath of sqlPaths) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
    }
    console.log('api-service migrations completed');
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
