-- =====================================================
-- SQL COMPLETO - SCHEMA UMP EMAÚS
-- Todas as tabelas e colunas para Neon PostgreSQL
-- =====================================================

-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  has_password BOOLEAN NOT NULL DEFAULT FALSE,
  photo_url TEXT,
  birthdate TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_member BOOLEAN NOT NULL DEFAULT TRUE,
  active_member BOOLEAN NOT NULL DEFAULT TRUE,
  secretaria TEXT,
  is_treasurer BOOLEAN NOT NULL DEFAULT FALSE,
  active_member_since TIMESTAMP
);

-- ==================== POSITIONS ====================
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- ==================== ELECTIONS ====================
CREATE TABLE IF NOT EXISTS elections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP
);

-- ==================== ELECTION WINNERS ====================
CREATE TABLE IF NOT EXISTS election_winners (
  id SERIAL PRIMARY KEY,
  election_id INTEGER NOT NULL REFERENCES elections(id),
  position_id INTEGER NOT NULL REFERENCES positions(id),
  candidate_id INTEGER NOT NULL,
  won_at_scrutiny INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== ELECTION POSITIONS ====================
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

-- ==================== ELECTION ATTENDANCE ====================
CREATE TABLE IF NOT EXISTS election_attendance (
  id SERIAL PRIMARY KEY,
  election_id INTEGER NOT NULL REFERENCES elections(id),
  election_position_id INTEGER REFERENCES election_positions(id),
  member_id INTEGER NOT NULL REFERENCES users(id),
  is_present BOOLEAN NOT NULL DEFAULT FALSE,
  marked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== CANDIDATES ====================
CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  position_id INTEGER NOT NULL REFERENCES positions(id),
  election_id INTEGER NOT NULL REFERENCES elections(id),
  UNIQUE(user_id, position_id, election_id)
);

-- Add FK to election_winners after candidates exists
ALTER TABLE election_winners DROP CONSTRAINT IF EXISTS election_winners_candidate_id_fkey;
ALTER TABLE election_winners ADD CONSTRAINT election_winners_candidate_id_fkey 
  FOREIGN KEY (candidate_id) REFERENCES candidates(id);

-- ==================== VOTES ====================
CREATE TABLE IF NOT EXISTS votes (
  id SERIAL PRIMARY KEY,
  voter_id INTEGER NOT NULL REFERENCES users(id),
  candidate_id INTEGER NOT NULL REFERENCES candidates(id),
  position_id INTEGER NOT NULL REFERENCES positions(id),
  election_id INTEGER NOT NULL REFERENCES elections(id),
  scrutiny_round INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== VERIFICATION CODES ====================
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_password_reset BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== PDF VERIFICATIONS ====================
CREATE TABLE IF NOT EXISTS pdf_verifications (
  id SERIAL PRIMARY KEY,
  election_id INTEGER NOT NULL REFERENCES elections(id),
  verification_hash TEXT NOT NULL UNIQUE,
  president_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== DEVOTIONALS ====================
CREATE TABLE IF NOT EXISTS devotionals (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  verse TEXT NOT NULL,
  verse_reference TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  summary TEXT,
  prayer TEXT,
  image_url TEXT,
  mobile_crop_data TEXT,
  author TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  audio_url TEXT,
  published_at TIMESTAMP NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMP,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== SITE EVENTS ====================
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
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== INSTAGRAM POSTS ====================
CREATE TABLE IF NOT EXISTS instagram_posts (
  id SERIAL PRIMARY KEY,
  instagram_id TEXT,
  caption TEXT,
  image_url TEXT NOT NULL,
  video_url TEXT,
  media_type TEXT DEFAULT 'IMAGE',
  permalink TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  posted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured_banner BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== BANNER HIGHLIGHTS ====================
CREATE TABLE IF NOT EXISTS banner_highlights (
  id SERIAL PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== PRAYER REQUESTS ====================
CREATE TABLE IF NOT EXISTS prayer_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT,
  category TEXT NOT NULL DEFAULT 'outros',
  request TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  prayed_by INTEGER REFERENCES users(id),
  prayed_at TIMESTAMP,
  is_moderated BOOLEAN NOT NULL DEFAULT FALSE,
  moderated_by INTEGER REFERENCES users(id),
  moderated_at TIMESTAMP,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id),
  in_prayer_count INTEGER NOT NULL DEFAULT 0,
  has_profanity BOOLEAN DEFAULT FALSE,
  has_hate_speech BOOLEAN DEFAULT FALSE,
  has_sexual_content BOOLEAN DEFAULT FALSE,
  moderation_details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== PRAYER REACTIONS ====================
CREATE TABLE IF NOT EXISTS prayer_reactions (
  id SERIAL PRIMARY KEY,
  prayer_request_id INTEGER NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(prayer_request_id, session_id)
);

-- ==================== DEVOTIONAL COMMENTS ====================
CREATE TABLE IF NOT EXISTS devotional_comments (
  id SERIAL PRIMARY KEY,
  devotional_id INTEGER NOT NULL REFERENCES devotionals(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  is_highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== BANNERS ====================
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  background_color TEXT,
  link_url TEXT,
  link_text TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== BOARD MEMBERS ====================
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
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== SITE CONTENT ====================
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

-- ==================== SEASONS ====================
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cover_image_url TEXT,
  pdf_url TEXT,
  ai_extracted_title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  is_ended BOOLEAN NOT NULL DEFAULT FALSE,
  ended_at TIMESTAMP,
  total_lessons INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  ai_metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== STUDY PROFILES ====================
CREATE TABLE IF NOT EXISTS study_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  hearts INTEGER NOT NULL DEFAULT 5,
  hearts_max INTEGER NOT NULL DEFAULT 5,
  hearts_refill_at TIMESTAMP,
  last_activity_date TEXT,
  daily_goal_minutes INTEGER NOT NULL DEFAULT 10,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  weekly_lessons_goal INTEGER NOT NULL DEFAULT 1,
  weekly_verses_goal INTEGER NOT NULL DEFAULT 7,
  weekly_missions_goal INTEGER NOT NULL DEFAULT 3,
  weekly_devotionals_goal INTEGER NOT NULL DEFAULT 1,
  verses_read_for_recovery INTEGER NOT NULL DEFAULT 0,
  crystals INTEGER NOT NULL DEFAULT 0,
  streak_freezes_available INTEGER NOT NULL DEFAULT 0,
  last_lesson_completed_at TIMESTAMP,
  streak_warning_day INTEGER NOT NULL DEFAULT 0,
  total_streak_freeze_used INTEGER NOT NULL DEFAULT 0,
  consecutive_perfect_lessons INTEGER NOT NULL DEFAULT 0,
  consecutive_lessons INTEGER NOT NULL DEFAULT 0,
  total_lessons_completed_today INTEGER NOT NULL DEFAULT 0,
  last_lesson_date TEXT,
  weekly_lessons_streak INTEGER NOT NULL DEFAULT 0,
  daily_verse_read_date TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ==================== CRYSTAL TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS crystal_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== STREAK FREEZE HISTORY ====================
CREATE TABLE IF NOT EXISTS streak_freeze_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  streak_saved INTEGER NOT NULL,
  crystals_cost INTEGER NOT NULL DEFAULT 0,
  was_automatic BOOLEAN NOT NULL DEFAULT FALSE
);

-- ==================== STREAK MILESTONES ====================
CREATE TABLE IF NOT EXISTS streak_milestones (
  id SERIAL PRIMARY KEY,
  days INTEGER NOT NULL UNIQUE,
  crystal_reward INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  badge_icon TEXT
);

-- ==================== USER STREAK MILESTONES ====================
CREATE TABLE IF NOT EXISTS user_streak_milestones (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  milestone_id INTEGER NOT NULL REFERENCES streak_milestones(id),
  achieved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  crystals_awarded INTEGER NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, milestone_id)
);

-- ==================== SEASON FINAL CHALLENGES ====================
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
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== USER FINAL CHALLENGE PROGRESS ====================
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
  is_perfect BOOLEAN NOT NULL DEFAULT FALSE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  answers_given TEXT,
  challenge_token TEXT,
  UNIQUE(user_id, challenge_id)
);

-- ==================== USER SEASON PROGRESS ====================
CREATE TABLE IF NOT EXISTS user_season_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  total_lessons INTEGER NOT NULL DEFAULT 0,
  bonus_lessons_completed INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_answers INTEGER NOT NULL DEFAULT 0,
  hearts_lost INTEGER NOT NULL DEFAULT 0,
  final_challenge_completed BOOLEAN NOT NULL DEFAULT FALSE,
  final_challenge_perfect BOOLEAN NOT NULL DEFAULT FALSE,
  is_mastered BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  UNIQUE(user_id, season_id)
);

-- ==================== SEASON RANKINGS ====================
CREATE TABLE IF NOT EXISTS season_rankings (
  id SERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  xp_earned INTEGER NOT NULL DEFAULT 0,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  correct_percentage INTEGER NOT NULL DEFAULT 0,
  final_challenge_score INTEGER,
  is_mastered BOOLEAN NOT NULL DEFAULT FALSE,
  rank_position INTEGER,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, user_id)
);

-- ==================== WEEKLY GOAL PROGRESS ====================
CREATE TABLE IF NOT EXISTS weekly_goal_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  week_key TEXT NOT NULL,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  verses_read INTEGER NOT NULL DEFAULT 0,
  missions_completed INTEGER NOT NULL DEFAULT 0,
  devotionals_read INTEGER NOT NULL DEFAULT 0,
  is_goal_met BOOLEAN NOT NULL DEFAULT FALSE,
  xp_bonus INTEGER NOT NULL DEFAULT 0,
  weekly_bonus_distributed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_key)
);

