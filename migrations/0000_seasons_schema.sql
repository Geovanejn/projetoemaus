-- ############################################################################
-- 1. TABELAS BASE (SEM DEPENDÊNCIAS DE CHAVE ESTRANGEIRA)
-- ############################################################################

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"has_password" boolean DEFAULT false NOT NULL,
	"photo_url" text,
	"birthdate" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_member" boolean DEFAULT true NOT NULL,
	"active_member" boolean DEFAULT true NOT NULL,
	"secretaria" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "positions_name_unique" UNIQUE("name")
);

CREATE TABLE "elections" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);

CREATE TABLE "bible_verses" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"text" text NOT NULL,
	"reflection" text,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "daily_mission_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_date" text NOT NULL,
	"daily_verse" text,
	"bible_fact" text,
	"bible_character" text,
	"daily_theme" text,
	"timed_quiz_questions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_mission_content_content_date_unique" UNIQUE("content_date")
);

CREATE TABLE "daily_missions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"xp_reward" integer DEFAULT 10 NOT NULL,
	"requirement" text,
	"is_active" boolean DEFAULT true NOT NULL
);

CREATE TABLE "streak_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"days" integer NOT NULL,
	"crystal_reward" integer NOT NULL,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"badge_icon" text,
	CONSTRAINT "streak_milestones_days_unique" UNIQUE("days")
);

CREATE TABLE "instagram_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"instagram_id" text,
	"caption" text,
	"image_url" text NOT NULL,
	"video_url" text,
	"media_type" text DEFAULT 'IMAGE',
	"permalink" text,
	"likes_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured_banner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_password_reset" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "anonymous_push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL UNIQUE,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used" timestamp
);

-- ############################################################################
-- 2. TABELAS COM DEPENDÊNCIAS (ORDEM HIERÁRQUICA)
-- ############################################################################

CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"cover_image_url" text,
	"pdf_url" text,
	"ai_extracted_title" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_lessons" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"created_by" integer REFERENCES "users"("id"),
	"ai_metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "study_weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_number" integer NOT NULL,
	"year" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"pdf_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"created_by" integer REFERENCES "users"("id"),
	"ai_metadata" text,
	"season_id" integer REFERENCES "seasons"("id"),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "study_weeks_week_number_year_unique" UNIQUE("week_number","year")
);

CREATE TABLE "study_lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"study_week_id" integer REFERENCES "study_weeks"("id"),
	"season_id" integer REFERENCES "seasons"("id"),
	"order_index" integer NOT NULL,
	"lesson_number" integer,
	"title" text NOT NULL,
	"type" text DEFAULT 'study' NOT NULL,
	"description" text,
	"xp_reward" integer DEFAULT 10 NOT NULL,
	"estimated_minutes" integer DEFAULT 5 NOT NULL,
	"icon" text,
	"is_bonus" boolean DEFAULT false NOT NULL,
	"has_bonus_quiz" boolean DEFAULT false NOT NULL,
	"bonus_quiz_questions" text,
	"is_locked" boolean DEFAULT true NOT NULL,
	"is_released" boolean DEFAULT false NOT NULL,
	"release_date" timestamp,
	"unlock_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "study_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_id" integer NOT NULL REFERENCES "study_lessons"("id"),
	"order_index" integer NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"xp_value" integer DEFAULT 2 NOT NULL,
	"stage" text DEFAULT 'estude' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"custom_icon_url" text,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"category" text NOT NULL,
	"requirement" text,
	"is_secret" boolean DEFAULT false NOT NULL,
	"season_id" integer REFERENCES "seasons"("id")
);

-- ############################################################################
-- 3. FUNCIONALIDADES ESPECÍFICAS (SISTEMA DE ESTUDOS / GAMIFICAÇÃO)
-- ############################################################################

