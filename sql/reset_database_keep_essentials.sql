-- ============================================================
-- SQL PARA RESET DO BANCO DE DADOS - UMP EMAÚS
-- Data: Janeiro 2026
-- Compatível com Neon PostgreSQL
-- ============================================================
-- 
-- PRESERVA:
--   - Membros (users)
--   - Temporadas (seasons)
--   - Revistas/Semanas de estudo (study_weeks)
--   - Lições (study_lessons)
--   - Unidades das lições (study_units)
--   - Eventos de estudo (study_events)
--   - Lições de eventos (study_event_lessons)
--   - Cards colecionáveis (collectible_cards)
--   - Categorias da loja (shop_categories)
--   - Produtos (shop_items)
--   - Imagens dos produtos (shop_item_images)
--   - Tamanhos (shop_item_sizes)
--   - Tabela de medidas (shop_item_size_charts)
--
-- LIMPA:
--   - Eleições, votos, candidatos
--   - Devocionais e comentários
--   - Eventos do site
--   - Tesouraria (pagamentos, empréstimos)
--   - Pedidos da loja e carrinho
--   - Progresso de usuários no estudo
--   - Rankings e XP
--   - Notificações e logs
--
-- ============================================================

-- ============================================================
-- PARTE 1: LIMPAR TABELAS COM CASCADE
-- (ordem: tabelas dependentes primeiro)
-- ============================================================

-- Scheduler e notificações
TRUNCATE TABLE sent_scheduler_reminders RESTART IDENTITY CASCADE;
TRUNCATE TABLE sent_event_notifications RESTART IDENTITY CASCADE;
TRUNCATE TABLE treasury_notifications_log RESTART IDENTITY CASCADE;
TRUNCATE TABLE push_subscriptions RESTART IDENTITY CASCADE;
TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;

-- Loja - pedidos e carrinho (mantém produtos)
TRUNCATE TABLE shop_installments RESTART IDENTITY CASCADE;
TRUNCATE TABLE shop_order_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE shop_orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE shop_cart_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE promo_codes RESTART IDENTITY CASCADE;

-- Tesouraria
TRUNCATE TABLE member_ump_payments RESTART IDENTITY CASCADE;
TRUNCATE TABLE member_percapta_payments RESTART IDENTITY CASCADE;
TRUNCATE TABLE treasury_loan_installments RESTART IDENTITY CASCADE;
TRUNCATE TABLE treasury_loans RESTART IDENTITY CASCADE;
TRUNCATE TABLE treasury_entries RESTART IDENTITY CASCADE;
TRUNCATE TABLE treasury_receipts RESTART IDENTITY CASCADE;
TRUNCATE TABLE treasury_settings RESTART IDENTITY CASCADE;
TRUNCATE TABLE treasury_expense_categories RESTART IDENTITY CASCADE;

-- Eventos do site
TRUNCATE TABLE event_confirmations RESTART IDENTITY CASCADE;
TRUNCATE TABLE event_fees RESTART IDENTITY CASCADE;

-- Progresso de usuário em estudo (mantém estrutura das lições)
TRUNCATE TABLE user_event_progress RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_cards RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_unit_progress RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_lesson_progress RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_season_progress RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_final_challenge_progress RESTART IDENTITY CASCADE;
TRUNCATE TABLE season_rankings RESTART IDENTITY CASCADE;

-- Atividade e progresso
TRUNCATE TABLE weekly_goal_progress RESTART IDENTITY CASCADE;
TRUNCATE TABLE weekly_practice_bonus RESTART IDENTITY CASCADE;
TRUNCATE TABLE achievement_xp RESTART IDENTITY CASCADE;
TRUNCATE TABLE daily_mission_xp RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_achievements RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_daily_missions RESTART IDENTITY CASCADE;
TRUNCATE TABLE daily_activity RESTART IDENTITY CASCADE;
TRUNCATE TABLE xp_transactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE leaderboard_entries RESTART IDENTITY CASCADE;
TRUNCATE TABLE verse_readings RESTART IDENTITY CASCADE;
TRUNCATE TABLE devotional_readings RESTART IDENTITY CASCADE;

