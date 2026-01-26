import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  console.log("Criando nova eleição de teste...");

  const [newElection] = await db.insert(schema.elections)
    .values({
      name: "Eleição 2025/2026",
      isActive: false,
      closedAt: new Date(),
    })
    .returning();

  const electionId = newElection.id;
  console.log(`✅ Eleição criada: ID ${electionId}`);

  const positions = await db.select().from(schema.positions);
  console.log(`✅ ${positions.length} cargos encontrados`);

  const members = await db.select().from(schema.users)
    .where(and(eq(schema.users.isMember, true), eq(schema.users.isAdmin, false)));
  console.log(`✅ ${members.length} membros encontrados`);

  if (members.length < 2) {
    console.error("❌ Não há membros suficientes. Execute scripts/seed-test-data.ts primeiro");
    process.exit(1);
  }

  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    await db.insert(schema.electionPositions).values({
      electionId,
      positionId: position.id,
      orderIndex: i,
      status: "completed",
      currentScrutiny: 1,
    });
  }

  console.log("✅ Cargos adicionados à eleição");

  for (const position of positions) {
    const numCandidates = 2 + Math.floor(Math.random() * 2);
    const shuffledMembers = [...members].sort(() => Math.random() - 0.5);
    const selectedMembers = shuffledMembers.slice(0, numCandidates);

    for (const member of selectedMembers) {
      await db.insert(schema.candidates).values({
        electionId,
        positionId: position.id,
        userId: member.id,
        name: member.fullName,
        email: member.email,
      });
    }

    const winner = selectedMembers[0];
    const [candidate] = await db.select().from(schema.candidates)
      .where(and(
        eq(schema.candidates.electionId, electionId),
        eq(schema.candidates.positionId, position.id),
        eq(schema.candidates.userId, winner.id)
      ))
      .limit(1);

    if (candidate) {
      const voteCount = 5 + Math.floor(Math.random() * 5);
      for (let i = 0; i < voteCount; i++) {
        const voter = members[i % members.length];
        try {
          await db.insert(schema.votes).values({
            electionId,
            positionId: position.id,
            candidateId: candidate.id,
            voterId: voter.id,
            scrutinyRound: 1,
          });
        } catch (e) {}
      }

      await db.insert(schema.electionWinners).values({
        electionId,
        positionId: position.id,
        candidateId: candidate.id,
        wonAtScrutiny: 1,
      });

      console.log(`✅ ${position.name}: ${winner.fullName} (${voteCount} votos)`);
    }
  }

  console.log("\n🎉 Eleição de teste criada com sucesso!");
  console.log(`📊 Nome: Eleição 2025/2026`);
  console.log(`✅ Status: Finalizada`);
  console.log(`👥 ${positions.length} cargos com vencedores definidos`);
  console.log("\nAcesse o histórico no painel admin para ver os resultados!");

  process.exit(0);
}

main().catch((e) => {
  console.error("Erro:", e);
  process.exit(1);
});
