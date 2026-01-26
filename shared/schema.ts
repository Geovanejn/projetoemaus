import { sql } from "drizzle-orm";
import { pgTable, serial, integer, text, boolean, unique, timestamp, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import crypto from "crypto";

// Utility function to generate Gravatar URL from email
export function getGravatarUrl(email: string): string {
  const hash = crypto
    .createHash("md5")
    .update(email.toLowerCase().trim())
    .digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=200`;
}

// Utility function to generate verification hash for PDF
export function generatePdfVerificationHash(electionId: number, electionName: string, timestamp: string): string {
  const data = `${electionId}-${electionName}-${timestamp}-${Math.random()}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

// Secretaria types - espiritualidade, marketing e tesouraria
export type Secretaria = "none" | "espiritualidade" | "marketing" | "tesouraria" | null;

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  hasPassword: boolean("has_password").notNull().default(false),
  photoUrl: text("photo_url"),
  birthdate: text("birthdate"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isMember: boolean("is_member").notNull().default(true),
  activeMember: boolean("active_member").notNull().default(true),
  secretaria: text("secretaria"),
  isTreasurer: boolean("is_treasurer").notNull().default(false),
  activeMemberSince: timestamp("active_member_since"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Positions table (fixed positions)
export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
});

export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

// Elections table
export const elections = pgTable("elections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

// Election Winners table - tracks which candidate won each position (for tie resolution in 3rd scrutiny)
export const electionWinners = pgTable("election_winners", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull().references(() => elections.id),
  positionId: integer("position_id").notNull().references(() => positions.id),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id),
  wonAtScrutiny: integer("won_at_scrutiny").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertElectionSchema = createInsertSchema(elections).omit({
  id: true,
  isActive: true,
  createdAt: true,
});

export type InsertElection = z.infer<typeof insertElectionSchema>;
export type Election = typeof elections.$inferSelect;

export const insertElectionWinnerSchema = createInsertSchema(electionWinners).omit({
  id: true,
  createdAt: true,
});

export type InsertElectionWinner = z.infer<typeof insertElectionWinnerSchema>;
export type ElectionWinner = typeof electionWinners.$inferSelect;

// Election Positions table - tracks each position within an election sequentially
export const electionPositions = pgTable("election_positions", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull().references(() => elections.id),
  positionId: integer("position_id").notNull().references(() => positions.id),
  orderIndex: integer("order_index").notNull(),
  status: text("status").notNull().default("pending"),
  currentScrutiny: integer("current_scrutiny").notNull().default(1),
  openedAt: timestamp("opened_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertElectionPositionSchema = createInsertSchema(electionPositions).omit({
  id: true,
  status: true,
  currentScrutiny: true,
  createdAt: true,
});

export type InsertElectionPosition = z.infer<typeof insertElectionPositionSchema>;
export type ElectionPosition = typeof electionPositions.$inferSelect;

// Election Attendance table - tracks which members are present for voting per position
export const electionAttendance = pgTable("election_attendance", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull().references(() => elections.id),
  electionPositionId: integer("election_position_id").references(() => electionPositions.id),
  memberId: integer("member_id").notNull().references(() => users.id),
  isPresent: boolean("is_present").notNull().default(false),
  markedAt: timestamp("marked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertElectionAttendanceSchema = createInsertSchema(electionAttendance).omit({
  id: true,
  createdAt: true,
});

export type InsertElectionAttendance = z.infer<typeof insertElectionAttendanceSchema>;
export type ElectionAttendance = typeof electionAttendance.$inferSelect;

// Candidates table
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  positionId: integer("position_id").notNull().references(() => positions.id),
  electionId: integer("election_id").notNull().references(() => elections.id),
}, (table) => ({
  uniqueCandidate: unique().on(table.userId, table.positionId, table.electionId),
}));

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
});

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

// Votes table
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  voterId: integer("voter_id").notNull().references(() => users.id),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id),
  positionId: integer("position_id").notNull().references(() => positions.id),
  electionId: integer("election_id").notNull().references(() => elections.id),
  scrutinyRound: integer("scrutiny_round").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;

// Verification Codes table
export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isPasswordReset: boolean("is_password_reset").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  createdAt: true,
});

export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;

// PDF Verification table
export const pdfVerifications = pgTable("pdf_verifications", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull().references(() => elections.id),
  verificationHash: text("verification_hash").notNull().unique(),
  presidentName: text("president_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPdfVerificationSchema = createInsertSchema(pdfVerifications).omit({
  id: true,
  createdAt: true,
});

export type InsertPdfVerification = z.infer<typeof insertPdfVerificationSchema>;
export type PdfVerification = typeof pdfVerifications.$inferSelect;

// Auth schemas
export const requestCodeSchema = z.object({
  email: z.string().email("Email inválido"),
  isPasswordReset: z.boolean().optional(),
});

export type RequestCodeData = z.infer<typeof requestCodeSchema>;

export const verifyCodeSchema = z.object({
  email: z.string().email("Email inválido"),
  code: z.string().length(6, "Código deve ter 6 dígitos"),
});

export type VerifyCodeData = z.infer<typeof verifyCodeSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export type LoginData = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  fullName: z.string().min(2, "Nome completo é obrigatório"),
});

export type RegisterData = z.infer<typeof registerSchema>;

export const addMemberSchema = z.object({
  fullName: z.string().min(2, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido"),
  photoUrl: z.string().optional(),
  birthdate: z.string().optional(),
  activeMember: z.boolean().default(true),
  isTreasurer: z.boolean().optional(),
  secretaria: z.string().optional(),
});

export type AddMemberData = z.infer<typeof addMemberSchema>;

export const updateMemberSchema = z.object({
  fullName: z.string().min(2, "Nome completo é obrigatório").optional(),
  email: z.string().email("Email inválido").optional(),
  photoUrl: z.string().optional(),
  birthdate: z.string().optional(),
  activeMember: z.boolean().optional(),
  isTreasurer: z.boolean().optional(),
  secretaria: z.string().optional(),
});

export type UpdateMemberData = z.infer<typeof updateMemberSchema>;

export const setPasswordSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export type SetPasswordData = z.infer<typeof setPasswordSchema>;

export const loginPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export type LoginPasswordData = z.infer<typeof loginPasswordSchema>;

// Response types
export type AuthResponse = {
  user: Omit<User, "password">;
  token: string;
};

export type CandidateWithDetails = Candidate & {
  positionName: string;
  electionName: string;
  voteCount?: number;
  photoUrl?: string;
};

export type PositionWithCandidates = Position & {
  candidates: Candidate[];
};

export type ElectionResults = {
  electionId: number;
  electionName: string;
  isActive: boolean;
  currentScrutiny: number;
  presentCount: number;
  createdAt: string;
  closedAt: string | null;
  positions: Array<{
    positionId: number;
    positionName: string;
    status: string;
    currentScrutiny: number;
    orderIndex: number;
    totalVoters: number;
    majorityThreshold: number;
    needsNextScrutiny: boolean;
    winnerId?: number;
    winnerScrutiny?: number;
    candidates: Array<{
      candidateId: number;
      candidateName: string;
      candidateEmail: string;
      photoUrl: string;
      voteCount: number;
      isElected: boolean;
      electedInScrutiny?: number;
      wonAtScrutiny?: number;
    }>;
  }>;
};

export type VoterActivity = {
  voterId: number;
  voterName: string;
  voterEmail: string;
  positionName: string;
  candidateName: string;
  scrutinyRound: number;
  votedAt: string;
};

export type VoterAttendance = {
  voterId: number;
  voterName: string;
  voterEmail: string;
  firstVoteAt: string;
  totalVotes: number;
};

export type ElectionAuditData = {
  results: ElectionResults;
  electionMetadata: {
    createdAt: string;
    closedAt?: string;
    totalPositions: number;
    completedPositions: number;
    totalMembers: number;
  };
  voterAttendance: VoterAttendance[];
  voteTimeline: VoterActivity[];
  scrutinyHistory?: Array<{
    positionId: number;
    positionName: string;
    scrutinies: Array<{
      round: number;
      candidates: Array<{
        candidateId: number;
        candidateName: string;
        candidateEmail: string;
        voteCount: number;
        advancedToNext: boolean;
        isElected: boolean;
      }>;
    }>;
  }>;
};

// ==================== DEVOCIONAIS ====================

export const mobileCropDataSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100),
  height: z.number().min(0).max(100),
});

export type MobileCropData = z.infer<typeof mobileCropDataSchema>;

