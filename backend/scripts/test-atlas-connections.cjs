/* eslint-disable no-console */
const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection(label, uri) {
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    console.log(`${label}: SKIP (not set)`);
    return false;
  }
  if (uri.includes('<') || uri.includes('>')) {
    console.log(`${label}: SKIP (remove < > placeholders from username/password in .env)`);
    return false;
  }
  if (uri.startsWith('mongodb://127.0.0.1')) {
    console.log(`${label}: SKIP (local URI)`);
    return false;
  }

  let conn;
  try {
    conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 15000 }).asPromise();
    await conn.db.admin().command({ ping: 1 });
    const name = conn.db?.databaseName ?? '(unknown)';
    console.log(`${label}: OK (database: ${name})`);
    await conn.close();
    return true;
  } catch (err) {
    console.log(`${label}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
    if (conn) {
      try {
        await conn.close();
      } catch {
        // ignore
      }
    }
    return false;
  }
}

async function main() {
  const sealed = process.env.MONGODB_URI;
  const ok = await testConnection('Sealed (MONGODB_URI)', sealed);
  if (!ok) process.exitCode = 1;
}

main();