-- ==================== WEEKLY PRACTICE BONUS ====================
CREATE TABLE IF NOT EXISTS weekly_practice_bonus (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  week_key TEXT NOT NULL,
  bonus_xp INTEGER NOT NULL DEFAULT 50,
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_key)
);

-- ==================== ACHIEVEMENTS ====================
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  custom_icon_url TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  requirement TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  season_id INTEGER REFERENCES seasons(id)
);

-- ==================== ACHIEVEMENT XP ====================
CREATE TABLE IF NOT EXISTS achievement_xp (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  achievement_id INTEGER NOT NULL REFERENCES achievements(id),
  xp_reward INTEGER NOT NULL,
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ==================== DAILY MISSION XP ====================
CREATE TABLE IF NOT EXISTS daily_mission_xp (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  mission_date TEXT NOT NULL,
  mission_xp INTEGER NOT NULL,
  bonus_xp INTEGER NOT NULL DEFAULT 0,
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, mission_date)
);

-- ==================== DEVOTIONAL READINGS ====================
CREATE TABLE IF NOT EXISTS devotional_readings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  devotional_id INTEGER NOT NULL REFERENCES devotionals(id),
  read_at TIMESTAMP NOT NULL DEFAULT NOW(),
  week_key TEXT,
  UNIQUE(user_id, devotional_id)
);