export const devotionals = pgTable("devotionals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  verse: text("verse").notNull(),
  verseReference: text("verse_reference").notNull(),
  content: text("content").notNull(),
  contentHtml: text("content_html"),
  summary: text("summary"),
  prayer: text("prayer"),
  imageUrl: text("image_url"),
  mobileCropData: text("mobile_crop_data"),
  author: text("author"),
  // Media fields
  youtubeUrl: text("youtube_url"),
  instagramUrl: text("instagram_url"),
  audioUrl: text("audio_url"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  scheduledAt: timestamp("scheduled_at"),
  isPublished: boolean("is_published").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDevotionalSchema = createInsertSchema(devotionals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDevotional = z.infer<typeof insertDevotionalSchema>;
export type Devotional = typeof devotionals.$inferSelect;

// ==================== EVENTOS ====================

export type EventCategory = "geral" | "culto" | "retiro" | "estudo" | "social" | "confraternizacao";

export const siteEvents = pgTable("site_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  shortDescription: text("short_description"),
  imageUrl: text("image_url"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  time: text("time"),
  location: text("location"),
  locationUrl: text("location_url"),
  price: text("price"),
  registrationUrl: text("registration_url"),
  category: text("category").notNull().default("geral"),
  isPublished: boolean("is_published").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  isAllDay: boolean("is_all_day").notNull().default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSiteEventSchema = createInsertSchema(siteEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema - whitelist of allowed fields for PATCH
export const updateSiteEventSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  locationUrl: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
  registrationUrl: z.string().nullable().optional(),
  category: z.string().optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isAllDay: z.boolean().optional(),
}).strict();

export type InsertSiteEvent = z.infer<typeof insertSiteEventSchema>;
export type UpdateSiteEvent = z.infer<typeof updateSiteEventSchema>;
export type SiteEvent = typeof siteEvents.$inferSelect;

// ==================== POSTS INSTAGRAM ====================

export const instagramPosts = pgTable("instagram_posts", {
  id: serial("id").primaryKey(),
  instagramId: text("instagram_id"),
  caption: text("caption"),
  imageUrl: text("image_url").notNull(),
  videoUrl: text("video_url"),
  mediaType: text("media_type").default("IMAGE"),
  permalink: text("permalink"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  postedAt: timestamp("posted_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  isFeaturedBanner: boolean("is_featured_banner").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInstagramPostSchema = createInsertSchema(instagramPosts).omit({
  id: true,
  createdAt: true,
});

export type InsertInstagramPost = z.infer<typeof insertInstagramPostSchema>;
export type InstagramPost = typeof instagramPosts.$inferSelect;

// ==================== BANNER HIGHLIGHTS ====================

export const bannerHighlights = pgTable("banner_highlights", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBannerHighlightSchema = createInsertSchema(bannerHighlights).omit({
  id: true,
  createdAt: true,
});

export type InsertBannerHighlight = z.infer<typeof insertBannerHighlightSchema>;
export type BannerHighlight = typeof bannerHighlights.$inferSelect;

// ==================== PEDIDOS DE ORACAO ====================

export type PrayerCategory = "saude" | "familia" | "trabalho" | "espiritual" | "relacionamento" | "outros";
export type PrayerStatus = "pending" | "approved" | "rejected" | "praying" | "answered" | "archived";

export const prayerRequests = pgTable("prayer_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  whatsapp: text("whatsapp"),
  category: text("category").notNull().default("outros"),
  request: text("request").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  prayedBy: integer("prayed_by").references(() => users.id),
  prayedAt: timestamp("prayed_at"),
  isModerated: boolean("is_moderated").notNull().default(false),
  moderatedBy: integer("moderated_by").references(() => users.id),
  moderatedAt: timestamp("moderated_at"),
  isApproved: boolean("is_approved").notNull().default(false),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  inPrayerCount: integer("in_prayer_count").notNull().default(0),
  hasProfanity: boolean("has_profanity").default(false),
  hasHateSpeech: boolean("has_hate_speech").default(false),
  hasSexualContent: boolean("has_sexual_content").default(false),
  moderationDetails: text("moderation_details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPrayerRequestSchema = createInsertSchema(prayerRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isModerated: true,
  moderatedBy: true,
  moderatedAt: true,
  isApproved: true,
  approvedAt: true,
  approvedBy: true,
  inPrayerCount: true,
  hasProfanity: true,
  hasHateSpeech: true,
  hasSexualContent: true,
  moderationDetails: true,
});

export type InsertPrayerRequest = z.infer<typeof insertPrayerRequestSchema>;
export type PrayerRequest = typeof prayerRequests.$inferSelect;

// ==================== REACOES DE ORACAO (ESTOU EM ORACAO) ====================

export const prayerReactions = pgTable("prayer_reactions", {
  id: serial("id").primaryKey(),
  prayerRequestId: integer("prayer_request_id").notNull().references(() => prayerRequests.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueReaction: unique().on(table.prayerRequestId, table.sessionId),
}));

export const insertPrayerReactionSchema = createInsertSchema(prayerReactions).omit({
  id: true,
  createdAt: true,
});

export type InsertPrayerReaction = z.infer<typeof insertPrayerReactionSchema>;
export type PrayerReaction = typeof prayerReactions.$inferSelect;

// ==================== COMENTARIOS DE DEVOCIONAIS ====================

export const devotionalComments = pgTable("devotional_comments", {
  id: serial("id").primaryKey(),
  devotionalId: integer("devotional_id").notNull().references(() => devotionals.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").notNull().default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  isHighlighted: boolean("is_highlighted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDevotionalCommentSchema = createInsertSchema(devotionalComments).omit({
  id: true,
  isApproved: true,
  approvedBy: true,
  approvedAt: true,
  isHighlighted: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDevotionalComment = z.infer<typeof insertDevotionalCommentSchema>;
export type DevotionalComment = typeof devotionalComments.$inferSelect;

// ==================== BANNERS DO CARROSSEL ====================

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url"),
  backgroundColor: text("background_color"),
  linkUrl: text("link_url"),
  linkText: text("link_text"),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBannerSchema = createInsertSchema(banners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema - whitelist of allowed fields for PATCH
export const updateBannerSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  backgroundColor: z.string().nullable().optional(),
  linkUrl: z.string().nullable().optional(),
  linkText: z.string().nullable().optional(),
  orderIndex: z.number().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
}).strict();

export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type UpdateBanner = z.infer<typeof updateBannerSchema>;
export type Banner = typeof banners.$inferSelect;

// ==================== MEMBROS DA DIRETORIA ====================

export type BoardPosition = "presidente" | "vice_presidente" | "primeiro_secretario" | "segundo_secretario" | "tesoureiro" | "conselheiro";

export const boardMembers = pgTable("board_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  position: text("position").notNull(),
  photoUrl: text("photo_url"),
  instagram: text("instagram"),
  whatsapp: text("whatsapp"),
  bio: text("bio"),
  termStart: text("term_start").notNull(),
  termEnd: text("term_end").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  isCurrent: boolean("is_current").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBoardMemberSchema = createInsertSchema(boardMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema - whitelist of allowed fields for PATCH
export const updateBoardMemberSchema = z.object({
  userId: z.number().nullable().optional(),
  name: z.string().optional(),
  position: z.string().optional(),
  photoUrl: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  termStart: z.string().optional(),
  termEnd: z.string().optional(),
  orderIndex: z.number().optional(),
  isCurrent: z.boolean().optional(),
}).strict();

export type InsertBoardMember = z.infer<typeof insertBoardMemberSchema>;
export type UpdateBoardMember = z.infer<typeof updateBoardMemberSchema>;
export type BoardMember = typeof boardMembers.$inferSelect;

// ==================== CONTEUDO DO SITE ====================

export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  page: text("page").notNull(),
  section: text("section").notNull(),
  title: text("title"),
  content: text("content"),
  imageUrl: text("image_url"),
  metadata: text("metadata"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniquePageSection: unique().on(table.page, table.section),
}));

export const insertSiteContentSchema = createInsertSchema(siteContent).omit({
  id: true,
  updatedAt: true,
});

export type InsertSiteContent = z.infer<typeof insertSiteContentSchema>;
export type SiteContent = typeof siteContent.$inferSelect;

// Daily Verse Stock - 60 background images that rotate every 60 days
export const dailyVerseStock = pgTable("daily_verse_stock", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(), // nature, contemplative, christian, meditation
  description: text("description"),
  orderIndex: integer("order_index").notNull(), // 1-60 for rotation
  lastUsedAt: timestamp("last_used_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDailyVerseStockSchema = createInsertSchema(dailyVerseStock).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyVerseStock = z.infer<typeof insertDailyVerseStockSchema>;
export type DailyVerseStock = typeof dailyVerseStock.$inferSelect;

// Daily Verse Posts - daily verse with AI-generated reflection
export const dailyVersePosts = pgTable("daily_verse_posts", {
  id: serial("id").primaryKey(),
  verse: text("verse").notNull(),
  reference: text("reference").notNull(),
  reflection: text("reflection"), // AI-generated reflection
  reflectionTitle: text("reflection_title"), // AI-generated title for the reflection
  highlightedKeywords: text("highlighted_keywords").array(), // AI-identified keywords to display in bold
  reflectionKeywords: text("reflection_keywords").array(), // AI-identified keywords for reflection (bold)
  reflectionReferences: text("reflection_references").array(), // Biblical references and quotes in reflection (italic)
  stockImageId: integer("stock_image_id").references(() => dailyVerseStock.id),
  imageUrl: text("image_url"), // cached image URL for the day
  verseShareImageUrl: text("verse_share_image_url"), // URL of the shared verse image (saved when shared via WhatsApp)
  reflectionShareImageUrl: text("reflection_share_image_url"), // URL of the shared reflection image (saved when shared via WhatsApp)
  publishedAt: timestamp("published_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  dateIdx: index("daily_verse_posts_published_idx").on(table.publishedAt),
}));

export const insertDailyVersePostSchema = createInsertSchema(dailyVersePosts).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyVersePost = z.infer<typeof insertDailyVersePostSchema>;
export type DailyVersePost = typeof dailyVersePosts.$inferSelect;

// Daily Verse Shares - track when users share the daily verse
export const dailyVerseShares = pgTable("daily_verse_shares", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  versePostId: integer("verse_post_id").references(() => dailyVersePosts.id),
  sharedAt: timestamp("shared_at").notNull().defaultNow(),
  platform: text("platform").notNull(), // 'whatsapp', 'instagram', 'download'
  shareDate: text("share_date").notNull(), // YYYY-MM-DD format for quick lookup
}, (table) => ({
  userDateIdx: index("daily_verse_shares_user_date_idx").on(table.userId, table.shareDate),
}));

export const insertDailyVerseShareSchema = createInsertSchema(dailyVerseShares).omit({
  id: true,
  sharedAt: true,
});

export type InsertDailyVerseShare = z.infer<typeof insertDailyVerseShareSchema>;
export type DailyVerseShare = typeof dailyVerseShares.$inferSelect;

// Birthday Share Images - store birthday images when shared via WhatsApp
export const birthdayShareImages = pgTable("birthday_share_images", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(), // URL of the shared birthday image
  shareDate: text("share_date").notNull(), // YYYY-MM-DD format
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  memberDateIdx: index("birthday_share_images_member_date_idx").on(table.memberId, table.shareDate),
}));

export const insertBirthdayShareImageSchema = createInsertSchema(birthdayShareImages).omit({
  id: true,
  createdAt: true,
});

export type InsertBirthdayShareImage = z.infer<typeof insertBirthdayShareImageSchema>;
export type BirthdayShareImage = typeof birthdayShareImages.$inferSelect;

// ==================== SISTEMA DE ESTUDOS (DUOLINGO-STYLE) ====================

export const studyProfiles = pgTable("study_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  totalXp: integer("total_xp").notNull().default(0),
  currentLevel: integer("current_level").notNull().default(1),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  hearts: integer("hearts").notNull().default(5),
  heartsMax: integer("hearts_max").notNull().default(5),
  heartsRefillAt: timestamp("hearts_refill_at"),
  lastActivityDate: text("last_activity_date"),
  dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(10),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  weeklyLessonsGoal: integer("weekly_lessons_goal").notNull().default(10),
  weeklyVersesGoal: integer("weekly_verses_goal").notNull().default(7),
  weeklyMissionsGoal: integer("weekly_missions_goal").notNull().default(3),
  weeklyDevotionalsGoal: integer("weekly_devotionals_goal").notNull().default(1),
  versesReadForRecovery: integer("verses_read_for_recovery").notNull().default(0),
  crystals: integer("crystals").notNull().default(0),
  streakFreezesAvailable: integer("streak_freezes_available").notNull().default(0),
  lastLessonCompletedAt: timestamp("last_lesson_completed_at"),
  streakWarningDay: integer("streak_warning_day").notNull().default(0),
  totalStreakFreezeUsed: integer("total_streak_freeze_used").notNull().default(0),
  consecutivePerfectLessons: integer("consecutive_perfect_lessons").notNull().default(0),
  consecutiveLessons: integer("consecutive_lessons").notNull().default(0),
  totalLessonsCompletedToday: integer("total_lessons_completed_today").notNull().default(0),
  lastLessonDate: text("last_lesson_date"),
  weeklyLessonsStreak: integer("weekly_lessons_streak").notNull().default(0),
  dailyVerseReadDate: text("daily_verse_read_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUser: unique().on(table.userId),
}));

export const insertStudyProfileSchema = createInsertSchema(studyProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStudyProfile = z.infer<typeof insertStudyProfileSchema>;
export type StudyProfile = typeof studyProfiles.$inferSelect;

// ==================== TRANSACOES DE CRISTAIS ====================

export type CrystalTransactionType = 
  | "perfect_lesson"
  | "perfect_streak_2"
  | "perfect_streak_3"
  | "perfect_streak_5"
  | "lesson_streak_3"
  | "lesson_streak_5"
  | "lesson_streak_7"
  | "first_lesson_of_day"
  | "weekly_lessons_streak"
  | "streak_milestone"
  | "weekly_goal"
  | "freeze_purchase"
  | "freeze_use"
  | "streak_repair"
  | "achievement"
  | "daily_bonus"
  | "admin_grant";

export const crystalTransactions = pgTable("crystal_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  balanceAfter: integer("balance_after").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCrystalTransactionSchema = createInsertSchema(crystalTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertCrystalTransaction = z.infer<typeof insertCrystalTransactionSchema>;
export type CrystalTransaction = typeof crystalTransactions.$inferSelect;

// ==================== HISTORICO DE CONGELAMENTO DE OFENSIVA ====================

export const streakFreezeHistory = pgTable("streak_freeze_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  usedAt: timestamp("used_at").notNull().defaultNow(),
  streakSaved: integer("streak_saved").notNull(),
  crystalsCost: integer("crystals_cost").notNull().default(0),
  wasAutomatic: boolean("was_automatic").notNull().default(false),
});

export const insertStreakFreezeHistorySchema = createInsertSchema(streakFreezeHistory).omit({
  id: true,
});

export type InsertStreakFreezeHistory = z.infer<typeof insertStreakFreezeHistorySchema>;
export type StreakFreezeHistory = typeof streakFreezeHistory.$inferSelect;

// ==================== MARCOS DE OFENSIVA (STREAK MILESTONES) ====================

export const streakMilestones = pgTable("streak_milestones", {
  id: serial("id").primaryKey(),
  days: integer("days").notNull().unique(),
  crystalReward: integer("crystal_reward").notNull(),
  xpReward: integer("xp_reward").notNull().default(0),
  title: text("title").notNull(),
  description: text("description"),
  badgeIcon: text("badge_icon"),
});

export const insertStreakMilestoneSchema = createInsertSchema(streakMilestones).omit({
  id: true,
});

export type InsertStreakMilestone = z.infer<typeof insertStreakMilestoneSchema>;
export type StreakMilestone = typeof streakMilestones.$inferSelect;

// ==================== MARCOS ALCANCADOS PELO USUARIO ====================

export const userStreakMilestones = pgTable("user_streak_milestones", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  milestoneId: integer("milestone_id").notNull().references(() => streakMilestones.id),
  achievedAt: timestamp("achieved_at").notNull().defaultNow(),
  crystalsAwarded: integer("crystals_awarded").notNull(),
  xpAwarded: integer("xp_awarded").notNull().default(0),
}, (table) => ({
  uniqueUserMilestone: unique().on(table.userId, table.milestoneId),
}));

export const insertUserStreakMilestoneSchema = createInsertSchema(userStreakMilestones).omit({
  id: true,
});

export type InsertUserStreakMilestone = z.infer<typeof insertUserStreakMilestoneSchema>;
export type UserStreakMilestone = typeof userStreakMilestones.$inferSelect;

// ==================== TEMPORADAS (SEASONS) ====================

export type SeasonStatus = "draft" | "processing" | "published" | "archived";

export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  pdfUrl: text("pdf_url"),
  aiExtractedTitle: text("ai_extracted_title"),
  status: text("status").notNull().default("draft"),
  isLocked: boolean("is_locked").notNull().default(false),
  isEnded: boolean("is_ended").notNull().default(false),
  endedAt: timestamp("ended_at"),
  totalLessons: integer("total_lessons").notNull().default(0),
  publishedAt: timestamp("published_at"),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdBy: integer("created_by").references(() => users.id),
  aiMetadata: text("ai_metadata"),
  cardId: integer("card_id").references(() => collectibleCards.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSeasonSchema = createInsertSchema(seasons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema - whitelist of allowed fields for PATCH/PUT
export const updateSeasonSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  pdfUrl: z.string().nullable().optional(),
  aiExtractedTitle: z.string().nullable().optional(),
  status: z.enum(["draft", "processing", "published", "archived"]).optional(),
  isLocked: z.boolean().optional(),
  isEnded: z.boolean().optional(),
  endedAt: z.coerce.date().nullable().optional(),
  totalLessons: z.number().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  aiMetadata: z.string().nullable().optional(),
  cardId: z.number().nullable().optional(),
}).strict();

export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type UpdateSeason = z.infer<typeof updateSeasonSchema>;
export type Season = typeof seasons.$inferSelect;

// ==================== DESAFIO FINAL DA TEMPORADA ====================

export const seasonFinalChallenges = pgTable("season_final_challenges", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  title: text("title").notNull().default("Desafio Final"),
  description: text("description"),
  questions: text("questions").notNull(),
  questionCount: integer("question_count").notNull().default(15),
  timeLimitSeconds: integer("time_limit_seconds").notNull().default(150),
  xpReward: integer("xp_reward").notNull().default(100),
  perfectXpBonus: integer("perfect_xp_bonus").notNull().default(50),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSeasonFinalChallengeSchema = createInsertSchema(seasonFinalChallenges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSeasonFinalChallenge = z.infer<typeof insertSeasonFinalChallengeSchema>;
export type SeasonFinalChallenge = typeof seasonFinalChallenges.$inferSelect;

// ==================== PROGRESSO DO USUARIO NO DESAFIO FINAL ====================

export const userFinalChallengeProgress = pgTable("user_final_challenge_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  challengeId: integer("challenge_id").notNull().references(() => seasonFinalChallenges.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  timeSpentSeconds: integer("time_spent_seconds"),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(15),
  xpEarned: integer("xp_earned").notNull().default(0),
  isPerfect: boolean("is_perfect").notNull().default(false),
  isCompleted: boolean("is_completed").notNull().default(false),
  answersGiven: text("answers_given"),
  challengeToken: text("challenge_token"),
}, (table) => ({
  uniqueUserChallenge: unique().on(table.userId, table.challengeId),
}));

export const insertUserFinalChallengeProgressSchema = createInsertSchema(userFinalChallengeProgress).omit({
  id: true,
});

export type InsertUserFinalChallengeProgress = z.infer<typeof insertUserFinalChallengeProgressSchema>;
export type UserFinalChallengeProgress = typeof userFinalChallengeProgress.$inferSelect;

// ==================== PROGRESSO DO USUARIO NA TEMPORADA ====================

export const userSeasonProgress = pgTable("user_season_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
  totalLessons: integer("total_lessons").notNull().default(0),
  bonusLessonsCompleted: integer("bonus_lessons_completed").notNull().default(0),
  xpEarned: integer("xp_earned").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalAnswers: integer("total_answers").notNull().default(0),
  heartsLost: integer("hearts_lost").notNull().default(0),
  finalChallengeCompleted: boolean("final_challenge_completed").notNull().default(false),
  finalChallengePerfect: boolean("final_challenge_perfect").notNull().default(false),
  isMastered: boolean("is_mastered").notNull().default(false),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  lastActivityAt: timestamp("last_activity_at"),
}, (table) => ({
  uniqueUserSeason: unique().on(table.userId, table.seasonId),
}));

export const insertUserSeasonProgressSchema = createInsertSchema(userSeasonProgress).omit({
  id: true,
});

export type InsertUserSeasonProgress = z.infer<typeof insertUserSeasonProgressSchema>;
export type UserSeasonProgress = typeof userSeasonProgress.$inferSelect;

// ==================== RANKING POR TEMPORADA ====================

export const seasonRankings = pgTable("season_rankings", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  userId: integer("user_id").notNull().references(() => users.id),
  xpEarned: integer("xp_earned").notNull().default(0),
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
  correctPercentage: integer("correct_percentage").notNull().default(0),
  finalChallengeScore: integer("final_challenge_score"),
  isMastered: boolean("is_mastered").notNull().default(false),
  rankPosition: integer("rank_position"),
  isWinner: boolean("is_winner").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueSeasonUser: unique().on(table.seasonId, table.userId),
}));

export const insertSeasonRankingSchema = createInsertSchema(seasonRankings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSeasonRanking = z.infer<typeof insertSeasonRankingSchema>;
export type SeasonRanking = typeof seasonRankings.$inferSelect;

// ==================== PROGRESSO DA META SEMANAL ====================

export const weeklyGoalProgress = pgTable("weekly_goal_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  weekKey: text("week_key").notNull(),
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
  versesRead: integer("verses_read").notNull().default(0),
  missionsCompleted: integer("missions_completed").notNull().default(0),
  devotionalsRead: integer("devotionals_read").notNull().default(0),
  isGoalMet: boolean("is_goal_met").notNull().default(false),
  xpBonus: integer("xp_bonus").notNull().default(0),
  weeklyBonusDistributed: boolean("weekly_bonus_distributed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserWeek: unique().on(table.userId, table.weekKey),
}));

export const insertWeeklyGoalProgressSchema = createInsertSchema(weeklyGoalProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWeeklyGoalProgress = z.infer<typeof insertWeeklyGoalProgressSchema>;
export type WeeklyGoalProgress = typeof weeklyGoalProgress.$inferSelect;

// ==================== BONUS PRATICO SEMANAL (IMUTAVEL - SINGLE SOURCE OF TRUTH) ====================
// This table stores IMMUTABLE weekly bonuses (50 XP per week when goal is met)
// Used for all leaderboard calculations - never recalculated or modified
export const weeklyPracticeBonus = pgTable("weekly_practice_bonus", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  weekKey: text("week_key").notNull(),
  bonusXp: integer("bonus_xp").notNull().default(50),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserWeekBonus: unique().on(table.userId, table.weekKey),
}));

export const insertWeeklyPracticeBonusSchema = createInsertSchema(weeklyPracticeBonus).omit({
  id: true,
  earnedAt: true,
});

export type InsertWeeklyPracticeBonus = z.infer<typeof insertWeeklyPracticeBonusSchema>;
export type WeeklyPracticeBonus = typeof weeklyPracticeBonus.$inferSelect;

// ==================== XP DE CONQUISTAS (IMUTAVEL - SINGLE SOURCE OF TRUTH) ====================
// This table stores IMMUTABLE achievement XP rewards
// Used for global and annual leaderboard calculations - never recalculated or modified
export const achievementXp = pgTable("achievement_xp", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id),
  xpReward: integer("xp_reward").notNull(),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserAchievement: unique().on(table.userId, table.achievementId),
}));

export const insertAchievementXpSchema = createInsertSchema(achievementXp).omit({
  id: true,
  earnedAt: true,
});

export type InsertAchievementXp = z.infer<typeof insertAchievementXpSchema>;
export type AchievementXp = typeof achievementXp.$inferSelect;

// ==================== XP DE MISSÕES DIÁRIAS (IMUTAVEL - SINGLE SOURCE OF TRUTH) ====================
// This table stores IMMUTABLE daily mission XP rewards (10 XP per mission + 25 XP bonus for all 5)
// Used for global and annual leaderboard calculations - never recalculated or modified
export const dailyMissionXp = pgTable("daily_mission_xp", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  missionDate: text("mission_date").notNull(),
  missionXp: integer("mission_xp").notNull(),
  bonusXp: integer("bonus_xp").notNull().default(0),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserMissionDate: unique().on(table.userId, table.missionDate),
}));

export const insertDailyMissionXpSchema = createInsertSchema(dailyMissionXp).omit({
  id: true,
  earnedAt: true,
});

export type InsertDailyMissionXp = z.infer<typeof insertDailyMissionXpSchema>;
export type DailyMissionXp = typeof dailyMissionXp.$inferSelect;

// ==================== LEITURA DE DEVOCIONAIS (CONFIRMACAO) ====================

export const devotionalReadings = pgTable("devotional_readings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  devotionalId: integer("devotional_id").notNull().references(() => devotionals.id),
  readAt: timestamp("read_at").notNull().defaultNow(),
  weekKey: text("week_key"),
}, (table) => ({
  uniqueUserDevotional: unique().on(table.userId, table.devotionalId),
}));

