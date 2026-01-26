import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq, or, like, inArray } from "drizzle-orm";

async function main() {
  console.log("🧹 Limpando dados de teste...\n");

  const testElectionNames = ["Eleição 2024/2025", "Eleição 2025/2026"];
  const testEmailDomains = ["%@example.com", "%@teste.com"];

  const elections = await db.select().from(schema.elections)
    .where(or(
      eq(schema.elections.name, testElectionNames[0]),
      eq(schema.elections.name, testElectionNames[1])
    ));

  if (elections.length > 0) {
    console.log(`📋 Encontradas ${elections.length} eleições de teste:`);
    elections.forEach(e => console.log(`   - ${e.name} (ID: ${e.id})`));

    for (const election of elections) {
      console.log(`\n🗑️  Removendo eleição "${election.name}"...`);
      
      await db.delete(schema.votes).where(eq(schema.votes.electionId, election.id));
      console.log("   ✓ Votos removidos");
      
      await db.delete(schema.electionWinners).where(eq(schema.electionWinners.electionId, election.id));
      console.log("   ✓ Vencedores removidos");
      
      await db.delete(schema.candidates).where(eq(schema.candidates.electionId, election.id));
      console.log("   ✓ Candidatos removidos");
      
      await db.delete(schema.electionPositions).where(eq(schema.electionPositions.electionId, election.id));
      console.log("   ✓ Cargos da eleição removidos");
      
      await db.delete(schema.electionAttendance).where(eq(schema.electionAttendance.electionId, election.id));
      console.log("   ✓ Presenças removidas");
      
      await db.delete(schema.elections).where(eq(schema.elections.id, election.id));
      console.log("   ✓ Eleição removida");
    }
  } else {
    console.log("✅ Nenhuma eleição de teste encontrada");
  }

  const testUsers = await db.select().from(schema.users)
    .where(or(
      like(schema.users.email, testEmailDomains[0]),
      like(schema.users.email, testEmailDomains[1])
    ));

  if (testUsers.length > 0) {
    console.log(`\n👤 Encontrados ${testUsers.length} usuários de teste:`);
    testUsers.forEach(u => console.log(`   - ${u.fullName} (${u.email})`));
    
    const userEmails = testUsers.map(u => u.email);
    const userIds = testUsers.map(u => u.id);
    
    await db.delete(schema.verificationCodes)
      .where(inArray(schema.verificationCodes.email, userEmails));
    console.log("   ✓ Códigos de verificação removidos");
    
    await db.delete(schema.users)
      .where(inArray(schema.users.id, userIds));
    console.log("   ✓ Usuários de teste removidos");
  } else {
    console.log("\n✅ Nenhum usuário de teste encontrado");
  }

  console.log("\n✅ Limpeza concluída com sucesso!");
  
  const [remainingElections] = await db.select({ count: db.$count(schema.elections) }).from(schema.elections);
  const [remainingUsers] = await db.select({ count: db.$count(schema.users) })
    .from(schema.users)
    .where(eq(schema.users.isMember, true));
  
  console.log("\n📊 Estado atual do banco de dados:");
  console.log(`   - ${remainingElections?.count || 0} eleições`);
  console.log(`   - ${remainingUsers?.count || 0} membros`);

  process.exit(0);
}

main().catch((e) => {
  console.error("\n❌ Erro durante a limpeza:", e);
  process.exit(1);
});