-- ==================== STUDY WEEKS (LEGACY) ====================
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

-- ==================== STUDY LESSONS ====================
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
  is_bonus BOOLEAN NOT NULL DEFAULT FALSE,
  has_bonus_quiz BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_quiz_questions TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT TRUE,
  is_released BOOLEAN NOT NULL DEFAULT FALSE,
  release_date TIMESTAMP,
  unlock_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== STUDY UNITS ====================
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

-- ==================== BIBLE VERSES ====================
CREATE TABLE IF NOT EXISTS bible_verses (
  id SERIAL PRIMARY KEY,
  reference TEXT NOT NULL,
  text TEXT NOT NULL,
  reflection TEXT,
  category TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== USER LESSON PROGRESS ====================
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  lesson_id INTEGER NOT NULL REFERENCES study_lessons(id),
  status TEXT NOT NULL DEFAULT 'locked',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  mistakes_count INTEGER NOT NULL DEFAULT 0,
  perfect_score BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS user_lesson_progress_user_id_idx ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS user_lesson_progress_user_status_idx ON user_lesson_progress(user_id, status);
CREATE INDEX IF NOT EXISTS user_lesson_progress_completed_at_idx ON user_lesson_progress(completed_at);

-- ==================== USER UNIT PROGRESS ====================
CREATE TABLE IF NOT EXISTS user_unit_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  unit_id INTEGER NOT NULL REFERENCES study_units(id),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  answer_given TEXT,
  is_correct BOOLEAN,
  attempts INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP,
  UNIQUE(user_id, unit_id)
);
CREATE INDEX IF NOT EXISTS user_unit_progress_user_id_idx ON user_unit_progress(user_id);
CREATE INDEX IF NOT EXISTS user_unit_progress_user_completed_idx ON user_unit_progress(user_id, is_completed);