export const insertDevotionalReadingSchema = createInsertSchema(devotionalReadings).omit({
  id: true,
  readAt: true,
});

export type InsertDevotionalReading = z.infer<typeof insertDevotionalReadingSchema>;
export type DevotionalReading = typeof devotionalReadings.$inferSelect;

// ==================== SEMANAS DE ESTUDO (LEGADO - mantido para compatibilidade) ====================

export const studyWeeks = pgTable("study_weeks", {
  id: serial("id").primaryKey(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  pdfUrl: text("pdf_url"),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  createdBy: integer("created_by").references(() => users.id),
  aiMetadata: text("ai_metadata"),
  seasonId: integer("season_id").references(() => seasons.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueWeek: unique().on(table.weekNumber, table.year),
}));

export const insertStudyWeekSchema = createInsertSchema(studyWeeks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStudyWeek = z.infer<typeof insertStudyWeekSchema>;
export type StudyWeek = typeof studyWeeks.$inferSelect;

// ==================== LICOES DE ESTUDO ====================

export const studyLessons = pgTable("study_lessons", {
  id: serial("id").primaryKey(),
  studyWeekId: integer("study_week_id").references(() => studyWeeks.id),
  seasonId: integer("season_id").references(() => seasons.id),
  orderIndex: integer("order_index").notNull(),
  lessonNumber: integer("lesson_number"),
  title: text("title").notNull(),
  type: text("type").notNull().default("study"),
  description: text("description"),
  xpReward: integer("xp_reward").notNull().default(10),
  estimatedMinutes: integer("estimated_minutes").notNull().default(5),
  icon: text("icon"),
  isBonus: boolean("is_bonus").notNull().default(false),
  hasBonusQuiz: boolean("has_bonus_quiz").notNull().default(false),
  bonusQuizQuestions: text("bonus_quiz_questions"),
  isLocked: boolean("is_locked").notNull().default(true),
  isReleased: boolean("is_released").notNull().default(false),
  releaseDate: timestamp("release_date"),
  unlockDate: timestamp("unlock_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStudyLessonSchema = createInsertSchema(studyLessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStudyLesson = z.infer<typeof insertStudyLessonSchema>;
export type StudyLesson = typeof studyLessons.$inferSelect;

export const studyUnits = pgTable("study_units", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => studyLessons.id),
  orderIndex: integer("order_index").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  xpValue: integer("xp_value").notNull().default(2),
  stage: text("stage").notNull().default("estude"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStudyUnitSchema = createInsertSchema(studyUnits).omit({
  id: true,
  createdAt: true,
});

export type InsertStudyUnit = z.infer<typeof insertStudyUnitSchema>;
export type StudyUnit = typeof studyUnits.$inferSelect;

export const bibleVerses = pgTable("bible_verses", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull(),
  text: text("text").notNull(),
  reflection: text("reflection"),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBibleVerseSchema = createInsertSchema(bibleVerses).omit({
  id: true,
  createdAt: true,
});

export type InsertBibleVerse = z.infer<typeof insertBibleVerseSchema>;
export type BibleVerse = typeof bibleVerses.$inferSelect;

export const userLessonProgress = pgTable("user_lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  lessonId: integer("lesson_id").notNull().references(() => studyLessons.id),
  status: text("status").notNull().default("locked"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  xpEarned: integer("xp_earned").notNull().default(0),
  mistakesCount: integer("mistakes_count").notNull().default(0),
  perfectScore: boolean("perfect_score").notNull().default(false),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
}, (table) => ({
  uniqueUserLesson: unique().on(table.userId, table.lessonId),
  userIdIdx: index("user_lesson_progress_user_id_idx").on(table.userId),
  userStatusIdx: index("user_lesson_progress_user_status_idx").on(table.userId, table.status),
  completedAtIdx: index("user_lesson_progress_completed_at_idx").on(table.completedAt),
}));

export const insertUserLessonProgressSchema = createInsertSchema(userLessonProgress).omit({
  id: true,
});

export type InsertUserLessonProgress = z.infer<typeof insertUserLessonProgressSchema>;
export type UserLessonProgress = typeof userLessonProgress.$inferSelect;

export const userUnitProgress = pgTable("user_unit_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  unitId: integer("unit_id").notNull().references(() => studyUnits.id),
  isCompleted: boolean("is_completed").notNull().default(false),
  answerGiven: text("answer_given"),
  isCorrect: boolean("is_correct"),
  attempts: integer("attempts").notNull().default(0),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  uniqueUserUnit: unique().on(table.userId, table.unitId),
  userIdIdx: index("user_unit_progress_user_id_idx").on(table.userId),
  userCompletedIdx: index("user_unit_progress_user_completed_idx").on(table.userId, table.isCompleted),
}));

export const insertUserUnitProgressSchema = createInsertSchema(userUnitProgress).omit({
  id: true,
});

export type InsertUserUnitProgress = z.infer<typeof insertUserUnitProgressSchema>;
export type UserUnitProgress = typeof userUnitProgress.$inferSelect;

export const verseReadings = pgTable("verse_readings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  verseId: integer("verse_id").notNull().references(() => bibleVerses.id),
  readAt: timestamp("read_at").notNull().defaultNow(),
  heartsRecovered: integer("hearts_recovered").notNull().default(1),
});

export const insertVerseReadingSchema = createInsertSchema(verseReadings).omit({
  id: true,
  readAt: true,
});

export type InsertVerseReading = z.infer<typeof insertVerseReadingSchema>;
export type VerseReading = typeof verseReadings.$inferSelect;

export const xpTransactions = pgTable("xp_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  source: text("source").notNull(),
  sourceId: integer("source_id"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("xp_transactions_user_id_idx").on(table.userId),
  userCreatedAtIdx: index("xp_transactions_user_created_at_idx").on(table.userId, table.createdAt),
}));

export const insertXpTransactionSchema = createInsertSchema(xpTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertXpTransaction = z.infer<typeof insertXpTransactionSchema>;
export type XpTransaction = typeof xpTransactions.$inferSelect;

export const dailyActivity = pgTable("daily_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  activityDate: text("activity_date").notNull(),
  minutesStudied: integer("minutes_studied").notNull().default(0),
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
  xpEarned: integer("xp_earned").notNull().default(0),
  streakMaintained: boolean("streak_maintained").notNull().default(false),
}, (table) => ({
  uniqueUserDate: unique().on(table.userId, table.activityDate),
}));

export const insertDailyActivitySchema = createInsertSchema(dailyActivity).omit({
  id: true,
});

export type InsertDailyActivity = z.infer<typeof insertDailyActivitySchema>;
export type DailyActivity = typeof dailyActivity.$inferSelect;

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  customIconUrl: text("custom_icon_url"),
  xpReward: integer("xp_reward").notNull().default(0),
  category: text("category").notNull(),
  requirement: text("requirement"),
  isSecret: boolean("is_secret").notNull().default(false),
  seasonId: integer("season_id").references(() => seasons.id),
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
});

export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserAchievement: unique().on(table.userId, table.achievementId),
}));

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  unlockedAt: true,
});

