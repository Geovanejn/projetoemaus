import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  console.log("Criando 10 membros de teste...");
  
  const testMembers = [
    { fullName: 'Ana Paula Santos', email: 'ana.santos@example.com' },
    { fullName: 'Bruno Costa Silva', email: 'bruno.silva@example.com' },
    { fullName: 'Carla Mendes Oliveira', email: 'carla.oliveira@example.com' },
    { fullName: 'Daniel Ferreira Lima', email: 'daniel.lima@example.com' },
    { fullName: 'Elena Rodrigues Souza', email: 'elena.souza@example.com' },
    { fullName: 'Felipe Alves Pereira', email: 'felipe.pereira@example.com' },
    { fullName: 'Gabriela Martins Costa', email: 'gabriela.costa@example.com' },
    { fullName: 'Henrique Santos Rocha', email: 'henrique.rocha@example.com' },
    { fullName: 'Isabela Fernandes Dias', email: 'isabela.dias@example.com' },
    { fullName: 'João Pedro Carvalho', email: 'joao.carvalho@example.com' }
  ];

  for (const member of testMembers) {
    try {
      const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, member.email)).limit(1);
      if (!existing) {
        await db.insert(schema.users).values({
          fullName: member.fullName,
          email: member.email,
          password: '',
          isAdmin: false,
          isMember: true,
          hasPassword: false,
        });
        console.log(`✓ Criado: ${member.fullName}`);
      } else {
        console.log(`- Já existe: ${member.fullName}`);
      }
    } catch (e) {
      console.log(`- Erro ao criar: ${member.fullName}`, e);
    }
  }

  const members = await db.select().from(schema.users).where(eq(schema.users.isMember, true));
  console.log(`\nTotal de membros: ${members.length}`);

  console.log("\nCriando eleição 2024/2025...");
  let electionId: number;
  
  const [existingElection] = await db.select().from(schema.elections).where(eq(schema.elections.name, 'Eleição 2024/2025')).limit(1);
  
  if (!existingElection) {
    const [newElection] = await db.insert(schema.elections)
      .values({ name: 'Eleição 2024/2025' })
      .returning();
    electionId = newElection.id;
    console.log(`✓ Eleição criada com ID: ${electionId}`);
  } else {
    electionId = existingElection.id;
    console.log(`- Eleição já existe com ID: ${electionId}`);
  }

  const positions = await db.select().from(schema.positions);
  console.log(`\nCriando election_positions para ${positions.length} cargos...`);

  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    try {
      const [existing] = await db.select().from(schema.electionPositions)
        .where(and(
          eq(schema.electionPositions.electionId, electionId),
          eq(schema.electionPositions.positionId, position.id)
        ))
        .limit(1);
      
      if (!existing) {
        await db.insert(schema.electionPositions).values({
          electionId,
          positionId: position.id,
          status: 'completed',
          currentScrutiny: 1,
          orderIndex: i,
        });
        console.log(`✓ Cargo ${position.name} adicionado`);
      } else {
        console.log(`- Cargo ${position.name} já existe`);
      }
    } catch (e) {
      console.log(`- Erro ao adicionar cargo ${position.name}`, e);
    }
  }

  console.log("\nCriando candidatos e votos...");
  
  for (let posIdx = 0; posIdx < positions.length && posIdx < 5; posIdx++) {
    const position = positions[posIdx];
    console.log(`\n${position.name}:`);
    
    const candidatesForPosition = members.slice(posIdx * 2, posIdx * 2 + 3);
    const candidateIds: number[] = [];
    
    for (const member of candidatesForPosition) {
      try {
        const [existing] = await db.select().from(schema.candidates)
          .where(and(
            eq(schema.candidates.userId, member.id),
            eq(schema.candidates.electionId, electionId),
            eq(schema.candidates.positionId, position.id)
          ))
          .limit(1);
        
        if (!existing) {
          const [newCandidate] = await db.insert(schema.candidates).values({
            userId: member.id,
            electionId,
            positionId: position.id,
            name: member.fullName,
            email: member.email,
          }).returning();
          candidateIds.push(newCandidate.id);
          console.log(`  ✓ Candidato: ${member.fullName}`);
        } else {
          candidateIds.push(existing.id);
          console.log(`  - Candidato já existe: ${member.fullName}`);
        }
      } catch (e) {
        console.log(`  - Erro ao criar candidato: ${member.fullName}`, e);
      }
    }
    
    if (candidateIds.length > 0) {
      const winnerId = candidateIds[0];
      let voterIdx = 0;
      
      const winnerVotes = Math.ceil(members.length * 0.6);
      for (let i = 0; i < winnerVotes && voterIdx < members.length; i++) {
        try {
          await db.insert(schema.votes).values({
            voterId: members[voterIdx].id,
            candidateId: winnerId,
            positionId: position.id,
            electionId,
            scrutinyRound: 1,
          });
          voterIdx++;
        } catch (e) {}
      }
      
      for (let cidx = 1; cidx < candidateIds.length; cidx++) {
        const votesForThis = Math.floor(members.length * 0.15);
        for (let i = 0; i < votesForThis && voterIdx < members.length; i++) {
          try {
            await db.insert(schema.votes).values({
              voterId: members[voterIdx].id,
              candidateId: candidateIds[cidx],
              positionId: position.id,
              electionId,
              scrutinyRound: 1,
            });
            voterIdx++;
          } catch (e) {}
        }
      }
      
      try {
        await db.insert(schema.electionWinners).values({
          electionId,
          positionId: position.id,
          candidateId: winnerId,
          wonAtScrutiny: 1,
        });
        const winner = candidatesForPosition[0];
        console.log(`  🏆 Vencedor: ${winner.fullName}`);
      } catch (e) {}
    }
  }

  console.log("\nFinalizando eleição...");
  await db.update(schema.elections)
    .set({ isActive: false, closedAt: new Date() })
    .where(eq(schema.elections.id, electionId));

  console.log("✅ Dados de teste criados com sucesso!");
  console.log("\nResumo:");
  console.log(`- ${members.length} membros cadastrados`);
  console.log(`- 1 eleição completa (2024/2025) com todos os cargos decididos`);
  console.log(`- Eleição finalizada e disponível no histórico`);

  process.exit(0);
}

main().catch((e) => {
  console.error("Erro:", e);
  process.exit(1);
});