-- ==================== VERSE READINGS ====================
CREATE TABLE IF NOT EXISTS verse_readings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  verse_id INTEGER NOT NULL REFERENCES bible_verses(id),
  read_at TIMESTAMP NOT NULL DEFAULT NOW(),
  hearts_recovered INTEGER NOT NULL DEFAULT 1
);

-- ==================== XP TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id INTEGER,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS xp_transactions_user_id_idx ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS xp_transactions_user_created_at_idx ON xp_transactions(user_id, created_at);

-- ==================== DAILY ACTIVITY ====================
CREATE TABLE IF NOT EXISTS daily_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  activity_date TEXT NOT NULL,
  minutes_studied INTEGER NOT NULL DEFAULT 0,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  streak_maintained BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, activity_date)
);

-- ==================== USER ACHIEVEMENTS ====================
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  achievement_id INTEGER NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ==================== LEADERBOARD ENTRIES ====================
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period_type, period_key)
);

-- ==================== DAILY MISSIONS ====================
CREATE TABLE IF NOT EXISTS daily_missions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  requirement TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ==================== USER DAILY MISSIONS ====================
CREATE TABLE IF NOT EXISTS user_daily_missions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  mission_id INTEGER NOT NULL REFERENCES daily_missions(id),
  assigned_date TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, mission_id, assigned_date)
);
CREATE INDEX IF NOT EXISTS user_daily_missions_user_date_idx ON user_daily_missions(user_id, assigned_date);

-- ==================== DAILY MISSION CONTENT ====================
CREATE TABLE IF NOT EXISTS daily_mission_content (
  id SERIAL PRIMARY KEY,
  content_date TEXT NOT NULL UNIQUE,
  daily_verse TEXT,
  bible_fact TEXT,
  bible_character TEXT,
  daily_theme TEXT,
  timed_quiz_questions TEXT,
  quiz_questions TEXT,
  ai_generated_missions TEXT,
  verse_memory TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== PUSH SUBSCRIPTIONS ====================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used TIMESTAMP,
  UNIQUE(user_id, endpoint)
);

-- ==================== ANONYMOUS PUSH SUBSCRIPTIONS ====================
CREATE TABLE IF NOT EXISTS anonymous_push_subscriptions (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used TIMESTAMP
);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== AUDIT LOGS ====================
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

-- ==================== WEEKLY PRACTICE ====================
CREATE TABLE IF NOT EXISTS weekly_practice (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  week_id INTEGER NOT NULL REFERENCES study_weeks(id),
  stars_earned INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 10,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  completed_within_time BOOLEAN NOT NULL DEFAULT FALSE,
  is_mastered BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_id)
);

