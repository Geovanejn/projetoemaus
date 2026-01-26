import { Pool } from "@neondatabase/serverless";

async function resetDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log("Connecting to database...");
  
  try {
    // Drop all tables in the correct order (respecting foreign keys)
    const dropTablesSQL = `
      DROP TABLE IF EXISTS study_lesson_progress CASCADE;
      DROP TABLE IF EXISTS study_quiz_responses CASCADE;
      DROP TABLE IF EXISTS study_quiz_questions CASCADE;
      DROP TABLE IF EXISTS study_lessons CASCADE;
      DROP TABLE IF EXISTS study_weeks CASCADE;
      DROP TABLE IF EXISTS study_profiles CASCADE;
      DROP TABLE IF EXISTS site_content CASCADE;
      DROP TABLE IF EXISTS board_members CASCADE;
      DROP TABLE IF EXISTS banners CASCADE;
      DROP TABLE IF EXISTS prayer_requests CASCADE;
      DROP TABLE IF EXISTS instagram_posts CASCADE;
      DROP TABLE IF EXISTS site_events CASCADE;
      DROP TABLE IF EXISTS devotionals CASCADE;
      DROP TABLE IF EXISTS pdf_verifications CASCADE;
      DROP TABLE IF EXISTS verification_codes CASCADE;
      DROP TABLE IF EXISTS votes CASCADE;
      DROP TABLE IF EXISTS candidates CASCADE;
      DROP TABLE IF EXISTS election_attendance CASCADE;
      DROP TABLE IF EXISTS election_positions CASCADE;
      DROP TABLE IF EXISTS election_winners CASCADE;
      DROP TABLE IF EXISTS elections CASCADE;
      DROP TABLE IF EXISTS positions CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `;
    
    console.log("Dropping all tables...");
    await pool.query(dropTablesSQL);
    console.log("All tables dropped successfully!");
    
    await pool.end();
    console.log("Database reset complete. Now run: npm run db:push");
    
  } catch (error) {
    console.error("Error resetting database:", error);
    throw error;
  }
}

resetDatabase();
