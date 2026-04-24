import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
