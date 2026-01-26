import { Pool } from "pg";

export async function createAllTables(pool: Pool) {
  console.log("Creating database tables...");
  
  const createTablesSQL = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      has_password BOOLEAN NOT NULL DEFAULT false,
      photo_url TEXT,
      birthdate TEXT,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      is_member BOOLEAN NOT NULL DEFAULT true,
      active_member BOOLEAN NOT NULL DEFAULT true,
      secretaria TEXT
    );

    -- Positions table
    CREATE TABLE IF NOT EXISTS positions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    -- Elections table
    CREATE TABLE IF NOT EXISTS elections (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMP
    );

    -- Candidates table
    CREATE TABLE IF NOT EXISTS candidates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      position_id INTEGER NOT NULL REFERENCES positions(id),
      election_id INTEGER NOT NULL REFERENCES elections(id),
      UNIQUE(user_id, position_id, election_id)
    );

    -- Election Winners table
    CREATE TABLE IF NOT EXISTS election_winners (
      id SERIAL PRIMARY KEY,
      election_id INTEGER NOT NULL REFERENCES elections(id),
      position_id INTEGER NOT NULL REFERENCES positions(id),
      candidate_id INTEGER NOT NULL REFERENCES candidates(id),
      won_at_scrutiny INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Election Positions table
    CREATE TABLE IF NOT EXISTS election_positions (
      id SERIAL PRIMARY KEY,
      election_id INTEGER NOT NULL REFERENCES elections(id),
      position_id INTEGER NOT NULL REFERENCES positions(id),
      order_index INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      current_scrutiny INTEGER NOT NULL DEFAULT 1,
      opened_at TIMESTAMP,
      closed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Election Attendance table
    CREATE TABLE IF NOT EXISTS election_attendance (
      id SERIAL PRIMARY KEY,
      election_id INTEGER NOT NULL REFERENCES elections(id),
      election_position_id INTEGER REFERENCES election_positions(id),
      member_id INTEGER NOT NULL REFERENCES users(id),
      is_present BOOLEAN NOT NULL DEFAULT false,
      marked_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Votes table
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      voter_id INTEGER NOT NULL REFERENCES users(id),
      candidate_id INTEGER NOT NULL REFERENCES candidates(id),
      position_id INTEGER NOT NULL REFERENCES positions(id),
      election_id INTEGER NOT NULL REFERENCES elections(id),
      scrutiny_round INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Verification Codes table
    CREATE TABLE IF NOT EXISTS verification_codes (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      is_password_reset BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- PDF Verifications table
    CREATE TABLE IF NOT EXISTS pdf_verifications (
      id SERIAL PRIMARY KEY,
      election_id INTEGER NOT NULL REFERENCES elections(id),
      verification_hash TEXT NOT NULL UNIQUE,
      president_name TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Devotionals table
    CREATE TABLE IF NOT EXISTS devotionals (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      verse TEXT NOT NULL,
      verse_reference TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      prayer TEXT,
      image_url TEXT,
      author TEXT,
      published_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_published BOOLEAN NOT NULL DEFAULT true,
      is_featured BOOLEAN NOT NULL DEFAULT false,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Site Events table
    CREATE TABLE IF NOT EXISTS site_events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      short_description TEXT,
      image_url TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      time TEXT,
      location TEXT,
      location_url TEXT,
      price TEXT,
      registration_url TEXT,
      category TEXT NOT NULL DEFAULT 'geral',
      is_published BOOLEAN NOT NULL DEFAULT true,
      is_featured BOOLEAN NOT NULL DEFAULT false,
      is_all_day BOOLEAN NOT NULL DEFAULT false,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Instagram Posts table
    CREATE TABLE IF NOT EXISTS instagram_posts (
      id SERIAL PRIMARY KEY,
      caption TEXT,
      image_url TEXT NOT NULL,
      permalink TEXT,
      posted_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Prayer Requests table
    CREATE TABLE IF NOT EXISTS prayer_requests (
      id SERIAL PRIMARY KEY,
      name TEXT,
      whatsapp TEXT,
      category TEXT NOT NULL DEFAULT 'outros',
      request TEXT NOT NULL,
      is_anonymous BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      prayed_by INTEGER REFERENCES users(id),
      prayed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Banners table
    CREATE TABLE IF NOT EXISTS banners (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      image_url TEXT,
      background_color TEXT,
      link_url TEXT,
      link_text TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      starts_at TIMESTAMP,
      ends_at TIMESTAMP,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Board Members table
    CREATE TABLE IF NOT EXISTS board_members (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      photo_url TEXT,
      instagram TEXT,
      whatsapp TEXT,
      bio TEXT,
      term_start TEXT NOT NULL,
      term_end TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      is_current BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Site Content table
    CREATE TABLE IF NOT EXISTS site_content (
      id SERIAL PRIMARY KEY,
      page TEXT NOT NULL,
      section TEXT NOT NULL,
      title TEXT,
      content TEXT,
      image_url TEXT,
      metadata TEXT,
      updated_by INTEGER REFERENCES users(id),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(page, section)
    );

    -- Seasons table
    CREATE TABLE IF NOT EXISTS seasons (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      cover_image_url TEXT,
      pdf_url TEXT,
      ai_extracted_title TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      total_lessons INTEGER NOT NULL DEFAULT 0,
      published_at TIMESTAMP,
      starts_at TIMESTAMP,
      ends_at TIMESTAMP,
      created_by INTEGER REFERENCES users(id),
      ai_metadata TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Season Final Challenges table
    CREATE TABLE IF NOT EXISTS season_final_challenges (
      id SERIAL PRIMARY KEY,
      season_id INTEGER NOT NULL REFERENCES seasons(id),
      title TEXT NOT NULL DEFAULT 'Desafio Final',
      description TEXT,
      questions TEXT NOT NULL,
      question_count INTEGER NOT NULL DEFAULT 15,
      time_limit_seconds INTEGER NOT NULL DEFAULT 150,
      xp_reward INTEGER NOT NULL DEFAULT 100,
      perfect_xp_bonus INTEGER NOT NULL DEFAULT 50,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- User Final Challenge Progress table
    CREATE TABLE IF NOT EXISTS user_final_challenge_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      challenge_id INTEGER NOT NULL REFERENCES season_final_challenges(id),
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP,
      time_spent_seconds INTEGER,
      correct_answers INTEGER NOT NULL DEFAULT 0,
      total_questions INTEGER NOT NULL DEFAULT 15,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      is_perfect BOOLEAN NOT NULL DEFAULT false,
      is_completed BOOLEAN NOT NULL DEFAULT false,
      answers_given TEXT,
      challenge_token TEXT,
      UNIQUE(user_id, challenge_id)
    );

    -- User Season Progress table
    CREATE TABLE IF NOT EXISTS user_season_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      season_id INTEGER NOT NULL REFERENCES seasons(id),
      lessons_completed INTEGER NOT NULL DEFAULT 0,
      total_lessons INTEGER NOT NULL DEFAULT 0,
      bonus_lessons_completed INTEGER NOT NULL DEFAULT 0,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      correct_answers INTEGER NOT NULL DEFAULT 0,
      total_answers INTEGER NOT NULL DEFAULT 1, -- Avoid div by zero
      hearts_lost INTEGER NOT NULL DEFAULT 0,
      final_challenge_completed BOOLEAN NOT NULL DEFAULT false,
      final_challenge_perfect BOOLEAN NOT NULL DEFAULT false,
      is_mastered BOOLEAN NOT NULL DEFAULT false,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      last_activity_at TIMESTAMP,
      UNIQUE(user_id, season_id)
    );

    -- Season Rankings table
    CREATE TABLE IF NOT EXISTS season_rankings (
      id SERIAL PRIMARY KEY,
      season_id INTEGER NOT NULL REFERENCES seasons(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      xp_earned INTEGER NOT NULL DEFAULT 0,
      lessons_completed INTEGER NOT NULL DEFAULT 0,
      correct_percentage INTEGER NOT NULL DEFAULT 0,
      final_challenge_score INTEGER,
      is_mastered BOOLEAN NOT NULL DEFAULT false,
      rank_position INTEGER,
      is_winner BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(season_id, user_id)
    );

    -- Achievement XP table
    CREATE TABLE IF NOT EXISTS achievement_xp (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      achievement_id INTEGER NOT NULL REFERENCES achievements(id),
      xp_reward INTEGER NOT NULL,
      earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, achievement_id)
    );

    -- Daily Mission XP table
    CREATE TABLE IF NOT EXISTS daily_mission_xp (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      mission_date TEXT NOT NULL,
      mission_xp INTEGER NOT NULL,
      bonus_xp INTEGER NOT NULL DEFAULT 0,
      earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, mission_date)
    );

    -- Devotional Readings table
    CREATE TABLE IF NOT EXISTS devotional_readings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      devotional_id INTEGER NOT NULL REFERENCES devotionals(id),
      read_at TIMESTAMP NOT NULL DEFAULT NOW(),
      week_key TEXT,
      UNIQUE(user_id, devotional_id)
    );

    -- Study Weeks table
    CREATE TABLE IF NOT EXISTS study_weeks (
      id SERIAL PRIMARY KEY,
      week_number INTEGER NOT NULL,
      year INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      pdf_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TIMESTAMP,
      created_by INTEGER REFERENCES users(id),
      ai_metadata TEXT,
      season_id INTEGER REFERENCES seasons(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(week_number, year)
    );

    -- Study Lessons table
    CREATE TABLE IF NOT EXISTS study_lessons (
      id SERIAL PRIMARY KEY,
      study_week_id INTEGER REFERENCES study_weeks(id),
      season_id INTEGER REFERENCES seasons(id),
      order_index INTEGER NOT NULL,
      lesson_number INTEGER,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'study',
      description TEXT,
      xp_reward INTEGER NOT NULL DEFAULT 10,
      estimated_minutes INTEGER NOT NULL DEFAULT 5,
      icon TEXT,
      is_bonus BOOLEAN NOT NULL DEFAULT false,
      has_bonus_quiz BOOLEAN NOT NULL DEFAULT false,
      bonus_quiz_questions TEXT,
      is_locked BOOLEAN NOT NULL DEFAULT true,
      is_released BOOLEAN NOT NULL DEFAULT false,
      release_date TIMESTAMP,
      unlock_date TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Study Quiz Questions table
    CREATE TABLE IF NOT EXISTS study_quiz_questions (
      id SERIAL PRIMARY KEY,
      lesson_id INTEGER NOT NULL REFERENCES study_lessons(id),
      order_index INTEGER NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'multiple_choice',
      question_text TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      hint TEXT,
      xp_value INTEGER NOT NULL DEFAULT 5,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Study Quiz Responses table
    CREATE TABLE IF NOT EXISTS study_quiz_responses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      question_id INTEGER NOT NULL REFERENCES study_quiz_questions(id),
      lesson_id INTEGER NOT NULL REFERENCES study_lessons(id),
      selected_answer TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      time_spent_seconds INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Study Units table
    CREATE TABLE IF NOT EXISTS study_units (
      id SERIAL PRIMARY KEY,
      lesson_id INTEGER NOT NULL REFERENCES study_lessons(id),
      order_index INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      xp_value INTEGER NOT NULL DEFAULT 2,
      stage TEXT NOT NULL DEFAULT 'estude',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- User Unit Progress table
    CREATE TABLE IF NOT EXISTS user_unit_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      unit_id INTEGER NOT NULL REFERENCES study_units(id),
      is_completed BOOLEAN NOT NULL DEFAULT false,
      answer_given TEXT,
      is_correct BOOLEAN,
      attempts INTEGER NOT NULL DEFAULT 0,
      completed_at TIMESTAMP,
      UNIQUE(user_id, unit_id)
    );

    -- Weekly Goal Progress table
    CREATE TABLE IF NOT EXISTS weekly_goal_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      week_key TEXT NOT NULL,
      lessons_completed INTEGER NOT NULL DEFAULT 0,
      verses_read INTEGER NOT NULL DEFAULT 0,
      missions_completed INTEGER NOT NULL DEFAULT 0,
      devotionals_read INTEGER NOT NULL DEFAULT 0,
      is_goal_met BOOLEAN NOT NULL DEFAULT false,
      xp_bonus INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, week_key)
    );

    -- Weekly Practice Bonus table
    CREATE TABLE IF NOT EXISTS weekly_practice_bonus (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      week_key TEXT NOT NULL,
      bonus_xp INTEGER NOT NULL DEFAULT 50,
      earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, week_key)
    );

    -- Audit Logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Weekly Practice table
    CREATE TABLE IF NOT EXISTS weekly_practice (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      week_id INTEGER NOT NULL REFERENCES study_weeks(id),
      stars_earned INTEGER NOT NULL DEFAULT 0,
      correct_answers INTEGER NOT NULL DEFAULT 0,
      total_questions INTEGER NOT NULL DEFAULT 10,
      time_spent_seconds INTEGER NOT NULL DEFAULT 0,
      completed_within_time BOOLEAN NOT NULL DEFAULT false,
      is_mastered BOOLEAN NOT NULL DEFAULT false,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, week_id)
    );

    -- Practice Questions table
    CREATE TABLE IF NOT EXISTS practice_questions (
      id SERIAL PRIMARY KEY,
      week_id INTEGER NOT NULL REFERENCES study_weeks(id),
      order_index INTEGER NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'multiple_choice',
      question_text TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      xp_value INTEGER NOT NULL DEFAULT 5,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  try {
    await pool.query(createTablesSQL);
    console.log("All tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
}
