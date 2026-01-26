import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool } from "@neondatabase/serverless";

async function main() {
  console.log("=== Inicialização do Banco de Dados de Produção ===\n");

  console.log("1. Criando usuário administrador...");
  
  // Email pode vir de env ou usar padrão
  const adminEmail = process.env.ADMIN_EMAIL || "marketingumpemaus@gmail.com";
  const adminName = "UMP Emaús";
  
  // SENHA OBRIGATÓRIA via variável de ambiente - nunca usar valor padrão!
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error("   ✗ ERRO: ADMIN_PASSWORD deve estar definido nas variáveis de ambiente!");
    console.log("   Defina o secret ADMIN_PASSWORD antes de executar este script.");
    console.log("   Use uma senha forte e única para o administrador.");
    process.exit(1);
  }
  
  try {
    const [existingAdmin] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.email, adminEmail))
      .limit(1);
    
    if (existingAdmin) {
      console.log(`   - Administrador já existe: ${adminEmail}`);
      
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await db.update(schema.users)
        .set({ 
          password: hashedPassword, 
          hasPassword: true,
          isAdmin: true 
        })
        .where(eq(schema.users.email, adminEmail));
      console.log(`   ✓ Senha do administrador atualizada`);
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await db.insert(schema.users).values({
        fullName: adminName,
        email: adminEmail,
        password: hashedPassword,
        isAdmin: true,
        isMember: true,
        hasPassword: true,
      });
      console.log(`   ✓ Administrador criado: ${adminName} (${adminEmail})`);
    }
  } catch (error) {
    console.error("   ✗ Erro ao criar administrador:", error);
    throw error;
  }

  console.log("\n2. Verificando cargos (positions)...");
  
  const defaultPositions = [
    { name: "Presidente", description: "Presidente da UMP" },
    { name: "Vice-Presidente", description: "Vice-Presidente da UMP" },
    { name: "1º Secretário", description: "Primeiro Secretário" },
    { name: "2º Secretário", description: "Segundo Secretário" },
    { name: "Tesoureiro", description: "Tesoureiro da UMP" },
  ];

  for (const pos of defaultPositions) {
    try {
      const [existing] = await db.select()
        .from(schema.positions)
        .where(eq(schema.positions.name, pos.name))
        .limit(1);
      
      if (!existing) {
        await db.insert(schema.positions).values(pos);
        console.log(`   ✓ Cargo criado: ${pos.name}`);
      } else {
        console.log(`   - Cargo já existe: ${pos.name}`);
      }
    } catch (error) {
      console.log(`   - Erro ao criar cargo ${pos.name}:`, error);
    }
  }

  console.log("\n=== Inicialização concluída! ===");
  console.log(`\nAdministrador configurado:`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   (A senha foi definida via variável de ambiente ADMIN_PASSWORD)`);
  console.log(`\nAgora você pode fazer login no sistema.`);
  
  process.exit(0);
}

main().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
