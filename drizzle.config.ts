import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    // O Render exige SSL. rejectUnauthorized: false permite a conexão
    // mesmo com certificados auto-assinados comuns em nuvem.
    ssl: {
      rejectUnauthorized: false,
    },
  },
});