export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;

export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  periodType: text("period_type").notNull(),
  periodKey: text("period_key").notNull(),
  xpEarned: integer("xp_earned").notNull().default(0),
  rankPosition: integer("rank_position"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserPeriod: unique().on(table.userId, table.periodType, table.periodKey),
}));

export const insertLeaderboardEntrySchema = createInsertSchema(leaderboardEntries).omit({
  id: true,
  updatedAt: true,
});

export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardEntrySchema>;
export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;

// ==================== SISTEMA DE MISSÕES DIÁRIAS ====================

export const missionTypes = [
  "complete_lesson",
  "read_daily_verse",
  "timed_challenge",
  "quick_quiz",
  "bible_character",
  "perfect_answers",
  "memorize_theme",
  "simple_prayer",
  "bible_fact",
  "maintain_streak",
] as const;

export type MissionType = typeof missionTypes[number];

export const dailyMissions = pgTable("daily_missions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  xpReward: integer("xp_reward").notNull().default(10),
  requirement: text("requirement"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertDailyMissionSchema = createInsertSchema(dailyMissions).omit({
  id: true,
});

export type InsertDailyMission = z.infer<typeof insertDailyMissionSchema>;
export type DailyMission = typeof dailyMissions.$inferSelect;

export const userDailyMissions = pgTable("user_daily_missions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  missionId: integer("mission_id").notNull().references(() => dailyMissions.id),
  assignedDate: text("assigned_date").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  xpAwarded: integer("xp_awarded").notNull().default(0),
}, (table) => ({
  uniqueUserMissionDate: unique().on(table.userId, table.missionId, table.assignedDate),
  userDateIdx: index("user_daily_missions_user_date_idx").on(table.userId, table.assignedDate),
}));

export const insertUserDailyMissionSchema = createInsertSchema(userDailyMissions).omit({
  id: true,
  completed: true,
  completedAt: true,
  xpAwarded: true,
});

export type InsertUserDailyMission = z.infer<typeof insertUserDailyMissionSchema>;
export type UserDailyMission = typeof userDailyMissions.$inferSelect;

export const dailyMissionContent = pgTable("daily_mission_content", {
  id: serial("id").primaryKey(),
  contentDate: text("content_date").notNull().unique(),
  dailyVerse: text("daily_verse"),
  bibleFact: text("bible_fact"),
  bibleCharacter: text("bible_character"),
  dailyTheme: text("daily_theme"),
  timedQuizQuestions: text("timed_quiz_questions"),
  quizQuestions: text("quiz_questions"),
  aiGeneratedMissions: text("ai_generated_missions"),
  verseMemory: text("verse_memory"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDailyMissionContentSchema = createInsertSchema(dailyMissionContent).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyMissionContent = z.infer<typeof insertDailyMissionContentSchema>;
export type DailyMissionContent = typeof dailyMissionContent.$inferSelect;

// ==================== TIPOS COMPOSTOS DO SISTEMA DE ESTUDOS ====================

export type StudyProfileWithUser = StudyProfile & {
  userName: string;
  userEmail: string;
  userPhotoUrl?: string;
};

export type StudyLessonWithProgress = StudyLesson & {
  status: "locked" | "available" | "in_progress" | "completed";
  xpEarned?: number;
  perfectScore?: boolean;
};

export type StudyWeekWithLessons = StudyWeek & {
  lessons: StudyLessonWithProgress[];
  totalXp: number;
  completedLessons: number;
};

export type LeaderboardRanking = {
  userId: number;
  userName: string;
  userPhotoUrl?: string;
  totalXp: number;
  level: number;
  streak: number;
  rank: number;
};

export type AchievementWithStatus = Achievement & {
  unlocked: boolean;
  unlockedAt?: string;
};

export type UserDailyMissionWithDetails = UserDailyMission & {
  mission: DailyMission;
};

export type DailyMissionsStatus = {
  missions: UserDailyMissionWithDetails[];
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
  bonusXpAvailable: number;
  content?: DailyMissionContent;
};

// ==================== PUSH NOTIFICATIONS ====================

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsed: timestamp("last_used"),
}, (table) => ({
  uniqueUserEndpoint: unique().on(table.userId, table.endpoint),
}));

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export const anonymousPushSubscriptions = pgTable("anonymous_push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsed: timestamp("last_used"),
});

export const insertAnonymousPushSubscriptionSchema = createInsertSchema(anonymousPushSubscriptions).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
});

