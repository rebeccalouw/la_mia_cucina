import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and add your Supabase connection string.');
}

// Supabase requires TLS, from any environment. Decide from the host rather than NODE_ENV, so
// local development against Supabase works the same as production; a Postgres running on
// localhost is the only case that skips it. Set DATABASE_SSL=false to override.
const isLocalDatabase = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
const useSsl = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL !== 'false'
  : !isLocalDatabase;

const pool = new pg.Pool({
  connectionString,
  // Supabase serves a certificate that is not in Node's default trust store.
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

// Helper for logging queries (optional)
const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('query error', { text, err });
    throw err;
  }
};

export default {
  query,
  pool,
  // Helper to mimic better-sqlite3 get()
  async get(text: string, params?: any[]) {
    const res = await query(text, params);
    return res.rows[0];
  },
  // Helper to mimic better-sqlite3 all()
  async all(text: string, params?: any[]) {
    const res = await query(text, params);
    return res.rows;
  },
  // Helper to mimic better-sqlite3 run()
  // Note: Postgres uses RETURNING for IDs
  async run(text: string, params?: any[]) {
    const res = await query(text, params);
    return {
      rowCount: res.rowCount,
      rows: res.rows
    };
  },
  // Transaction helper
  async transaction(callback: (client: pg.PoolClient) => Promise<any>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};