CREATE TABLE "study_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL UNIQUE REFERENCES "users"("id"),
	"total_xp" integer DEFAULT 0 NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"hearts" integer DEFAULT 5 NOT NULL,
	"hearts_max" integer DEFAULT 5 NOT NULL,
	"hearts_refill_at" timestamp,
	"last_activity_date" text,
	"daily_goal_minutes" integer DEFAULT 10 NOT NULL,
	"timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"weekly_lessons_goal" integer DEFAULT 1 NOT NULL,
	"weekly_verses_goal" integer DEFAULT 7 NOT NULL,
	"weekly_missions_goal" integer DEFAULT 3 NOT NULL,
	"weekly_devotionals_goal" integer DEFAULT 1 NOT NULL,
	"verses_read_for_recovery" integer DEFAULT 0 NOT NULL,
	"crystals" integer DEFAULT 0 NOT NULL,
	"streak_freezes_available" integer DEFAULT 0 NOT NULL,
	"last_lesson_completed_at" timestamp,
	"streak_warning_day" integer DEFAULT 0 NOT NULL,
	"total_streak_freeze_used" integer DEFAULT 0 NOT NULL,
	"consecutive_perfect_lessons" integer DEFAULT 0 NOT NULL,
	"consecutive_lessons" integer DEFAULT 0 NOT NULL,
	"total_lessons_completed_today" integer DEFAULT 0 NOT NULL,
	"last_lesson_date" text,
	"weekly_lessons_streak" integer DEFAULT 0 NOT NULL,
	"daily_verse_read_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crystal_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"balance_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "streak_freeze_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"used_at" timestamp DEFAULT now() NOT NULL,
	"streak_saved" integer NOT NULL,
	"crystals_cost" integer DEFAULT 0 NOT NULL,
	"was_automatic" boolean DEFAULT false NOT NULL
);

CREATE TABLE "user_streak_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"milestone_id" integer NOT NULL REFERENCES "streak_milestones"("id"),
	"achieved_at" timestamp DEFAULT now() NOT NULL,
	"crystals_awarded" integer NOT NULL,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_streak_milestones_user_id_milestone_id_unique" UNIQUE("user_id","milestone_id")
);

-- ############################################################################
-- 4. ELEIÇÕES E VOTAÇÃO
-- ############################################################################

CREATE TABLE "election_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"election_id" integer NOT NULL REFERENCES "elections"("id"),
	"position_id" integer NOT NULL REFERENCES "positions"("id"),
	"order_index" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_scrutiny" integer DEFAULT 1 NOT NULL,
	"opened_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"position_id" integer NOT NULL REFERENCES "positions"("id"),
	"election_id" integer NOT NULL REFERENCES "elections"("id"),
	CONSTRAINT "candidates_user_id_position_id_election_id_unique" UNIQUE("user_id","position_id","election_id")
);

CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"voter_id" integer NOT NULL REFERENCES "users"("id"),
	"candidate_id" integer NOT NULL REFERENCES "candidates"("id"),
	"position_id" integer NOT NULL REFERENCES "positions"("id"),
	"election_id" integer NOT NULL REFERENCES "elections"("id"),
	"scrutiny_round" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "election_winners" (
	"id" serial PRIMARY KEY NOT NULL,
	"election_id" integer NOT NULL REFERENCES "elections"("id"),
	"position_id" integer NOT NULL REFERENCES "positions"("id"),
	"candidate_id" integer NOT NULL REFERENCES "candidates"("id"),
	"won_at_scrutiny" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "election_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"election_id" integer NOT NULL REFERENCES "elections"("id"),
	"election_position_id" integer REFERENCES "election_positions"("id"),
	"member_id" integer NOT NULL REFERENCES "users"("id"),
	"is_present" boolean DEFAULT false NOT NULL,
	"marked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "pdf_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"election_id" integer NOT NULL REFERENCES "elections"("id"),
	"verification_hash" text NOT NULL UNIQUE,
	"president_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ############################################################################
-- 5. CONTEÚDO, SOCIAL E SITE
-- ############################################################################

CREATE TABLE "devotionals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"verse" text NOT NULL,
	"verse_reference" text NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"summary" text,
	"prayer" text,
	"image_url" text,
	"author" text,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"scheduled_at" timestamp,
	"is_published" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_by" integer REFERENCES "users"("id"),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "devotional_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"devotional_id" integer NOT NULL REFERENCES "devotionals"("id") ON DELETE CASCADE,
	"user_id" integer REFERENCES "users"("id"),
	"name" text NOT NULL,
	"content" text NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approved_by" integer REFERENCES "users"("id"),
	"approved_at" timestamp,
	"is_highlighted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "prayer_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"whatsapp" text,
	"category" text DEFAULT 'outros' NOT NULL,
	"request" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"prayed_by" integer REFERENCES "users"("id"),
	"prayed_at" timestamp,
	"is_moderated" boolean DEFAULT false NOT NULL,
	"moderated_by" integer REFERENCES "users"("id"),
	"moderated_at" timestamp,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approved_at" timestamp,
	"approved_by" integer REFERENCES "users"("id"),
	"in_prayer_count" integer DEFAULT 0 NOT NULL,
	"has_profanity" boolean DEFAULT false,
	"has_hate_speech" boolean DEFAULT false,
	"has_sexual_content" boolean DEFAULT false,
	"moderation_details" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "prayer_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"prayer_request_id" integer NOT NULL REFERENCES "prayer_requests"("id") ON DELETE CASCADE,
	"session_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prayer_reactions_unique_reaction" UNIQUE("prayer_request_id", "session_id")
);