export type InsertAnonymousPushSubscription = z.infer<typeof insertAnonymousPushSubscriptionSchema>;
export type AnonymousPushSubscription = typeof anonymousPushSubscriptions.$inferSelect;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: text("data"),
  read: boolean("read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  readAt: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type NotificationType = 
  | "streak_reminder" 
  | "lesson_available" 
  | "achievement" 
  | "election" 
  | "birthday"
  | "system";

// ==================== TIPOS COMPOSTOS PARA TEMPORADAS ====================

export type SeasonWithLessons = Season & {
  lessons: StudyLesson[];
  progress?: UserSeasonProgress;
  finalChallenge?: SeasonFinalChallenge;
};

export type SeasonRankingEntry = SeasonRanking & {
  user: Pick<User, 'id' | 'fullName' | 'photoUrl'>;
};

export type SeasonLeaderboard = {
  seasonId: number;
  seasonTitle: string;
  rankings: SeasonRankingEntry[];
  totalParticipants: number;
  isFinished: boolean;
};

export type FinalChallengeQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

export type FinalChallengeResult = {
  challengeId: number;
  userId: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  xpEarned: number;
  isPerfect: boolean;
  isMastered: boolean;
};

export type WeeklyGoalStatus = {
  weekKey: string;
  goals: {
    lessons: { current: number; target: number; completed: boolean };
    verses: { current: number; target: number; completed: boolean };
    missions: { current: number; target: number; completed: boolean };
    devotionals: { current: number; target: number; completed: boolean };
  };
  isGoalMet: boolean;
  xpBonus: number;
  overallProgress: number;
  daysCompleted: number;
  totalDays: number;
};

export type LessonStage = "estude" | "medite" | "responda";

export type LessonWithProgress = StudyLesson & {
  progress?: UserLessonProgress;
  units?: StudyUnit[];
  currentStage?: LessonStage;
  stageProgress?: {
    estude: { completed: number; total: number };
    medite: { completed: number; total: number };
    responda: { completed: number; total: number };
  };
};

export type ShareableImage = {
  type: "ranking" | "achievement" | "season_mastery";
  entityId: number;
  imageDataUrl?: string;
  title: string;
  subtitle?: string;
};

// ==================== AUDIT LOGS ====================

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: integer("resource_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type AuditAction = 
  | "create"
  | "update" 
  | "delete"
  | "login"
  | "logout"
  | "password_reset"
  | "approve"
  | "reject";

// ==================== WEEKLY PRACTICE (PRATIQUE) ====================

export const weeklyPractice = pgTable("weekly_practice", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  weekId: integer("week_id").notNull().references(() => studyWeeks.id),
  starsEarned: integer("stars_earned").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(10),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  completedWithinTime: boolean("completed_within_time").notNull().default(false),
  isMastered: boolean("is_mastered").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserWeek: unique().on(table.userId, table.weekId),
}));