-- ==================== PRACTICE QUESTIONS ====================
CREATE TABLE IF NOT EXISTS practice_questions (
  id SERIAL PRIMARY KEY,
  week_id INTEGER NOT NULL REFERENCES study_weeks(id),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== USER ONLINE STATUS ====================
CREATE TABLE IF NOT EXISTS user_online_status (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== ACHIEVEMENT LIKES ====================
CREATE TABLE IF NOT EXISTS achievement_likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  target_user_id INTEGER NOT NULL REFERENCES users(id),
  achievement_id INTEGER NOT NULL REFERENCES achievements(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_user_id, achievement_id)
);

-- ==================== MEMBER ENCOURAGEMENTS ====================
CREATE TABLE IF NOT EXISTS member_encouragements (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id),
  message_key TEXT NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== COLLECTIBLE CARDS ====================
CREATE TABLE IF NOT EXISTS collectible_cards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  available_rarities TEXT[] DEFAULT ARRAY['common', 'rare', 'epic', 'legendary'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== STUDY EVENTS ====================
CREATE TABLE IF NOT EXISTS study_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  theme TEXT NOT NULL,
  image_url TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  force_unlock BOOLEAN DEFAULT FALSE,
  card_id INTEGER REFERENCES collectible_cards(id),
  lessons_count INTEGER DEFAULT 7,
  xp_multiplier REAL DEFAULT 1.0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==================== STUDY EVENT LESSONS ====================
CREATE TABLE IF NOT EXISTS study_event_lessons (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES study_events(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  verse_reference TEXT,
  verse_text TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  xp_reward INTEGER DEFAULT 50,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, day_number)
);

-- ==================== USER EVENT PROGRESS ====================
CREATE TABLE IF NOT EXISTS user_event_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_id INTEGER NOT NULL REFERENCES study_events(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES study_event_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  used_hints BOOLEAN DEFAULT FALSE,
  xp_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  UNIQUE(user_id, lesson_id)
);

-- ==================== USER CARDS ====================
CREATE TABLE IF NOT EXISTS user_cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  card_id INTEGER NOT NULL REFERENCES collectible_cards(id),
  rarity TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  performance REAL DEFAULT 0,
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- ==================== TREASURY SETTINGS ====================
CREATE TABLE IF NOT EXISTS treasury_settings (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  percapta_amount INTEGER NOT NULL,
  ump_monthly_amount INTEGER NOT NULL,
  pix_key TEXT,
  treasurer_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== TREASURY EXPENSE CATEGORIES ====================
CREATE TABLE IF NOT EXISTS treasury_expense_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== TREASURY LOANS ====================
CREATE TABLE IF NOT EXISTS treasury_loans (
  id SERIAL PRIMARY KEY,
  origin TEXT NOT NULL,
  origin_name TEXT,
  origin_member_id INTEGER REFERENCES users(id),
  total_amount INTEGER NOT NULL,
  is_installment BOOLEAN NOT NULL DEFAULT FALSE,
  installment_count INTEGER,
  installment_amount INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== TREASURY LOAN INSTALLMENTS ====================
CREATE TABLE IF NOT EXISTS treasury_loan_installments (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER NOT NULL REFERENCES treasury_loans(id),
  installment_number INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  due_date TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP,
  entry_id INTEGER
);

-- ==================== TREASURY ENTRIES ====================
CREATE TABLE IF NOT EXISTS treasury_entries (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  amount INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  external_payer_name TEXT,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  pix_transaction_id TEXT,
  pix_qr_code TEXT,
  pix_qr_code_base64 TEXT,
  pix_expires_at TIMESTAMP,
  reference_month INTEGER,
  reference_months TEXT,
  reference_year INTEGER NOT NULL,
  event_id INTEGER,
  order_id INTEGER,
  loan_id INTEGER REFERENCES treasury_loans(id),
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS treasury_entries_user_id_idx ON treasury_entries(user_id);
CREATE INDEX IF NOT EXISTS treasury_entries_type_idx ON treasury_entries(type);
CREATE INDEX IF NOT EXISTS treasury_entries_status_idx ON treasury_entries(payment_status);
CREATE INDEX IF NOT EXISTS treasury_entries_year_idx ON treasury_entries(reference_year);

-- ==================== MEMBER UMP PAYMENTS ====================
CREATE TABLE IF NOT EXISTS member_ump_payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  entry_id INTEGER NOT NULL REFERENCES treasury_entries(id),
  paid_at TIMESTAMP NOT NULL,
  UNIQUE(user_id, year, month)
);

-- ==================== MEMBER PERCAPTA PAYMENTS ====================
CREATE TABLE IF NOT EXISTS member_percapta_payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  year INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  entry_id INTEGER NOT NULL REFERENCES treasury_entries(id),
  paid_at TIMESTAMP NOT NULL,
  UNIQUE(user_id, year)
);

-- ==================== TREASURY NOTIFICATIONS LOG ====================
CREATE TABLE IF NOT EXISTS treasury_notifications_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL,
  reference_id INTEGER,
  sent_at TIMESTAMP DEFAULT NOW(),
  is_manual BOOLEAN NOT NULL DEFAULT FALSE
);

-- ==================== SHOP CATEGORIES ====================
CREATE TABLE IF NOT EXISTS shop_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== SHOP ITEMS ====================
CREATE TABLE IF NOT EXISTS shop_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  category_id INTEGER NOT NULL REFERENCES shop_categories(id),
  gender_type TEXT NOT NULL,
  has_size BOOLEAN NOT NULL DEFAULT TRUE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_pre_order BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_order INTEGER DEFAULT 0,
  banner_image_data TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== SHOP ITEM IMAGES ====================
CREATE TABLE IF NOT EXISTS shop_item_images (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  gender TEXT NOT NULL,
  image_data TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ==================== SHOP ITEM SIZES ====================
CREATE TABLE IF NOT EXISTS shop_item_sizes (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  gender TEXT NOT NULL,
  size TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ==================== SHOP ITEM SIZE CHARTS ====================
CREATE TABLE IF NOT EXISTS shop_item_size_charts (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  gender TEXT NOT NULL,
  size TEXT NOT NULL,
  width REAL,
  length REAL,
  sleeve REAL,
  shoulder REAL
);

-- ==================== SHOP CART ITEMS ====================
CREATE TABLE IF NOT EXISTS shop_cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  item_id INTEGER NOT NULL REFERENCES shop_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  gender TEXT,
  size TEXT,
  added_at TIMESTAMP DEFAULT NOW()
);

-- ==================== SHOP ORDERS ====================
CREATE TABLE IF NOT EXISTS shop_orders (
  id SERIAL PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total_amount INTEGER NOT NULL,
  observation TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'awaiting_payment',
  entry_id INTEGER REFERENCES treasury_entries(id),
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS shop_orders_user_id_idx ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS shop_orders_status_idx ON shop_orders(order_status);

-- ==================== SHOP ORDER ITEMS ====================
CREATE TABLE IF NOT EXISTS shop_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES shop_items(id),
  quantity INTEGER NOT NULL,
  gender TEXT,
  size TEXT,
  unit_price INTEGER NOT NULL
);

-- ==================== PROMO CODES ====================
CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value INTEGER NOT NULL,
  category_id INTEGER REFERENCES shop_categories(id),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== EVENT FEES ====================
CREATE TABLE IF NOT EXISTS event_fees (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL UNIQUE,
  fee_amount INTEGER NOT NULL,
  deadline TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== EVENT CONFIRMATIONS ====================
CREATE TABLE IF NOT EXISTS event_confirmations (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  is_visitor BOOLEAN NOT NULL DEFAULT FALSE,
  visitor_count INTEGER DEFAULT 0,
  entry_id INTEGER REFERENCES treasury_entries(id),
  confirmed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS event_confirmations_event_user_idx ON event_confirmations(event_id, user_id);

-- ==================== SENT EVENT NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS sent_event_notifications (
  id SERIAL PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  event_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sent_event_notifications_cache_key_idx ON sent_event_notifications(cache_key);
CREATE INDEX IF NOT EXISTS sent_event_notifications_event_idx ON sent_event_notifications(event_id);

-- ==================== SENT SCHEDULER REMINDERS ====================
CREATE TABLE IF NOT EXISTS sent_scheduler_reminders (
  id SERIAL PRIMARY KEY,
  reminder_key TEXT NOT NULL UNIQUE,
  reminder_type TEXT NOT NULL,
  related_id INTEGER,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sent_scheduler_reminders_key_idx ON sent_scheduler_reminders(reminder_key);
CREATE INDEX IF NOT EXISTS sent_scheduler_reminders_type_idx ON sent_scheduler_reminders(reminder_type);

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================