CREATE TABLE "site_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"short_description" text,
	"image_url" text,
	"start_date" text NOT NULL,
	"end_date" text,
	"time" text,
	"location" text,
	"location_url" text,
	"price" text,
	"registration_url" text,
	"category" text DEFAULT 'geral' NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"created_by" integer REFERENCES "users"("id"),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"image_url" text,
	"background_color" text,
	"link_url" text,
	"link_text" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"created_by" integer REFERENCES "users"("id"),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "board_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer REFERENCES "users"("id"),
	"name" text NOT NULL,
	"position" text NOT NULL,
	"photo_url" text,
	"instagram" text,
	"whatsapp" text,
	"bio" text,
	"term_start" text NOT NULL,
	"term_end" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "site_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"page" text NOT NULL,
	"section" text NOT NULL,
	"title" text,
	"content" text,
	"image_url" text,
	"metadata" text,
	"updated_by" integer REFERENCES "users"("id"),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_content_page_section_unique" UNIQUE("page","section")
);

-- ############################################################################
-- 6. PROGRESSO, XP E LEADERBOARDS
-- ############################################################################

CREATE TABLE "user_season_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"season_id" integer NOT NULL REFERENCES "seasons"("id"),
	"lessons_completed" integer DEFAULT 0 NOT NULL,
	"total_lessons" integer DEFAULT 0 NOT NULL,
	"bonus_lessons_completed" integer DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"correct_answers" integer DEFAULT 0 NOT NULL,
	"total_answers" integer DEFAULT 0 NOT NULL,
	"hearts_lost" integer DEFAULT 0 NOT NULL,
	"final_challenge_completed" boolean DEFAULT false NOT NULL,
	"final_challenge_perfect" boolean DEFAULT false NOT NULL,
	"is_mastered" boolean DEFAULT false NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"last_activity_at" timestamp,
	CONSTRAINT "user_season_progress_user_id_season_id_unique" UNIQUE("user_id","season_id")
);

CREATE TABLE "season_rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL REFERENCES "seasons"("id"),
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"lessons_completed" integer DEFAULT 0 NOT NULL,
	"correct_percentage" integer DEFAULT 0 NOT NULL,
	"final_challenge_score" integer,
	"is_mastered" boolean DEFAULT false NOT NULL,
	"rank_position" integer,
	"is_winner" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "season_rankings_season_id_user_id_unique" UNIQUE("season_id","user_id")
);

CREATE TABLE "user_lesson_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"lesson_id" integer NOT NULL REFERENCES "study_lessons"("id"),
	"status" text DEFAULT 'locked' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"mistakes_count" integer DEFAULT 0 NOT NULL,
	"perfect_score" boolean DEFAULT false NOT NULL,
	"time_spent_seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_lesson_progress_user_id_lesson_id_unique" UNIQUE("user_id","lesson_id")
);

CREATE TABLE "user_unit_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"unit_id" integer NOT NULL REFERENCES "study_units"("id"),
	"is_completed" boolean DEFAULT false NOT NULL,
	"answer_given" text,
	"is_correct" boolean,
	"attempts" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "user_unit_progress_user_id_unit_id_unique" UNIQUE("user_id","unit_id")
);

CREATE TABLE "xp_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"amount" integer NOT NULL,
	"source" text NOT NULL,
	"source_id" integer,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "achievement_xp" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"achievement_id" integer NOT NULL REFERENCES "achievements"("id"),
	"xp_reward" integer NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "achievement_xp_user_achievement_unique" UNIQUE("user_id", "achievement_id")
);

CREATE TABLE "daily_mission_xp" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"mission_date" text NOT NULL,
	"mission_xp" integer NOT NULL,
	"bonus_xp" integer DEFAULT 0 NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_mission_xp_user_mission_date_unique" UNIQUE("user_id", "mission_date")
);