export const insertWeeklyPracticeSchema = createInsertSchema(weeklyPractice).omit({
  id: true,
  createdAt: true,
});

export type InsertWeeklyPractice = z.infer<typeof insertWeeklyPracticeSchema>;
export type WeeklyPractice = typeof weeklyPractice.$inferSelect;

export const practiceQuestions = pgTable("practice_questions", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").notNull().references(() => studyWeeks.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPracticeQuestionSchema = createInsertSchema(practiceQuestions).omit({
  id: true,
  createdAt: true,
});

export type InsertPracticeQuestion = z.infer<typeof insertPracticeQuestionSchema>;
export type PracticeQuestion = typeof practiceQuestions.$inferSelect;

export type WeeklyPracticeStatus = {
  weekId: number;
  isUnlocked: boolean;
  starsEarned: number;
  isMastered: boolean;
  lessonsCompleted: number;
  totalLessons: number;
};

// ==================== MEMBER INTERACTION SYSTEM ====================

// Status online dos membros
export const userOnlineStatus = pgTable("user_online_status", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserOnlineStatusSchema = createInsertSchema(userOnlineStatus).omit({
  id: true,
  updatedAt: true,
});

export type InsertUserOnlineStatus = z.infer<typeof insertUserOnlineStatusSchema>;
export type UserOnlineStatus = typeof userOnlineStatus.$inferSelect;

// Curtidas em conquistas de outros membros
export const achievementLikes = pgTable("achievement_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  targetUserId: integer("target_user_id").notNull().references(() => users.id),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueLike: unique().on(table.userId, table.targetUserId, table.achievementId),
}));

export const insertAchievementLikeSchema = createInsertSchema(achievementLikes).omit({
  id: true,
  createdAt: true,
});

export type InsertAchievementLike = z.infer<typeof insertAchievementLikeSchema>;
export type AchievementLike = typeof achievementLikes.$inferSelect;

// Mensagens de incentivo entre membros
export const memberEncouragements = pgTable("member_encouragements", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  messageKey: text("message_key").notNull(),
  messageText: text("message_text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemberEncouragementSchema = createInsertSchema(memberEncouragements).omit({
  id: true,
  createdAt: true,
});

export type InsertMemberEncouragement = z.infer<typeof insertMemberEncouragementSchema>;
export type MemberEncouragement = typeof memberEncouragements.$inferSelect;

// Mensagens predefinidas de incentivo
export const PREDEFINED_ENCOURAGEMENT_MESSAGES = [
  { key: "lesson_reminder", text: "Já fez sua lição hoje?", icon: "book-open" },
  { key: "prayer_reminder", text: "Não se esqueça de orar!", icon: "heart" },
  { key: "streak_warning", text: "Cuidado pra não perder a ofensiva!", icon: "flame" },
  { key: "gospel_fire", text: "Não deixe a chama do evangelho se apagar!", icon: "flame" },
  { key: "keep_going", text: "Continue firme na fé!", icon: "trophy" },
  { key: "god_bless", text: "Que Deus abençoe seus estudos!", icon: "star" },
  { key: "encouragement", text: "Você está indo muito bem!", icon: "medal" },
  { key: "bible_study", text: "A Palavra de Deus é lâmpada para nossos pés!", icon: "book" },
  { key: "fellowship", text: "Estamos juntos nessa jornada!", icon: "heart" },
  { key: "perseverance", text: "Persevere! O prêmio vale a pena!", icon: "crown" },
] as const;

export type EncouragementMessageKey = typeof PREDEFINED_ENCOURAGEMENT_MESSAGES[number]["key"];

// ==================== EVENTOS ESPECIAIS + CARDS COLECIONÁVEIS ====================

export type EventStatus = "draft" | "scheduled" | "active" | "completed";
export type CardRarity = "common" | "rare" | "epic" | "legendary";
export type CardSourceType = "season" | "event";

// Cards Colecionáveis (definido primeiro para permitir FK em studyEvents)
export const collectibleCards = pgTable("collectible_cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  sourceType: text("source_type").notNull(),
  sourceId: integer("source_id").notNull(),
  availableRarities: text("available_rarities").array().default(["common", "rare", "epic", "legendary"]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCollectibleCardSchema = createInsertSchema(collectibleCards).omit({
  id: true,
  createdAt: true,
});

// Update schema - whitelist of allowed fields for PATCH
export const updateCollectibleCardSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  category: z.string().optional(),
  themeColor: z.string().nullable().optional(),
  availableRarities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
}).strict();

export type InsertCollectibleCard = z.infer<typeof insertCollectibleCardSchema>;
export type UpdateCollectibleCard = z.infer<typeof updateCollectibleCardSchema>;
export type CollectibleCard = typeof collectibleCards.$inferSelect;

// Eventos Especiais DeoGlory
export const studyEvents = pgTable("study_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  theme: text("theme").notNull(),
  imageUrl: text("image_url"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("draft"),
  forceUnlock: boolean("force_unlock").default(false), // Admin can force immediate access even before start date
  cardId: integer("card_id").references(() => collectibleCards.id),
  lessonsCount: integer("lessons_count").default(7),
  xpMultiplier: real("xp_multiplier").default(1.0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStudyEventSchema = createInsertSchema(studyEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema - whitelist of allowed fields for PATCH
export const updateStudyEventSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  theme: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(["draft", "published", "ended"]).optional(),
  forceUnlock: z.boolean().optional(),
  cardId: z.number().nullable().optional(),
  lessonsCount: z.number().optional(),
  xpMultiplier: z.number().optional(),
}).strict();

export type InsertStudyEvent = z.infer<typeof insertStudyEventSchema>;
export type UpdateStudyEvent = z.infer<typeof updateStudyEventSchema>;
export type StudyEvent = typeof studyEvents.$inferSelect;

// Lições de Eventos Especiais
export const studyEventLessons = pgTable("study_event_lessons", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => studyEvents.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  verseReference: text("verse_reference"),
  verseText: text("verse_text"),
  questions: jsonb("questions").notNull().default([]),
  xpReward: integer("xp_reward").default(50),
  status: text("status").default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueEventDay: unique().on(table.eventId, table.dayNumber),
}));

export const insertStudyEventLessonSchema = createInsertSchema(studyEventLessons).omit({
  id: true,
  createdAt: true,
});

// Update schema - whitelist of allowed fields for PATCH
export const updateStudyEventLessonSchema = z.object({
  dayNumber: z.number().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  verseReference: z.string().nullable().optional(),
  verseText: z.string().nullable().optional(),
  questions: z.any().optional(), // jsonb type
  xpReward: z.number().optional(),
  status: z.enum(["draft", "released"]).optional(),
}).strict();

export type InsertStudyEventLesson = z.infer<typeof insertStudyEventLessonSchema>;
export type UpdateStudyEventLesson = z.infer<typeof updateStudyEventLessonSchema>;
export type StudyEventLesson = typeof studyEventLessons.$inferSelect;

// Progresso do usuário em eventos
export const userEventProgress = pgTable("user_event_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  eventId: integer("event_id").notNull().references(() => studyEvents.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id").notNull().references(() => studyEventLessons.id, { onDelete: "cascade" }),
  completed: boolean("completed").default(false),
  score: integer("score").default(0),
  totalQuestions: integer("total_questions").default(0),
  correctAnswers: integer("correct_answers").default(0),
  usedHints: boolean("used_hints").default(false),
  xpEarned: integer("xp_earned").default(0),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  uniqueProgress: unique().on(table.userId, table.lessonId),
}));

export const insertUserEventProgressSchema = createInsertSchema(userEventProgress).omit({
  id: true,
});

export type InsertUserEventProgress = z.infer<typeof insertUserEventProgressSchema>;
export type UserEventProgress = typeof userEventProgress.$inferSelect;