-- Sistema social
TRUNCATE TABLE member_encouragements RESTART IDENTITY CASCADE;
TRUNCATE TABLE achievement_likes RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_online_status RESTART IDENTITY CASCADE;

-- Perfil de estudo (resetar mas manter usuário)
TRUNCATE TABLE study_profiles RESTART IDENTITY CASCADE;

-- Conquistas (definições ficam, progresso limpa)
TRUNCATE TABLE achievements RESTART IDENTITY CASCADE;

-- Missões diárias (definições)
TRUNCATE TABLE daily_mission_content RESTART IDENTITY CASCADE;
TRUNCATE TABLE daily_missions RESTART IDENTITY CASCADE;

-- Versículos
TRUNCATE TABLE bible_verses RESTART IDENTITY CASCADE;

-- Devocionais
TRUNCATE TABLE devotional_comments RESTART IDENTITY CASCADE;
TRUNCATE TABLE devotionals RESTART IDENTITY CASCADE;

-- Eventos do site
TRUNCATE TABLE site_events RESTART IDENTITY CASCADE;

-- Instagram e banners
TRUNCATE TABLE banner_highlights RESTART IDENTITY CASCADE;
TRUNCATE TABLE banners RESTART IDENTITY CASCADE;
TRUNCATE TABLE instagram_posts RESTART IDENTITY CASCADE;

-- Pedidos de oração
TRUNCATE TABLE prayer_reactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE prayer_requests RESTART IDENTITY CASCADE;

-- Eleições
TRUNCATE TABLE votes RESTART IDENTITY CASCADE;
TRUNCATE TABLE election_winners RESTART IDENTITY CASCADE;
TRUNCATE TABLE election_attendance RESTART IDENTITY CASCADE;
TRUNCATE TABLE candidates RESTART IDENTITY CASCADE;
TRUNCATE TABLE election_positions RESTART IDENTITY CASCADE;
TRUNCATE TABLE elections RESTART IDENTITY CASCADE;
TRUNCATE TABLE positions RESTART IDENTITY CASCADE;

-- Verificação
TRUNCATE TABLE pdf_verifications RESTART IDENTITY CASCADE;
TRUNCATE TABLE verification_codes RESTART IDENTITY CASCADE;

-- ============================================================
-- PARTE 2: CRIAR CATEGORIAS PADRÃO DE DESPESAS
-- ============================================================

INSERT INTO treasury_expense_categories (name, is_default) VALUES
  ('Percapta', true),
  ('Empréstimo', true),
  ('Eventos', true),
  ('Marketing', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- PARTE 3: CRIAR POSIÇÕES PADRÃO PARA ELEIÇÕES
-- ============================================================

INSERT INTO positions (name) VALUES
  ('Presidente'),
  ('Vice-Presidente'),
  ('Primeiro Secretário'),
  ('Segundo Secretário'),
  ('Primeiro Tesoureiro'),
  ('Segundo Tesoureiro')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================

SELECT 'Dados preservados:' as status;
SELECT 'Membros:', COUNT(*) FROM users;
SELECT 'Temporadas:', COUNT(*) FROM seasons;
SELECT 'Semanas de estudo:', COUNT(*) FROM study_weeks;
SELECT 'Lições:', COUNT(*) FROM study_lessons;
SELECT 'Unidades:', COUNT(*) FROM study_units;
SELECT 'Eventos de estudo:', COUNT(*) FROM study_events;
SELECT 'Lições de eventos:', COUNT(*) FROM study_event_lessons;
SELECT 'Cards colecionáveis:', COUNT(*) FROM collectible_cards;
SELECT 'Categorias da loja:', COUNT(*) FROM shop_categories;
SELECT 'Produtos:', COUNT(*) FROM shop_items;
SELECT 'Imagens de produtos:', COUNT(*) FROM shop_item_images;
SELECT 'Tamanhos:', COUNT(*) FROM shop_item_sizes;

SELECT 'Reset concluído com sucesso!' as resultado;