CREATE TABLE "leaderboard_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"period_type" text NOT NULL,
	"period_key" text NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"rank_position" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_entries_user_id_period_type_period_key_unique" UNIQUE("user_id","period_type","period_key")
);

-- ############################################################################
-- 7. NOTIFICAÇÕES, MISSÕES E PRÁTICA SEMANAL
-- ############################################################################

CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used" timestamp,
	CONSTRAINT "push_subscriptions_user_id_endpoint_unique" UNIQUE("user_id","endpoint")
);

CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" text,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "user_daily_missions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"mission_id" integer NOT NULL REFERENCES "daily_missions"("id"),
	"assigned_date" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_daily_missions_user_id_mission_id_assigned_date_unique" UNIQUE("user_id","mission_id","assigned_date")
);

CREATE TABLE "weekly_practice" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"week_id" integer NOT NULL REFERENCES "study_weeks"("id"),
	"stars_earned" integer DEFAULT 0 NOT NULL,
	"correct_answers" integer DEFAULT 0 NOT NULL,
	"total_questions" integer DEFAULT 10 NOT NULL,
	"time_spent_seconds" integer DEFAULT 0 NOT NULL,
	"completed_within_time" boolean DEFAULT false NOT NULL,
	"is_mastered" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_practice_user_week_unique" UNIQUE("user_id", "week_id")
);

CREATE TABLE "practice_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_id" integer NOT NULL REFERENCES "study_weeks"("id"),
	"type" text NOT NULL,
	"content" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer REFERENCES "users"("id"),
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" integer,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ############################################################################
-- 8. OUTROS (PROGRESSOS E MARCOS ADICIONAIS)
-- ############################################################################

CREATE TABLE "season_final_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL REFERENCES "seasons"("id"),
	"title" text DEFAULT 'Desafio Final' NOT NULL,
	"description" text,
	"questions" text NOT NULL,
	"question_count" integer DEFAULT 15 NOT NULL,
	"time_limit_seconds" integer DEFAULT 150 NOT NULL,
	"xp_reward" integer DEFAULT 100 NOT NULL,
	"perfect_xp_bonus" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "user_final_challenge_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"challenge_id" integer NOT NULL REFERENCES "season_final_challenges"("id"),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"time_spent_seconds" integer,
	"correct_answers" integer DEFAULT 0 NOT NULL,
	"total_questions" integer DEFAULT 15 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"is_perfect" boolean DEFAULT false NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"answers_given" text,
	"challenge_token" text,
	CONSTRAINT "user_final_challenge_progress_user_id_challenge_id_unique" UNIQUE("user_id","challenge_id")
);

CREATE TABLE "weekly_goal_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"week_key" text NOT NULL,
	"lessons_completed" integer DEFAULT 0 NOT NULL,
	"verses_read" integer DEFAULT 0 NOT NULL,
	"missions_completed" integer DEFAULT 0 NOT NULL,
	"devotionals_read" integer DEFAULT 0 NOT NULL,
	"is_goal_met" boolean DEFAULT false NOT NULL,
	"xp_bonus" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_goal_progress_user_id_week_key_unique" UNIQUE("user_id","week_key")
);

CREATE TABLE "weekly_practice_bonus" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"week_key" text NOT NULL,
	"bonus_xp" integer DEFAULT 50 NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_practice_bonus_user_week_unique" UNIQUE("user_id", "week_key")
);

CREATE TABLE "devotional_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"devotional_id" integer NOT NULL REFERENCES "devotionals"("id"),
	"read_at" timestamp DEFAULT now() NOT NULL,
	"week_key" text,
	CONSTRAINT "devotional_readings_user_id_devotional_id_unique" UNIQUE("user_id","devotional_id")
);

CREATE TABLE "user_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"achievement_id" integer NOT NULL REFERENCES "achievements"("id"),
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievements_user_id_achievement_id_unique" UNIQUE("user_id","achievement_id")
);

CREATE TABLE "verse_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"verse_id" integer NOT NULL REFERENCES "bible_verses"("id"),
	"read_at" timestamp DEFAULT now() NOT NULL,
	"hearts_recovered" integer DEFAULT 1 NOT NULL
);

CREATE TABLE "daily_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"activity_date" text NOT NULL,
	"minutes_studied" integer DEFAULT 0 NOT NULL,
	"lessons_completed" integer DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"streak_maintained" boolean DEFAULT false NOT NULL,
	CONSTRAINT "daily_activity_user_id_activity_date_unique" UNIQUE("user_id","activity_date")
);