// Participantes de eventos (para contador de participantes)
// Registrado quando membro clica em sessão "Estude" pela primeira vez em qualquer lição do evento
export const studyEventParticipants = pgTable("study_event_participants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  eventId: integer("event_id").notNull().references(() => studyEvents.id, { onDelete: "cascade" }),
  participatedAt: timestamp("participated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueParticipant: unique().on(table.userId, table.eventId),
}));

export const insertStudyEventParticipantSchema = createInsertSchema(studyEventParticipants).omit({
  id: true,
  participatedAt: true,
});

export type InsertStudyEventParticipant = z.infer<typeof insertStudyEventParticipantSchema>;
export type StudyEventParticipant = typeof studyEventParticipants.$inferSelect;

// Cards conquistados pelos usuários
export const userCards = pgTable("user_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  cardId: integer("card_id").notNull().references(() => collectibleCards.id),
  rarity: text("rarity").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: integer("source_id").notNull(),
  performance: real("performance").default(0),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserCard: unique().on(table.userId, table.cardId),
}));

export const insertUserCardSchema = createInsertSchema(userCards).omit({
  id: true,
  earnedAt: true,
});

export type InsertUserCard = z.infer<typeof insertUserCardSchema>;
export type UserCard = typeof userCards.$inferSelect;

// Helper para calcular raridade baseada no desempenho
export function calculateCardRarity(performance: number, usedHints: boolean): CardRarity {
  if (performance >= 100 && !usedHints) return "legendary";
  if (performance >= 95) return "epic";
  if (performance >= 80) return "rare";
  return "common";
}

// Tipos para exibição de cards com informações completas
export type UserCardWithDetails = UserCard & {
  card: CollectibleCard;
};

export type EventWithProgress = StudyEvent & {
  lessonsCompleted: number;
  totalLessons: number;
  cardEarned: boolean;
};

// Tipo para perfil público de membro
export type PublicMemberProfile = {
  userId: number;
  username: string;
  photoUrl: string | null;
  level: number;
  totalXp: number;
  currentStreak: number;
  rankingPosition: number | null;
  achievements: Array<{
    id: number;
    name: string;
    icon: string;
    category: string;
    xpReward: number;
    unlockedAt: string;
    likesCount: number;
    isLikedByMe: boolean;
  }>;
  isOnline: boolean;
  lastSeenAt: string | null;
};

// =====================================================
// MÓDULO DE TESOURARIA
// =====================================================

// Tipos de entrada
export type TreasuryIncomeCategory = "percapta" | "ump" | "loan" | "misc" | "event";

// Tipos de saída
export type TreasuryExpenseCategoryType = "percapta" | "loan" | "events" | "marketing";

// Status de pagamento
export type PaymentStatus = "pending" | "paid" | "expired" | "cancelled";

// Status do pedido
export type OrderStatus = "awaiting_payment" | "paid" | "producing" | "ready";

// Métodos de pagamento
export type PaymentMethod = "pix" | "cash" | "manual";

// Origem de empréstimo
export type LoanOrigin = "church" | "member" | "federation" | "other";

