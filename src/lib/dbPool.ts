import { Pool } from "pg";

const globalForPg = global as typeof global & { __pgPool?: Pool };

export function getPool(): Pool {
  if (!globalForPg.__pgPool) {
    globalForPg.__pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // The host-name test below treats anything that is not localhost as a
      // managed cloud database requiring TLS — true on Railway, wrong on the
      // HR platform, where Postgres is a container named "postgres" on a
      // private Docker network with TLS switched off. node-postgres does not
      // negotiate: it asks for a secure connection, the server says it cannot,
      // and every query fails. PGSSL=disable opts out.
      ssl:
        process.env.PGSSL === "disable"
          ? false
          : process.env.DATABASE_URL &&
              !process.env.DATABASE_URL.includes("localhost") &&
              !process.env.DATABASE_URL.includes("127.0.0.1")
            ? { rejectUnauthorized: false }
            : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return globalForPg.__pgPool;
}
