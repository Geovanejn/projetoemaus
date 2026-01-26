import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";

// Lazy initialization - pool and db are created on first access after validation
let pool: Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

// Getter for db - throws if not initialized
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_, prop) {
    if (!_db) {
      throw new Error("Database not initialized. Call initializeDatabase() first.");
    }
    return (_db as any)[prop];
  }
});

function validateAndCreatePool(): Pool {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error("================================================================================");
    console.error("[FATAL] DATABASE_URL environment variable is not set!");
    console.error("[FATAL] Please configure DATABASE_URL in your environment variables.");
    console.error("[FATAL] For Render: Go to Dashboard > Environment > Add DATABASE_URL");
    console.error("[FATAL] Format: postgresql://user:password@host:port/database");
    console.error("================================================================================");
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }

  if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
    console.error("================================================================================");
    console.error("[FATAL] DATABASE_URL has invalid format!");
    console.error("[FATAL] Current value starts with:", dbUrl.substring(0, Math.min(20, dbUrl.length)));
    console.error("[FATAL] Expected format: postgresql://user:password@host:port/database");
    console.error("================================================================================");
    throw new Error("DATABASE_URL has invalid format - must start with postgres:// or postgresql://");
  }

  return new Pool({ 
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
}

async function createDefaultPositions() {
  const positions = [
    { name: "Presidente" },
    { name: "Vice-Presidente" },
    { name: "1º Secretário" },
    { name: "2º Secretário" },
    { name: "Tesoureiro" },
  ];

  for (const pos of positions) {
    try {
      const [existing] = await db.select()
        .from(schema.positions)
        .where(eq(schema.positions.name, pos.name))
        .limit(1);

      if (!existing) {
        await db.insert(schema.positions).values(pos);
        console.log(`Position created: ${pos.name}`);
      }
    } catch (error: any) {
      console.error(`Error creating position ${pos.name}:`, error);
    }
  }
}

async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminEmail || !adminPassword) {
    console.log("ADMIN_EMAIL ou ADMIN_PASSWORD nao definidos. Pulando configuracao do admin.");
    return;
  }
  
  try {
    const [existingUser] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.email, adminEmail.toLowerCase().trim()))
      .limit(1);
    
    if (existingUser) {
      if (existingUser.isAdmin) {
        console.log(`Admin ${adminEmail} ja existe e esta configurado.`);
        return;
      }
      await db.update(schema.users)
        .set({ isAdmin: true })
        .where(eq(schema.users.id, existingUser.id));
      console.log(`Usuario ${adminEmail} promovido a admin (senha mantida).`);
      return;
    }
    
    const hashedPassword = await hashPassword(adminPassword);
    await db.insert(schema.users).values({
      fullName: "Administrador",
      email: adminEmail.toLowerCase().trim(),
      password: hashedPassword,
      hasPassword: true,
      isAdmin: true,
      isMember: true,
      activeMember: true,
      secretaria: null,
    });
    
    console.log(`Admin criado com sucesso: ${adminEmail}`);
  } catch (error: any) {
    console.error("Erro ao configurar admin:", error.message);
  }
}

export async function initializeDatabase(): Promise<void> {
  console.log("Initializing PostgreSQL database connection...");
  
  // Validate and create pool on first call
  if (!pool) {
    pool = validateAndCreatePool();
    _db = drizzle(pool, { schema });
  }
  
  try {
    const result = await pool.query('SELECT NOW()');
    console.log("PostgreSQL connection successful:", result.rows[0].now);
    
    // Tables are created via Drizzle migration (migrations/0000_seasons_schema.sql)
    // No need to create tables here - Drizzle handles schema sync
    
    await createDefaultPositions();
    await seedAdminUser();
    
    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("[DB] Database initialization error:", error);
    throw error;
  }
}