// Configurações da tesouraria (por ano)
export const treasurySettings = pgTable("treasury_settings", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  percaptaAmount: integer("percapta_amount").notNull(),
  umpMonthlyAmount: integer("ump_monthly_amount").notNull(),
  pixKey: text("pix_key"),
  treasurerId: integer("treasurer_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTreasurySettingsSchema = createInsertSchema(treasurySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTreasurySettings = z.infer<typeof insertTreasurySettingsSchema>;
export type TreasurySettings = typeof treasurySettings.$inferSelect;

// Categorias de despesa customizáveis
export const treasuryExpenseCategories = pgTable("treasury_expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTreasuryExpenseCategorySchema = createInsertSchema(treasuryExpenseCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertTreasuryExpenseCategory = z.infer<typeof insertTreasuryExpenseCategorySchema>;
export type TreasuryExpenseCategory = typeof treasuryExpenseCategories.$inferSelect;

// Empréstimos
export const treasuryLoans = pgTable("treasury_loans", {
  id: serial("id").primaryKey(),
  origin: text("origin").notNull(),
  originName: text("origin_name"),
  originMemberId: integer("origin_member_id").references(() => users.id),
  totalAmount: integer("total_amount").notNull(),
  isInstallment: boolean("is_installment").notNull().default(false),
  installmentCount: integer("installment_count"),
  installmentAmount: integer("installment_amount"),
  status: text("status").notNull().default("active"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTreasuryLoanSchema = createInsertSchema(treasuryLoans).omit({
  id: true,
  createdAt: true,
});

export type InsertTreasuryLoan = z.infer<typeof insertTreasuryLoanSchema>;
export type TreasuryLoan = typeof treasuryLoans.$inferSelect;

// Parcelas de empréstimo
export const treasuryLoanInstallments = pgTable("treasury_loan_installments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => treasuryLoans.id),
  installmentNumber: integer("installment_number").notNull(),
  amount: integer("amount").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  entryId: integer("entry_id"),
});

export const insertTreasuryLoanInstallmentSchema = createInsertSchema(treasuryLoanInstallments).omit({
  id: true,
});

export type InsertTreasuryLoanInstallment = z.infer<typeof insertTreasuryLoanInstallmentSchema>;
export type TreasuryLoanInstallment = typeof treasuryLoanInstallments.$inferSelect;

// Arquivos de comprovante (receipts)
export const treasuryReceipts = pgTable("treasury_receipts", {
  id: text("id").primaryKey(), // UUID/hash
  mimeType: text("mime_type").notNull(),
  data: text("data").notNull(), // Base64 encoded
  createdAt: timestamp("created_at").defaultNow(),
});

export type TreasuryReceipt = typeof treasuryReceipts.$inferSelect;

// Entradas e saídas da tesouraria
export const treasuryEntries = pgTable("treasury_entries", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  description: text("description"),
  amount: integer("amount").notNull(),
  userId: integer("user_id").references(() => users.id),
  externalPayerName: text("external_payer_name"),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull(),
  pixTransactionId: text("pix_transaction_id"),
  pixQrCode: text("pix_qr_code"),
  pixQrCodeBase64: text("pix_qr_code_base64"),
  pixExpiresAt: timestamp("pix_expires_at"),
  referenceMonth: integer("reference_month"),
  referenceMonths: text("reference_months"), // JSON array for multi-month UMP payments
  referenceYear: integer("reference_year").notNull(),
  eventId: integer("event_id"),
  orderId: integer("order_id"),
  loanId: integer("loan_id").references(() => treasuryLoans.id),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
}, (table) => ({
  userIdIdx: index("treasury_entries_user_id_idx").on(table.userId),
  typeIdx: index("treasury_entries_type_idx").on(table.type),
  statusIdx: index("treasury_entries_status_idx").on(table.paymentStatus),
  yearIdx: index("treasury_entries_year_idx").on(table.referenceYear),
}));

export const insertTreasuryEntrySchema = createInsertSchema(treasuryEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertTreasuryEntry = z.infer<typeof insertTreasuryEntrySchema>;
export type TreasuryEntry = typeof treasuryEntries.$inferSelect;

// Pagamentos de Taxa UMP por mês
export const memberUmpPayments = pgTable("member_ump_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  amount: integer("amount").notNull(),
  entryId: integer("entry_id").notNull().references(() => treasuryEntries.id),
  paidAt: timestamp("paid_at").notNull(),
}, (table) => ({
  uniqueUserYearMonth: unique().on(table.userId, table.year, table.month),
}));

export const insertMemberUmpPaymentSchema = createInsertSchema(memberUmpPayments).omit({
  id: true,
});

export type InsertMemberUmpPayment = z.infer<typeof insertMemberUmpPaymentSchema>;
export type MemberUmpPayment = typeof memberUmpPayments.$inferSelect;

// Pagamentos de Taxa Percapta por ano
export const memberPercaptaPayments = pgTable("member_percapta_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  amount: integer("amount").notNull(),
  entryId: integer("entry_id").notNull().references(() => treasuryEntries.id),
  paidAt: timestamp("paid_at").notNull(),
}, (table) => ({
  uniqueUserYear: unique().on(table.userId, table.year),
}));

export const insertMemberPercaptaPaymentSchema = createInsertSchema(memberPercaptaPayments).omit({
  id: true,
});

export type InsertMemberPercaptaPayment = z.infer<typeof insertMemberPercaptaPaymentSchema>;
export type MemberPercaptaPayment = typeof memberPercaptaPayments.$inferSelect;

// Log de notificações da tesouraria
export const treasuryNotificationsLog = pgTable("treasury_notifications_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(),
  referenceId: integer("reference_id"),
  sentAt: timestamp("sent_at").defaultNow(),
  isManual: boolean("is_manual").notNull().default(false),
});

export const insertTreasuryNotificationLogSchema = createInsertSchema(treasuryNotificationsLog).omit({
  id: true,
  sentAt: true,
});

export type InsertTreasuryNotificationLog = z.infer<typeof insertTreasuryNotificationLogSchema>;
export type TreasuryNotificationLog = typeof treasuryNotificationsLog.$inferSelect;

// =====================================================
// LOJA VIRTUAL
// =====================================================

// Categorias de itens da loja
export const shopCategories = pgTable("shop_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  imageData: text("image_data"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertShopCategorySchema = createInsertSchema(shopCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertShopCategory = z.infer<typeof insertShopCategorySchema>;
export type ShopCategory = typeof shopCategories.$inferSelect;

// Itens da loja
export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  categoryId: integer("category_id").notNull().references(() => shopCategories.id),
  genderType: text("gender_type").notNull(),
  hasSize: boolean("has_size").notNull().default(true),
  isAvailable: boolean("is_available").notNull().default(true),
  isPreOrder: boolean("is_pre_order").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  featuredOrder: integer("featured_order").default(0),
  bannerImageData: text("banner_image_data"),
  allowInstallments: boolean("allow_installments").notNull().default(false),
  maxInstallments: integer("max_installments").default(1),
  stockQuantity: integer("stock_quantity"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertShopItemSchema = createInsertSchema(shopItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
export type ShopItem = typeof shopItems.$inferSelect;

// Imagens dos itens
export const shopItemImages = pgTable("shop_item_images", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => shopItems.id, { onDelete: "cascade" }),
  gender: text("gender").notNull(),
  imageData: text("image_data").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => ({
  itemIdIdx: index("shop_item_images_item_id_idx").on(table.itemId),
}));

export const insertShopItemImageSchema = createInsertSchema(shopItemImages).omit({
  id: true,
});

export type InsertShopItemImage = z.infer<typeof insertShopItemImageSchema>;
export type ShopItemImage = typeof shopItemImages.$inferSelect;

// Tamanhos dos itens
export const shopItemSizes = pgTable("shop_item_sizes", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => shopItems.id, { onDelete: "cascade" }),
  gender: text("gender").notNull(),
  size: text("size").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertShopItemSizeSchema = createInsertSchema(shopItemSizes).omit({
  id: true,
});

export type InsertShopItemSize = z.infer<typeof insertShopItemSizeSchema>;
export type ShopItemSize = typeof shopItemSizes.$inferSelect;

// Tabela de medidas dos itens
export const shopItemSizeCharts = pgTable("shop_item_size_charts", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => shopItems.id, { onDelete: "cascade" }),
  gender: text("gender").notNull(),
  size: text("size").notNull(),
  width: real("width"),
  length: real("length"),
  sleeve: real("sleeve"),
  shoulder: real("shoulder"),
});

export const insertShopItemSizeChartSchema = createInsertSchema(shopItemSizeCharts).omit({
  id: true,
});

export type InsertShopItemSizeChart = z.infer<typeof insertShopItemSizeChartSchema>;
export type ShopItemSizeChart = typeof shopItemSizeCharts.$inferSelect;

// Carrinho de compras
export const shopCartItems = pgTable("shop_cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  itemId: integer("item_id").notNull().references(() => shopItems.id),
  quantity: integer("quantity").notNull().default(1),
  gender: text("gender"),
  size: text("size"),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertShopCartItemSchema = createInsertSchema(shopCartItems).omit({
  id: true,
  addedAt: true,
});

export type InsertShopCartItem = z.infer<typeof insertShopCartItemSchema>;
export type ShopCartItem = typeof shopCartItems.$inferSelect;

// Pedidos
export const shopOrders = pgTable("shop_orders", {
  id: serial("id").primaryKey(),
  orderCode: text("order_code").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id),
  totalAmount: integer("total_amount").notNull(),
  observation: text("observation"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  orderStatus: text("order_status").notNull().default("awaiting_payment"),
  entryId: integer("entry_id").references(() => treasuryEntries.id),
  installmentCount: integer("installment_count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
}, (table) => ({
  userIdIdx: index("shop_orders_user_id_idx").on(table.userId),
  statusIdx: index("shop_orders_status_idx").on(table.orderStatus),
}));

export const insertShopOrderSchema = createInsertSchema(shopOrders).omit({
  id: true,
  createdAt: true,
});

export type InsertShopOrder = z.infer<typeof insertShopOrderSchema>;
export type ShopOrder = typeof shopOrders.$inferSelect;

// Itens do pedido
export const shopOrderItems = pgTable("shop_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => shopOrders.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => shopItems.id),
  quantity: integer("quantity").notNull(),
  gender: text("gender"),
  size: text("size"),
  unitPrice: integer("unit_price").notNull(),
}, (table) => ({
  orderIdIdx: index("shop_order_items_order_id_idx").on(table.orderId),
  itemIdIdx: index("shop_order_items_item_id_idx").on(table.itemId),
}));

export const insertShopOrderItemSchema = createInsertSchema(shopOrderItems).omit({
  id: true,
});

export type InsertShopOrderItem = z.infer<typeof insertShopOrderItemSchema>;
export type ShopOrderItem = typeof shopOrderItems.$inferSelect;

// Parcelas do pedido (para pagamento parcelado via PIX)
export const shopInstallments = pgTable("shop_installments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => shopOrders.id, { onDelete: "cascade" }),
  installmentNumber: integer("installment_number").notNull(),
  amount: integer("amount").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  paymentId: text("payment_id"),
  pixCode: text("pix_code"),
  pixQrCodeBase64: text("pix_qr_code_base64"),
  pixExpiresAt: timestamp("pix_expires_at"),
  paidAt: timestamp("paid_at"),
  entryId: integer("entry_id").references(() => treasuryEntries.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  orderIdIdx: index("shop_installments_order_id_idx").on(table.orderId),
  dueDateIdx: index("shop_installments_due_date_idx").on(table.dueDate),
}));

export const insertShopInstallmentSchema = createInsertSchema(shopInstallments).omit({
  id: true,
  createdAt: true,
});

export type InsertShopInstallment = z.infer<typeof insertShopInstallmentSchema>;
export type ShopInstallment = typeof shopInstallments.$inferSelect;

// Códigos promocionais
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull().default("percentage"),
  discountValue: integer("discount_value").notNull(),
  categoryId: integer("category_id").references(() => shopCategories.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  usedCount: true,
  createdAt: true,
});

export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

// =====================================================
// EVENTOS COM TAXA
// =====================================================

// Taxa de evento
export const eventFees = pgTable("event_fees", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().unique(),
  feeAmount: integer("fee_amount").notNull(),
  deadline: timestamp("deadline").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventFeeSchema = createInsertSchema(eventFees).omit({
  id: true,
  createdAt: true,
});

export type InsertEventFee = z.infer<typeof insertEventFeeSchema>;
export type EventFee = typeof eventFees.$inferSelect;

// Confirmações de evento
export const eventConfirmations = pgTable("event_confirmations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  isVisitor: boolean("is_visitor").notNull().default(false),
  visitorCount: integer("visitor_count").default(0),
  entryId: integer("entry_id").references(() => treasuryEntries.id),
  confirmedAt: timestamp("confirmed_at").defaultNow(),
}, (table) => ({
  eventUserIdx: index("event_confirmations_event_user_idx").on(table.eventId, table.userId),
}));

export const insertEventConfirmationSchema = createInsertSchema(eventConfirmations).omit({
  id: true,
  confirmedAt: true,
});

export type InsertEventConfirmation = z.infer<typeof insertEventConfirmationSchema>;
export type EventConfirmation = typeof eventConfirmations.$inferSelect;

// Tipos compostos para frontend
export type ShopItemWithDetails = ShopItem & {
  category: ShopCategory;
  images: ShopItemImage[];
  sizes: ShopItemSize[];
  sizeCharts: ShopItemSizeChart[];
};

export type ShopOrderWithItems = ShopOrder & {
  items: (ShopOrderItem & { item: ShopItem })[];
  user: Pick<User, "id" | "fullName" | "email" | "photoUrl">;
};

export type TreasuryDashboardSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  membersUpToDate: number;
  membersOverdue: number;
  pendingLoans: number;
  pendingInstallments: number;
};

export type MemberFinancialStatus = {
  percaptaPaid: boolean;
  percaptaAmount: number | null;
  umpMonthsPaid: number[];
  umpMonthsPending: number[];
  umpMonthlyAmount: number;
  totalOwed: number;
};

// Sent Event Notifications table - persists notification cache across restarts
export const sentEventNotifications = pgTable("sent_event_notifications", {
  id: serial("id").primaryKey(),
  cacheKey: text("cache_key").notNull().unique(),
  eventId: integer("event_id").notNull(),
  notificationType: text("notification_type").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
}, (table) => ({
  cacheKeyIdx: index("sent_event_notifications_cache_key_idx").on(table.cacheKey),
  eventIdx: index("sent_event_notifications_event_idx").on(table.eventId),
}));

export type SentEventNotification = typeof sentEventNotifications.$inferSelect;

// Sent Scheduler Reminders table - persists reminders across restarts (for Render deployments)
export const sentSchedulerReminders = pgTable("sent_scheduler_reminders", {
  id: serial("id").primaryKey(),
  reminderKey: text("reminder_key").notNull().unique(),
  reminderType: text("reminder_type").notNull(), // 'abandoned_cart', 'loan_installment', 'event_fee', 'treasury_day5'
  relatedId: integer("related_id"), // orderId, loanId, eventId, etc
  sentAt: timestamp("sent_at").notNull().defaultNow(),
}, (table) => ({
  keyIdx: index("sent_scheduler_reminders_key_idx").on(table.reminderKey),
  typeIdx: index("sent_scheduler_reminders_type_idx").on(table.reminderType),
}));

export type SentSchedulerReminder = typeof sentSchedulerReminders.$inferSelect;
