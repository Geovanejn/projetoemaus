import { db } from "./db";
import { eq, and, desc, asc, sql, isNull, gt, lt, gte, lte, ne, or, inArray } from "drizzle-orm";
import { sendCongratulationsEmail } from "./email";
import { getTodayBrazilDate } from "./utils/date";
import * as schema from "@shared/schema";
import type {
  User,
  InsertUser,
  Position,
  Election,
  InsertElection,
  Candidate,
  InsertCandidate,
  Vote,
  InsertVote,
  VerificationCode,
  InsertVerificationCode,
  CandidateWithDetails,
  ElectionResults,
  ElectionPosition,
  InsertElectionPosition,
  ElectionAttendance,
  InsertElectionAttendance,
  StudyProfile,
  StudyWeek,
  StudyLesson,
  StudyUnit,
  BibleVerse,
  UserLessonProgress,
  UserUnitProgress,
  Achievement,
  DailyMission,
  UserDailyMission,
  DailyMissionContent,
  Devotional,
  SiteEvent,
  InstagramPost,
  PushSubscription,
  AnonymousPushSubscription,
  Notification,
  PrayerRequest,
  InsertPrayerRequest,
  BoardMember,
  InsertBoardMember,
  Banner,
  InsertBanner,
  SiteContent,
  InsertSiteContent,
  AuditLog,
  InsertAuditLog,
  DevotionalComment,
  InsertDevotionalComment,
  StudyEvent,
  InsertStudyEvent,
  StudyEventLesson,
  InsertStudyEventLesson,
  UserEventProgress,
  InsertUserEventProgress,
  CollectibleCard,
  InsertCollectibleCard,
  UserCard,
  InsertUserCard,
  ShopCategory,
  InsertShopCategory,
  ShopItem,
  InsertShopItem,
  ShopItemImage,
  InsertShopItemImage,
  ShopItemSize,
  InsertShopItemSize,
  ShopItemSizeChart,
  ShopCartItem,
  InsertShopCartItem,
  ShopOrder,
  InsertShopOrder,
  ShopOrderItem,
  InsertShopOrderItem,
  ShopInstallment,
  InsertShopInstallment,
  TreasurySettings,
  InsertTreasurySettings,
  TreasuryEntry,
  InsertTreasuryEntry,
  TreasuryLoan,
  InsertTreasuryLoan,
  TreasuryLoanInstallment,
  InsertTreasuryLoanInstallment,
  MemberPercaptaPayment,
  InsertMemberPercaptaPayment,
  MemberUmpPayment,
  InsertMemberUmpPayment,
  EventFee,
  InsertEventFee,
  EventConfirmation,
  InsertEventConfirmation,
  PromoCode,
  InsertPromoCode,
} from "@shared/schema";

export interface IStorage {
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<Omit<User, 'id'>>): Promise<User | undefined>;
  getAllMembers(excludeAdmins?: boolean): Promise<User[]>;
  getMembersBasicInfo(): Promise<{ id: number; fullName: string; email: string }[]>;
  getAllUsers(): Promise<User[]>;
  deleteMember(id: number): Promise<void>;
  
  getAllPositions(): Promise<Position[]>;
  
  getActiveElection(): Promise<Election | null>;
  getElectionById(id: number): Promise<Election | undefined>;
  createElection(name: string): Promise<Election>;
  closeElection(id: number): Promise<void>;
  finalizeElection(id: number): Promise<void>;
  getElectionHistory(): Promise<Election[]>;
  setWinner(electionId: number, candidateId: number, positionId: number, scrutiny: number): Promise<void>;
  
  getElectionPositions(electionId: number): Promise<ElectionPosition[]>;
  getActiveElectionPosition(electionId: number): Promise<ElectionPosition | null>;
  getElectionPositionById(id: number): Promise<ElectionPosition | null>;
  advancePositionScrutiny(electionPositionId: number): Promise<void>;
  openNextPosition(electionId: number): Promise<ElectionPosition | null>;
  openPosition(electionPositionId: number): Promise<ElectionPosition>;
  completePosition(electionPositionId: number): Promise<void>;
  forceCompletePosition(electionPositionId: number, reason: string, shouldReopen?: boolean): Promise<void>;
  
  getElectionAttendance(electionId: number): Promise<ElectionAttendance[]>;
  getPresentCount(electionId: number): Promise<number>;
  getPresentCountForPosition(electionPositionId: number): Promise<number>;
  isMemberPresent(electionId: number, memberId: number): Promise<boolean>;
  getMemberPresenceByUserIds(electionId: number, userIds: number[]): Promise<Map<number, boolean>>;
  setMemberAttendance(electionId: number, memberId: number, isPresent: boolean): Promise<void>;
  initializeAttendance(electionId: number): Promise<void>;
  createAttendanceSnapshot(electionPositionId: number): Promise<void>;
  
  getAllCandidates(): Promise<Candidate[]>;
  getCandidatesByElection(electionId: number): Promise<CandidateWithDetails[]>;
  getCandidatesByPosition(positionId: number, electionId: number): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  clearCandidatesForPosition(positionId: number, electionId: number): Promise<void>;
  
  createVote(vote: InsertVote): Promise<Vote>;
  hasUserVoted(voterId: number, positionId: number, electionId: number, scrutinyRound: number): Promise<boolean>;
  
  getElectionResults(electionId: number): Promise<ElectionResults | null>;
  getLatestElectionResults(): Promise<ElectionResults | null>;
  getElectionWinners(electionId: number): Promise<Array<{ userId: number; positionId: number; candidateId: number; wonAtScrutiny: number }>>;
  
  getVoterAttendance(electionId: number): Promise<Array<any>>;
  getVoteTimeline(electionId: number): Promise<Array<any>>;
  getElectionAuditData(electionId: number): Promise<any | null>;
  
  createVerificationCode(data: InsertVerificationCode): Promise<VerificationCode>;
  getValidVerificationCode(email: string, code: string): Promise<VerificationCode | null>;
  deleteVerificationCodesByEmail(email: string): Promise<void>;
  
  createPdfVerification(electionId: number, verificationHash: string, presidentName?: string): Promise<any>;
  getPdfVerification(verificationHash: string): Promise<any | null>;

  getStudyWeekById(weekId: number): Promise<any | null>;
  getStudyWeekByNumber(weekNumber: number, year: number): Promise<any | null>;
  getAllStudyWeeks(): Promise<any[]>;
  getLessonsForWeek(weekId: number): Promise<any[]>;
  getLessonById(lessonId: number): Promise<any | null>;
  getLessonWithSeasonStatus(lessonId: number): Promise<{ lesson: any; seasonEnded: boolean; seasonTitle: string | null } | null>;
  getUnitsByLessonId(lessonId: number): Promise<any[]>;
  getUnitsByLessonIds(lessonIds: number[]): Promise<any[]>;
  getStudyUnitById(unitId: number): Promise<any | null>;
  createStudyWeek(data: { title: string; description?: string; weekNumber: number; year: number; createdBy?: number; aiMetadata?: string }): Promise<any>;
  createStudyLesson(data: { studyWeekId: number; orderIndex: number; title: string; type?: string; description?: string; xpReward?: number; estimatedMinutes?: number; icon?: string; isBonus?: boolean }): Promise<any>;
  createStudyUnit(data: { lessonId: number; orderIndex: number; type: string; content: any; xpValue?: number; stage?: string }): Promise<any>;
  updateStudyLesson(lessonId: number, data: { title?: string; type?: string; description?: string; xpReward?: number; estimatedMinutes?: number; icon?: string; isBonus?: boolean; orderIndex?: number; isLocked?: boolean; unlockDate?: string | null }): Promise<any | null>;
  deleteStudyLesson(lessonId: number): Promise<boolean>;
  updateStudyUnit(unitId: number, data: { type?: string; content?: any; xpValue?: number; orderIndex?: number; stage?: string }): Promise<any | null>;
  deleteStudyUnit(unitId: number): Promise<boolean>;
  updateStudyWeek(weekId: number, data: { title?: string; description?: string; weekNumber?: number; year?: number; status?: string }): Promise<any | null>;
  deleteStudyWeek(weekId: number): Promise<boolean>;
  getUnitsForLesson(lessonId: number): Promise<any[]>;
  publishStudyWeek(weekId: number): Promise<any | null>;
  lockLesson(lessonId: number): Promise<any | null>;
  unlockLesson(lessonId: number): Promise<any | null>;
  setLessonUnlockDate(lessonId: number, unlockDate: string | null): Promise<any | null>;
  unlockAllLessonsForWeek(weekId: number): Promise<number>;
  lockAllLessonsForWeek(weekId: number): Promise<number>;
  setWeeklyUnlockSchedule(weekId: number, startDate: string): Promise<number>;
  
  getDailyMissions(): Promise<any[]>;
  getUserDailyMissions(userId: number, date: string): Promise<any[]>;
  assignDailyMissions(userId: number, date: string): Promise<any[]>;
  getUserMissionById(userId: number, missionId: number, date: string): Promise<any | null>;
  completeMission(userId: number, missionId: number, date: string): Promise<any | null>;
  getDailyMissionContent(date: string): Promise<any | null>;
  createDailyMissionContent(data: any): Promise<any>;
  initializeDailyMissions(): Promise<void>;
  
  getUnreadVersesForUser(userId: number): Promise<any[]>;
  getTotalVersesReadByUser(userId: number): Promise<number>;
  resetUserVerseReadings(userId: number): Promise<void>;
  
  clearAllBibleVerses(): Promise<void>;
  clearAllDailyMissions(): Promise<void>;
  clearAllAchievements(): Promise<void>;
  clearAllStudyProgress(): Promise<void>;
  createDailyMission(data: { type: string; title: string; description: string; icon: string; xpReward: number }): Promise<any>;
  
  getLatestDevotional(): Promise<any | null>;
  getAllDevotionals(limit?: number): Promise<any[]>;
  getAllDevotionalsAdmin(): Promise<any[]>;
  getDevotionalById(id: number): Promise<any | null>;
  createDevotional(data: { title: string; verse: string; verseReference: string; content: string; contentHtml?: string; summary?: string; prayer?: string; imageUrl?: string; author?: string; isPublished?: boolean; isFeatured?: boolean; scheduledAt?: Date; createdBy?: number }): Promise<any>;
  updateDevotional(id: number, data: Partial<{ title: string; verse: string; verseReference: string; content: string; contentHtml?: string; summary?: string; prayer?: string; imageUrl?: string; author?: string; isPublished?: boolean; isFeatured?: boolean; scheduledAt?: Date | null }>): Promise<any | null>;
  deleteDevotional(id: number): Promise<boolean>;
  publishDevotional(id: number): Promise<any | null>;
  unpublishDevotional(id: number): Promise<any | null>;
  clearAllDevotionals(): Promise<void>;
  
  getUpcomingEvents(limit?: number): Promise<any[]>;
  getAllSiteEvents(): Promise<any[]>;
  createSiteEvent(data: { title: string; description?: string; imageUrl?: string; startDate: string; endDate?: string; time?: string; location?: string; isPublished?: boolean }): Promise<any>;
  clearAllSiteEvents(): Promise<void>;
  
  getLatestInstagramPosts(limit?: number): Promise<any[]>;
  createInstagramPost(data: { instagramId?: string; caption?: string; imageUrl: string; videoUrl?: string; mediaType?: string; permalink?: string; likesCount?: number; commentsCount?: number; postedAt?: string; isActive?: boolean }): Promise<any>;
  clearAllInstagramPosts(): Promise<void>;
  getFeaturedInstagramPost(): Promise<any | null>;
  setFeaturedInstagramPost(id: number): Promise<any | null>;
  removeFeaturedInstagramPost(id: number): Promise<void>;
  getInstagramPostById(id: number): Promise<any | null>;
  getInstagramPostsForAdmin(): Promise<any[]>;
  
  getSiteHighlights(): Promise<{ devotional: any | null; events: any[]; instagramPosts: any[]; featuredInstagramPost: any | null; featuredDevotionals: any[]; featuredEvents: any[]; featuredInstagramPosts: any[] }>;
  getFeaturedDevotionals(): Promise<any[]>;
  getFeaturedEvents(): Promise<any[]>;
  getFeaturedInstagramPosts(): Promise<any[]>;
  
  getBannerHighlights(): Promise<any[]>;
  addBannerHighlight(contentType: string, contentId: number): Promise<any>;
  removeBannerHighlight(id: number): Promise<void>;
  reorderBannerHighlights(orderedIds: number[]): Promise<void>;
  getBannerHighlightCount(): Promise<number>;
  
  // Study Profile Methods
  getStudyProfile(userId: number): Promise<any | null>;
  getOrCreateStudyProfile(userId: number): Promise<any>;
  updateStudyProfile(userId: number, data: Partial<{ dailyVerseReadDate: string }>): Promise<void>;
  getPublishedStudyWeeks(): Promise<any[]>;
  getWeeksWithLessonsBulkOptimized(userId: number, weekIds: number[]): Promise<any[]>;
  getLessonsWithProgress(userId: number, weekId: number): Promise<any[]>;
  getUserLessonProgress(userId: number, lessonId: number): Promise<any | null>;
  startLesson(userId: number, lessonId: number): Promise<any>;
  submitUnitAnswer(userId: number, unitId: number, answer: any): Promise<any>;
  markUnitAsCompleted(userId: number, unitId: number): Promise<any>;
  completeLesson(userId: number, lessonId: number, xpEarned: number, mistakes: number, timeSpent: number, perfectScore: boolean): Promise<any>;
  addStageXp(userId: number, amount: number, stage: string, lessonId: number): Promise<void>;
  addEventXp(userId: number, amount: number, eventId: number, lessonId: number): Promise<void>;
  getStudyStats(): Promise<any>;
  getStudyDashboardStats(): Promise<any>;
  getMonthlyProgressData(): Promise<any[]>;
  getWeeklyActivityData(): Promise<any[]>;
  getTopWeeklyMembers(limit?: number): Promise<any[]>;
  getUserProfileStats(userId: number): Promise<any>;
  getUserRecentActivities(userId: number, limit?: number): Promise<any[]>;
  getCompletedLessonsWithExercises(userId: number): Promise<any[]>;
  getStudyUsersWithProfiles(): Promise<any[]>;
  recalculateAllLevels(): Promise<{ updated: number; total: number }>;
  
  // Third Scrutiny Methods
  checkThirdScrutinyTie(electionPositionId: number): Promise<{ isTie: boolean; candidates?: any[] }>;
  resolveThirdScrutinyTie(electionPositionId: number, winnerId: number): Promise<void>;
  
  // Notification Methods
  savePushSubscription(userId: number, endpoint: string, p256dh: string, auth: string): Promise<void>;
  removePushSubscription(userId: number, endpoint: string): Promise<void>;
  getUserNotifications(userId: number, limit?: number, offset?: number): Promise<any[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  markNotificationRead(userId: number, notificationId: number): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;
  deleteNotification(userId: number, notificationId: number): Promise<void>;
  
  // Push Notification Methods (for notifications.ts)
  getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]>;
  updatePushSubscriptionLastUsed(subscriptionId: number): Promise<void>;
  deletePushSubscription(userId: number, endpoint: string): Promise<void>;
  getUsersBySecretaria(secretaria: string): Promise<User[]>;
  getAdminUsers(): Promise<User[]>;
  getActiveMembers(): Promise<User[]>;
  createNotification(data: { userId: number; type: string; title: string; body: string; data?: string | null }): Promise<Notification>;
  createNotificationsBatch(notifications: Array<{ userId: number; type: string; title: string; body: string; data?: string | null }>): Promise<Notification[]>;
  
  // DeoGlory Scheduler Methods
  getUsersWithActiveStreakNotStudiedToday(): Promise<{ userId: number; currentStreak: number }[]>;
  getInactiveUsersByDays(days: number): Promise<{ userId: number; daysSinceLastActivity: number }[]>;
  
  // Crystal and Streak Freeze Methods
  addCrystals(userId: number, amount: number, type: string, description?: string): Promise<number>;
  spendCrystals(userId: number, amount: number, type: string, description?: string): Promise<boolean>;
  getCrystalBalance(userId: number): Promise<number>;
  getCrystalHistory(userId: number, limit?: number): Promise<any[]>;
  purchaseStreakFreeze(userId: number): Promise<{ success: boolean; cost: number; freezesAvailable: number }>;
  useStreakFreeze(userId: number, streakToSave: number, automatic: boolean): Promise<boolean>;
  getStreakFreezeHistory(userId: number): Promise<any[]>;
  checkAndAwardStreakMilestone(userId: number, currentStreak: number): Promise<{ milestone: any; crystalsAwarded: number; xpAwarded: number } | null>;
  getUsersNeedingStreakCheck(): Promise<{ userId: number; currentStreak: number; lastLessonCompletedAt: Date | null; streakWarningDay: number; streakFreezesAvailable: number }[]>;
  resetStreak(userId: number): Promise<void>;
  getStreakRecoveryStatus(userId: number): Promise<{
    needsRecovery: boolean;
    streakAtRisk: number;
    daysMissed: number;
    crystalCost: number;
    crystalsAvailable: number;
    canRecover: boolean;
    streakLost: boolean;
  } | null>;
  recoverStreakWithCrystals(userId: number): Promise<{
    success: boolean;
    message: string;
    crystalsSpent?: number;
    newCrystalBalance?: number;
  }>;
  updateStreakWarningDay(userId: number, day: number): Promise<void>;
  incrementStreak(userId: number): Promise<{ newStreak: number; isNewRecord: boolean }>;
  checkAndAwardLessonCrystals(userId: number, isPerfect: boolean): Promise<{ crystalsAwarded: number; rewards: Array<{ type: string; amount: number; description: string }> }>;
  
  // Anonymous Push Subscription Methods (for visitors)
  saveAnonymousPushSubscription(endpoint: string, p256dh: string, auth: string): Promise<{ id: number; isNew: boolean }>;
  removeAnonymousPushSubscription(endpoint: string): Promise<void>;
  getAllAnonymousPushSubscriptions(): Promise<AnonymousPushSubscription[]>;
  updateAnonymousPushSubscriptionLastUsed(subscriptionId: number): Promise<void>;
  deleteAnonymousPushSubscriptionByEndpoint(endpoint: string): Promise<void>;
  
  // Bible Verse Methods
  getBibleVerseById(id: number): Promise<any | null>;
  getAllBibleVerses(): Promise<any[]>;
  createBibleVerse(reference: string, text: string, reflection: string, category: string): Promise<any>;
  readVerseAndRecoverHeart(userId: number, verseId: number): Promise<any>;
  getVerseRecoveryProgress(userId: number): Promise<any>;
  
  // Achievement Methods
  getAllAchievements(): Promise<any[]>;
  getAchievementById(id: number): Promise<{ id: number; name: string; icon: string; category: string; xpReward: number } | null>;
  getUserAchievements(userId: number): Promise<any[]>;
  createAchievement(data: any): Promise<any>;
  unlockAchievement(userId: number, achievementId: number): Promise<any | null>;
  checkAndUnlockAchievements(userId: number, context: { event: string; value?: number }): Promise<any[]>;
  
  // Leaderboard Methods
  getLeaderboard(periodType: string, periodKey: string, limit?: number): Promise<any[]>;
  getAnnualLeaderboard(year: number, limit?: number): Promise<any[]>;
  getSeasonLeaderboard(seasonId: number, limit?: number): Promise<any[]>;
  
  // Prayer Requests Methods
  createPrayerRequest(data: InsertPrayerRequest, moderationData?: { hasProfanity?: boolean; hasHateSpeech?: boolean; hasSexualContent?: boolean; moderationDetails?: string }): Promise<PrayerRequest>;
  getAllPrayerRequests(status?: string): Promise<PrayerRequest[]>;
  getPrayerRequestById(id: number): Promise<PrayerRequest | null>;
  getApprovedPrayerRequests(): Promise<PrayerRequest[]>;
  getPendingPrayerRequests(): Promise<PrayerRequest[]>;
  updatePrayerRequestStatus(id: number, status: string, prayedBy?: number): Promise<PrayerRequest | null>;
  approvePrayerRequest(id: number, approvedBy: number): Promise<PrayerRequest | null>;
  autoApprovePrayerRequest(id: number): Promise<PrayerRequest | null>;
  rejectPrayerRequest(id: number, moderatedBy: number, reason?: string): Promise<PrayerRequest | null>;
  incrementPrayerCount(id: number): Promise<PrayerRequest | null>;
  moderatePrayerRequest(id: number, data: { isModerated: boolean; moderatedBy: number; hasProfanity?: boolean; hasHateSpeech?: boolean; hasSexualContent?: boolean; moderationDetails?: string }): Promise<PrayerRequest | null>;
  deletePrayerRequest(id: number): Promise<void>;
  
  // Board Members Methods
  getAllBoardMembers(currentOnly?: boolean): Promise<BoardMember[]>;
  createBoardMember(data: InsertBoardMember): Promise<BoardMember>;
  updateBoardMember(id: number, data: Partial<InsertBoardMember>): Promise<BoardMember | null>;
  deleteBoardMember(id: number): Promise<void>;
  
  // Banners Methods
  getActiveBanners(): Promise<Banner[]>;
  getAllBanners(): Promise<Banner[]>;
  createBanner(data: InsertBanner): Promise<Banner>;
  updateBanner(id: number, data: Partial<InsertBanner>): Promise<Banner | null>;
  deleteBanner(id: number): Promise<void>;
  
  // Site Content Methods
  getSiteContent(page: string, section: string): Promise<SiteContent | null>;
  getAllSiteContent(): Promise<SiteContent[]>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { userId?: number; resource?: string; limit?: number }): Promise<AuditLog[]>;
  upsertSiteContent(data: InsertSiteContent): Promise<SiteContent>;
  
  // Daily Verse Stock Methods
  getAllDailyVerseStock(): Promise<schema.DailyVerseStock[]>;
  getDailyVerseStockById(id: number): Promise<schema.DailyVerseStock | null>;
  getNextDailyVerseStockImage(): Promise<schema.DailyVerseStock | null>;
  createDailyVerseStock(data: schema.InsertDailyVerseStock): Promise<schema.DailyVerseStock>;
  updateDailyVerseStock(id: number, data: Partial<schema.InsertDailyVerseStock>): Promise<schema.DailyVerseStock | null>;
  deleteDailyVerseStock(id: number): Promise<void>;
  
  // Daily Verse Posts Methods
  getActiveDailyVersePost(): Promise<schema.DailyVersePost | null>;
  getDailyVersePostByDate(date: Date): Promise<schema.DailyVersePost | null>;
  getDailyVersePosts(limit?: number, offset?: number, activeOnly?: boolean): Promise<schema.DailyVersePost[]>;
  createDailyVersePost(data: schema.InsertDailyVersePost): Promise<schema.DailyVersePost>;
  updateDailyVersePost(id: number, data: Partial<schema.InsertDailyVersePost>): Promise<schema.DailyVersePost | null>;
  deleteDailyVersePost(id: number): Promise<void>;
  deactivateExpiredDailyVersePosts(): Promise<void>;
  
  // Daily Verse Share Tracking
  recordDailyVerseShare(userId: number, versePostId: number | null, platform: string, shareDate: string): Promise<schema.DailyVerseShare>;
  hasUserSharedDailyVerseToday(userId: number, date: string): Promise<boolean>;
  
  // Birthday Share Images
  saveBirthdayShareImage(memberId: number, imageUrl: string, shareDate: string): Promise<schema.BirthdayShareImage>;
  getBirthdayShareImage(memberId: number, shareDate: string): Promise<schema.BirthdayShareImage | null>;
  deleteBirthdayShareImage(id: number): Promise<void>;
  
  // Current Lesson Optimized
  getCurrentLessonOptimized(userId: number): Promise<{
    lesson: { id: number; lessonNumber: number; title: string; sectionsCompleted: number; totalSections: number; status: string };
    season: { id: number; title: string };
  } | null>;
  
  // Season Methods
  getAllSeasons(): Promise<schema.Season[]>;
  getPublishedSeasons(): Promise<schema.Season[]>;
  getSeasonById(id: number): Promise<schema.Season | null>;
  createSeason(data: schema.InsertSeason): Promise<schema.Season>;
  updateSeason(id: number, data: Partial<schema.InsertSeason>): Promise<schema.Season | null>;
  deleteSeason(id: number): Promise<boolean>;
  publishSeason(id: number): Promise<schema.Season | null>;
  toggleSeasonLock(id: number, isLocked: boolean): Promise<schema.Season | null>;
  endSeason(id: number): Promise<{ season: schema.Season; topRankers: schema.SeasonRankingEntry[]; allParticipants: schema.SeasonRankingEntry[] } | null>;
  getLessonsForSeason(seasonId: number): Promise<schema.StudyLesson[]>;
  getLessonsWithProgressForSeason(userId: number, seasonId: number): Promise<any[]>;
  createSeasonLesson(data: { seasonId: number; orderIndex: number; lessonNumber?: number; title: string; type?: string; description?: string; xpReward?: number; estimatedMinutes?: number; icon?: string; isBonus?: boolean }): Promise<schema.StudyLesson>;
  releaseLessonInSeason(lessonId: number): Promise<schema.StudyLesson | null>;
  
  // Final Challenge Methods
  getSeasonFinalChallenge(seasonId: number): Promise<schema.SeasonFinalChallenge | null>;
  createFinalChallenge(data: schema.InsertSeasonFinalChallenge): Promise<schema.SeasonFinalChallenge>;
  updateFinalChallenge(id: number, data: Partial<schema.InsertSeasonFinalChallenge>): Promise<schema.SeasonFinalChallenge | null>;
  startFinalChallenge(userId: number, challengeId: number): Promise<{ progress: schema.UserFinalChallengeProgress; token: string }>;
  submitFinalChallenge(userId: number, challengeId: number, token: string, answers: number[]): Promise<schema.FinalChallengeResult>;
  getUserFinalChallengeProgress(userId: number, challengeId: number): Promise<schema.UserFinalChallengeProgress | null>;
  
  // User Season Progress Methods
  getUserSeasonProgress(userId: number, seasonId: number): Promise<schema.UserSeasonProgress | null>;
  updateUserSeasonProgress(userId: number, seasonId: number, data: Partial<schema.InsertUserSeasonProgress>): Promise<schema.UserSeasonProgress>;
  
  // Season Ranking Methods
  getSeasonRankings(seasonId: number, limit?: number): Promise<schema.SeasonRankingEntry[]>;
  updateSeasonRanking(seasonId: number, userId: number): Promise<schema.SeasonRanking>;
  finalizeSeasonRankings(seasonId: number): Promise<void>;
  
  // Weekly Goal Methods
  getWeeklyGoalProgress(userId: number, weekKey: string): Promise<schema.WeeklyGoalProgress | null>;
  getAllWeeklyGoalProgressByWeek(weekKey: string): Promise<schema.WeeklyGoalProgress[]>;
  updateWeeklyGoalProgress(userId: number, weekKey: string, data: Partial<schema.InsertWeeklyGoalProgress>): Promise<schema.WeeklyGoalProgress>;
  getWeeklyGoalStatus(userId: number, weekKey: string): Promise<schema.WeeklyGoalStatus>;
  incrementWeeklyLesson(userId: number, weekKey: string): Promise<void>;
  incrementWeeklyVerse(userId: number, weekKey: string): Promise<void>;
  incrementWeeklyMission(userId: number, weekKey: string): Promise<void>;
  incrementWeeklyDevotional(userId: number, weekKey: string): Promise<void>;
  
  // Devotional Reading Methods
  confirmDevotionalRead(userId: number, devotionalId: number, weekKey?: string): Promise<schema.DevotionalReading>;
  hasReadDevotional(userId: number, devotionalId: number): Promise<boolean>;
  getDevotionalReadings(userId: number, limit?: number): Promise<schema.DevotionalReading[]>;
  
  // Devotional Comments Methods
  getApprovedDevotionalComments(devotionalId: number): Promise<DevotionalComment[]>;
  getAllDevotionalComments(): Promise<DevotionalComment[]>;
  createDevotionalComment(data: InsertDevotionalComment): Promise<DevotionalComment>;
  approveDevotionalComment(id: number, approvedBy: number): Promise<DevotionalComment | null>;
  autoApproveDevotionalComment(id: number): Promise<DevotionalComment | null>;
  highlightDevotionalComment(id: number, isHighlighted: boolean): Promise<DevotionalComment | null>;
  deleteDevotionalComment(id: number): Promise<void>;
  
  // Member Interaction Methods
  updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void>;
  getUserOnlineStatus(userId: number): Promise<{ isOnline: boolean; lastSeenAt: Date } | null>;
  getOnlineUserIds(): Promise<number[]>;
  getPublicMemberProfile(targetUserId: number, requesterId: number): Promise<schema.PublicMemberProfile | null>;
  
  // Achievement Like Methods
  likeAchievement(userId: number, targetUserId: number, achievementId: number): Promise<boolean>;
  unlikeAchievement(userId: number, targetUserId: number, achievementId: number): Promise<boolean>;
  getAchievementLikesCount(targetUserId: number, achievementId: number): Promise<number>;
  hasLikedAchievement(userId: number, targetUserId: number, achievementId: number): Promise<boolean>;
  
  // Member Encouragement Methods
  sendEncouragement(senderId: number, receiverId: number, messageKey: string, messageText: string): Promise<schema.MemberEncouragement>;
  getReceivedEncouragements(userId: number, limit?: number): Promise<schema.MemberEncouragement[]>;
  sendEncouragementToAll(senderId: number, messageKey: string, messageText: string): Promise<number>;
  
  // Study Events Methods
  getAllStudyEvents(): Promise<StudyEvent[]>;
  getActiveStudyEvents(): Promise<StudyEvent[]>;
  getStudyEventById(id: number): Promise<StudyEvent | null>;
  createStudyEvent(data: InsertStudyEvent): Promise<StudyEvent>;
  updateStudyEvent(id: number, data: Partial<InsertStudyEvent>): Promise<StudyEvent | null>;
  deleteStudyEvent(id: number): Promise<void>;
  
  // Study Event Lessons Methods
  getStudyEventLessons(eventId: number): Promise<StudyEventLesson[]>;
  getStudyEventLessonsLightweight(eventId: number): Promise<any[]>;
  getStudyEventLessonByDay(eventId: number, dayNumber: number): Promise<StudyEventLesson | null>;
  createStudyEventLesson(data: InsertStudyEventLesson): Promise<StudyEventLesson>;
  updateStudyEventLesson(id: number, data: Partial<InsertStudyEventLesson>): Promise<StudyEventLesson | null>;
  deleteStudyEventLesson(id: number): Promise<void>;
  
  // User Event Progress Methods
  getUserEventProgress(userId: number, eventId: number): Promise<UserEventProgress[]>;
  getUserEventProgressBatch(userId: number, eventIds: number[]): Promise<Map<number, UserEventProgress[]>>;
  getUserEventLessonProgress(userId: number, lessonId: number): Promise<UserEventProgress | null>;
  saveUserEventProgress(data: InsertUserEventProgress): Promise<UserEventProgress>;
  
  // Study Event Participants Methods (for participation counter)
  registerEventParticipant(userId: number, eventId: number): Promise<boolean>;
  getEventParticipantsCount(eventId: number): Promise<number>;
  getEventParticipantsCountBatch(eventIds: number[]): Promise<Map<number, number>>;
  hasUserParticipatedInEvent(userId: number, eventId: number): Promise<boolean>;
  
  // Collectible Cards Methods
  getAllCollectibleCards(): Promise<CollectibleCard[]>;
  getActiveCollectibleCards(): Promise<CollectibleCard[]>;
  getCollectibleCardById(id: number): Promise<CollectibleCard | null>;
  getCollectibleCardsByIds(ids: number[]): Promise<Map<number, CollectibleCard>>;
  getStudyEventsByIds(ids: number[]): Promise<Map<number, StudyEvent>>;
  getUsersByIds(ids: number[]): Promise<Map<number, User>>;
  createCollectibleCard(data: InsertCollectibleCard): Promise<CollectibleCard>;
  updateCollectibleCard(id: number, data: Partial<InsertCollectibleCard>): Promise<CollectibleCard | null>;
  deleteCollectibleCard(id: number): Promise<void>;
  
  // User Cards Methods
  getUserCards(userId: number): Promise<UserCard[]>;
  getUserCard(userId: number, cardId: number): Promise<UserCard | null>;
  awardUserCard(data: InsertUserCard): Promise<UserCard>;
  
  // Event Completion Methods
  getUsersWhoCompletedEvent(eventId: number, totalLessons: number): Promise<number[]>;
  
  // Season Completion Methods
  getUsersWhoCompletedSeason(seasonId: number): Promise<{ userId: number; performance: number }[]>;
  
  // Shop Categories Methods
  getShopCategories(): Promise<ShopCategory[]>;
  getShopCategoriesLight(): Promise<Omit<ShopCategory, 'imageData'>[]>;
  getShopCategoriesWithImageCheck(ids: number[]): Promise<Map<number, boolean>>;
  getShopCategoryById(id: number): Promise<ShopCategory | null>;
  getShopCategoryImageData(id: number): Promise<string | null>;
  createShopCategory(data: InsertShopCategory): Promise<ShopCategory>;
  updateShopCategory(id: number, data: Partial<InsertShopCategory>): Promise<ShopCategory | null>;
  deleteShopCategory(id: number): Promise<void>;
  
  // Shop Items Methods
  getShopItems(onlyAvailable?: boolean): Promise<ShopItem[]>;
  getShopItemsLight(onlyAvailable?: boolean): Promise<Omit<ShopItem, 'bannerImageData'>[]>;
  getShopItemById(id: number): Promise<ShopItem | null>;
  getShopItemsByIds(ids: number[]): Promise<ShopItem[]>;
  getShopItemsByIdsLight(ids: number[]): Promise<Pick<ShopItem, 'id' | 'name' | 'price'>[]>;
  getShopItemBannerImage(id: number): Promise<string | null>;
  getShopItemsWithBannerCheck(ids: number[]): Promise<{ id: number; hasBanner: boolean }[]>;
  getShopItemBannerUrls(ids: number[]): Promise<Map<number, string>>;
  getShopItemImageData(imageId: number): Promise<string | null>;
  getShopItemImageUrls(itemIds: number[]): Promise<Map<number, { id: number; imageData: string; sortOrder: number }[]>>;
  getShopCategoryImageUrls(ids: number[]): Promise<Map<number, string>>;
  createShopItem(data: InsertShopItem): Promise<ShopItem>;
  updateShopItem(id: number, data: Partial<InsertShopItem>): Promise<ShopItem | null>;
  deleteShopItem(id: number): Promise<void>;
  deductStockQuantity(itemId: number, quantity: number): Promise<{ success: boolean; newQuantity: number | null }>;
  
  // Shop Item Images Methods
  getShopItemImages(itemId: number): Promise<ShopItemImage[]>;
  getShopItemImagesByItemIds(itemIds: number[]): Promise<Map<number, ShopItemImage[]>>;
  getShopItemImagesLight(itemId: number): Promise<Omit<ShopItemImage, 'imageData'>[]>;
  getShopItemImagesByItemIdsLight(itemIds: number[]): Promise<Map<number, Omit<ShopItemImage, 'imageData'>[]>>;
  createShopItemImage(data: InsertShopItemImage): Promise<ShopItemImage>;
  updateShopItemImage(id: number, data: Partial<InsertShopItemImage>): Promise<ShopItemImage | null>;
  deleteShopItemImage(id: number): Promise<void>;
  reorderShopItemImages(itemId: number, imageIds: number[]): Promise<void>;
  
  // Shop Item Sizes Methods
  getShopItemSizes(itemId: number): Promise<ShopItemSize[]>;
  getShopItemSizesByItemIds(itemIds: number[]): Promise<Map<number, ShopItemSize[]>>;
  createShopItemSize(data: InsertShopItemSize): Promise<ShopItemSize>;
  deleteShopItemSize(id: number): Promise<void>;
  deleteShopItemSizesByItem(itemId: number): Promise<void>;
  
  // Shop Item Size Charts Methods
  getShopItemSizeCharts(itemId: number): Promise<ShopItemSizeChart[]>;
  getShopItemSizeChartsByItemIds(itemIds: number[]): Promise<Map<number, ShopItemSizeChart[]>>;
  
  // Shop Cart Methods
  getCartItems(userId: number): Promise<ShopCartItem[]>;
  addToCart(data: InsertShopCartItem): Promise<ShopCartItem>;
  updateCartItem(id: number, quantity: number): Promise<ShopCartItem | null>;
  removeFromCart(id: number): Promise<void>;
  clearCart(userId: number): Promise<void>;
  
  // Shop Orders Methods
  getShopOrders(filters?: { userId?: number; status?: string }): Promise<ShopOrder[]>;
  getShopOrderById(id: number): Promise<ShopOrder | null>;
  getShopOrderByCode(code: string): Promise<ShopOrder | null>;
  createShopOrder(data: InsertShopOrder): Promise<ShopOrder>;
  updateShopOrder(id: number, data: Partial<InsertShopOrder>): Promise<ShopOrder | null>;
  
  // Shop Order Items Methods
  getShopOrderItems(orderId: number): Promise<ShopOrderItem[]>;
  getShopOrderItemsByOrderIds(orderIds: number[]): Promise<Map<number, ShopOrderItem[]>>;
  createShopOrderItem(data: InsertShopOrderItem): Promise<ShopOrderItem>;
  createShopOrderItemsBatch(items: InsertShopOrderItem[]): Promise<ShopOrderItem[]>;
  
  // Shop Installments Methods
  getShopInstallments(orderId: number): Promise<ShopInstallment[]>;
  getShopInstallmentsByOrderId(orderId: number): Promise<ShopInstallment[]>;
  getShopInstallmentsByOrderIds(orderIds: number[]): Promise<Map<number, ShopInstallment[]>>;
  getShopInstallmentById(id: number): Promise<ShopInstallment | null>;
  getShopInstallmentByPixId(pixId: string): Promise<ShopInstallment | null>;
  getShopInstallmentsDueSoon(daysAhead: number): Promise<ShopInstallment[]>;
  createShopInstallment(data: InsertShopInstallment): Promise<ShopInstallment>;
  createShopInstallmentsBatch(installments: InsertShopInstallment[]): Promise<ShopInstallment[]>;
  updateShopInstallment(id: number, data: Partial<InsertShopInstallment>): Promise<ShopInstallment | null>;
  
  // Promo Codes Methods
  getPromoCodes(): Promise<PromoCode[]>;
  getPromoCodeById(id: number): Promise<PromoCode | null>;
  getPromoCodeByCode(code: string): Promise<PromoCode | null>;
  createPromoCode(data: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: number, data: Partial<InsertPromoCode>): Promise<PromoCode | null>;
  deletePromoCode(id: number): Promise<void>;
  incrementPromoCodeUsage(id: number): Promise<void>;
  
  // Scheduler Reminders Methods (for persistence across restarts)
  hasSentSchedulerReminder(reminderKey: string): Promise<boolean>;
  markSchedulerReminderSent(reminderKey: string, reminderType: string, relatedId?: number): Promise<void>;
  cleanOldSchedulerReminders(maxAgeHours: number): Promise<number>;

    // ... outros métodos ...

  // Automações do Instagram e Aniversariantes
  getMembersByBirthday(day: number, month: number): Promise<User[]>;
  getDailyStoryImage(date: string): Promise<string | null>;
  saveDailyStoryImage(data: { date: string; imageUrl: string; verse: string; reference: string; theme?: string }): Promise<any>;

}

export class DatabaseStorage implements IStorage {
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(schema.users).values(user).returning();
    return newUser;
  }

  async getAllMembers(excludeAdmins: boolean = false): Promise<User[]> {
    if (excludeAdmins) {
      return db.select().from(schema.users)
        .where(and(eq(schema.users.isMember, true), eq(schema.users.isAdmin, false)))
        .orderBy(asc(schema.users.fullName));
    }
    return db.select().from(schema.users)
      .where(eq(schema.users.isMember, true))
      .orderBy(asc(schema.users.fullName));
  }

  async getMembersBasicInfo(): Promise<{ id: number; fullName: string; email: string }[]> {
    return db.select({
      id: schema.users.id,
      fullName: schema.users.fullName,
      email: schema.users.email,
    }).from(schema.users)
      .where(and(
        eq(schema.users.isMember, true),
        eq(schema.users.isAdmin, false)
      ))
      .orderBy(asc(schema.users.fullName));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(schema.users).orderBy(asc(schema.users.fullName));
  }

  async updateUser(id: number, updates: Partial<Omit<User, 'id'>>): Promise<User | undefined> {
    const [updated] = await db.update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, id))
      .returning();
    return updated;
  }

  async deleteMember(id: number): Promise<void> {
    await db.delete(schema.users).where(eq(schema.users.id, id));
  }

  async getAllPositions(): Promise<Position[]> {
    return db.select().from(schema.positions).orderBy(asc(schema.positions.id));
  }

  async getActiveElection(): Promise<Election | null> {
    const [election] = await db.select().from(schema.elections)
      .where(eq(schema.elections.isActive, true))
      .limit(1);
    return election || null;
  }

  async getElectionById(id: number): Promise<Election | undefined> {
    const [election] = await db.select().from(schema.elections)
      .where(eq(schema.elections.id, id))
      .limit(1);
    return election;
  }

  async createElection(name: string): Promise<Election> {
    const [election] = await db.insert(schema.elections)
      .values({ name })
      .returning();
    
    const positions = await this.getAllPositions();
    for (let i = 0; i < positions.length; i++) {
      await db.insert(schema.electionPositions).values({
        electionId: election.id,
        positionId: positions[i].id,
        orderIndex: i,
        status: i === 0 ? 'active' : 'pending',
        currentScrutiny: 1,
      });
    }
    
    await this.initializeAttendance(election.id);
    return election;
  }

  async closeElection(id: number): Promise<void> {
    await db.update(schema.elections)
      .set({ isActive: false, closedAt: new Date() })
      .where(eq(schema.elections.id, id));
    
    await db.update(schema.electionPositions)
      .set({ status: 'completed', closedAt: new Date() })
      .where(eq(schema.electionPositions.electionId, id));
  }

  async finalizeElection(id: number): Promise<void> {
    await db.update(schema.elections)
      .set({ isActive: false, closedAt: new Date() })
      .where(eq(schema.elections.id, id));
  }

  async getElectionHistory(): Promise<Election[]> {
    return db.select().from(schema.elections)
      .where(eq(schema.elections.isActive, false))
      .orderBy(desc(schema.elections.createdAt));
  }

  async setWinner(electionId: number, candidateId: number, positionId: number, scrutiny: number): Promise<void> {
    await db.insert(schema.electionWinners).values({
      electionId,
      candidateId,
      positionId,
      wonAtScrutiny: scrutiny,
    });
  }

  async getElectionPositions(electionId: number): Promise<ElectionPosition[]> {
    return db.select().from(schema.electionPositions)
      .where(eq(schema.electionPositions.electionId, electionId))
      .orderBy(asc(schema.electionPositions.orderIndex));
  }

  async getActiveElectionPosition(electionId: number): Promise<ElectionPosition | null> {
    const [position] = await db.select().from(schema.electionPositions)
      .where(and(
        eq(schema.electionPositions.electionId, electionId),
        eq(schema.electionPositions.status, 'active')
      ))
      .limit(1);
    return position || null;
  }

  async getElectionPositionById(id: number): Promise<ElectionPosition | null> {
    const [position] = await db.select().from(schema.electionPositions)
      .where(eq(schema.electionPositions.id, id))
      .limit(1);
    return position || null;
  }

  async advancePositionScrutiny(electionPositionId: number): Promise<void> {
    const position = await this.getElectionPositionById(electionPositionId);
    if (position && position.currentScrutiny < 3) {
      await db.update(schema.electionPositions)
        .set({ currentScrutiny: position.currentScrutiny + 1 })
        .where(eq(schema.electionPositions.id, electionPositionId));
    }
  }

  async openNextPosition(electionId: number): Promise<ElectionPosition | null> {
    const [nextPosition] = await db.select().from(schema.electionPositions)
      .where(and(
        eq(schema.electionPositions.electionId, electionId),
        eq(schema.electionPositions.status, 'pending')
      ))
      .orderBy(asc(schema.electionPositions.orderIndex))
      .limit(1);
    
    if (nextPosition) {
      await db.update(schema.electionPositions)
        .set({ status: 'active', openedAt: new Date() })
        .where(eq(schema.electionPositions.id, nextPosition.id));
      
      return { ...nextPosition, status: 'active', openedAt: new Date() };
    }
    return null;
  }

  async openPosition(electionPositionId: number): Promise<ElectionPosition> {
    const [position] = await db.update(schema.electionPositions)
      .set({ status: 'active', openedAt: new Date(), currentScrutiny: 1 })
      .where(eq(schema.electionPositions.id, electionPositionId))
      .returning();
    return position;
  }

  async completePosition(electionPositionId: number): Promise<void> {
    await db.update(schema.electionPositions)
      .set({ status: 'completed', closedAt: new Date() })
      .where(eq(schema.electionPositions.id, electionPositionId));
  }

  async forceCompletePosition(electionPositionId: number, reason: string, shouldReopen?: boolean): Promise<void> {
    await this.completePosition(electionPositionId);
    console.log(`Position ${electionPositionId} force completed. Reason: ${reason}`);
  }

  async getElectionAttendance(electionId: number): Promise<ElectionAttendance[]> {
    return db.select().from(schema.electionAttendance)
      .where(eq(schema.electionAttendance.electionId, electionId));
  }

  async getPresentCount(electionId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(schema.electionAttendance)
      .where(and(
        eq(schema.electionAttendance.electionId, electionId),
        eq(schema.electionAttendance.isPresent, true),
        isNull(schema.electionAttendance.electionPositionId)
      ));
    return Number(result[0]?.count || 0);
  }

  async getPresentCountForPosition(electionPositionId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(schema.electionAttendance)
      .where(and(
        eq(schema.electionAttendance.electionPositionId, electionPositionId),
        eq(schema.electionAttendance.isPresent, true)
      ));
    return Number(result[0]?.count || 0);
  }

  async isMemberPresent(electionId: number, memberId: number): Promise<boolean> {
    const [attendance] = await db.select()
      .from(schema.electionAttendance)
      .where(and(
        eq(schema.electionAttendance.electionId, electionId),
        eq(schema.electionAttendance.memberId, memberId),
        eq(schema.electionAttendance.isPresent, true),
        isNull(schema.electionAttendance.electionPositionId)
      ))
      .limit(1);
    return !!attendance;
  }

  async getMemberPresenceByUserIds(electionId: number, userIds: number[]): Promise<Map<number, boolean>> {
    const result = new Map<number, boolean>();
    if (userIds.length === 0) return result;
    
    const attendances = await db.select()
      .from(schema.electionAttendance)
      .where(and(
        eq(schema.electionAttendance.electionId, electionId),
        inArray(schema.electionAttendance.memberId, userIds),
        eq(schema.electionAttendance.isPresent, true),
        isNull(schema.electionAttendance.electionPositionId)
      ));
    
    const presentUserIds = new Set(attendances.map(a => a.memberId));
    for (const userId of userIds) {
      result.set(userId, presentUserIds.has(userId));
    }
    return result;
  }

  async setMemberAttendance(electionId: number, memberId: number, isPresent: boolean): Promise<void> {
    const [existing] = await db.select()
      .from(schema.electionAttendance)
      .where(and(
        eq(schema.electionAttendance.electionId, electionId),
        eq(schema.electionAttendance.memberId, memberId),
        isNull(schema.electionAttendance.electionPositionId)
      ))
      .limit(1);
    
    if (existing) {
      await db.update(schema.electionAttendance)
        .set({ isPresent, markedAt: new Date() })
        .where(eq(schema.electionAttendance.id, existing.id));
    } else {
      await db.insert(schema.electionAttendance).values({
        electionId,
        memberId,
        isPresent,
        markedAt: new Date(),
      });
    }
  }

  async initializeAttendance(electionId: number): Promise<void> {
    const members = await this.getAllMembers();
    for (const member of members) {
      if (!member.activeMember) continue;
      await db.insert(schema.electionAttendance).values({
        electionId,
        memberId: member.id,
        isPresent: false,
      });
    }
  }

  async createAttendanceSnapshot(electionPositionId: number): Promise<void> {
    const position = await this.getElectionPositionById(electionPositionId);
    if (!position) return;
    
    const mainAttendance = await db.select()
      .from(schema.electionAttendance)
      .where(and(
        eq(schema.electionAttendance.electionId, position.electionId),
        isNull(schema.electionAttendance.electionPositionId)
      ));
    
    for (const att of mainAttendance) {
      await db.insert(schema.electionAttendance).values({
        electionId: position.electionId,
        electionPositionId,
        memberId: att.memberId,
        isPresent: att.isPresent,
        markedAt: att.markedAt,
      });
    }
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return db.select().from(schema.candidates);
  }

  async getCandidatesByElection(electionId: number): Promise<CandidateWithDetails[]> {
    const candidates = await db.select({
      id: schema.candidates.id,
      name: schema.candidates.name,
      email: schema.candidates.email,
      userId: schema.candidates.userId,
      positionId: schema.candidates.positionId,
      electionId: schema.candidates.electionId,
      positionName: schema.positions.name,
      electionName: schema.elections.name,
    })
    .from(schema.candidates)
    .leftJoin(schema.positions, eq(schema.candidates.positionId, schema.positions.id))
    .leftJoin(schema.elections, eq(schema.candidates.electionId, schema.elections.id))
    .where(eq(schema.candidates.electionId, electionId));
    
    return candidates.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      userId: c.userId,
      positionId: c.positionId,
      electionId: c.electionId,
      positionName: c.positionName || '',
      electionName: c.electionName || '',
    }));
  }

  async getCandidatesByPosition(positionId: number, electionId: number): Promise<Candidate[]> {
    return db.select().from(schema.candidates)
      .where(and(
        eq(schema.candidates.positionId, positionId),
        eq(schema.candidates.electionId, electionId)
      ));
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db.insert(schema.candidates)
      .values(candidate)
      .returning();
    return newCandidate;
  }

  async clearCandidatesForPosition(positionId: number, electionId: number): Promise<void> {
    await db.delete(schema.candidates)
      .where(and(
        eq(schema.candidates.positionId, positionId),
        eq(schema.candidates.electionId, electionId)
      ));
  }

  async createVote(vote: InsertVote): Promise<Vote> {
    const [newVote] = await db.insert(schema.votes)
      .values(vote)
      .returning();
    return newVote;
  }

  async hasUserVoted(voterId: number, positionId: number, electionId: number, scrutinyRound: number): Promise<boolean> {
    const [vote] = await db.select()
      .from(schema.votes)
      .where(and(
        eq(schema.votes.voterId, voterId),
        eq(schema.votes.positionId, positionId),
        eq(schema.votes.electionId, electionId),
        eq(schema.votes.scrutinyRound, scrutinyRound)
      ))
      .limit(1);
    return !!vote;
  }

  async getElectionResults(electionId: number): Promise<ElectionResults | null> {
    const election = await this.getElectionById(electionId);
    if (!election) return null;

    const positions = await this.getElectionPositions(electionId);
    const presentCount = await this.getPresentCount(electionId);
    const winners = await this.getElectionWinners(electionId);

    // Optimized: Batch fetch all position info in one query
    const positionIds = positions.map(p => p.positionId);
    const allPositionInfo = positionIds.length > 0
      ? await db.select().from(schema.positions).where(inArray(schema.positions.id, positionIds))
      : [];
    const positionInfoMap = new Map(allPositionInfo.map(p => [p.id, p]));

    // Optimized: Batch fetch all candidates for all positions in this election
    // Ordered by id for deterministic results (matching original getCandidatesByPosition behavior)
    const allCandidates = await db.select().from(schema.candidates)
      .where(eq(schema.candidates.electionId, electionId))
      .orderBy(asc(schema.candidates.id));

    // Optimized: Batch fetch all vote counts grouped by candidate and scrutiny
    const allVoteCounts = await db.select({
      candidateId: schema.votes.candidateId,
      scrutinyRound: schema.votes.scrutinyRound,
      count: sql<number>`count(*)`,
    })
      .from(schema.votes)
      .where(eq(schema.votes.electionId, electionId))
      .groupBy(schema.votes.candidateId, schema.votes.scrutinyRound);
    
    // Create a map for quick lookup: "candidateId-scrutiny" -> count
    const voteCountMap = new Map(
      allVoteCounts.map(v => [`${v.candidateId}-${v.scrutinyRound}`, Number(v.count)])
    );

    // Optimized: Batch fetch voter counts per position and scrutiny
    const allVoterCounts = await db.select({
      positionId: schema.votes.positionId,
      scrutinyRound: schema.votes.scrutinyRound,
      count: sql<number>`count(distinct voter_id)`,
    })
      .from(schema.votes)
      .where(eq(schema.votes.electionId, electionId))
      .groupBy(schema.votes.positionId, schema.votes.scrutinyRound);
    
    const voterCountMap = new Map(
      allVoterCounts.map(v => [`${v.positionId}-${v.scrutinyRound}`, Number(v.count)])
    );

    // Now process positions without additional queries
    const positionResults = positions.map(ep => {
      const positionInfo = positionInfoMap.get(ep.positionId);
      
      const candidates = allCandidates.filter(c => c.positionId === ep.positionId);
      
      const candidateResults = candidates.map(c => {
        const voteCount = voteCountMap.get(`${c.id}-${ep.currentScrutiny}`) || 0;
        const winner = winners.find(w => w.candidateId === c.id);
        
        return {
          candidateId: c.id,
          candidateName: c.name,
          candidateEmail: c.email,
          photoUrl: schema.getGravatarUrl(c.email),
          voteCount,
          isElected: !!winner,
          electedInScrutiny: winner?.wonAtScrutiny,
          wonAtScrutiny: winner?.wonAtScrutiny,
        };
      });

      const totalVoters = voterCountMap.get(`${ep.positionId}-${ep.currentScrutiny}`) || 0;
      const majorityThreshold = ep.currentScrutiny < 3 
        ? Math.floor(totalVoters / 2) + 1 
        : Math.ceil(totalVoters / 2);
      
      const maxVotes = Math.max(...candidateResults.map(c => c.voteCount), 0);
      const hasWinner = winners.some(w => w.positionId === ep.positionId);
      const needsNextScrutiny = !hasWinner && maxVotes < majorityThreshold && ep.status === 'active';
      
      const winnerCandidate = winners.find(w => w.positionId === ep.positionId);

      return {
        positionId: ep.positionId,
        positionName: positionInfo?.name || '',
        status: ep.status,
        currentScrutiny: ep.currentScrutiny,
        orderIndex: ep.orderIndex,
        totalVoters,
        majorityThreshold,
        needsNextScrutiny,
        winnerId: winnerCandidate?.candidateId,
        winnerScrutiny: winnerCandidate?.wonAtScrutiny,
        candidates: candidateResults,
      };
    });

    return {
      electionId: election.id,
      electionName: election.name,
      isActive: election.isActive,
      currentScrutiny: positions.find(p => p.status === 'active')?.currentScrutiny || 1,
      presentCount,
      createdAt: election.createdAt?.toISOString() || new Date().toISOString(),
      closedAt: election.closedAt?.toISOString() || null,
      positions: positionResults,
    };
  }

  async getLatestElectionResults(): Promise<ElectionResults | null> {
    const [election] = await db.select()
      .from(schema.elections)
      .orderBy(desc(schema.elections.createdAt))
      .limit(1);
    
    if (!election) return null;
    return this.getElectionResults(election.id);
  }

  async getElectionWinners(electionId: number): Promise<Array<{ userId: number; positionId: number; candidateId: number; wonAtScrutiny: number }>> {
    const winners = await db.select({
      positionId: schema.electionWinners.positionId,
      candidateId: schema.electionWinners.candidateId,
      wonAtScrutiny: schema.electionWinners.wonAtScrutiny,
      userId: schema.candidates.userId,
    })
    .from(schema.electionWinners)
    .leftJoin(schema.candidates, eq(schema.electionWinners.candidateId, schema.candidates.id))
    .where(eq(schema.electionWinners.electionId, electionId));
    
    return winners.map(w => ({
      userId: w.userId || 0,
      positionId: w.positionId,
      candidateId: w.candidateId,
      wonAtScrutiny: w.wonAtScrutiny,
    }));
  }

  async getVoterAttendance(electionId: number): Promise<Array<any>> {
    const result = await db.select({
      voterId: schema.votes.voterId,
      voterName: schema.users.fullName,
      voterEmail: schema.users.email,
      firstVoteAt: sql<string>`min(${schema.votes.createdAt})`,
      totalVotes: sql<number>`count(*)`,
    })
    .from(schema.votes)
    .leftJoin(schema.users, eq(schema.votes.voterId, schema.users.id))
    .where(eq(schema.votes.electionId, electionId))
    .groupBy(schema.votes.voterId, schema.users.fullName, schema.users.email);
    
    return result;
  }

  async getVoteTimeline(electionId: number): Promise<Array<any>> {
    const result = await db.select({
      voterId: schema.votes.voterId,
      voterName: schema.users.fullName,
      voterEmail: schema.users.email,
      positionName: schema.positions.name,
      candidateName: schema.candidates.name,
      scrutinyRound: schema.votes.scrutinyRound,
      votedAt: schema.votes.createdAt,
    })
    .from(schema.votes)
    .leftJoin(schema.users, eq(schema.votes.voterId, schema.users.id))
    .leftJoin(schema.positions, eq(schema.votes.positionId, schema.positions.id))
    .leftJoin(schema.candidates, eq(schema.votes.candidateId, schema.candidates.id))
    .where(eq(schema.votes.electionId, electionId))
    .orderBy(asc(schema.votes.createdAt));
    
    return result;
  }

  async getElectionAuditData(electionId: number): Promise<any | null> {
    const results = await this.getElectionResults(electionId);
    if (!results) return null;

    const election = await this.getElectionById(electionId);
    const voterAttendance = await this.getVoterAttendance(electionId);
    const voteTimeline = await this.getVoteTimeline(electionId);
    const members = await this.getAllMembers();

    return {
      results,
      electionMetadata: {
        createdAt: election?.createdAt?.toISOString() || '',
        closedAt: election?.closedAt?.toISOString(),
        totalPositions: results.positions.length,
        completedPositions: results.positions.filter(p => p.status === 'completed').length,
        totalMembers: members.length,
      },
      voterAttendance,
      voteTimeline,
    };
  }

  async createVerificationCode(data: InsertVerificationCode): Promise<VerificationCode> {
    const [code] = await db.insert(schema.verificationCodes)
      .values(data)
      .returning();
    return code;
  }

  async getValidVerificationCode(email: string, code: string): Promise<VerificationCode | null> {
    const [result] = await db.select()
      .from(schema.verificationCodes)
      .where(and(
        eq(schema.verificationCodes.email, email),
        eq(schema.verificationCodes.code, code),
        gt(schema.verificationCodes.expiresAt, new Date())
      ))
      .orderBy(desc(schema.verificationCodes.createdAt))
      .limit(1);
    return result || null;
  }

  async deleteVerificationCodesByEmail(email: string): Promise<void> {
    await db.delete(schema.verificationCodes)
      .where(eq(schema.verificationCodes.email, email));
  }

  async createPdfVerification(electionId: number, verificationHash: string, presidentName?: string): Promise<any> {
    const [result] = await db.insert(schema.pdfVerifications)
      .values({ electionId, verificationHash, presidentName })
      .returning();
    return result;
  }

  async getPdfVerification(verificationHash: string): Promise<any | null> {
    const [result] = await db.select()
      .from(schema.pdfVerifications)
      .where(eq(schema.pdfVerifications.verificationHash, verificationHash))
      .limit(1);
    return result || null;
  }

  // Study System Methods
  async getStudyWeekById(weekId: number): Promise<any | null> {
    const [week] = await db.select().from(schema.studyWeeks)
      .where(eq(schema.studyWeeks.id, weekId))
      .limit(1);
    return week || null;
  }

  async getStudyWeekByNumber(weekNumber: number, year: number): Promise<any | null> {
    const [week] = await db.select().from(schema.studyWeeks)
      .where(and(
        eq(schema.studyWeeks.weekNumber, weekNumber),
        eq(schema.studyWeeks.year, year)
      ))
      .limit(1);
    return week || null;
  }

  async getAllStudyWeeks(): Promise<any[]> {
    return db.select().from(schema.studyWeeks)
      .orderBy(desc(schema.studyWeeks.year), desc(schema.studyWeeks.weekNumber));
  }

  async getLessonsForWeek(weekId: number): Promise<any[]> {
    return db.select().from(schema.studyLessons)
      .where(eq(schema.studyLessons.studyWeekId, weekId))
      .orderBy(asc(schema.studyLessons.orderIndex));
  }

  async getLessonById(lessonId: number): Promise<any | null> {
    const [lesson] = await db.select().from(schema.studyLessons)
      .where(eq(schema.studyLessons.id, lessonId))
      .limit(1);
    return lesson || null;
  }

  // OPTIMIZED: Get lesson with season status in a single query (avoids N+1)
  async getLessonWithSeasonStatus(lessonId: number): Promise<{ lesson: any; seasonEnded: boolean; seasonTitle: string | null } | null> {
    const [result] = await db.select({
      lesson: schema.studyLessons,
      seasonEnded: schema.seasons.isEnded,
      seasonTitle: schema.seasons.title,
    })
      .from(schema.studyLessons)
      .leftJoin(schema.seasons, eq(schema.studyLessons.seasonId, schema.seasons.id))
      .where(eq(schema.studyLessons.id, lessonId))
      .limit(1);
    
    if (!result?.lesson) return null;
    
    return {
      lesson: result.lesson,
      seasonEnded: result.seasonEnded ?? false,
      seasonTitle: result.seasonTitle ?? null,
    };
  }

  async getUnitsByLessonId(lessonId: number): Promise<any[]> {
    return db.select().from(schema.studyUnits)
      .where(eq(schema.studyUnits.lessonId, lessonId))
      .orderBy(asc(schema.studyUnits.orderIndex));
  }

  // OPTIMIZED: Batch fetch units for multiple lessons
  async getUnitsByLessonIds(lessonIds: number[]): Promise<any[]> {
    if (lessonIds.length === 0) return [];
    return db.select().from(schema.studyUnits)
      .where(inArray(schema.studyUnits.lessonId, lessonIds))
      .orderBy(asc(schema.studyUnits.lessonId), asc(schema.studyUnits.orderIndex));
  }

  // OPTIMIZED: Batch fetch units for multiple lessons in one query (avoids N+1)
  async getUnitsForMultipleLessons(lessonIds: number[]): Promise<Map<number, any[]>> {
    if (lessonIds.length === 0) return new Map();
    
    const units = await db.select().from(schema.studyUnits)
      .where(inArray(schema.studyUnits.lessonId, lessonIds))
      .orderBy(asc(schema.studyUnits.lessonId), asc(schema.studyUnits.orderIndex));
    
    // Group by lessonId
    const unitsByLesson = new Map<number, any[]>();
    for (const unit of units) {
      const lessonUnits = unitsByLesson.get(unit.lessonId) || [];
      lessonUnits.push(unit);
      unitsByLesson.set(unit.lessonId, lessonUnits);
    }
    
    return unitsByLesson;
  }

  async getStudyUnitById(unitId: number): Promise<any | null> {
    const [unit] = await db.select().from(schema.studyUnits)
      .where(eq(schema.studyUnits.id, unitId))
      .limit(1);
    return unit || null;
  }

  async createStudyWeek(data: { title: string; description?: string; weekNumber: number; year: number; createdBy?: number; aiMetadata?: string }): Promise<any> {
    const [week] = await db.insert(schema.studyWeeks)
      .values(data)
      .returning();
    return week;
  }

  async createStudyLesson(data: { studyWeekId: number; orderIndex: number; title: string; type?: string; description?: string; xpReward?: number; estimatedMinutes?: number; icon?: string; isBonus?: boolean }): Promise<any> {
    const [lesson] = await db.insert(schema.studyLessons)
      .values({
        ...data,
        type: data.type || 'study',
        xpReward: data.xpReward || 10,
        estimatedMinutes: data.estimatedMinutes || 5,
        isBonus: data.isBonus || false,
      })
      .returning();
    return lesson;
  }

  async createStudyUnit(data: { lessonId: number; orderIndex: number; type: string; content: any; xpValue?: number; stage?: string }): Promise<any> {
    const [unit] = await db.insert(schema.studyUnits)
      .values({
        lessonId: data.lessonId,
        orderIndex: data.orderIndex,
        type: data.type,
        content: typeof data.content === 'string' ? data.content : JSON.stringify(data.content),
        xpValue: data.xpValue || 2,
        stage: data.stage || 'estude',
      })
      .returning();
    return unit;
  }

  async updateStudyLesson(lessonId: number, data: { title?: string; type?: string; description?: string; xpReward?: number; estimatedMinutes?: number; icon?: string; isBonus?: boolean; orderIndex?: number; isLocked?: boolean; unlockDate?: string | null }): Promise<any | null> {
    const updates: any = { ...data, updatedAt: new Date() };
    if (data.unlockDate) {
      updates.unlockDate = new Date(data.unlockDate);
    } else if (data.unlockDate === null) {
      updates.unlockDate = null;
    }
    const [lesson] = await db.update(schema.studyLessons)
      .set(updates)
      .where(eq(schema.studyLessons.id, lessonId))
      .returning();
    return lesson || null;
  }

  async deleteStudyLesson(lessonId: number): Promise<boolean> {
    // First, get all unit IDs for this lesson
    const units = await db.select({ id: schema.studyUnits.id })
      .from(schema.studyUnits)
      .where(eq(schema.studyUnits.lessonId, lessonId));
    const unitIds = units.map(u => u.id);
    
    // Delete user unit progress first (foreign key constraint to studyUnits)
    if (unitIds.length > 0) {
      await db.delete(schema.userUnitProgress).where(inArray(schema.userUnitProgress.unitId, unitIds));
    }
    
    // Delete user lesson progress (foreign key constraint to studyLessons)
    await db.delete(schema.userLessonProgress).where(eq(schema.userLessonProgress.lessonId, lessonId));
    
    // Delete units
    await db.delete(schema.studyUnits).where(eq(schema.studyUnits.lessonId, lessonId));
    
    // Delete lesson
    await db.delete(schema.studyLessons).where(eq(schema.studyLessons.id, lessonId));
    return true;
  }

  async updateStudyUnit(unitId: number, data: { type?: string; content?: any; xpValue?: number; orderIndex?: number; stage?: string }): Promise<any | null> {
    const updates: any = { ...data };
    if (data.content) {
      updates.content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
    }
    const [unit] = await db.update(schema.studyUnits)
      .set(updates)
      .where(eq(schema.studyUnits.id, unitId))
      .returning();
    return unit || null;
  }

  async deleteStudyUnit(unitId: number): Promise<boolean> {
    // Delete user unit progress first (foreign key constraint)
    await db.delete(schema.userUnitProgress).where(eq(schema.userUnitProgress.unitId, unitId));
    // Delete the unit
    await db.delete(schema.studyUnits).where(eq(schema.studyUnits.id, unitId));
    return true;
  }

  async updateStudyWeek(weekId: number, data: { title?: string; description?: string; weekNumber?: number; year?: number; status?: string }): Promise<any | null> {
    const [week] = await db.update(schema.studyWeeks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.studyWeeks.id, weekId))
      .returning();
    return week || null;
  }

  async deleteStudyWeek(weekId: number): Promise<boolean> {
    // Delete lessons first (this will also delete units and user progress)
    const lessons = await this.getLessonsForWeek(weekId);
    for (const lesson of lessons) {
      await this.deleteStudyLesson(lesson.id);
    }
    
    // Delete practice questions (foreign key constraint)
    await db.delete(schema.practiceQuestions).where(eq(schema.practiceQuestions.weekId, weekId));
    
    
    // Finally delete the week
    await db.delete(schema.studyWeeks).where(eq(schema.studyWeeks.id, weekId));
    return true;
  }

  async getUnitsForLesson(lessonId: number): Promise<any[]> {
    return this.getUnitsByLessonId(lessonId);
  }

  async publishStudyWeek(weekId: number): Promise<any | null> {
    // Update week status
    const [week] = await db.update(schema.studyWeeks)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.studyWeeks.id, weekId))
      .returning();
    
    // Also unlock all lessons in this week so they appear to users
    await db.update(schema.studyLessons)
      .set({ isLocked: false, updatedAt: new Date() })
      .where(eq(schema.studyLessons.studyWeekId, weekId));
    
    return week || null;
  }

  async lockLesson(lessonId: number): Promise<any | null> {
    const [lesson] = await db.update(schema.studyLessons)
      .set({ isLocked: true, unlockDate: null, updatedAt: new Date() })
      .where(eq(schema.studyLessons.id, lessonId))
      .returning();
    return lesson || null;
  }

  async unlockLesson(lessonId: number): Promise<any | null> {
    const [lesson] = await db.update(schema.studyLessons)
      .set({ isLocked: false, updatedAt: new Date() })
      .where(eq(schema.studyLessons.id, lessonId))
      .returning();
    return lesson || null;
  }

  async setLessonUnlockDate(lessonId: number, unlockDate: string | null): Promise<any | null> {
    const [lesson] = await db.update(schema.studyLessons)
      .set({ 
        unlockDate: unlockDate ? new Date(unlockDate) : null, 
        updatedAt: new Date() 
      })
      .where(eq(schema.studyLessons.id, lessonId))
      .returning();
    return lesson || null;
  }

  async unlockAllLessonsForWeek(weekId: number): Promise<number> {
    const result = await db.update(schema.studyLessons)
      .set({ isLocked: false, updatedAt: new Date() })
      .where(eq(schema.studyLessons.studyWeekId, weekId));
    return 1;
  }

  async lockAllLessonsForWeek(weekId: number): Promise<number> {
    const result = await db.update(schema.studyLessons)
      .set({ isLocked: true, updatedAt: new Date() })
      .where(eq(schema.studyLessons.studyWeekId, weekId));
    return 1;
  }

  async setWeeklyUnlockSchedule(weekId: number, startDate: string): Promise<number> {
    const lessons = await this.getLessonsForWeek(weekId);
    let count = 0;
    const start = new Date(startDate);
    
    for (const lesson of lessons) {
      const unlockDate = new Date(start);
      unlockDate.setDate(unlockDate.getDate() + lesson.orderIndex);
      await db.update(schema.studyLessons)
        .set({ isLocked: true, unlockDate, updatedAt: new Date() })
        .where(eq(schema.studyLessons.id, lesson.id));
      count++;
    }
    return count;
  }

  // Daily Missions
  async getDailyMissions(): Promise<any[]> {
    return db.select().from(schema.dailyMissions)
      .where(eq(schema.dailyMissions.isActive, true));
  }

  async getUserDailyMissions(userId: number, date: string): Promise<any[]> {
    return db.select({
      id: schema.userDailyMissions.id,
      userId: schema.userDailyMissions.userId,
      missionId: schema.userDailyMissions.missionId,
      assignedDate: schema.userDailyMissions.assignedDate,
      completed: schema.userDailyMissions.completed,
      completedAt: schema.userDailyMissions.completedAt,
      xpAwarded: schema.userDailyMissions.xpAwarded,
      mission: schema.dailyMissions,
    })
    .from(schema.userDailyMissions)
    .leftJoin(schema.dailyMissions, eq(schema.userDailyMissions.missionId, schema.dailyMissions.id))
    .where(and(
      eq(schema.userDailyMissions.userId, userId),
      eq(schema.userDailyMissions.assignedDate, date)
    ));
  }

  async assignDailyMissions(userId: number, date: string): Promise<any[]> {
    const existing = await this.getUserDailyMissions(userId, date);
    if (existing.length > 0) return existing;
    
    const missions = await this.getDailyMissions();
    
    // Shuffle missions using Fisher-Yates algorithm for true randomness
    const shuffled = [...missions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Select 5 random missions
    const selected = shuffled.slice(0, 5);
    
    for (const mission of selected) {
      await db.insert(schema.userDailyMissions).values({
        userId,
        missionId: mission.id,
        assignedDate: date,
      });
    }
    
    return this.getUserDailyMissions(userId, date);
  }

  async getUserMissionById(userId: number, missionId: number, date: string): Promise<any | null> {
    const [result] = await db.select({
      id: schema.userDailyMissions.id,
      missionId: schema.userDailyMissions.missionId,
      completed: schema.userDailyMissions.completed,
      assignedDate: schema.userDailyMissions.assignedDate,
      mission: schema.dailyMissions,
    })
      .from(schema.userDailyMissions)
      .leftJoin(schema.dailyMissions, eq(schema.userDailyMissions.missionId, schema.dailyMissions.id))
      .where(and(
        eq(schema.userDailyMissions.userId, userId),
        eq(schema.userDailyMissions.missionId, missionId),
        eq(schema.userDailyMissions.assignedDate, date)
      ))
      .limit(1);
    return result || null;
  }

  async completeMission(userId: number, missionId: number, date: string): Promise<any | null> {
    // Check if mission is already completed
    const existingMission = await this.getUserMissionById(userId, missionId, date);
    if (existingMission?.completed) {
      return existingMission;
    }
    
    // Each daily mission gives 10XP
    const xp = 10;
    
    const [result] = await db.update(schema.userDailyMissions)
      .set({ completed: true, completedAt: new Date(), xpAwarded: xp })
      .where(and(
        eq(schema.userDailyMissions.userId, userId),
        eq(schema.userDailyMissions.missionId, missionId),
        eq(schema.userDailyMissions.assignedDate, date)
      ))
      .returning();
    
    if (result) {
      // Check if all 5 daily missions are now completed for bonus XP
      const allMissions = await this.getUserDailyMissions(userId, date);
      const completedCount = allMissions.filter((m: any) => m.completed).length;
      let totalMissionXp = xp;
      let bonusXpAwarded = 0;
      
      if (completedCount === 5) {
        bonusXpAwarded = 25;
        totalMissionXp = xp + bonusXpAwarded;
        console.log(`[Missions] User ${userId} completed all 5 daily missions! Bonus 25XP awarded.`);
      }
      
      // CRITICAL FIX: Insert into dailyMissionXp (immutable, single source of truth for leaderboards)
      // Use onConflictDoUpdate to accumulate XP from multiple missions
      await db.insert(schema.dailyMissionXp)
        .values({
          userId,
          missionDate: date,
          missionXp: xp,
          bonusXp: bonusXpAwarded,
        })
        .onConflictDoUpdate({
          target: [schema.dailyMissionXp.userId, schema.dailyMissionXp.missionDate],
          set: {
            missionXp: sql`${schema.dailyMissionXp.missionXp} + ${xp}`,
            bonusXp: bonusXpAwarded > 0 ? sql`${bonusXpAwarded}` : sql`${schema.dailyMissionXp.bonusXp}`,
          },
        });
      
      // Also record in xpTransactions for audit log
      await this.addXp(userId, xp, 'daily_mission', missionId);
      if (bonusXpAwarded > 0) {
        await this.addXp(userId, bonusXpAwarded, 'daily_missions_bonus');
      }
    }
    
    return result || null;
  }

  async getDailyMissionContent(date: string): Promise<any | null> {
    const [content] = await db.select().from(schema.dailyMissionContent)
      .where(eq(schema.dailyMissionContent.contentDate, date))
      .limit(1);
    return content || null;
  }

  async createDailyMissionContent(data: any): Promise<any> {
    const [content] = await db.insert(schema.dailyMissionContent)
      .values(data)
      .returning();
    return content;
  }

  async initializeDailyMissions(): Promise<void> {
    const existingMissions = await this.getDailyMissions();
    if (existingMissions.length > 0) return;

    const defaultMissions = [
      // All daily missions give 10XP each (5 missions x 10XP = 50XP + 25XP bonus = 75XP max daily)
      { type: 'complete_lesson', title: 'Estudante Dedicado', description: 'Complete uma lição hoje', icon: 'BookOpen', xpReward: 10 },
      { type: 'read_daily_verse', title: 'Palavra do Dia', description: 'Leia o versículo do dia na aba Explorar', icon: 'BookMarked', xpReward: 10 },
      { type: 'quick_quiz', title: 'Quiz Rápido', description: 'Responda 3 perguntas corretamente', icon: 'Zap', xpReward: 10 },
      { type: 'maintain_streak', title: 'Mantenha o Foco', description: 'Complete uma lição para manter sua ofensiva', icon: 'Flame', xpReward: 10 },
      { type: 'perfect_answers', title: 'Perfeição', description: 'Acerte 5 respostas seguidas', icon: 'Star', xpReward: 10 },
      // Additional variety missions
      { type: 'timed_challenge', title: 'Contra o Relógio', description: 'Responda 5 perguntas em 30 segundos', icon: 'Timer', xpReward: 10 },
      { type: 'bible_character', title: 'Personagem Bíblico', description: 'Conheça um personagem da Bíblia', icon: 'User', xpReward: 10 },
      { type: 'simple_prayer', title: 'Momento de Oração', description: 'Escreva uma oração de gratidão', icon: 'Heart', xpReward: 10 },
      { type: 'bible_fact', title: 'Curiosidade Bíblica', description: 'Aprenda um fato interessante da Bíblia', icon: 'Lightbulb', xpReward: 10 },
      // New challenging missions (replaced memorize_theme)
      { type: 'verse_memory', title: 'Memorize o Versículo', description: 'Complete as palavras que faltam no versículo', icon: 'Brain', xpReward: 10 },
      { type: 'daily_reflection', title: 'Reflexão Diária', description: 'Escreva uma reflexão sobre o estudo de hoje', icon: 'MessageSquare', xpReward: 10 },
      { type: 'share_knowledge', title: 'Compartilhe a Palavra', description: 'Compartilhe o Versículo do Dia no WhatsApp ou Instagram', icon: 'Share2', xpReward: 10 },
    ];

    for (const mission of defaultMissions) {
      await db.insert(schema.dailyMissions).values(mission);
    }
  }

  // Bible Verses
  async getUnreadVersesForUser(userId: number): Promise<any[]> {
    const readVerseIds = await db.select({ verseId: schema.verseReadings.verseId })
      .from(schema.verseReadings)
      .where(eq(schema.verseReadings.userId, userId));
    
    const readIds = readVerseIds.map(r => r.verseId);
    
    if (readIds.length === 0) {
      return db.select().from(schema.bibleVerses);
    }
    
    return db.select().from(schema.bibleVerses)
      .where(sql`${schema.bibleVerses.id} NOT IN (${sql.join(readIds, sql`, `)})`);
  }

  async getTotalVersesReadByUser(userId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(schema.verseReadings)
      .where(eq(schema.verseReadings.userId, userId));
    return Number(result[0]?.count || 0);
  }

  async resetUserVerseReadings(userId: number): Promise<void> {
    await db.delete(schema.verseReadings)
      .where(eq(schema.verseReadings.userId, userId));
  }

  async clearAllBibleVerses(): Promise<void> {
    await db.delete(schema.verseReadings);
    await db.delete(schema.bibleVerses);
  }

  async clearAllDailyMissions(): Promise<void> {
    await db.delete(schema.userDailyMissions);
    await db.delete(schema.dailyMissions);
  }

  async clearAllAchievements(): Promise<void> {
    await db.delete(schema.userAchievements);
    await db.delete(schema.achievements);
  }

  async clearAllStudyProgress(): Promise<void> {
    await db.delete(schema.userUnitProgress);
    await db.delete(schema.userLessonProgress);
    await db.delete(schema.verseReadings);
    await db.delete(schema.xpTransactions);
    await db.delete(schema.dailyActivity);
    await db.delete(schema.leaderboardEntries);
    await db.delete(schema.studyProfiles);
  }

  async createDailyMission(data: { type: string; title: string; description: string; icon: string; xpReward: number }): Promise<any> {
    const [mission] = await db.insert(schema.dailyMissions)
      .values(data)
      .returning();
    return mission;
  }

  // Devotionals
  async getLatestDevotional(): Promise<any | null> {
    const [devotional] = await db.select().from(schema.devotionals)
      .where(eq(schema.devotionals.isPublished, true))
      .orderBy(desc(schema.devotionals.publishedAt))
      .limit(1);
    return devotional || null;
  }

  async getAllDevotionals(limit?: number): Promise<any[]> {
    let query = db.select().from(schema.devotionals)
      .where(eq(schema.devotionals.isPublished, true))
      .orderBy(desc(schema.devotionals.publishedAt));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async getDevotionalById(id: number): Promise<any | null> {
    const [devotional] = await db.select().from(schema.devotionals)
      .where(eq(schema.devotionals.id, id))
      .limit(1);
    return devotional || null;
  }

  async createDevotional(data: { title: string; verse: string; verseReference: string; content: string; contentHtml?: string; summary?: string; prayer?: string; imageUrl?: string; author?: string; isPublished?: boolean; isFeatured?: boolean; scheduledAt?: Date; createdBy?: number }): Promise<any> {
    const [devotional] = await db.insert(schema.devotionals)
      .values({
        ...data,
        isPublished: data.isPublished ?? false,
        isFeatured: data.isFeatured ?? false,
      })
      .returning();
    return devotional;
  }

  async getAllDevotionalsAdmin(): Promise<any[]> {
    return db.select().from(schema.devotionals)
      .orderBy(desc(schema.devotionals.createdAt));
  }

  async updateDevotional(id: number, data: Partial<{ title: string; verse: string; verseReference: string; content: string; contentHtml?: string; summary?: string; prayer?: string; imageUrl?: string; author?: string; isPublished?: boolean; isFeatured?: boolean; scheduledAt?: Date | null }>): Promise<any | null> {
    const [devotional] = await db.update(schema.devotionals)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.devotionals.id, id))
      .returning();
    return devotional || null;
  }

  async deleteDevotional(id: number): Promise<boolean> {
    const result = await db.delete(schema.devotionals)
      .where(eq(schema.devotionals.id, id))
      .returning();
    return result.length > 0;
  }

  async publishDevotional(id: number): Promise<any | null> {
    const [devotional] = await db.update(schema.devotionals)
      .set({
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.devotionals.id, id))
      .returning();
    return devotional || null;
  }

  async unpublishDevotional(id: number): Promise<any | null> {
    const [devotional] = await db.update(schema.devotionals)
      .set({
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(eq(schema.devotionals.id, id))
      .returning();
    return devotional || null;
  }

  async clearAllDevotionals(): Promise<void> {
    await db.delete(schema.devotionals);
  }

  // Site Events
  async getUpcomingEvents(limit?: number): Promise<any[]> {
    const today = getTodayBrazilDate();
    let query = db.select({
      id: schema.siteEvents.id,
      title: schema.siteEvents.title,
      description: schema.siteEvents.description,
      shortDescription: schema.siteEvents.shortDescription,
      imageUrl: schema.siteEvents.imageUrl,
      startDate: schema.siteEvents.startDate,
      endDate: schema.siteEvents.endDate,
      time: schema.siteEvents.time,
      location: schema.siteEvents.location,
      locationUrl: schema.siteEvents.locationUrl,
      price: schema.siteEvents.price,
      registrationUrl: schema.siteEvents.registrationUrl,
      category: schema.siteEvents.category,
      isPublished: schema.siteEvents.isPublished,
      isFeatured: schema.siteEvents.isFeatured,
      isAllDay: schema.siteEvents.isAllDay,
      createdBy: schema.siteEvents.createdBy,
      createdAt: schema.siteEvents.createdAt,
      updatedAt: schema.siteEvents.updatedAt,
      feeAmount: schema.eventFees.feeAmount,
      feeDeadline: schema.eventFees.deadline,
    })
      .from(schema.siteEvents)
      .leftJoin(schema.eventFees, eq(schema.siteEvents.id, schema.eventFees.eventId))
      .where(and(
        eq(schema.siteEvents.isPublished, true),
        gte(schema.siteEvents.startDate, today)
      ))
      .orderBy(asc(schema.siteEvents.startDate));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async getAllSiteEvents(): Promise<any[]> {
    return db.select().from(schema.siteEvents)
      .orderBy(desc(schema.siteEvents.startDate));
  }

  async createSiteEvent(data: { 
    title: string; 
    description?: string | null; 
    shortDescription?: string | null;
    imageUrl?: string | null; 
    startDate: string; 
    endDate?: string | null; 
    time?: string | null; 
    location?: string | null; 
    locationUrl?: string | null;
    price?: string | null;
    registrationUrl?: string | null;
    category?: string;
    isPublished?: boolean;
    isFeatured?: boolean;
    isAllDay?: boolean;
    createdBy?: number;
  }): Promise<any> {
    const [event] = await db.insert(schema.siteEvents)
      .values({
        ...data,
        isPublished: data.isPublished ?? true,
        category: data.category ?? "geral",
      })
      .returning();
    return event;
  }

  async clearAllSiteEvents(): Promise<void> {
    await db.delete(schema.siteEvents);
  }

  async getSiteEventById(id: number): Promise<any | null> {
    const [event] = await db.select().from(schema.siteEvents)
      .where(eq(schema.siteEvents.id, id))
      .limit(1);
    return event || null;
  }

  async updateSiteEvent(id: number, data: Partial<{
    title: string;
    description: string | null;
    shortDescription: string | null;
    imageUrl: string | null;
    startDate: string;
    endDate: string | null;
    time: string | null;
    location: string | null;
    locationUrl: string | null;
    price: string | null;
    registrationUrl: string | null;
    category: string;
    isPublished: boolean;
    isFeatured: boolean;
    isAllDay: boolean;
  }>): Promise<any | null> {
    const [event] = await db.update(schema.siteEvents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.siteEvents.id, id))
      .returning();
    return event || null;
  }

  async deleteSiteEvent(id: number): Promise<boolean> {
    const result = await db.delete(schema.siteEvents)
      .where(eq(schema.siteEvents.id, id));
    return true;
  }

  async getMarketingStats(): Promise<{
    events: { total: number; upcoming: number; past: number };
    boardMembers: { total: number; active: number };
  }> {
    const today = getTodayBrazilDate();
    
    const [allEvents, upcomingEvents, allMembers, activeMembers] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(schema.siteEvents),
      db.select({ count: sql<number>`count(*)` }).from(schema.siteEvents)
        .where(gte(schema.siteEvents.startDate, today)),
      db.select({ count: sql<number>`count(*)` }).from(schema.boardMembers),
      db.select({ count: sql<number>`count(*)` }).from(schema.boardMembers)
        .where(eq(schema.boardMembers.isCurrent, true)),
    ]);

    const totalEvents = Number(allEvents[0]?.count || 0);
    const upcoming = Number(upcomingEvents[0]?.count || 0);
    
    return {
      events: {
        total: totalEvents,
        upcoming,
        past: totalEvents - upcoming,
      },
      boardMembers: {
        total: Number(allMembers[0]?.count || 0),
        active: Number(activeMembers[0]?.count || 0),
      },
    };
  }

  // Instagram Posts
  async getLatestInstagramPosts(limit?: number): Promise<any[]> {
    let query = db.select().from(schema.instagramPosts)
      .where(eq(schema.instagramPosts.isActive, true))
      .orderBy(desc(schema.instagramPosts.postedAt));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async createInstagramPost(data: { instagramId?: string; caption?: string; imageUrl: string; videoUrl?: string; mediaType?: string; permalink?: string; likesCount?: number; commentsCount?: number; postedAt?: string; isActive?: boolean }): Promise<any> {
    const [post] = await db.insert(schema.instagramPosts)
      .values({
        instagramId: data.instagramId,
        caption: data.caption,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        mediaType: data.mediaType || "IMAGE",
        permalink: data.permalink,
        likesCount: data.likesCount ?? 0,
        commentsCount: data.commentsCount ?? 0,
        postedAt: data.postedAt ? new Date(data.postedAt) : new Date(),
        isActive: data.isActive ?? true,
      })
      .returning();
    return post;
  }

  async clearAllInstagramPosts(): Promise<void> {
    await db.delete(schema.instagramPosts);
  }

  async getFeaturedInstagramPost(): Promise<any | null> {
    const [post] = await db.select().from(schema.instagramPosts)
      .where(eq(schema.instagramPosts.isFeaturedBanner, true))
      .limit(1);
    return post || null;
  }

  async getFeaturedInstagramPosts(): Promise<any[]> {
    return db.select().from(schema.instagramPosts)
      .where(and(
        eq(schema.instagramPosts.isFeaturedBanner, true),
        eq(schema.instagramPosts.isActive, true)
      ))
      .orderBy(desc(schema.instagramPosts.postedAt))
      .limit(10);
  }

  async getFeaturedDevotionals(): Promise<any[]> {
    return db.select().from(schema.devotionals)
      .where(and(
        eq(schema.devotionals.isFeatured, true),
        eq(schema.devotionals.isPublished, true)
      ))
      .orderBy(desc(schema.devotionals.publishedAt))
      .limit(10);
  }

  async getFeaturedEvents(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    return db.select().from(schema.siteEvents)
      .where(and(
        eq(schema.siteEvents.isFeatured, true),
        gte(schema.siteEvents.startDate, today)
      ))
      .orderBy(asc(schema.siteEvents.startDate))
      .limit(10);
  }

  async setFeaturedInstagramPost(id: number): Promise<any | null> {
    await db.update(schema.instagramPosts)
      .set({ isFeaturedBanner: false });
    
    const [updated] = await db.update(schema.instagramPosts)
      .set({ isFeaturedBanner: true })
      .where(eq(schema.instagramPosts.id, id))
      .returning();
    return updated || null;
  }

  async getInstagramPostById(id: number): Promise<any | null> {
    const [post] = await db.select().from(schema.instagramPosts)
      .where(eq(schema.instagramPosts.id, id))
      .limit(1);
    return post || null;
  }

  async removeFeaturedInstagramPost(id: number): Promise<void> {
    await db.update(schema.instagramPosts)
      .set({ isFeaturedBanner: false })
      .where(eq(schema.instagramPosts.id, id));
  }

  async getInstagramPostsForAdmin(): Promise<any[]> {
    return db.select().from(schema.instagramPosts)
      .orderBy(desc(schema.instagramPosts.postedAt));
  }

  async getSiteHighlights(): Promise<{ devotional: any | null; events: any[]; instagramPosts: any[]; featuredInstagramPost: any | null; featuredDevotionals: any[]; featuredEvents: any[]; featuredInstagramPosts: any[] }> {
    const [devotional, events, instagramPosts, featuredInstagramPost, featuredDevotionals, featuredEvents, featuredInstagramPosts] = await Promise.all([
      this.getLatestDevotional(),
      this.getUpcomingEvents(5),
      this.getLatestInstagramPosts(6),
      this.getFeaturedInstagramPost(),
      this.getFeaturedDevotionals(),
      this.getFeaturedEvents(),
      this.getFeaturedInstagramPosts(),
    ]);
    
    return { devotional, events, instagramPosts, featuredInstagramPost, featuredDevotionals, featuredEvents, featuredInstagramPosts };
  }

  async getBannerHighlights(): Promise<any[]> {
    const highlights = await db.select().from(schema.bannerHighlights)
      .orderBy(schema.bannerHighlights.orderIndex);
    
    const enrichedHighlights = await Promise.all(highlights.map(async (h) => {
      let content = null;
      if (h.contentType === 'devotional') {
        content = await this.getDevotionalById(h.contentId);
      } else if (h.contentType === 'event') {
        const events = await db.select().from(schema.siteEvents)
          .where(eq(schema.siteEvents.id, h.contentId))
          .limit(1);
        content = events[0] || null;
      } else if (h.contentType === 'instagram') {
        content = await this.getInstagramPostById(h.contentId);
      }
      return { ...h, content };
    }));
    
    return enrichedHighlights.filter(h => h.content !== null);
  }

  async addBannerHighlight(contentType: string, contentId: number): Promise<any> {
    const count = await this.getBannerHighlightCount();
    if (count >= 10) {
      throw new Error('Limite máximo de 10 destaques atingido');
    }
    
    const existing = await db.select().from(schema.bannerHighlights)
      .where(and(
        eq(schema.bannerHighlights.contentType, contentType),
        eq(schema.bannerHighlights.contentId, contentId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      throw new Error('Este item já está em destaque');
    }
    
    const [highlight] = await db.insert(schema.bannerHighlights)
      .values({
        contentType,
        contentId,
        orderIndex: count,
      })
      .returning();
    return highlight;
  }

  async removeBannerHighlight(id: number): Promise<void> {
    await db.delete(schema.bannerHighlights)
      .where(eq(schema.bannerHighlights.id, id));
  }

  async reorderBannerHighlights(orderedIds: number[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(schema.bannerHighlights)
        .set({ orderIndex: i })
        .where(eq(schema.bannerHighlights.id, orderedIds[i]));
    }
  }

  async getBannerHighlightCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(schema.bannerHighlights);
    return Number(result[0]?.count || 0);
  }

  // Study Profile Methods
  
  // SINGLE SOURCE OF TRUTH: Calculate real total XP for a user
  // This is the ONLY function that should be used to get XP (used by profile, ranking, etc.)
  // NOTE: Event XP counts for general and annual ranking but NOT for magazine/season ranking
  async getUserTotalXp(userId: number): Promise<{ totalXp: number; lessonXp: number; bonusXp: number; achievementXp: number; missionXp: number; eventXp: number }> {
    // Sum ALL completed lesson XP
    const [lessonXpResult] = await db.select({
      totalXp: sql<number>`COALESCE(SUM(${schema.userLessonProgress.xpEarned}), 0)`
    })
      .from(schema.userLessonProgress)
      .where(and(
        eq(schema.userLessonProgress.userId, userId),
        eq(schema.userLessonProgress.status, 'completed')
      ));
    
    // Sum ALL immutable weekly bonuses
    const [bonusResult] = await db.select({
      totalBonus: sql<number>`COALESCE(SUM(${schema.weeklyPracticeBonus.bonusXp}), 0)`
    })
      .from(schema.weeklyPracticeBonus)
      .where(eq(schema.weeklyPracticeBonus.userId, userId));
    
    // Sum ALL immutable achievement XP
    const [achievementResult] = await db.select({
      totalAchievementXp: sql<number>`COALESCE(SUM(${schema.achievementXp.xpReward}), 0)`
    })
      .from(schema.achievementXp)
      .where(eq(schema.achievementXp.userId, userId));
    
    // Sum ALL immutable daily mission XP (mission XP + bonus XP)
    const [dailyMissionResult] = await db.select({
      totalDailyMissionXp: sql<number>`COALESCE(SUM(${schema.dailyMissionXp.missionXp} + ${schema.dailyMissionXp.bonusXp}), 0)`
    })
      .from(schema.dailyMissionXp)
      .where(eq(schema.dailyMissionXp.userId, userId));
    
    // Sum ALL completed event lesson XP (counts for general/annual ranking, NOT magazine ranking)
    const [eventXpResult] = await db.select({
      totalEventXp: sql<number>`COALESCE(SUM(${schema.userEventProgress.xpEarned}), 0)`
    })
      .from(schema.userEventProgress)
      .where(and(
        eq(schema.userEventProgress.userId, userId),
        eq(schema.userEventProgress.completed, true)
      ));
    
    const lessonXp = Number(lessonXpResult?.totalXp || 0);
    const bonusXp = Number(bonusResult?.totalBonus || 0);
    const achievementXp = Number(achievementResult?.totalAchievementXp || 0);
    const missionXp = Number(dailyMissionResult?.totalDailyMissionXp || 0);
    const eventXp = Number(eventXpResult?.totalEventXp || 0);
    
    return {
      totalXp: lessonXp + bonusXp + achievementXp + missionXp + eventXp,
      lessonXp,
      bonusXp,
      achievementXp,
      missionXp,
      eventXp,
    };
  }
  
  async getStudyProfile(userId: number): Promise<any | null> {
    const [profile] = await db.select().from(schema.studyProfiles)
      .where(eq(schema.studyProfiles.userId, userId))
      .limit(1);
    
    if (!profile) return null;
    
    // Get real total XP from SINGLE SOURCE OF TRUTH
    const xpData = await this.getUserTotalXp(userId);
    
    // Recalculate level based on real XP
    const getXpPerLevel = (level: number): number => {
      if (level <= 5) return 500;
      if (level <= 10) return 750;
      if (level <= 20) return 1000;
      if (level <= 30) return 1500;
      return 2000;
    };

    const calculateLevelFromXp = (totalXp: number): number => {
      let level = 1;
      let xpAccumulated = 0;
      while (xpAccumulated + getXpPerLevel(level) <= totalXp) {
        xpAccumulated += getXpPerLevel(level);
        level++;
      }
      return level;
    };
    
    const realLevel = calculateLevelFromXp(xpData.totalXp);
    
    return {
      ...profile,
      totalXp: xpData.totalXp,
      currentLevel: realLevel,
    };
  }

  async getAllStudyProfiles(): Promise<any[]> {
    return db.select().from(schema.studyProfiles);
  }

  async awardWeeklyGoalXp(userId: number, xpAmount: number): Promise<void> {
    await this.addXp(userId, xpAmount, 'weekly_goal_completion', undefined);
  }

  async getOrCreateStudyProfile(userId: number): Promise<any> {
    let profile = await this.getStudyProfile(userId);
    if (!profile) {
      const [newProfile] = await db.insert(schema.studyProfiles)
        .values({ userId })
        .returning();
      return newProfile;
    }
    return profile;
  }

  async updateStudyProfile(userId: number, data: Partial<{ dailyVerseReadDate: string }>): Promise<void> {
    await db.update(schema.studyProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.studyProfiles.userId, userId));
  }

  async getPublishedStudyWeeks(): Promise<any[]> {
    return db.select().from(schema.studyWeeks)
      .where(eq(schema.studyWeeks.status, 'published'))
      .orderBy(desc(schema.studyWeeks.year), desc(schema.studyWeeks.weekNumber));
  }

  // OPTIMIZED: Bulk fetch weeks with lessons - LIGHTWEIGHT payload for listing
  // Heavy content (content, markdown, description, units) loaded on-demand via GET /lessons/:id
  async getWeeksWithLessonsBulkOptimized(userId: number, weekIds: number[]): Promise<any[]> {
    if (weekIds.length === 0) return [];
    
    // Batch fetch weeks (lightweight - only essential fields)
    const weeks = await db.select({
      id: schema.studyWeeks.id,
      weekNumber: schema.studyWeeks.weekNumber,
      year: schema.studyWeeks.year,
      title: schema.studyWeeks.title,
      status: schema.studyWeeks.status,
    }).from(schema.studyWeeks)
      .where(inArray(schema.studyWeeks.id, weekIds));
    
    if (weeks.length === 0) return [];
    
    // Batch fetch lessons with progress - LIGHTWEIGHT fields only
    // Excludes: content, markdown, description, videoUrl (heavy fields)
    const lessonsWithProgress = await db.select({
      id: schema.studyLessons.id,
      studyWeekId: schema.studyLessons.studyWeekId,
      orderIndex: schema.studyLessons.orderIndex,
      title: schema.studyLessons.title,
      lessonNumber: schema.studyLessons.lessonNumber,
      icon: schema.studyLessons.icon,
      xpReward: schema.studyLessons.xpReward,
      estimatedMinutes: schema.studyLessons.estimatedMinutes,
      isLocked: schema.studyLessons.isLocked,
      isBonus: schema.studyLessons.isBonus,
      seasonId: schema.studyLessons.seasonId,
      progressStatus: schema.userLessonProgress.status,
    })
      .from(schema.studyLessons)
      .leftJoin(
        schema.userLessonProgress,
        and(
          eq(schema.userLessonProgress.lessonId, schema.studyLessons.id),
          eq(schema.userLessonProgress.userId, userId)
        )
      )
      .where(inArray(schema.studyLessons.studyWeekId, weekIds))
      .orderBy(asc(schema.studyLessons.orderIndex));
    
    // Batch fetch unit COUNTS only (not full unit data)
    const lessonIds = lessonsWithProgress.map(l => l.id);
    let unitCountByLessonId = new Map<number, number>();
    let completedCountByLessonId = new Map<number, number>();
    
    if (lessonIds.length > 0) {
      // Get unit IDs grouped by lesson for counting
      const allUnits = await db.select({
        id: schema.studyUnits.id,
        lessonId: schema.studyUnits.lessonId,
      }).from(schema.studyUnits)
        .where(inArray(schema.studyUnits.lessonId, lessonIds));
      
      // Count units per lesson
      for (const unit of allUnits) {
        unitCountByLessonId.set(unit.lessonId, (unitCountByLessonId.get(unit.lessonId) || 0) + 1);
      }
      
      // Batch fetch completed unit counts
      const allUnitIds = allUnits.map(u => u.id);
      if (allUnitIds.length > 0) {
        const completedProgress = await db.select({
          unitId: schema.userUnitProgress.unitId,
        }).from(schema.userUnitProgress)
          .where(and(
            eq(schema.userUnitProgress.userId, userId),
            eq(schema.userUnitProgress.isCompleted, true),
            inArray(schema.userUnitProgress.unitId, allUnitIds)
          ));
        
        // Map completed units back to lessons
        const unitToLesson = new Map<number, number>();
        for (const unit of allUnits) {
          unitToLesson.set(unit.id, unit.lessonId);
        }
        
        for (const p of completedProgress) {
          const lessonId = unitToLesson.get(p.unitId);
          if (lessonId) {
            completedCountByLessonId.set(lessonId, (completedCountByLessonId.get(lessonId) || 0) + 1);
          }
        }
      }
    }
    
    // Group lessons by weekId with LIGHTWEIGHT payload
    const lessonsByWeekId = new Map<number, any[]>();
    for (const lesson of lessonsWithProgress) {
      const unitCount = unitCountByLessonId.get(lesson.id) || 0;
      const completedCount = completedCountByLessonId.get(lesson.id) || 0;
      
      // Derive correct status
      let status = lesson.progressStatus;
      if (!status) {
        status = lesson.isLocked ? 'locked' : 'available';
      }
      
      if (!lessonsByWeekId.has(lesson.studyWeekId!)) {
        lessonsByWeekId.set(lesson.studyWeekId!, []);
      }
      
      // LIGHTWEIGHT lesson object - no heavy fields
      lessonsByWeekId.get(lesson.studyWeekId!)!.push({
        id: lesson.id,
        title: lesson.title,
        lessonNumber: lesson.lessonNumber || (lesson.orderIndex + 1),
        icon: lesson.icon,
        xpReward: lesson.xpReward,
        estimatedMinutes: lesson.estimatedMinutes,
        isLocked: lesson.isLocked,
        isBonus: lesson.isBonus,
        seasonId: lesson.seasonId,
        status,
        unitCount,
        sectionsCompleted: completedCount,
        totalSections: unitCount,
      });
    }
    
    // Build final result
    return weeks.map(week => ({
      week,
      lessons: lessonsByWeekId.get(week.id) || [],
    }));
  }

  async getLessonsWithProgress(userId: number, weekId: number): Promise<any[]> {
    // Optimized: Single query with LEFT JOIN instead of N+1 queries
    const lessonsWithProgress = await db.select({
      id: schema.studyLessons.id,
      studyWeekId: schema.studyLessons.studyWeekId,
      orderIndex: schema.studyLessons.orderIndex,
      title: schema.studyLessons.title,
      type: schema.studyLessons.type,
      description: schema.studyLessons.description,
      xpReward: schema.studyLessons.xpReward,
      estimatedMinutes: schema.studyLessons.estimatedMinutes,
      icon: schema.studyLessons.icon,
      isBonus: schema.studyLessons.isBonus,
      isLocked: schema.studyLessons.isLocked,
      unlockDate: schema.studyLessons.unlockDate,
      seasonId: schema.studyLessons.seasonId,
      lessonNumber: schema.studyLessons.lessonNumber,
      isReleased: schema.studyLessons.isReleased,
      progressStatus: schema.userLessonProgress.status,
      progressXpEarned: schema.userLessonProgress.xpEarned,
      progressPerfectScore: schema.userLessonProgress.perfectScore,
    })
      .from(schema.studyLessons)
      .leftJoin(
        schema.userLessonProgress,
        and(
          eq(schema.userLessonProgress.lessonId, schema.studyLessons.id),
          eq(schema.userLessonProgress.userId, userId)
        )
      )
      .where(eq(schema.studyLessons.studyWeekId, weekId))
      .orderBy(asc(schema.studyLessons.orderIndex));

    // Get stage progress for each lesson
    const lessonsWithStageProgress = await Promise.all(lessonsWithProgress.map(async (row) => {
      // Get all units for this lesson with type information, ordered by orderIndex
      const units = await db.select({
        id: schema.studyUnits.id,
        stage: schema.studyUnits.stage,
        type: schema.studyUnits.type,
        orderIndex: schema.studyUnits.orderIndex,
      }).from(schema.studyUnits)
        .where(eq(schema.studyUnits.lessonId, row.id))
        .orderBy(asc(schema.studyUnits.orderIndex));
      
      // Get unit progress for this user (including correctness for responda)
      const unitIds = units.map(u => u.id);
      let unitProgressList: { unitId: number; isCompleted: boolean; isCorrect: boolean | null }[] = [];
      if (unitIds.length > 0) {
        unitProgressList = await db.select({
          unitId: schema.userUnitProgress.unitId,
          isCompleted: schema.userUnitProgress.isCompleted,
          isCorrect: schema.userUnitProgress.isCorrect,
        }).from(schema.userUnitProgress)
          .where(and(
            eq(schema.userUnitProgress.userId, userId),
            inArray(schema.userUnitProgress.unitId, unitIds)
          ));
      }
      
      const unitProgressMap = new Map(unitProgressList.map(u => [u.unitId, u]));
      const completedUnitIds = new Set(unitProgressList.filter(u => u.isCompleted).map(u => u.unitId));
      
      // Calculate stage progress - only count types that are actually shown in each stage
      // Estude: only text and verse types
      // Medite: only meditation and reflection types
      // Responda: only exercise types (multiple_choice, true_false, fill_blank)
      const stageProgress: {
        estude: { completed: number; total: number };
        medite: { completed: number; total: number };
        responda: { completed: number; total: number; questionResults: Array<'correct' | 'incorrect' | 'unanswered'> };
      } = {
        estude: { completed: 0, total: 0 },
        medite: { completed: 0, total: 0 },
        responda: { completed: 0, total: 0, questionResults: [] },
      };
      
      const estudeTypes = ['text', 'verse'];
      const mediteTypes = ['meditation', 'reflection'];
      const respondaTypes = ['multiple_choice', 'true_false', 'fill_blank'];
      
      // Collect responda units separately to maintain order
      const respondaUnits: typeof units = [];
      
      for (const unit of units) {
        const stage = (unit.stage || 'estude') as 'estude' | 'medite' | 'responda';
        const unitType = unit.type || 'text';
        
        // Only count units whose type matches their stage
        let shouldCount = false;
        if (stage === 'estude' && estudeTypes.includes(unitType)) {
          shouldCount = true;
        } else if (stage === 'medite' && mediteTypes.includes(unitType)) {
          shouldCount = true;
        } else if (stage === 'responda' && respondaTypes.includes(unitType)) {
          shouldCount = true;
          respondaUnits.push(unit);
        }
        
        if (shouldCount && stageProgress[stage]) {
          stageProgress[stage].total++;
          if (completedUnitIds.has(unit.id)) {
            stageProgress[stage].completed++;
          }
        }
      }
      
      // Build question results for responda stage
      for (const unit of respondaUnits) {
        const progress = unitProgressMap.get(unit.id);
        if (!progress) {
          stageProgress.responda.questionResults.push('unanswered');
        } else if (progress.isCorrect === true) {
          stageProgress.responda.questionResults.push('correct');
        } else if (progress.isCorrect === false) {
          stageProgress.responda.questionResults.push('incorrect');
        } else {
          stageProgress.responda.questionResults.push('unanswered');
        }
      }
      
      return {
        id: row.id,
        studyWeekId: row.studyWeekId,
        orderIndex: row.orderIndex,
        title: row.title,
        type: row.type,
        description: row.description,
        xpReward: row.xpReward,
        estimatedMinutes: row.estimatedMinutes,
        icon: row.icon,
        isBonus: row.isBonus,
        isLocked: row.isLocked,
        unlockDate: row.unlockDate,
        seasonId: row.seasonId,
        lessonNumber: row.lessonNumber,
        isReleased: row.isReleased,
        status: row.progressStatus || 'locked',
        xpEarned: row.progressXpEarned || 0,
        perfectScore: row.progressPerfectScore || false,
        progress: {
          stageProgress
        }
      };
    }));
    
    return lessonsWithStageProgress;
  }

  async getUserLessonProgress(userId: number, lessonId: number): Promise<any | null> {
    const [progress] = await db.select().from(schema.userLessonProgress)
      .where(and(
        eq(schema.userLessonProgress.userId, userId),
        eq(schema.userLessonProgress.lessonId, lessonId)
      ))
      .limit(1);
    return progress || null;
  }

  async startLesson(userId: number, lessonId: number): Promise<any> {
    const existing = await this.getUserLessonProgress(userId, lessonId);
    if (existing) {
      if (existing.status === 'completed') {
        return { alreadyCompleted: true, progress: existing };
      }
      const [updated] = await db.update(schema.userLessonProgress)
        .set({ status: 'in_progress', startedAt: new Date() })
        .where(eq(schema.userLessonProgress.id, existing.id))
        .returning();
      return updated;
    }
    
    const [progress] = await db.insert(schema.userLessonProgress)
      .values({
        userId,
        lessonId,
        status: 'in_progress',
        startedAt: new Date(),
      })
      .returning();
    return progress;
  }

  async submitUnitAnswer(userId: number, unitId: number, answer: any): Promise<any> {
    const RESPONDA_XP_PER_CORRECT = 10;
    const unit = await this.getStudyUnitById(unitId);
    if (!unit) return null;
    
    const [existing] = await db.select().from(schema.userUnitProgress)
      .where(and(
        eq(schema.userUnitProgress.userId, userId),
        eq(schema.userUnitProgress.unitId, unitId)
      ))
      .limit(1);
    
    const content = typeof unit.content === 'string' ? JSON.parse(unit.content) : unit.content;
    const isCorrect = this.checkAnswer(unit.type, content, answer);
    
    // DEBUG: Log answer verification details (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG submitUnitAnswer]', {
        unitId,
        unitType: unit.type,
        userAnswer: answer,
        contentCorrectIndex: content?.correctIndex ?? content?.content?.correctIndex,
        contentCorrectAnswer: content?.correctAnswer ?? content?.content?.correctAnswer,
        isCorrect
      });
    }
    
    // Deduzir vida quando resposta está errada (apenas na primeira tentativa errada)
    let heartLost = false;
    if (!isCorrect && (!existing || existing.isCorrect !== false)) {
      const profile = await this.getStudyProfile(userId);
      if (profile && profile.hearts > 0) {
        await db.update(schema.studyProfiles)
          .set({ hearts: profile.hearts - 1 })
          .where(eq(schema.studyProfiles.userId, userId));
        heartLost = true;
      }
    }
    
    if (existing) {
      const [updated] = await db.update(schema.userUnitProgress)
        .set({
          answerGiven: JSON.stringify(answer),
          isCorrect,
          attempts: existing.attempts + 1,
          isCompleted: isCorrect,
          completedAt: isCorrect ? new Date() : null,
        })
        .where(eq(schema.userUnitProgress.id, existing.id))
        .returning();
      
      // Award 20 XP only on first correct answer (not on retries)
      if (isCorrect && !existing.isCorrect) {
        await this.addXp(userId, RESPONDA_XP_PER_CORRECT, 'unit', unitId);
      }
      return { unitProgress: updated, isCorrect, xpEarned: (isCorrect && !existing.isCorrect) ? RESPONDA_XP_PER_CORRECT : 0, heartLost };
    }
    
    const [progress] = await db.insert(schema.userUnitProgress)
      .values({
        userId,
        unitId,
        answerGiven: JSON.stringify(answer),
        isCorrect,
        attempts: 1,
        isCompleted: isCorrect,
        completedAt: isCorrect ? new Date() : null,
      })
      .returning();
    
    // Award 20 XP for correct answer on first attempt
    if (isCorrect) {
      await this.addXp(userId, RESPONDA_XP_PER_CORRECT, 'unit', unitId);
    }
    return { unitProgress: progress, isCorrect, xpEarned: isCorrect ? RESPONDA_XP_PER_CORRECT : 0, heartLost };
  }

  private checkAnswer(unitType: string, content: any, answer: any): boolean {
    // Handle nested content structure: some questions have content.content
    const data = content?.content ?? content;
    // Get question type from the normalized data first, then fall back to outer content, then unitType
    const questionType = data.type ?? content.type ?? unitType;
    
    if (questionType === 'multiple_choice') {
      const correctIndex = data.correctIndex;
      if (correctIndex !== undefined) {
        // Compare as numbers to ensure consistent comparison
        return Number(correctIndex) === Number(answer);
      }
      return data.correctAnswer === answer;
    }
    if (questionType === 'true_false') {
      // Normalize the correct answer using same logic as client
      // This handles: boolean true/false, string 'true'/'false', 'verdadeiro'/'falso'
      const rawCorrect = data.isTrue ?? data.correctAnswer;
      let expectedAnswer: boolean;
      
      if (typeof rawCorrect === 'boolean') {
        expectedAnswer = rawCorrect;
      } else if (typeof rawCorrect === 'string') {
        const normalized = rawCorrect.toLowerCase().trim();
        expectedAnswer = normalized === 'true' || normalized === 'verdadeiro';
      } else {
        expectedAnswer = !!rawCorrect;
      }
      
      // Also normalize the user's answer in case it's a string
      let userAnswer: boolean;
      if (typeof answer === 'boolean') {
        userAnswer = answer;
      } else if (typeof answer === 'string') {
        const normalized = answer.toLowerCase().trim();
        userAnswer = normalized === 'true' || normalized === 'verdadeiro';
      } else {
        userAnswer = !!answer;
      }
      
      return expectedAnswer === userAnswer;
    }
    if (questionType === 'fill_blank') {
      const correctAnswer = data.correctAnswer;
      if (correctAnswer) {
        return String(correctAnswer).toLowerCase().trim() === String(answer).toLowerCase().trim();
      }
      const correctAnswers = data.correctAnswers || [];
      return correctAnswers.some((a: string) => 
        String(a).toLowerCase().trim() === String(answer).toLowerCase().trim()
      );
    }
    return false;
  }

  async markUnitAsCompleted(userId: number, unitId: number): Promise<any> {
    const unit = await this.getStudyUnitById(unitId);
    if (!unit) return null;
    
    const [existing] = await db.select().from(schema.userUnitProgress)
      .where(and(
        eq(schema.userUnitProgress.userId, userId),
        eq(schema.userUnitProgress.unitId, unitId)
      ))
      .limit(1);
    
    if (existing) {
      const [updated] = await db.update(schema.userUnitProgress)
        .set({ isCompleted: true, completedAt: new Date() })
        .where(eq(schema.userUnitProgress.id, existing.id))
        .returning();
      return { unitProgress: updated, xpAwarded: 0 };
    }
    
    const [progress] = await db.insert(schema.userUnitProgress)
      .values({
        userId,
        unitId,
        isCompleted: true,
        completedAt: new Date(),
      })
      .returning();
    return { unitProgress: progress, xpAwarded: 0 };
  }

  async completeLesson(userId: number, lessonId: number, xpEarned: number, mistakes: number, timeSpent: number, perfectScore: boolean): Promise<any> {
    const existing = await this.getUserLessonProgress(userId, lessonId);
    
    if (existing) {
      const [updated] = await db.update(schema.userLessonProgress)
        .set({
          status: 'completed',
          completedAt: new Date(),
          xpEarned,
          mistakesCount: mistakes,
          timeSpentSeconds: timeSpent,
          perfectScore,
        })
        .where(eq(schema.userLessonProgress.id, existing.id))
        .returning();
      
      await this.addXp(userId, xpEarned, 'lesson', lessonId);
      return updated;
    }
    
    const [progress] = await db.insert(schema.userLessonProgress)
      .values({
        userId,
        lessonId,
        status: 'completed',
        completedAt: new Date(),
        xpEarned,
        mistakesCount: mistakes,
        timeSpentSeconds: timeSpent,
        perfectScore,
      })
      .returning();
    
    await this.addXp(userId, xpEarned, 'lesson', lessonId);
    return progress;
  }

  async addStageXp(userId: number, amount: number, stage: string, lessonId: number): Promise<void> {
    // Make this idempotent - check if XP for this stage/lesson was already awarded
    const source = `stage_${stage}`;
    const existing = await db.select()
      .from(schema.xpTransactions)
      .where(and(
        eq(schema.xpTransactions.userId, userId),
        eq(schema.xpTransactions.source, source),
        eq(schema.xpTransactions.sourceId, lessonId)
      ))
      .limit(1);
    
    // If already awarded, skip
    if (existing.length > 0) {
      console.log(`Stage XP already awarded for user ${userId}, stage ${stage}, lesson ${lessonId}`);
      return;
    }
    
    await this.addXp(userId, amount, source, lessonId);
  }

  async addEventXp(userId: number, amount: number, eventId: number, lessonId: number): Promise<void> {
    // Make this idempotent - check if XP for this event lesson was already awarded
    // Event XP counts for general and annual ranking but NOT for magazine/season ranking
    const source = `event_${eventId}`;
    const existing = await db.select()
      .from(schema.xpTransactions)
      .where(and(
        eq(schema.xpTransactions.userId, userId),
        eq(schema.xpTransactions.source, source),
        eq(schema.xpTransactions.sourceId, lessonId)
      ))
      .limit(1);
    
    // If already awarded, skip
    if (existing.length > 0) {
      console.log(`Event XP already awarded for user ${userId}, event ${eventId}, lesson ${lessonId}`);
      return;
    }
    
    await this.addXp(userId, amount, source, lessonId);
  }

  private async addXp(userId: number, amount: number, source: string, sourceId?: number): Promise<void> {
    // Ensure the study profile exists before adding XP
    const profile = await this.getOrCreateStudyProfile(userId);
    
    await db.insert(schema.xpTransactions).values({
      userId,
      amount,
      source,
      sourceId,
    });
    
    const newTotalXp = (profile.totalXp || 0) + amount;
    const oldLevel = profile.currentLevel || 1;
    
    // Progressive XP system with increasing difficulty
    // Levels 1-5: 500 XP per level
    // Levels 6-10: 750 XP per level
    // Levels 11-20: 1000 XP per level
    // Levels 21-30: 1500 XP per level
    // Levels 31+: 2000 XP per level
    const getXpPerLevel = (level: number): number => {
      if (level <= 5) return 500;
      if (level <= 10) return 750;
      if (level <= 20) return 1000;
      if (level <= 30) return 1500;
      return 2000;
    };

    const calculateLevelFromXp = (totalXp: number): number => {
      let level = 1;
      let xpAccumulated = 0;
      while (xpAccumulated + getXpPerLevel(level) <= totalXp) {
        xpAccumulated += getXpPerLevel(level);
        level++;
      }
      return level;
    };
    
    const newLevel = calculateLevelFromXp(newTotalXp);
    
    // Check if user leveled up - award +1 life if not at max (5 hearts)
    let newHearts = profile.hearts;
    const didLevelUp = newLevel > oldLevel;
    if (didLevelUp) {
      const currentHearts = profile.hearts || 0;
      const maxHearts = profile.heartsMax || 5;
      if (currentHearts < maxHearts) {
        newHearts = Math.min(currentHearts + 1, maxHearts);
        console.log(`[Level Up] User ${userId}: Level ${oldLevel} -> ${newLevel}, Hearts ${currentHearts} -> ${newHearts}`);
      } else {
        console.log(`[Level Up] User ${userId}: Level ${oldLevel} -> ${newLevel}, Hearts already at max (${maxHearts})`);
      }
    }
    
    await db.update(schema.studyProfiles)
      .set({ 
        totalXp: newTotalXp, 
        currentLevel: newLevel,
        hearts: newHearts,
        updatedAt: new Date() 
      })
      .where(eq(schema.studyProfiles.userId, userId));
  }

  async getStudyStats(): Promise<any> {
    // Count only published seasons (revistas)
    const [seasonCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.seasons)
      .where(eq(schema.seasons.status, "published"));
    const [lessonCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.studyLessons);
    const [unitCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.studyUnits);
    const [profileCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.studyProfiles);
    
    return {
      totalWeeks: Number(seasonCount?.count || 0),
      totalLessons: Number(lessonCount?.count || 0),
      totalUnits: Number(unitCount?.count || 0),
      totalStudents: Number(profileCount?.count || 0),
    };
  }

  async getStudyDashboardStats(): Promise<any> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // OPTIMIZED: Single query with all stats RESTRICTED to members only
    const results = await db.execute(sql`
      WITH members AS (
        SELECT id FROM users WHERE is_member = true AND is_admin = false
      ),
      total_xp AS (
        -- XP ONLY from members
        SELECT COALESCE(SUM(xp), 0) as total_xp FROM (
          SELECT xp_earned as xp FROM user_lesson_progress 
          WHERE status = 'completed' AND user_id IN (SELECT id FROM members)
          UNION ALL
          SELECT bonus_xp as xp FROM weekly_practice_bonus 
          WHERE user_id IN (SELECT id FROM members)
          UNION ALL
          SELECT xp_reward as xp FROM achievement_xp 
          WHERE user_id IN (SELECT id FROM members)
          UNION ALL
          SELECT mission_xp + bonus_xp as xp FROM daily_mission_xp 
          WHERE user_id IN (SELECT id FROM members)
        ) all_xp
      ),
      active_users AS (
        -- Active users ONLY from members with ANY XP activity in last 7 days
        SELECT COUNT(DISTINCT user_id) as count FROM (
          SELECT user_id FROM user_lesson_progress 
          WHERE status = 'completed' AND completed_at >= ${sevenDaysAgo} 
            AND user_id IN (SELECT id FROM members)
          UNION ALL
          SELECT user_id FROM daily_mission_xp 
          WHERE earned_at >= ${sevenDaysAgo} 
            AND user_id IN (SELECT id FROM members)
          UNION ALL
          SELECT user_id FROM achievement_xp 
          WHERE earned_at >= ${sevenDaysAgo} 
            AND user_id IN (SELECT id FROM members)
          UNION ALL
          SELECT user_id FROM weekly_practice_bonus 
          WHERE earned_at >= ${sevenDaysAgo} 
            AND user_id IN (SELECT id FROM members)
        ) recent_activity
      ),
      completed_lessons AS (
        -- Completed lessons ONLY by members
        SELECT COUNT(*) as count FROM user_lesson_progress 
        WHERE status = 'completed' AND user_id IN (SELECT id FROM members)
      ),
      avg_streak AS (
        -- Average streak only for members with study profiles
        SELECT COALESCE(AVG(current_streak), 0) as avg_streak
        FROM study_profiles sp
        WHERE sp.user_id IN (SELECT id FROM members)
      )
      SELECT 
        (SELECT COUNT(*) FROM members) as "totalUsers",
        (SELECT count FROM active_users) as "activeUsers",
        (SELECT COUNT(*) FROM study_lessons) as "totalLessons",
        (SELECT count FROM completed_lessons) as "completedLessons",
        (SELECT avg_streak FROM avg_streak) as "averageStreak",
        (SELECT total_xp FROM total_xp) as "totalXpEarned",
        (SELECT COUNT(*) FROM seasons WHERE status = 'published') as "totalSeasons"
    `);
    
    const row = (results.rows as any[])[0] || {};
    
    return {
      totalUsers: Number(row.totalUsers || 0),
      activeUsers: Number(row.activeUsers || 0),
      totalLessons: Number(row.totalLessons || 0),
      completedLessons: Number(row.completedLessons || 0),
      averageStreak: Math.round(Number(row.averageStreak || 0) * 10) / 10,
      totalXpEarned: Number(row.totalXpEarned || 0),
      totalWeeks: Number(row.totalSeasons || 0),
    };
  }

  async getMonthlyProgressData(): Promise<any[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    
    const results = await db.select({
      month: sql<string>`to_char(${schema.userLessonProgress.completedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')`,
      lessonsCompleted: sql<number>`count(*)`,
      xpEarned: sql<number>`COALESCE(SUM(${schema.userLessonProgress.xpEarned}), 0)`,
    })
      .from(schema.userLessonProgress)
      .where(and(
        eq(schema.userLessonProgress.status, 'completed'),
        sql`${schema.userLessonProgress.completedAt} >= ${sixMonthsAgo}`
      ))
      .groupBy(sql`to_char(${schema.userLessonProgress.completedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')`)
      .orderBy(sql`to_char(${schema.userLessonProgress.completedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')`);
    
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return results.map(r => {
      const [year, monthNum] = (r.month || '').split('-');
      const monthIndex = parseInt(monthNum, 10) - 1;
      return {
        month: monthNames[monthIndex] || r.month,
        lessonsCompleted: Number(r.lessonsCompleted || 0),
        xpEarned: Number(r.xpEarned || 0),
      };
    });
  }

  async getWeeklyActivityData(): Promise<any[]> {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const results = await db.select({
      dayOfWeek: sql<number>`EXTRACT(DOW FROM ${schema.userLessonProgress.completedAt} AT TIME ZONE 'America/Sao_Paulo')`,
      date: sql<string>`to_char(${schema.userLessonProgress.completedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')`,
      lessonsCompleted: sql<number>`count(*)`,
      uniqueUsers: sql<number>`count(DISTINCT ${schema.userLessonProgress.userId})`,
    })
      .from(schema.userLessonProgress)
      .where(and(
        eq(schema.userLessonProgress.status, 'completed'),
        sql`${schema.userLessonProgress.completedAt} >= ${sevenDaysAgo}`
      ))
      .groupBy(
        sql`EXTRACT(DOW FROM ${schema.userLessonProgress.completedAt} AT TIME ZONE 'America/Sao_Paulo')`,
        sql`to_char(${schema.userLessonProgress.completedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')`
      )
      .orderBy(sql`to_char(${schema.userLessonProgress.completedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')`);
    
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      
      const found = results.find(r => r.date === dateStr);
      last7Days.push({
        day: dayNames[dayOfWeek],
        date: dateStr,
        lessonsCompleted: Number(found?.lessonsCompleted || 0),
        uniqueUsers: Number(found?.uniqueUsers || 0),
      });
    }
    
    return last7Days;
  }

  async getTopWeeklyMembers(limit: number = 5): Promise<any[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    // OPTIMIZED: Single query using UNION to aggregate all weekly XP sources
    const weeklyXpResults = await db.execute(sql`
      WITH weekly_xp AS (
        SELECT user_id, SUM(xp) as total_xp FROM (
          SELECT user_id, xp_earned as xp FROM user_lesson_progress 
          WHERE status = 'completed' AND completed_at >= ${sevenDaysAgo}
          UNION ALL
          SELECT user_id, bonus_xp as xp FROM weekly_practice_bonus 
          WHERE earned_at >= ${sevenDaysAgo}
          UNION ALL
          SELECT user_id, xp_reward as xp FROM achievement_xp 
          WHERE earned_at >= ${sevenDaysAgo}
          UNION ALL
          SELECT user_id, mission_xp + bonus_xp as xp FROM daily_mission_xp 
          WHERE earned_at >= ${sevenDaysAgo}
        ) all_xp
        GROUP BY user_id
        HAVING SUM(xp) > 0
      ),
      weekly_lessons AS (
        SELECT user_id, COUNT(*) as lessons_count FROM user_lesson_progress
        WHERE status = 'completed' AND completed_at >= ${sevenDaysAgo}
        GROUP BY user_id
      )
      SELECT 
        u.id,
        u.full_name as "fullName",
        u.photo_url as "avatarUrl",
        COALESCE(wx.total_xp, 0) as "currentXp",
        COALESCE(sp.current_level, 1) as "currentLevel",
        COALESCE(sp.current_streak, 0) as streak,
        COALESCE(wl.lessons_count, 0) as "lessonsCompleted"
      FROM users u
      INNER JOIN weekly_xp wx ON u.id = wx.user_id
      LEFT JOIN study_profiles sp ON u.id = sp.user_id
      LEFT JOIN weekly_lessons wl ON u.id = wl.user_id
      WHERE u.is_member = true AND u.is_admin = false
      ORDER BY wx.total_xp DESC
      LIMIT ${limit}
    `);
    
    return (weeklyXpResults.rows as any[]).map(r => ({
      id: r.id,
      fullName: r.fullName || 'Usuario',
      avatarUrl: r.avatarUrl,
      currentXp: Number(r.currentXp || 0),
      currentLevel: Number(r.currentLevel || 1),
      streak: Number(r.streak || 0),
      lessonsCompleted: Number(r.lessonsCompleted || 0),
    }));
  }

  async getUserProfileStats(userId: number): Promise<any> {
    // Get completed regular lessons count
    const [regularLessonsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.userLessonProgress)
      .where(and(
        eq(schema.userLessonProgress.userId, userId),
        eq(schema.userLessonProgress.status, 'completed')
      ));
    
    // Get completed event lessons count
    const [eventLessonsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.userEventProgress)
      .where(and(
        eq(schema.userEventProgress.userId, userId),
        eq(schema.userEventProgress.completed, true)
      ));
    
    // Get completed units count (kept for backward compatibility)
    const [unitsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.userUnitProgress)
      .where(and(
        eq(schema.userUnitProgress.userId, userId),
        eq(schema.userUnitProgress.isCompleted, true)
      ));
    
    // Get achievements earned count
    const [achievementsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.userAchievements)
      .where(eq(schema.userAchievements.userId, userId));
    
    // Get distinct study days count using raw SQL for combined union query
    const studyDaysQuery = await db.execute(sql`
      SELECT COUNT(DISTINCT study_date) as count FROM (
        SELECT date_trunc('day', completed_at AT TIME ZONE 'America/Sao_Paulo') as study_date
        FROM user_lesson_progress
        WHERE user_id = ${userId} AND status = 'completed' AND completed_at IS NOT NULL
        UNION
        SELECT date_trunc('day', completed_at AT TIME ZONE 'America/Sao_Paulo') as study_date
        FROM user_event_progress
        WHERE user_id = ${userId} AND completed = true AND completed_at IS NOT NULL
      ) combined
    `);
    const studyDaysCount = studyDaysQuery.rows && studyDaysQuery.rows.length > 0 
      ? Number((studyDaysQuery.rows[0] as any)?.count || 0) 
      : 0;
    
    // Get user ranking position using all users ordered by totalXp
    const [rankResult] = await db.select({
      rank: sql<number>`
        (SELECT COUNT(*) + 1 FROM ${schema.studyProfiles} sp2 
         WHERE sp2.total_xp > (SELECT total_xp FROM ${schema.studyProfiles} WHERE user_id = ${userId}))
      `
    }).from(sql`(SELECT 1) as dummy`);
    
    // Check if user has a profile (if not, rank is null)
    const profile = await this.getStudyProfile(userId);
    const userRank = profile ? Number(rankResult?.rank || 1) : null;
    
    // Get first activity date (check both regular and event lessons)
    const [firstRegular] = await db.select({ 
      firstDate: sql<string>`MIN(${schema.userLessonProgress.completedAt})` 
    })
      .from(schema.userLessonProgress)
      .where(eq(schema.userLessonProgress.userId, userId));
    
    const [firstEvent] = await db.select({ 
      firstDate: sql<string>`MIN(${schema.userEventProgress.completedAt})` 
    })
      .from(schema.userEventProgress)
      .where(eq(schema.userEventProgress.userId, userId));
    
    const firstActivityDate = !firstRegular?.firstDate ? firstEvent?.firstDate :
      !firstEvent?.firstDate ? firstRegular?.firstDate :
      new Date(firstRegular.firstDate) < new Date(firstEvent.firstDate) ? firstRegular.firstDate : firstEvent.firstDate;
    
    const totalLessons = Number(regularLessonsResult?.count || 0) + Number(eventLessonsResult?.count || 0);
    
    return {
      lessonsCompleted: totalLessons,
      unitsCompleted: Number(unitsResult?.count || 0), // Kept for backward compatibility
      achievementsEarned: Number(achievementsResult?.count || 0),
      studyDays: studyDaysCount,
      rankingPosition: userRank,
      firstActivityDate: firstActivityDate || null,
    };
  }

  async getUserRecentActivities(userId: number, limit: number = 10): Promise<any[]> {
    // Get completed lessons with lesson info
    const completedLessons = await db.select({
      type: sql<string>`'lesson_completed'`,
      lessonId: schema.userLessonProgress.lessonId,
      lessonTitle: schema.studyLessons.title,
      xpEarned: schema.userLessonProgress.xpEarned,
      completedAt: schema.userLessonProgress.completedAt,
      perfectScore: schema.userLessonProgress.perfectScore,
    })
      .from(schema.userLessonProgress)
      .innerJoin(schema.studyLessons, eq(schema.userLessonProgress.lessonId, schema.studyLessons.id))
      .where(and(
        eq(schema.userLessonProgress.userId, userId),
        eq(schema.userLessonProgress.status, 'completed')
      ))
      .orderBy(desc(schema.userLessonProgress.completedAt))
      .limit(limit);
    
    // Get achievements unlocked
    const achievements = await db.select({
      type: sql<string>`'achievement_unlocked'`,
      achievementId: schema.userAchievements.achievementId,
      achievementTitle: schema.achievements.name,
      achievementIcon: schema.achievements.icon,
      unlockedAt: schema.userAchievements.unlockedAt,
    })
      .from(schema.userAchievements)
      .innerJoin(schema.achievements, eq(schema.userAchievements.achievementId, schema.achievements.id))
      .where(eq(schema.userAchievements.userId, userId))
      .orderBy(desc(schema.userAchievements.unlockedAt))
      .limit(limit);
    
    // Combine and sort by date
    const allActivities = [
      ...completedLessons.map(l => ({
        type: 'lesson_completed' as const,
        title: l.lessonTitle,
        xpEarned: l.xpEarned,
        perfectScore: l.perfectScore,
        date: l.completedAt,
      })),
      ...achievements.map(a => ({
        type: 'achievement_unlocked' as const,
        title: a.achievementTitle,
        icon: a.achievementIcon,
        date: a.unlockedAt,
      })),
    ].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    }).slice(0, limit);
    
    return allActivities;
  }

  async getCompletedLessonsWithExercises(userId: number): Promise<any[]> {
    // Get all completed lessons for this user
    const completedProgress = await db.select({
      lessonId: schema.userLessonProgress.lessonId,
    })
      .from(schema.userLessonProgress)
      .where(and(
        eq(schema.userLessonProgress.userId, userId),
        eq(schema.userLessonProgress.status, 'completed')
      ));
    
    if (completedProgress.length === 0) {
      return [];
    }
    
    const lessonIds = completedProgress.map(p => p.lessonId);
    
    // Get lesson details for completed lessons
    const lessons = await db.select()
      .from(schema.studyLessons)
      .where(inArray(schema.studyLessons.id, lessonIds));
    
    return lessons;
  }

  async getStudyUsersWithProfiles(): Promise<any[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // OPTIMIZED: Single query to get all user data with computed XP
    // XP calculation matches getUserTotalXp() exactly
    const results = await db.execute(sql`
      WITH total_xp AS (
        SELECT user_id, SUM(xp) as total_xp FROM (
          SELECT user_id, xp_earned as xp FROM user_lesson_progress WHERE status = 'completed'
          UNION ALL
          SELECT user_id, bonus_xp as xp FROM weekly_practice_bonus
          UNION ALL
          SELECT user_id, xp_reward as xp FROM achievement_xp
          UNION ALL
          SELECT user_id, mission_xp + bonus_xp as xp FROM daily_mission_xp
        ) all_xp
        GROUP BY user_id
      ),
      lesson_counts AS (
        SELECT user_id, COUNT(*) as lessons_completed FROM user_lesson_progress
        WHERE status = 'completed' GROUP BY user_id
      ),
      recent_activity AS (
        -- Check for ANY recent XP activity (lessons, missions, achievements, bonuses)
        SELECT user_id, COUNT(*) as recent_count FROM (
          SELECT user_id FROM user_lesson_progress 
          WHERE status = 'completed' AND completed_at >= ${sevenDaysAgo}
          UNION ALL
          SELECT user_id FROM daily_mission_xp 
          WHERE earned_at >= ${sevenDaysAgo}
          UNION ALL
          SELECT user_id FROM achievement_xp 
          WHERE earned_at >= ${sevenDaysAgo}
          UNION ALL
          SELECT user_id FROM weekly_practice_bonus 
          WHERE earned_at >= ${sevenDaysAgo}
        ) all_recent
        GROUP BY user_id
      )
      SELECT 
        u.id,
        u.full_name as name,
        u.email,
        u.photo_url as "avatarUrl",
        u.active_member as "activeMember",
        COALESCE(tx.total_xp, 0) as "totalXp",
        COALESCE(sp.current_level, 1) as "currentLevel",
        COALESCE(sp.current_streak, 0) as "currentStreak",
        COALESCE(sp.crystals, 0) as crystals,
        COALESCE(lc.lessons_completed, 0) as "lessonsCompleted",
        COALESCE(ra.recent_count, 0) as "recentActivity",
        sp.last_activity_date as "lastActivityDate",
        sp.last_lesson_completed_at as "lastLessonCompletedAt",
        sp.created_at as "createdAt"
      FROM users u
      LEFT JOIN study_profiles sp ON u.id = sp.user_id
      LEFT JOIN total_xp tx ON u.id = tx.user_id
      LEFT JOIN lesson_counts lc ON u.id = lc.user_id
      LEFT JOIN recent_activity ra ON u.id = ra.user_id
      WHERE u.is_member = true AND u.is_admin = false
      ORDER BY COALESCE(tx.total_xp, 0) DESC
    `);
    
    return (results.rows as any[]).map(r => {
      let status: "Ativo" | "Inativo" | "Suspenso" = "Inativo";
      if (!r.activeMember) {
        status = "Suspenso";
      } else if (Number(r.recentActivity || 0) > 0) {
        status = "Ativo";
      }
      
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        avatarUrl: r.avatarUrl,
        status,
        lastAccess: r.lastActivityDate || r.lastLessonCompletedAt,
        lessonsCompleted: Number(r.lessonsCompleted || 0),
        totalXp: Number(r.totalXp || 0),
        currentLevel: Number(r.currentLevel || 1),
        currentStreak: Number(r.currentStreak || 0),
        crystals: Number(r.crystals || 0),
        registrationDate: r.createdAt?.toISOString?.() || r.createdAt || null,
      };
    });
  }

  async recalculateAllLevels(): Promise<{ updated: number; total: number }> {
    console.log('[Level Sync] Starting level recalculation...');
    
    // Progressive XP system with increasing difficulty
    // Levels 1-5: 500 XP per level
    // Levels 6-10: 750 XP per level
    // Levels 11-20: 1000 XP per level
    // Levels 21-30: 1500 XP per level
    // Levels 31+: 2000 XP per level
    
    const getXpPerLevel = (level: number): number => {
      if (level <= 5) return 500;
      if (level <= 10) return 750;
      if (level <= 20) return 1000;
      if (level <= 30) return 1500;
      return 2000;
    };

    // Calculate level from total XP
    const calculateLevelFromXp = (totalXp: number): number => {
      let level = 1;
      let xpAccumulated = 0;
      while (xpAccumulated + getXpPerLevel(level) <= totalXp) {
        xpAccumulated += getXpPerLevel(level);
        level++;
      }
      return level;
    };
    
    const allProfiles = await db.select({
      userId: schema.studyProfiles.userId,
      totalXp: schema.studyProfiles.totalXp,
      currentLevel: schema.studyProfiles.currentLevel,
    }).from(schema.studyProfiles);
    
    console.log(`[Level Sync] Found ${allProfiles.length} profiles to check`);
    
    let updatedCount = 0;
    
    for (const profile of allProfiles) {
      const totalXp = profile.totalXp || 0;
      const correctLevel = calculateLevelFromXp(totalXp);
      
      console.log(`[Level Sync] User ${profile.userId}: XP=${totalXp}, current=${profile.currentLevel}, correct=${correctLevel}`);
      
      if (profile.currentLevel !== correctLevel) {
        await db.update(schema.studyProfiles)
          .set({ 
            currentLevel: correctLevel,
            updatedAt: new Date()
          })
          .where(eq(schema.studyProfiles.userId, profile.userId));
        updatedCount++;
        console.log(`[Level Sync] UPDATED User ${profile.userId}: level ${profile.currentLevel} -> ${correctLevel} (XP: ${totalXp})`);
      }
    }
    
    console.log(`[Level Sync] Completed: ${updatedCount}/${allProfiles.length} profiles updated`);
    return { updated: updatedCount, total: allProfiles.length };
  }

  // Third Scrutiny Methods
  async checkThirdScrutinyTie(electionPositionId: number): Promise<{ isTie: boolean; candidates?: any[] }> {
    const position = await this.getElectionPositionById(electionPositionId);
    if (!position || position.currentScrutiny !== 3) {
      return { isTie: false };
    }
    
    // Optimized: Single query with JOIN and GROUP BY instead of N+1 queries
    const candidatesWithVotes = await db.select({
      id: schema.candidates.id,
      userId: schema.candidates.userId,
      name: schema.candidates.name,
      email: schema.candidates.email,
      positionId: schema.candidates.positionId,
      electionId: schema.candidates.electionId,
      voteCount: sql<number>`count(${schema.votes.id})`,
    })
      .from(schema.candidates)
      .leftJoin(
        schema.votes,
        and(
          eq(schema.votes.candidateId, schema.candidates.id),
          eq(schema.votes.scrutinyRound, 3)
        )
      )
      .where(and(
        eq(schema.candidates.positionId, position.positionId),
        eq(schema.candidates.electionId, position.electionId)
      ))
      .groupBy(schema.candidates.id);

    const voteResults = candidatesWithVotes.map(c => ({
      ...c,
      voteCount: Number(c.voteCount || 0),
    }));
    
    const maxVotes = Math.max(...voteResults.map(c => c.voteCount), 0);
    const tiedCandidates = voteResults.filter(c => c.voteCount === maxVotes);
    
    return {
      isTie: tiedCandidates.length > 1,
      candidates: tiedCandidates.length > 1 ? tiedCandidates : undefined,
    };
  }

  async resolveThirdScrutinyTie(electionPositionId: number, winnerId: number): Promise<void> {
    const position = await this.getElectionPositionById(electionPositionId);
    if (!position) return;
    
    await this.setWinner(position.electionId, winnerId, position.positionId, 3);
    await this.completePosition(electionPositionId);
  }

  // Notification Methods
  async savePushSubscription(userId: number, endpoint: string, p256dh: string, auth: string): Promise<void> {
    const [existing] = await db.select().from(schema.pushSubscriptions)
      .where(and(
        eq(schema.pushSubscriptions.userId, userId),
        eq(schema.pushSubscriptions.endpoint, endpoint)
      ))
      .limit(1);
    
    if (existing) {
      await db.update(schema.pushSubscriptions)
        .set({ p256dh, auth, lastUsed: new Date() })
        .where(eq(schema.pushSubscriptions.id, existing.id));
    } else {
      await db.insert(schema.pushSubscriptions).values({
        userId,
        endpoint,
        p256dh,
        auth,
      });
    }
  }

  async removePushSubscription(userId: number, endpoint: string): Promise<void> {
    await db.delete(schema.pushSubscriptions)
      .where(and(
        eq(schema.pushSubscriptions.userId, userId),
        eq(schema.pushSubscriptions.endpoint, endpoint)
      ));
  }

  async getUserNotifications(userId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    return db.select().from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.read, false)
      ));
    return Number(result?.count || 0);
  }

  async markNotificationRead(userId: number, notificationId: number): Promise<void> {
    await db.update(schema.notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, userId)
      ));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(schema.notifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(schema.notifications.userId, userId));
  }

  async deleteNotification(userId: number, notificationId: number): Promise<void> {
    await db.delete(schema.notifications)
      .where(and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, userId)
      ));
  }

  // Bible Verse Methods
  async getBibleVerseById(id: number): Promise<any | null> {
    const [verse] = await db.select().from(schema.bibleVerses)
      .where(eq(schema.bibleVerses.id, id))
      .limit(1);
    return verse || null;
  }

  async getAllBibleVerses(): Promise<any[]> {
    return db.select().from(schema.bibleVerses)
      .orderBy(asc(schema.bibleVerses.id));
  }

  async createBibleVerse(reference: string, text: string, reflection: string, category: string): Promise<any> {
    const [verse] = await db.insert(schema.bibleVerses)
      .values({ reference, text, reflection, category })
      .returning();
    return verse;
  }

  async readVerseAndRecoverHeart(userId: number, verseId: number): Promise<any> {
    const [existing] = await db.select().from(schema.verseReadings)
      .where(and(
        eq(schema.verseReadings.userId, userId),
        eq(schema.verseReadings.verseId, verseId)
      ))
      .limit(1);
    
    if (existing) {
      const profile = await this.getStudyProfile(userId);
      return { 
        alreadyRead: true, 
        heartRecovered: false,
        heartsRecovered: 0,
        versesRead: profile?.versesReadForRecovery || 0,
        versesNeeded: 3,
        profile
      };
    }
    
    await db.insert(schema.verseReadings)
      .values({ userId, verseId, readAt: new Date() });
    
    const profile = await this.getStudyProfile(userId);
    if (!profile) {
      return { alreadyRead: false, heartRecovered: false, heartsRecovered: 0, versesRead: 0, versesNeeded: 3 };
    }
    
    const newVersesCount = (profile.versesReadForRecovery || 0) + 1;
    
    if (newVersesCount >= 3) {
      if (profile.hearts < profile.heartsMax) {
        await db.update(schema.studyProfiles)
          .set({ 
            hearts: Math.min(profile.heartsMax, profile.hearts + 1), 
            versesReadForRecovery: 0,
            updatedAt: new Date() 
          })
          .where(eq(schema.studyProfiles.userId, userId));
        
        const updatedProfile = await this.getStudyProfile(userId);
        return { 
          alreadyRead: false, 
          heartRecovered: true,
          heartsRecovered: 1,
          versesRead: 0,
          versesNeeded: 3,
          profile: updatedProfile
        };
      } else {
        await db.update(schema.studyProfiles)
          .set({ 
            versesReadForRecovery: 0,
            updatedAt: new Date() 
          })
          .where(eq(schema.studyProfiles.userId, userId));
        
        const updatedProfile = await this.getStudyProfile(userId);
        return { 
          alreadyRead: false, 
          heartRecovered: false,
          heartsRecovered: 0,
          heartsFull: true,
          versesRead: 0,
          versesNeeded: 3,
          profile: updatedProfile
        };
      }
    } else {
      await db.update(schema.studyProfiles)
        .set({ 
          versesReadForRecovery: newVersesCount,
          updatedAt: new Date() 
        })
        .where(eq(schema.studyProfiles.userId, userId));
      
      const updatedProfile = await this.getStudyProfile(userId);
      return { 
        alreadyRead: false, 
        heartRecovered: false,
        heartsRecovered: 0,
        versesRead: newVersesCount,
        versesNeeded: 3,
        profile: updatedProfile
      };
    }
  }

  async getVerseRecoveryProgress(userId: number): Promise<any> {
    const profile = await this.getStudyProfile(userId);
    
    return {
      versesRead: profile?.versesReadForRecovery || 0,
      versesNeeded: 3,
      hearts: profile?.hearts || 5,
      maxHearts: profile?.heartsMax || 5,
    };
  }

  // Achievement Methods
  async getAllAchievements(): Promise<any[]> {
    return db.select().from(schema.achievements)
      .orderBy(asc(schema.achievements.id));
  }

  async getAchievementById(id: number): Promise<{ id: number; name: string; icon: string; category: string; xpReward: number } | null> {
    const [achievement] = await db.select({
      id: schema.achievements.id,
      name: schema.achievements.name,
      icon: schema.achievements.icon,
      category: schema.achievements.category,
      xpReward: schema.achievements.xpReward,
    })
      .from(schema.achievements)
      .where(eq(schema.achievements.id, id))
      .limit(1);
    
    return achievement || null;
  }

  async getUserAchievements(userId: number): Promise<any[]> {
    return db.select().from(schema.userAchievements)
      .where(eq(schema.userAchievements.userId, userId));
  }

  async createAchievement(data: any): Promise<any> {
    const [achievement] = await db.insert(schema.achievements)
      .values(data)
      .returning();
    return achievement;
  }

  async unlockAchievement(userId: number, achievementId: number): Promise<any | null> {
    try {
      const [existing] = await db.select().from(schema.userAchievements)
        .where(and(
          eq(schema.userAchievements.userId, userId),
          eq(schema.userAchievements.achievementId, achievementId)
        ))
        .limit(1);
      
      if (existing) {
        return null;
      }

      const [achievement] = await db.select().from(schema.achievements)
        .where(eq(schema.achievements.id, achievementId))
        .limit(1);
      
      if (!achievement) {
        return null;
      }

      const [userAchievement] = await db.insert(schema.userAchievements)
        .values({ userId, achievementId })
        .returning();

      if (achievement.xpReward > 0) {
        await this.addCrystals(userId, Math.floor(achievement.xpReward / 25), "achievement", `Conquista: ${achievement.name}`);
        // CRITICAL FIX: Insert into achievementXp (immutable, single source of truth for leaderboards)
        await db.insert(schema.achievementXp)
          .values({
            userId,
            achievementId,
            xpReward: achievement.xpReward,
          })
          .onConflictDoNothing();
        // Also record in xpTransactions for audit log
        await this.addXp(userId, achievement.xpReward, 'achievement', achievementId);
      }

      // Send push notification for unlocked achievement
      try {
        const { notifyAchievement } = await import('./notifications');
        await notifyAchievement(userId, achievement.name, achievement.description);
      } catch (err) {
        console.error("[Achievement] Error sending notification:", err);
      }

      return { userAchievement, achievement };
    } catch (error) {
      console.error("[Achievement] Error unlocking:", error);
      return null;
    }
  }

  async checkAndUnlockAchievements(userId: number, context: { event: string; value?: number }): Promise<any[]> {
    const unlockedAchievements: any[] = [];
    
    try {
      const profile = await this.getStudyProfile(userId);
      if (!profile) {
        console.log(`[Achievement] No profile found for user ${userId}`);
        return unlockedAchievements;
      }

      const allAchievements = await this.getAllAchievements();
      const userAchievements = await this.getUserAchievements(userId);
      const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

      const completedLessonsCount = await db.select({ count: sql<number>`count(*)` })
        .from(schema.userLessonProgress)
        .where(and(
          eq(schema.userLessonProgress.userId, userId),
          eq(schema.userLessonProgress.status, 'completed')
        ));
      const lessonsCompleted = Number(completedLessonsCount[0]?.count || 0);
      
      console.log(`[Achievement] Checking for user ${userId}: event=${context.event}, lessonsCompleted=${lessonsCompleted}, streak=${profile.currentStreak}, totalXp=${profile.totalXp}, alreadyUnlocked=${unlockedIds.size}`);

      for (const achievement of allAchievements) {
        if (unlockedIds.has(achievement.id)) continue;

        let requirement: any = {};
        
        try {
          requirement = achievement.requirement ? JSON.parse(achievement.requirement) : {};
        } catch {
          requirement = {};
        }

        // Check ALL requirements must be met (conjunctive logic)
        const requirementKeys = Object.keys(requirement);
        if (requirementKeys.length === 0) {
          // Handle event-based achievements (no static requirements)
          // Use São Paulo timezone for correct time-based achievements
          const saoPauloTime = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
          const currentHour = new Date(saoPauloTime).getHours();
          
          if (achievement.code === 'perfect_lesson' && context.event === 'lesson_complete' && context.value === 1) {
            const result = await this.unlockAchievement(userId, achievement.id);
            if (result) unlockedAchievements.push(result);
          }
          // Early bird: studying before 7am
          else if (achievement.code === 'early_bird' && context.event === 'lesson_complete' && currentHour < 7) {
            const result = await this.unlockAchievement(userId, achievement.id);
            if (result) unlockedAchievements.push(result);
          }
          // Night owl: studying after 22h
          else if (achievement.code === 'night_owl' && context.event === 'lesson_complete' && currentHour >= 22) {
            const result = await this.unlockAchievement(userId, achievement.id);
            if (result) unlockedAchievements.push(result);
          }
          // Bookworm: read 10 verses
          else if (achievement.code === 'bookworm' && context.event === 'verse_read' && context.value && context.value >= 10) {
            const result = await this.unlockAchievement(userId, achievement.id);
            if (result) unlockedAchievements.push(result);
          }
          // Comeback kid: recovered all hearts using verses
          else if (achievement.code === 'comeback_kid' && context.event === 'hearts_recovered') {
            const result = await this.unlockAchievement(userId, achievement.id);
            if (result) unlockedAchievements.push(result);
          }
          // Practice master: complete practice with 3 stars
          else if (achievement.code === 'practice_master' && context.event === 'practice_complete' && (context as any).starsEarned === 3) {
            const result = await this.unlockAchievement(userId, achievement.id);
            if (result) unlockedAchievements.push(result);
          }
          // Practice first: complete first practice
          else if (achievement.code === 'first_practice' && context.event === 'practice_complete') {
            const result = await this.unlockAchievement(userId, achievement.id);
            if (result) unlockedAchievements.push(result);
          }
          continue;
        }

        let allCriteriaMet = true;
        
        for (const key of requirementKeys) {
          const requiredValue = requirement[key];
          
          switch (key) {
            case 'streak':
              if (profile.currentStreak < requiredValue) allCriteriaMet = false;
              break;
            case 'lessons':
              if (lessonsCompleted < requiredValue) allCriteriaMet = false;
              break;
            case 'xp':
              if (profile.totalXp < requiredValue) allCriteriaMet = false;
              break;
            case 'level':
              if (profile.currentLevel < requiredValue) allCriteriaMet = false;
              break;
            default:
              // Unknown requirement type, skip
              break;
          }
          
          if (!allCriteriaMet) break;
        }

        if (allCriteriaMet) {
          console.log(`[Achievement] Unlocking ${achievement.code} for user ${userId}`);
          const result = await this.unlockAchievement(userId, achievement.id);
          if (result) {
            unlockedAchievements.push(result);
          }
        }
      }
    } catch (error) {
      console.error("[Achievement] Error checking achievements:", error);
    }

    return unlockedAchievements;
  }

  // Leaderboard Methods
  // Global leaderboard - OPTIMIZED: Single query with subqueries instead of N+1
  async getLeaderboard(periodType: string, periodKey: string, limit: number = 20): Promise<any[]> {
    // Single optimized query using subqueries for all XP components (including event XP)
    const leaderboardData = await db.execute(sql`
      SELECT 
        u.id as user_id,
        u.full_name,
        u.photo_url,
        COALESCE(sp.current_streak, 0) as current_streak,
        COALESCE(sp.current_level, 1) as current_level,
        COALESCE(lesson_xp.total, 0) as lesson_xp,
        COALESCE(bonus_xp.total, 0) as bonus_xp,
        COALESCE(achievement_xp.total, 0) as achievement_xp,
        COALESCE(mission_xp.total, 0) as mission_xp,
        COALESCE(event_xp.total, 0) as event_xp,
        (
          COALESCE(lesson_xp.total, 0) + 
          COALESCE(bonus_xp.total, 0) + 
          COALESCE(achievement_xp.total, 0) + 
          COALESCE(mission_xp.total, 0) +
          COALESCE(event_xp.total, 0)
        ) as total_xp
      FROM users u
      LEFT JOIN study_profiles sp ON sp.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(xp_earned), 0) as total 
        FROM user_lesson_progress 
        WHERE user_id = u.id AND status = 'completed'
      ) lesson_xp ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(bonus_xp), 0) as total 
        FROM weekly_practice_bonus 
        WHERE user_id = u.id
      ) bonus_xp ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(xp_reward), 0) as total 
        FROM achievement_xp 
        WHERE user_id = u.id
      ) achievement_xp ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(mission_xp + bonus_xp), 0) as total 
        FROM daily_mission_xp 
        WHERE user_id = u.id
      ) mission_xp ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(xp_earned), 0) as total 
        FROM user_event_progress 
        WHERE user_id = u.id AND completed = true
      ) event_xp ON true
      WHERE u.is_admin = false
      ORDER BY total_xp DESC
      LIMIT ${limit}
    `);
    
    const rows = leaderboardData.rows as any[];
    
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.full_name || 'Unknown',
      photoUrl: row.photo_url,
      totalXp: Number(row.total_xp || 0),
      level: Number(row.current_level || 1),
      currentStreak: Number(row.current_streak || 0),
    }));
  }

  // Annual leaderboard - OPTIMIZED: Single query with subqueries instead of N+1
  async getAnnualLeaderboard(year: number, limit: number = 50): Promise<any[]> {
    // Single optimized query using subqueries for all yearly XP components
    const leaderboardData = await db.execute(sql`
      SELECT 
        u.id as user_id,
        u.full_name,
        u.photo_url,
        COALESCE(sp.current_streak, 0) as current_streak,
        COALESCE(sp.current_level, 1) as current_level,
        COALESCE(lesson_xp.total, 0) as lesson_xp,
        COALESCE(bonus_xp.total, 0) as bonus_xp,
        COALESCE(achievement_xp.total, 0) as achievement_xp,
        COALESCE(mission_xp.total, 0) as mission_xp,
        COALESCE(event_xp.total, 0) as event_xp,
        (
          COALESCE(lesson_xp.total, 0) + 
          COALESCE(bonus_xp.total, 0) + 
          COALESCE(achievement_xp.total, 0) + 
          COALESCE(mission_xp.total, 0) +
          COALESCE(event_xp.total, 0)
        ) as total_xp
      FROM users u
      LEFT JOIN study_profiles sp ON sp.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(ulp.xp_earned), 0) as total 
        FROM user_lesson_progress ulp
        INNER JOIN study_lessons sl ON sl.id = ulp.lesson_id
        WHERE ulp.user_id = u.id AND ulp.status = 'completed'
        AND EXTRACT(YEAR FROM sl.created_at) = ${year}
      ) lesson_xp ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(bonus_xp), 0) as total 
        FROM weekly_practice_bonus 
        WHERE user_id = u.id
        AND EXTRACT(YEAR FROM earned_at) = ${year}
      ) bonus_xp ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(xp_reward), 0) as total 
        FROM achievement_xp 
        WHERE user_id = u.id
        AND EXTRACT(YEAR FROM earned_at) = ${year}
      ) achievement_xp ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(mission_xp + bonus_xp), 0) as total 
        FROM daily_mission_xp 
        WHERE user_id = u.id
        AND EXTRACT(YEAR FROM earned_at) = ${year}
      ) mission_xp ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(xp_earned), 0) as total 
        FROM user_event_progress 
        WHERE user_id = u.id AND completed = true
        AND EXTRACT(YEAR FROM completed_at) = ${year}
      ) event_xp ON true
      WHERE u.is_admin = false
      ORDER BY total_xp DESC
      LIMIT ${limit}
    `);
    
    const rows = leaderboardData.rows as any[];
    
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.full_name || 'Unknown',
      photoUrl: row.photo_url,
      totalXp: Number(row.total_xp || 0),
      level: Number(row.current_level || 1),
      currentStreak: Number(row.current_streak || 0),
    }));
  }

  // Season leaderboard - OPTIMIZED: Single query with subqueries instead of N+1
  async getSeasonLeaderboard(seasonId: number, limit: number = 50): Promise<any[]> {
    // First get season dates for bonus XP calculation
    const [season] = await db.select({
      startsAt: schema.seasons.startsAt,
      endsAt: schema.seasons.endsAt,
    })
      .from(schema.seasons)
      .where(eq(schema.seasons.id, seasonId))
      .limit(1);
    
    // Single optimized query using subqueries for season-specific XP
    const leaderboardData = await db.execute(sql`
      SELECT 
        u.id as user_id,
        u.full_name,
        u.photo_url,
        COALESCE(sp.current_streak, 0) as current_streak,
        COALESCE(sp.current_level, 1) as current_level,
        COALESCE(lesson_data.xp, 0) as lesson_xp,
        COALESCE(lesson_data.count, 0) as lessons_completed,
        ${season?.startsAt && season?.endsAt ? sql`COALESCE(bonus_xp.total, 0)` : sql`0`} as bonus_xp,
        (
          COALESCE(lesson_data.xp, 0) + 
          ${season?.startsAt && season?.endsAt ? sql`COALESCE(bonus_xp.total, 0)` : sql`0`}
        ) as total_xp
      FROM users u
      LEFT JOIN study_profiles sp ON sp.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT 
          COALESCE(SUM(ulp.xp_earned), 0) as xp,
          COUNT(*) as count
        FROM user_lesson_progress ulp
        INNER JOIN study_lessons sl ON sl.id = ulp.lesson_id
        WHERE ulp.user_id = u.id 
        AND ulp.status = 'completed'
        AND sl.season_id = ${seasonId}
      ) lesson_data ON true
      ${season?.startsAt && season?.endsAt ? sql`
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(bonus_xp), 0) as total 
          FROM weekly_practice_bonus 
          WHERE user_id = u.id
          AND earned_at BETWEEN ${season.startsAt} AND ${season.endsAt}
        ) bonus_xp ON true
      ` : sql``}
      WHERE u.is_admin = false
      ORDER BY total_xp DESC
      LIMIT ${limit}
    `);
    
    const rows = leaderboardData.rows as any[];
    
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.full_name || 'Unknown',
      photoUrl: row.photo_url,
      totalXp: Number(row.total_xp || 0),
      level: Number(row.current_level || 1),
      currentStreak: Number(row.current_streak || 0),
      lessonsCompleted: Number(row.lessons_completed || 0),
    }));
  }

  // Prayer Requests Methods
  async createPrayerRequest(data: InsertPrayerRequest, moderationData?: { hasProfanity?: boolean; hasHateSpeech?: boolean; hasSexualContent?: boolean; moderationDetails?: string }): Promise<PrayerRequest> {
    const insertData = {
      ...data,
      ...(moderationData && {
        hasProfanity: moderationData.hasProfanity,
        hasHateSpeech: moderationData.hasHateSpeech,
        hasSexualContent: moderationData.hasSexualContent,
        moderationDetails: moderationData.moderationDetails,
        // isModerated sera definido como true apenas quando um moderador revisar manualmente
      }),
    };
    const [request] = await db.insert(schema.prayerRequests)
      .values(insertData)
      .returning();
    return request;
  }

  async getAllPrayerRequests(status?: string): Promise<PrayerRequest[]> {
    if (status) {
      return db.select().from(schema.prayerRequests)
        .where(eq(schema.prayerRequests.status, status))
        .orderBy(desc(schema.prayerRequests.createdAt));
    }
    return db.select().from(schema.prayerRequests)
      .orderBy(desc(schema.prayerRequests.createdAt));
  }

  async updatePrayerRequestStatus(id: number, status: string, prayedBy?: number): Promise<PrayerRequest | null> {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };
    if (prayedBy) {
      updateData.prayedBy = prayedBy;
      updateData.prayedAt = new Date();
    }
    const [updated] = await db.update(schema.prayerRequests)
      .set(updateData)
      .where(eq(schema.prayerRequests.id, id))
      .returning();
    return updated || null;
  }

  async getPrayerRequestById(id: number): Promise<PrayerRequest | null> {
    const [request] = await db.select().from(schema.prayerRequests)
      .where(eq(schema.prayerRequests.id, id))
      .limit(1);
    return request || null;
  }

  async getApprovedPrayerRequests(): Promise<PrayerRequest[]> {
    return db.select().from(schema.prayerRequests)
      .where(eq(schema.prayerRequests.isApproved, true))
      .orderBy(desc(schema.prayerRequests.approvedAt));
  }

  async getPendingPrayerRequests(): Promise<PrayerRequest[]> {
    return db.select().from(schema.prayerRequests)
      .where(and(
        eq(schema.prayerRequests.status, 'pending'),
        eq(schema.prayerRequests.isApproved, false)
      ))
      .orderBy(desc(schema.prayerRequests.createdAt));
  }

  async approvePrayerRequest(id: number, approvedBy: number): Promise<PrayerRequest | null> {
    const [request] = await db.update(schema.prayerRequests)
      .set({
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: approvedBy,
        isModerated: true,
        moderatedBy: approvedBy,
        moderatedAt: new Date(),
        status: 'approved',
        updatedAt: new Date(),
      })
      .where(eq(schema.prayerRequests.id, id))
      .returning();
    return request || null;
  }

  async autoApprovePrayerRequest(id: number): Promise<PrayerRequest | null> {
    const now = new Date();
    const [request] = await db.update(schema.prayerRequests)
      .set({
        isApproved: true,
        approvedAt: now,
        // approvedBy permanece null para indicar aprovacao automatica pelo sistema
        isModerated: true,
        moderatedAt: now,
        // moderatedBy permanece null para indicar moderacao automatica pelo sistema
        moderationDetails: 'Aprovado automaticamente - conteudo limpo',
        status: 'approved',
        updatedAt: now,
      })
      .where(eq(schema.prayerRequests.id, id))
      .returning();
    return request || null;
  }

  async rejectPrayerRequest(id: number, moderatedBy: number, reason?: string): Promise<PrayerRequest | null> {
    const [request] = await db.update(schema.prayerRequests)
      .set({
        isApproved: false,
        isModerated: true,
        moderatedBy: moderatedBy,
        moderatedAt: new Date(),
        status: 'rejected',
        notes: reason,
        updatedAt: new Date(),
      })
      .where(eq(schema.prayerRequests.id, id))
      .returning();
    return request || null;
  }

  async incrementPrayerCount(id: number): Promise<PrayerRequest | null> {
    const [request] = await db.update(schema.prayerRequests)
      .set({
        inPrayerCount: sql`${schema.prayerRequests.inPrayerCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.prayerRequests.id, id))
      .returning();
    return request || null;
  }

  async checkIfPraying(prayerRequestId: number, sessionId: string): Promise<boolean> {
    const [reaction] = await db.select()
      .from(schema.prayerReactions)
      .where(and(
        eq(schema.prayerReactions.prayerRequestId, prayerRequestId),
        eq(schema.prayerReactions.sessionId, sessionId)
      ))
      .limit(1);
    return !!reaction;
  }

  async togglePraying(prayerRequestId: number, sessionId: string): Promise<{ isPraying: boolean; inPrayerCount: number } | null> {
    // First, verify that the prayer request exists and is approved
    const [existingRequest] = await db.select()
      .from(schema.prayerRequests)
      .where(and(
        eq(schema.prayerRequests.id, prayerRequestId),
        eq(schema.prayerRequests.isApproved, true)
      ))
      .limit(1);
    
    if (!existingRequest) {
      return null; // Request not found or not approved
    }
    
    const isPraying = await this.checkIfPraying(prayerRequestId, sessionId);
    
    if (isPraying) {
      // Remove reaction and decrement count
      await db.delete(schema.prayerReactions)
        .where(and(
          eq(schema.prayerReactions.prayerRequestId, prayerRequestId),
          eq(schema.prayerReactions.sessionId, sessionId)
        ));
      
      const [request] = await db.update(schema.prayerRequests)
        .set({
          inPrayerCount: sql`GREATEST(${schema.prayerRequests.inPrayerCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(schema.prayerRequests.id, prayerRequestId))
        .returning();
      
      return { isPraying: false, inPrayerCount: request?.inPrayerCount || 0 };
    } else {
      // Add reaction and increment count
      await db.insert(schema.prayerReactions)
        .values({ prayerRequestId, sessionId })
        .onConflictDoNothing();
      
      const [request] = await db.update(schema.prayerRequests)
        .set({
          inPrayerCount: sql`${schema.prayerRequests.inPrayerCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.prayerRequests.id, prayerRequestId))
        .returning();
      
      return { isPraying: true, inPrayerCount: request?.inPrayerCount || 0 };
    }
  }

  async getPrayingSessionsForRequests(prayerRequestIds: number[], sessionId: string): Promise<Set<number>> {
    const reactions = await db.select({ prayerRequestId: schema.prayerReactions.prayerRequestId })
      .from(schema.prayerReactions)
      .where(and(
        inArray(schema.prayerReactions.prayerRequestId, prayerRequestIds),
        eq(schema.prayerReactions.sessionId, sessionId)
      ));
    return new Set(reactions.map(r => r.prayerRequestId));
  }

  async moderatePrayerRequest(id: number, data: { isModerated: boolean; moderatedBy: number; hasProfanity?: boolean; hasHateSpeech?: boolean; hasSexualContent?: boolean; moderationDetails?: string }): Promise<PrayerRequest | null> {
    const [request] = await db.update(schema.prayerRequests)
      .set({
        ...data,
        moderatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.prayerRequests.id, id))
      .returning();
    return request || null;
  }

  async deletePrayerRequest(id: number): Promise<void> {
    await db.delete(schema.prayerReactions)
      .where(eq(schema.prayerReactions.prayerRequestId, id));
    await db.delete(schema.prayerRequests)
      .where(eq(schema.prayerRequests.id, id));
  }

  // Board Members Methods
  async getAllBoardMembers(currentOnly: boolean = true): Promise<BoardMember[]> {
    if (currentOnly) {
      return db.select().from(schema.boardMembers)
        .where(eq(schema.boardMembers.isCurrent, true))
        .orderBy(asc(schema.boardMembers.orderIndex));
    }
    return db.select().from(schema.boardMembers)
      .orderBy(asc(schema.boardMembers.orderIndex));
  }

  async createBoardMember(data: InsertBoardMember): Promise<BoardMember> {
    const [member] = await db.insert(schema.boardMembers)
      .values(data)
      .returning();
    return member;
  }

  async updateBoardMember(id: number, data: Partial<InsertBoardMember>): Promise<BoardMember | null> {
    const [updated] = await db.update(schema.boardMembers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.boardMembers.id, id))
      .returning();
    return updated || null;
  }

  async deleteBoardMember(id: number): Promise<void> {
    await db.delete(schema.boardMembers).where(eq(schema.boardMembers.id, id));
  }

  // Banners Methods
  async getActiveBanners(): Promise<Banner[]> {
    const now = new Date();
    return db.select().from(schema.banners)
      .where(and(
        eq(schema.banners.isActive, true),
        or(
          isNull(schema.banners.startsAt),
          lte(schema.banners.startsAt, now)
        ),
        or(
          isNull(schema.banners.endsAt),
          gte(schema.banners.endsAt, now)
        )
      ))
      .orderBy(asc(schema.banners.orderIndex));
  }

  async getAllBanners(): Promise<Banner[]> {
    return db.select().from(schema.banners)
      .orderBy(asc(schema.banners.orderIndex));
  }

  async createBanner(data: InsertBanner): Promise<Banner> {
    const [banner] = await db.insert(schema.banners)
      .values(data)
      .returning();
    return banner;
  }

  async updateBanner(id: number, data: Partial<InsertBanner>): Promise<Banner | null> {
    const [updated] = await db.update(schema.banners)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.banners.id, id))
      .returning();
    return updated || null;
  }

  async deleteBanner(id: number): Promise<void> {
    await db.delete(schema.banners).where(eq(schema.banners.id, id));
  }

  // Site Content Methods
  async getSiteContent(page: string, section: string): Promise<SiteContent | null> {
    const [content] = await db.select().from(schema.siteContent)
      .where(and(
        eq(schema.siteContent.page, page),
        eq(schema.siteContent.section, section)
      ))
      .limit(1);
    return content || null;
  }

  async getAllSiteContent(): Promise<SiteContent[]> {
    return db.select().from(schema.siteContent)
      .orderBy(asc(schema.siteContent.page), asc(schema.siteContent.section));
  }

  async upsertSiteContent(data: InsertSiteContent): Promise<SiteContent> {
    const existing = await this.getSiteContent(data.page, data.section);
    if (existing) {
      const [updated] = await db.update(schema.siteContent)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.siteContent.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(schema.siteContent)
      .values(data)
      .returning();
    return created;
  }

  // ==================== DAILY VERSE STOCK METHODS ====================

  async getAllDailyVerseStock(): Promise<schema.DailyVerseStock[]> {
    return db.select().from(schema.dailyVerseStock)
      .where(eq(schema.dailyVerseStock.isActive, true))
      .orderBy(asc(schema.dailyVerseStock.orderIndex));
  }

  async getDailyVerseStockById(id: number): Promise<schema.DailyVerseStock | null> {
    const [stock] = await db.select().from(schema.dailyVerseStock)
      .where(eq(schema.dailyVerseStock.id, id));
    return stock || null;
  }

  async getNextDailyVerseStockImage(): Promise<schema.DailyVerseStock | null> {
    // Get all active stock images ordered by last used (oldest first, null first)
    // NULLS FIRST ensures never-used images come first
    const stocks = await db.select().from(schema.dailyVerseStock)
      .where(eq(schema.dailyVerseStock.isActive, true))
      .orderBy(
        sql`${schema.dailyVerseStock.lastUsedAt} ASC NULLS FIRST`,
        asc(schema.dailyVerseStock.orderIndex)
      );
    
    if (stocks.length === 0) return null;
    
    // Return the one that was used longest ago (or never used)
    return stocks[0];
  }

  async createDailyVerseStock(data: schema.InsertDailyVerseStock): Promise<schema.DailyVerseStock> {
    const [stock] = await db.insert(schema.dailyVerseStock)
      .values(data)
      .returning();
    return stock;
  }

  async updateDailyVerseStock(id: number, data: Partial<schema.InsertDailyVerseStock>): Promise<schema.DailyVerseStock | null> {
    const [updated] = await db.update(schema.dailyVerseStock)
      .set(data)
      .where(eq(schema.dailyVerseStock.id, id))
      .returning();
    return updated || null;
  }

  async deleteDailyVerseStock(id: number): Promise<void> {
    await db.delete(schema.dailyVerseStock)
      .where(eq(schema.dailyVerseStock.id, id));
  }

  // ==================== DAILY VERSE POSTS METHODS ====================

  async getActiveDailyVersePost(): Promise<schema.DailyVersePost | null> {
    const now = new Date();
    const [post] = await db.select().from(schema.dailyVersePosts)
      .where(and(
        eq(schema.dailyVersePosts.isActive, true),
        lte(schema.dailyVersePosts.publishedAt, now),
        gte(schema.dailyVersePosts.expiresAt, now)
      ))
      .orderBy(desc(schema.dailyVersePosts.publishedAt))
      .limit(1);
    return post || null;
  }

  async getDailyVersePostByDate(date: Date): Promise<schema.DailyVersePost | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Only return active posts (filtered out posts are not accessible)
    const [post] = await db.select().from(schema.dailyVersePosts)
      .where(and(
        eq(schema.dailyVersePosts.isActive, true),
        gte(schema.dailyVersePosts.publishedAt, startOfDay),
        lte(schema.dailyVersePosts.publishedAt, endOfDay)
      ))
      .limit(1);
    return post || null;
  }

  async getDailyVersePosts(limit: number = 30, offset: number = 0, activeOnly: boolean = true): Promise<schema.DailyVersePost[]> {
    if (activeOnly) {
      return db.select().from(schema.dailyVersePosts)
        .where(eq(schema.dailyVersePosts.isActive, true))
        .orderBy(desc(schema.dailyVersePosts.publishedAt))
        .limit(limit)
        .offset(offset);
    }
    return db.select().from(schema.dailyVersePosts)
      .orderBy(desc(schema.dailyVersePosts.publishedAt))
      .limit(limit)
      .offset(offset);
  }

  async createDailyVersePost(data: schema.InsertDailyVersePost): Promise<schema.DailyVersePost> {
    const [post] = await db.insert(schema.dailyVersePosts)
      .values(data)
      .returning();
    return post;
  }

  async updateDailyVersePost(id: number, data: Partial<schema.InsertDailyVersePost>): Promise<schema.DailyVersePost | null> {
    const [updated] = await db.update(schema.dailyVersePosts)
      .set(data)
      .where(eq(schema.dailyVersePosts.id, id))
      .returning();
    return updated || null;
  }
  
  async deleteDailyVersePost(id: number): Promise<void> {
    await db.delete(schema.dailyVersePosts)
      .where(eq(schema.dailyVersePosts.id, id));
  }

  async deactivateExpiredDailyVersePosts(): Promise<void> {
    const now = new Date();
    await db.update(schema.dailyVersePosts)
      .set({ isActive: false })
      .where(and(
        eq(schema.dailyVersePosts.isActive, true),
        lte(schema.dailyVersePosts.expiresAt, now)
      ));
  }

  async recordDailyVerseShare(userId: number, versePostId: number | null, platform: string, shareDate: string): Promise<schema.DailyVerseShare> {
    const [share] = await db.insert(schema.dailyVerseShares)
      .values({
        userId,
        versePostId,
        platform,
        shareDate,
      })
      .returning();
    return share;
  }

  async hasUserSharedDailyVerseToday(userId: number, date: string): Promise<boolean> {
    const [share] = await db.select()
      .from(schema.dailyVerseShares)
      .where(and(
        eq(schema.dailyVerseShares.userId, userId),
        eq(schema.dailyVerseShares.shareDate, date)
      ))
      .limit(1);
    return !!share;
  }

  // ==================== BIRTHDAY SHARE IMAGES ====================

  async saveBirthdayShareImage(memberId: number, imageUrl: string, shareDate: string): Promise<schema.BirthdayShareImage> {
    // Upsert - update if exists, insert if not
    const existing = await db.select()
      .from(schema.birthdayShareImages)
      .where(and(
        eq(schema.birthdayShareImages.memberId, memberId),
        eq(schema.birthdayShareImages.shareDate, shareDate)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      const [updated] = await db.update(schema.birthdayShareImages)
        .set({ imageUrl })
        .where(eq(schema.birthdayShareImages.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(schema.birthdayShareImages)
      .values({ memberId, imageUrl, shareDate })
      .returning();
    return created;
  }

  async getBirthdayShareImage(memberId: number, shareDate: string): Promise<schema.BirthdayShareImage | null> {
    const [image] = await db.select()
      .from(schema.birthdayShareImages)
      .where(and(
        eq(schema.birthdayShareImages.memberId, memberId),
        eq(schema.birthdayShareImages.shareDate, shareDate)
      ))
      .limit(1);
    return image || null;
  }

  async deleteBirthdayShareImage(id: number): Promise<void> {
    await db.delete(schema.birthdayShareImages)
      .where(eq(schema.birthdayShareImages.id, id));
  }

  // ==================== AUDIT LOG METHODS ====================

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(schema.auditLogs)
      .values(log)
      .returning();
    return auditLog;
  }

  async getAuditLogs(filters?: { userId?: number; resource?: string; limit?: number }): Promise<AuditLog[]> {
    let query = db.select().from(schema.auditLogs);
    
    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(schema.auditLogs.userId, filters.userId));
    }
    if (filters?.resource) {
      conditions.push(eq(schema.auditLogs.resource, filters.resource));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    return query
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(filters?.limit || 100);
  }

  // ==================== CURRENT LESSON OPTIMIZED ====================
  
  // OPTIMIZED: Single SQL query to find current lesson instead of loading all lessons + JavaScript loop
  async getCurrentLessonOptimized(userId: number): Promise<{
    lesson: { id: number; lessonNumber: number; title: string; sectionsCompleted: number; totalSections: number; status: string };
    season: { id: number; title: string };
  } | null> {
    // Get all published seasons ordered by publishedAt
    const seasons = await db.select({
      id: schema.seasons.id,
      title: schema.seasons.title,
    }).from(schema.seasons)
      .where(eq(schema.seasons.status, "published"))
      .orderBy(asc(schema.seasons.publishedAt));
    
    if (seasons.length === 0) return null;
    
    const seasonIds = seasons.map(s => s.id);
    
    // Get all lessons from published seasons with their progress in one query
    const lessonsWithProgress = await db.select({
      id: schema.studyLessons.id,
      seasonId: schema.studyLessons.seasonId,
      orderIndex: schema.studyLessons.orderIndex,
      lessonNumber: schema.studyLessons.lessonNumber,
      title: schema.studyLessons.title,
      isLocked: schema.studyLessons.isLocked,
      progressStatus: schema.userLessonProgress.status,
    })
      .from(schema.studyLessons)
      .leftJoin(
        schema.userLessonProgress,
        and(
          eq(schema.userLessonProgress.lessonId, schema.studyLessons.id),
          eq(schema.userLessonProgress.userId, userId)
        )
      )
      .where(inArray(schema.studyLessons.seasonId, seasonIds))
      .orderBy(asc(schema.studyLessons.seasonId), asc(schema.studyLessons.orderIndex));
    
    if (lessonsWithProgress.length === 0) return null;
    
    // Group lessons by seasonId for efficient lookup
    const lessonsBySeasonId = new Map<number, typeof lessonsWithProgress>();
    for (const lesson of lessonsWithProgress) {
      if (!lessonsBySeasonId.has(lesson.seasonId!)) {
        lessonsBySeasonId.set(lesson.seasonId!, []);
      }
      lessonsBySeasonId.get(lesson.seasonId!)!.push(lesson);
    }
    
    // Find first available lesson across all seasons (in order)
    for (const season of seasons) {
      const lessons = lessonsBySeasonId.get(season.id) || [];
      
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const previousLesson = lessons[i - 1];
        const previousCompleted = i === 0 || previousLesson?.progressStatus === 'completed';
        // Derive correct status: if no progress but lesson is unlocked, status is 'available'
        const status = lesson.progressStatus || (lesson.isLocked ? 'locked' : 'available');
        
        if (status !== 'completed' && previousCompleted && !lesson.isLocked) {
          // Get unit counts for this specific lesson
          const units = await db.select({ id: schema.studyUnits.id })
            .from(schema.studyUnits)
            .where(eq(schema.studyUnits.lessonId, lesson.id));
          
          const unitIds = units.map(u => u.id);
          let completedCount = 0;
          if (unitIds.length > 0) {
            const completed = await db.select({ unitId: schema.userUnitProgress.unitId })
              .from(schema.userUnitProgress)
              .where(and(
                eq(schema.userUnitProgress.userId, userId),
                eq(schema.userUnitProgress.isCompleted, true),
                inArray(schema.userUnitProgress.unitId, unitIds)
              ));
            completedCount = completed.length;
          }
          
          return {
            lesson: {
              id: lesson.id,
              lessonNumber: lesson.lessonNumber || (lesson.orderIndex + 1),
              title: lesson.title,
              sectionsCompleted: completedCount,
              totalSections: units.length,
              status,
            },
            season: {
              id: season.id,
              title: season.title,
            }
          };
        }
      }
    }
    
    return null;
  }

  // ==================== SEASON METHODS ====================

  async getAllSeasons(): Promise<schema.Season[]> {
    return db.select().from(schema.seasons)
      .orderBy(desc(schema.seasons.createdAt));
  }

  async getPublishedSeasons(): Promise<schema.Season[]> {
    return db.select().from(schema.seasons)
      .where(eq(schema.seasons.status, "published"))
      .orderBy(desc(schema.seasons.publishedAt));
  }

  async getSeasonById(id: number): Promise<schema.Season | null> {
    const [season] = await db.select().from(schema.seasons)
      .where(eq(schema.seasons.id, id))
      .limit(1);
    return season || null;
  }

  async createSeason(data: schema.InsertSeason): Promise<schema.Season> {
    const [season] = await db.insert(schema.seasons)
      .values(data)
      .returning();
    return season;
  }

  async updateSeason(id: number, data: Partial<schema.InsertSeason>): Promise<schema.Season | null> {
    const [updated] = await db.update(schema.seasons)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.seasons.id, id))
      .returning();
    return updated || null;
  }

  async deleteSeason(id: number): Promise<boolean> {
    const lessons = await this.getLessonsForSeason(id);
    const lessonIds = lessons.map(l => l.id);
    
    if (lessonIds.length > 0) {
      const units = await db.select({ id: schema.studyUnits.id })
        .from(schema.studyUnits)
        .where(inArray(schema.studyUnits.lessonId, lessonIds));
      const unitIds = units.map(u => u.id);
      
      if (unitIds.length > 0) {
        await db.delete(schema.userUnitProgress)
          .where(inArray(schema.userUnitProgress.unitId, unitIds));
        await db.delete(schema.studyUnits)
          .where(inArray(schema.studyUnits.id, unitIds));
      }
      
      await db.delete(schema.userLessonProgress)
        .where(inArray(schema.userLessonProgress.lessonId, lessonIds));
      await db.delete(schema.studyLessons)
        .where(inArray(schema.studyLessons.id, lessonIds));
    }
    
    await db.delete(schema.userSeasonProgress)
      .where(eq(schema.userSeasonProgress.seasonId, id));
    
    const finalChallenges = await db.select({ id: schema.seasonFinalChallenges.id })
      .from(schema.seasonFinalChallenges)
      .where(eq(schema.seasonFinalChallenges.seasonId, id));
    
    if (finalChallenges.length > 0) {
      const challengeIds = finalChallenges.map(c => c.id);
      await db.delete(schema.userFinalChallengeProgress)
        .where(inArray(schema.userFinalChallengeProgress.challengeId, challengeIds));
      await db.delete(schema.seasonFinalChallenges)
        .where(eq(schema.seasonFinalChallenges.seasonId, id));
    }
    
    // Delete season rankings before deleting the season
    await db.delete(schema.seasonRankings)
      .where(eq(schema.seasonRankings.seasonId, id));
    
    await db.delete(schema.seasons)
      .where(eq(schema.seasons.id, id));
    return true;
  }

  async publishSeason(id: number): Promise<schema.Season | null> {
    // Only update the season status - DO NOT change lesson lock states
    // Lessons should be individually managed via unlock/lock functions
    const [updated] = await db.update(schema.seasons)
      .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.seasons.id, id))
      .returning();
    return updated || null;
  }

  async toggleSeasonLock(id: number, isLocked: boolean): Promise<schema.Season | null> {
    const [updated] = await db.update(schema.seasons)
      .set({ isLocked, updatedAt: new Date() })
      .where(eq(schema.seasons.id, id))
      .returning();
    return updated || null;
  }

  async endSeason(id: number): Promise<{ season: schema.Season; topRankers: schema.SeasonRankingEntry[]; allParticipants: schema.SeasonRankingEntry[] } | null> {
    const season = await this.getSeasonById(id);
    if (!season) return null;

    // Finalize rankings before ending
    await this.finalizeSeasonRankings(id);

    // Get ALL participants (for card distribution and notifications)
    const allParticipants = await this.getSeasonRankings(id, 1000);
    
    // Top 3 rankers for emails (first 3 from allParticipants)
    const topRankers = allParticipants.slice(0, 3);

    // Mark season as ended
    const [updated] = await db.update(schema.seasons)
      .set({ 
        isEnded: true, 
        endedAt: new Date(),
        isLocked: true,
        updatedAt: new Date() 
      })
      .where(eq(schema.seasons.id, id))
      .returning();

    if (!updated) return null;

    return { season: updated, topRankers, allParticipants };
  }

  async getLessonsForSeason(seasonId: number): Promise<schema.StudyLesson[]> {
    return db.select().from(schema.studyLessons)
      .where(eq(schema.studyLessons.seasonId, seasonId))
      .orderBy(asc(schema.studyLessons.orderIndex));
  }

  // OPTIMIZED: Batch queries for season lessons - LIGHTWEIGHT payload for listing
  // Heavy content (content, markdown, units) loaded on-demand via GET /lessons/:id
  async getLessonsWithProgressForSeason(userId: number, seasonId: number): Promise<any[]> {
    // Batch fetch lessons with progress - LIGHTWEIGHT fields only
    const lessonsWithProgress = await db.select({
      id: schema.studyLessons.id,
      orderIndex: schema.studyLessons.orderIndex,
      title: schema.studyLessons.title,
      lessonNumber: schema.studyLessons.lessonNumber,
      icon: schema.studyLessons.icon,
      xpReward: schema.studyLessons.xpReward,
      estimatedMinutes: schema.studyLessons.estimatedMinutes,
      isLocked: schema.studyLessons.isLocked,
      isBonus: schema.studyLessons.isBonus,
      isReleased: schema.studyLessons.isReleased,
      progressStatus: schema.userLessonProgress.status,
    })
      .from(schema.studyLessons)
      .leftJoin(
        schema.userLessonProgress,
        and(
          eq(schema.userLessonProgress.lessonId, schema.studyLessons.id),
          eq(schema.userLessonProgress.userId, userId)
        )
      )
      .where(eq(schema.studyLessons.seasonId, seasonId))
      .orderBy(asc(schema.studyLessons.orderIndex));
    
    if (lessonsWithProgress.length === 0) return [];
    
    // Batch fetch ALL units for ALL lessons (minimal fields for stage calculation)
    const lessonIds = lessonsWithProgress.map(l => l.id);
    const allUnits = await db.select({
      id: schema.studyUnits.id,
      lessonId: schema.studyUnits.lessonId,
      stage: schema.studyUnits.stage,
      type: schema.studyUnits.type,
    }).from(schema.studyUnits)
      .where(inArray(schema.studyUnits.lessonId, lessonIds));
    
    // Group units by lessonId
    const unitsByLessonId = new Map<number, { id: number; stage: string | null; type: string | null }[]>();
    for (const unit of allUnits) {
      if (!unitsByLessonId.has(unit.lessonId)) {
        unitsByLessonId.set(unit.lessonId, []);
      }
      unitsByLessonId.get(unit.lessonId)!.push(unit);
    }
    
    // Batch fetch ALL unit progress
    const allUnitIds = allUnits.map(u => u.id);
    const completedUnitIds = new Set<number>();
    
    if (allUnitIds.length > 0) {
      const allProgress = await db.select({
        unitId: schema.userUnitProgress.unitId,
      }).from(schema.userUnitProgress)
        .where(and(
          eq(schema.userUnitProgress.userId, userId),
          eq(schema.userUnitProgress.isCompleted, true),
          inArray(schema.userUnitProgress.unitId, allUnitIds)
        ));
      
      for (const p of allProgress) {
        completedUnitIds.add(p.unitId);
      }
    }
    
    // Stage type mappings
    const estudeTypes = ['text', 'verse'];
    const mediteTypes = ['meditation', 'reflection'];
    const respondaTypes = ['multiple_choice', 'true_false', 'fill_blank'];
    
    // Build LIGHTWEIGHT result with calculated stage progress
    return lessonsWithProgress.map((row) => {
      const units = unitsByLessonId.get(row.id) || [];
      
      let estudeTotal = 0, estudeCompleted = 0;
      let mediteTotal = 0, mediteCompleted = 0;
      let respondaTotal = 0, respondaCompleted = 0;
      
      for (const unit of units) {
        const stage = (unit.stage || 'estude') as 'estude' | 'medite' | 'responda';
        const unitType = unit.type || 'text';
        const isCompleted = completedUnitIds.has(unit.id);
        
        if (stage === 'estude' && estudeTypes.includes(unitType)) {
          estudeTotal++;
          if (isCompleted) estudeCompleted++;
        } else if (stage === 'medite' && mediteTypes.includes(unitType)) {
          mediteTotal++;
          if (isCompleted) mediteCompleted++;
        } else if (stage === 'responda' && respondaTypes.includes(unitType)) {
          respondaTotal++;
          if (isCompleted) respondaCompleted++;
        }
      }
      
      const studyCompleted = estudeTotal > 0 && estudeCompleted >= estudeTotal;
      const meditationCompleted = mediteTotal > 0 && mediteCompleted >= mediteTotal;
      const quizCompleted = respondaTotal > 0 && respondaCompleted >= respondaTotal;
      
      const totalSections = estudeTotal + mediteTotal + respondaTotal;
      const sectionsCompleted = estudeCompleted + mediteCompleted + respondaCompleted;
      
      // Derive correct status
      const status = row.progressStatus || (row.isLocked ? 'locked' : 'available');
      
      // LIGHTWEIGHT lesson object - no heavy fields
      return {
        id: row.id,
        title: row.title,
        lessonNumber: row.lessonNumber || (row.orderIndex + 1),
        icon: row.icon,
        xpReward: row.xpReward,
        estimatedMinutes: row.estimatedMinutes,
        isLocked: row.isLocked,
        isBonus: row.isBonus,
        isReleased: row.isReleased,
        status,
        studyCompleted,
        meditationCompleted,
        quizCompleted,
        sectionsCompleted,
        totalSections,
        unitCount: units.length,
      };
    });
  }

  async createSeasonLesson(data: { seasonId: number; orderIndex: number; lessonNumber?: number; title: string; type?: string; description?: string; xpReward?: number; estimatedMinutes?: number; icon?: string; isBonus?: boolean }): Promise<schema.StudyLesson> {
    const [lesson] = await db.insert(schema.studyLessons)
      .values({
        seasonId: data.seasonId,
        orderIndex: data.orderIndex,
        lessonNumber: data.lessonNumber,
        title: data.title,
        type: data.type || "study",
        description: data.description,
        xpReward: data.xpReward || 10,
        estimatedMinutes: data.estimatedMinutes || 5,
        icon: data.icon,
        isBonus: data.isBonus || false,
        isLocked: true,
        isReleased: false,
      })
      .returning();
    return lesson;
  }

  async releaseLessonInSeason(lessonId: number): Promise<schema.StudyLesson | null> {
    const [updated] = await db.update(schema.studyLessons)
      .set({ isReleased: true, isLocked: false, releaseDate: new Date(), updatedAt: new Date() })
      .where(eq(schema.studyLessons.id, lessonId))
      .returning();
    return updated || null;
  }

  // ==================== FINAL CHALLENGE METHODS ====================

  async getSeasonFinalChallenge(seasonId: number): Promise<schema.SeasonFinalChallenge | null> {
    const [challenge] = await db.select().from(schema.seasonFinalChallenges)
      .where(eq(schema.seasonFinalChallenges.seasonId, seasonId))
      .limit(1);
    return challenge || null;
  }

  async createFinalChallenge(data: schema.InsertSeasonFinalChallenge): Promise<schema.SeasonFinalChallenge> {
    const [challenge] = await db.insert(schema.seasonFinalChallenges)
      .values(data)
      .returning();
    return challenge;
  }

  async updateFinalChallenge(id: number, data: Partial<schema.InsertSeasonFinalChallenge>): Promise<schema.SeasonFinalChallenge | null> {
    const [updated] = await db.update(schema.seasonFinalChallenges)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.seasonFinalChallenges.id, id))
      .returning();
    return updated || null;
  }

  async startFinalChallenge(userId: number, challengeId: number): Promise<{ progress: schema.UserFinalChallengeProgress; token: string }> {
    const token = `${userId}-${challengeId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const existing = await this.getUserFinalChallengeProgress(userId, challengeId);
    if (existing && existing.isCompleted) {
      throw new Error("Desafio já foi completado");
    }

    if (existing) {
      const [updated] = await db.update(schema.userFinalChallengeProgress)
        .set({ startedAt: new Date(), challengeToken: token })
        .where(eq(schema.userFinalChallengeProgress.id, existing.id))
        .returning();
      return { progress: updated, token };
    }

    const [progress] = await db.insert(schema.userFinalChallengeProgress)
      .values({
        userId,
        challengeId,
        startedAt: new Date(),
        challengeToken: token,
      })
      .returning();
    return { progress, token };
  }

  async submitFinalChallenge(userId: number, challengeId: number, token: string, answers: number[]): Promise<schema.FinalChallengeResult> {
    const progress = await this.getUserFinalChallengeProgress(userId, challengeId);
    if (!progress) {
      throw new Error("Desafio não iniciado");
    }
    if (progress.challengeToken !== token) {
      throw new Error("Token inválido");
    }
    if (progress.isCompleted) {
      throw new Error("Desafio já foi completado");
    }

    const challenge = await db.select().from(schema.seasonFinalChallenges)
      .where(eq(schema.seasonFinalChallenges.id, challengeId))
      .limit(1)
      .then(r => r[0]);
    
    if (!challenge) {
      throw new Error("Desafio não encontrado");
    }

    const now = new Date();
    const startedAt = new Date(progress.startedAt);
    const timeSpentSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    
    if (timeSpentSeconds > challenge.timeLimitSeconds + 10) {
      throw new Error("Tempo esgotado");
    }

    const questions: schema.FinalChallengeQuestion[] = JSON.parse(challenge.questions);
    let correctAnswers = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === questions[i].correctAnswer) {
        correctAnswers++;
      }
    }

    const isPerfect = correctAnswers === challenge.questionCount && timeSpentSeconds <= challenge.timeLimitSeconds;
    let xpEarned = challenge.xpReward;
    if (isPerfect) {
      xpEarned += challenge.perfectXpBonus;
    }

    const [updated] = await db.update(schema.userFinalChallengeProgress)
      .set({
        completedAt: now,
        timeSpentSeconds,
        correctAnswers,
        xpEarned,
        isPerfect,
        isCompleted: true,
        answersGiven: JSON.stringify(answers),
      })
      .where(eq(schema.userFinalChallengeProgress.id, progress.id))
      .returning();

    if (isPerfect) {
      await this.updateUserSeasonProgress(userId, challenge.seasonId, {
        finalChallengeCompleted: true,
        finalChallengePerfect: true,
        isMastered: true,
      });
    } else {
      await this.updateUserSeasonProgress(userId, challenge.seasonId, {
        finalChallengeCompleted: true,
      });
    }

    return {
      challengeId,
      userId,
      correctAnswers,
      totalQuestions: challenge.questionCount,
      timeSpentSeconds,
      xpEarned,
      isPerfect,
      isMastered: isPerfect,
    };
  }

  async getUserFinalChallengeProgress(userId: number, challengeId: number): Promise<schema.UserFinalChallengeProgress | null> {
    const [progress] = await db.select().from(schema.userFinalChallengeProgress)
      .where(and(
        eq(schema.userFinalChallengeProgress.userId, userId),
        eq(schema.userFinalChallengeProgress.challengeId, challengeId)
      ))
      .limit(1);
    return progress || null;
  }

  // ==================== USER SEASON PROGRESS METHODS ====================

  async getUserSeasonProgress(userId: number, seasonId: number): Promise<schema.UserSeasonProgress | null> {
    const [progress] = await db.select().from(schema.userSeasonProgress)
      .where(and(
        eq(schema.userSeasonProgress.userId, userId),
        eq(schema.userSeasonProgress.seasonId, seasonId)
      ))
      .limit(1);
    return progress || null;
  }

  // OPTIMIZED: Batch fetch season progress for multiple seasons (avoids N+1)
  async getUserSeasonProgressBatch(userId: number, seasonIds: number[]): Promise<Map<number, schema.UserSeasonProgress>> {
    if (seasonIds.length === 0) return new Map();
    
    const progressList = await db.select().from(schema.userSeasonProgress)
      .where(and(
        eq(schema.userSeasonProgress.userId, userId),
        inArray(schema.userSeasonProgress.seasonId, seasonIds)
      ));
    
    const progressBySeasonId = new Map<number, schema.UserSeasonProgress>();
    for (const p of progressList) {
      progressBySeasonId.set(p.seasonId, p);
    }
    
    return progressBySeasonId;
  }

  async updateUserSeasonProgress(userId: number, seasonId: number, data: Partial<schema.InsertUserSeasonProgress>): Promise<schema.UserSeasonProgress> {
    const existing = await this.getUserSeasonProgress(userId, seasonId);
    
    if (existing) {
      const [updated] = await db.update(schema.userSeasonProgress)
        .set({ ...data, lastActivityAt: new Date() })
        .where(eq(schema.userSeasonProgress.id, existing.id))
        .returning();
      return updated;
    }

    const season = await this.getSeasonById(seasonId);
    const [created] = await db.insert(schema.userSeasonProgress)
      .values({
        userId,
        seasonId,
        totalLessons: season?.totalLessons || 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        ...data,
      })
      .returning();
    return created;
  }

  // ==================== SEASON RANKING METHODS ====================

  async getSeasonRankings(seasonId: number, limit: number = 50): Promise<schema.SeasonRankingEntry[]> {
    const rankings = await db.select({
      id: schema.seasonRankings.id,
      seasonId: schema.seasonRankings.seasonId,
      userId: schema.seasonRankings.userId,
      xpEarned: schema.seasonRankings.xpEarned,
      lessonsCompleted: schema.seasonRankings.lessonsCompleted,
      correctPercentage: schema.seasonRankings.correctPercentage,
      finalChallengeScore: schema.seasonRankings.finalChallengeScore,
      isMastered: schema.seasonRankings.isMastered,
      rankPosition: schema.seasonRankings.rankPosition,
      isWinner: schema.seasonRankings.isWinner,
      updatedAt: schema.seasonRankings.updatedAt,
      user: {
        id: schema.users.id,
        fullName: schema.users.fullName,
        photoUrl: schema.users.photoUrl,
      },
    })
    .from(schema.seasonRankings)
    .innerJoin(schema.users, eq(schema.seasonRankings.userId, schema.users.id))
    .where(eq(schema.seasonRankings.seasonId, seasonId))
    .orderBy(desc(schema.seasonRankings.xpEarned))
    .limit(limit);

    return rankings as schema.SeasonRankingEntry[];
  }

  async updateSeasonRanking(seasonId: number, userId: number): Promise<schema.SeasonRanking> {
    // CRITICAL FIX: Use single source of truth (user_lesson_progress.xpEarned + weekly bonuses)
    // Do NOT use userSeasonProgress.xpEarned which is derived and incomplete
    
    // Get XP and lesson count from lessons in this season
    const [seasonXpResult] = await db.select({
      seasonXp: sql<number>`COALESCE(SUM(${schema.userLessonProgress.xpEarned}), 0)`,
      lessonsCompleted: sql<number>`COALESCE(COUNT(*), 0)`,
    })
      .from(schema.userLessonProgress)
      .innerJoin(schema.studyLessons, eq(schema.userLessonProgress.lessonId, schema.studyLessons.id))
      .where(and(
        eq(schema.userLessonProgress.userId, userId),
        eq(schema.userLessonProgress.status, 'completed'),
        eq(schema.studyLessons.seasonId, seasonId)
      ));
    
    // Get weekly bonuses earned during this season's timeframe
    const [season] = await db.select({
      startsAt: schema.seasons.startsAt,
      endsAt: schema.seasons.endsAt,
    })
      .from(schema.seasons)
      .where(eq(schema.seasons.id, seasonId))
      .limit(1);
    
    let bonusXp = 0;
    if (season?.startsAt && season?.endsAt) {
      const [bonusResult] = await db.select({
        seasonBonus: sql<number>`COALESCE(SUM(${schema.weeklyPracticeBonus.bonusXp}), 0)`
      })
        .from(schema.weeklyPracticeBonus)
        .where(and(
          eq(schema.weeklyPracticeBonus.userId, userId),
          sql`${schema.weeklyPracticeBonus.earnedAt} BETWEEN ${season.startsAt} AND ${season.endsAt}`
        ));
      bonusXp = Number(bonusResult?.seasonBonus || 0);
    }
    
    const lessonXp = Number(seasonXpResult?.seasonXp || 0);
    const xpEarned = lessonXp + bonusXp;
    const lessonsCompleted = Number(seasonXpResult?.lessonsCompleted || 0);
    
    // Get other progress data from userSeasonProgress
    const progress = await this.getUserSeasonProgress(userId, seasonId);
    const correctPercentage = progress?.totalAnswers ? 
      Math.round((progress.correctAnswers / progress.totalAnswers) * 100) : 0;
    const isMastered = progress?.isMastered || false;

    const [existing] = await db.select().from(schema.seasonRankings)
      .where(and(
        eq(schema.seasonRankings.seasonId, seasonId),
        eq(schema.seasonRankings.userId, userId)
      ))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(schema.seasonRankings)
        .set({ xpEarned, lessonsCompleted, correctPercentage, isMastered, updatedAt: new Date() })
        .where(eq(schema.seasonRankings.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(schema.seasonRankings)
      .values({ seasonId, userId, xpEarned, lessonsCompleted, correctPercentage, isMastered })
      .returning();
    return created;
  }

  async finalizeSeasonRankings(seasonId: number): Promise<void> {
    // First check if rankings exist
    let rankings = await db.select().from(schema.seasonRankings)
      .where(eq(schema.seasonRankings.seasonId, seasonId))
      .orderBy(desc(schema.seasonRankings.xpEarned));

    // If no rankings exist, create them from user_lesson_progress data
    if (rankings.length === 0) {
      console.log(`[Season Finalize] No rankings found for season ${seasonId}, creating from lesson progress...`);
      
      // Find all distinct users who completed lessons in this season using raw SQL for DISTINCT
      const usersWithProgress = await db.execute(sql`
        SELECT DISTINCT ulp.user_id as "userId"
        FROM user_lesson_progress ulp
        INNER JOIN study_lessons sl ON ulp.lesson_id = sl.id
        WHERE sl.season_id = ${seasonId}
          AND ulp.status = 'completed'
      `);
      
      const userIds = (usersWithProgress.rows || []) as { userId: number }[];
      console.log(`[Season Finalize] Found ${userIds.length} users with completed lessons`);
      
      if (userIds.length === 0) {
        console.warn(`[Season Finalize] WARNING: No participants found for season ${seasonId} - no cards or notifications will be sent`);
        return;
      }
      
      // Create ranking entry for each user (also creates userSeasonProgress if missing)
      for (const { userId } of userIds) {
        // First ensure userSeasonProgress exists with accurate data
        await this.recalculateUserSeasonProgress(seasonId, userId);
        // Then update ranking
        await this.updateSeasonRanking(seasonId, userId);
      }
      
      // Refetch rankings after creation
      rankings = await db.select().from(schema.seasonRankings)
        .where(eq(schema.seasonRankings.seasonId, seasonId))
        .orderBy(desc(schema.seasonRankings.xpEarned));
      
      console.log(`[Season Finalize] Created ${rankings.length} ranking entries`);
    }

    // Now finalize positions
    for (let i = 0; i < rankings.length; i++) {
      await db.update(schema.seasonRankings)
        .set({ 
          rankPosition: i + 1, 
          isWinner: i === 0,
          updatedAt: new Date() 
        })
        .where(eq(schema.seasonRankings.id, rankings[i].id));
    }
  }
  
  // Recalculate user season progress from lesson data
  async recalculateUserSeasonProgress(seasonId: number, userId: number): Promise<void> {
    // Get lesson progress data for this season
    // Note: userLessonProgress only has xpEarned and mistakesCount columns
    const [progressData] = await db.select({
      lessonsCompleted: sql<number>`COUNT(*)`,
      xpEarned: sql<number>`COALESCE(SUM(${schema.userLessonProgress.xpEarned}::integer), 0)`,
      mistakesCount: sql<number>`COALESCE(SUM(${schema.userLessonProgress.mistakesCount}::integer), 0)`,
    })
      .from(schema.userLessonProgress)
      .innerJoin(schema.studyLessons, eq(schema.userLessonProgress.lessonId, schema.studyLessons.id))
      .where(and(
        eq(schema.userLessonProgress.userId, userId),
        eq(schema.studyLessons.seasonId, seasonId),
        eq(schema.userLessonProgress.status, 'completed')
      ));
    
    if (!progressData) return;
    
    const season = await this.getSeasonById(seasonId);
    
    // Update or create userSeasonProgress
    // correctAnswers/totalAnswers are not tracked at lesson level, so we set to 0
    await this.updateUserSeasonProgress(userId, seasonId, {
      lessonsCompleted: Number(progressData.lessonsCompleted) || 0,
      xpEarned: Number(progressData.xpEarned) || 0,
      correctAnswers: 0,
      totalAnswers: 0,
      heartsLost: Number(progressData.mistakesCount) || 0,
      totalLessons: season?.totalLessons || 0,
    });
  }

  // ==================== WEEKLY GOAL METHODS ====================

  async getWeeklyGoalProgress(userId: number, weekKey: string): Promise<schema.WeeklyGoalProgress | null> {
    const [progress] = await db.select().from(schema.weeklyGoalProgress)
      .where(and(
        eq(schema.weeklyGoalProgress.userId, userId),
        eq(schema.weeklyGoalProgress.weekKey, weekKey)
      ))
      .limit(1);
    return progress || null;
  }

  // OPTIMIZED: Batch fetch all weekly goal progress for a given week (avoids N+1 in scheduler)
  async getAllWeeklyGoalProgressByWeek(weekKey: string): Promise<schema.WeeklyGoalProgress[]> {
    return await db.select().from(schema.weeklyGoalProgress)
      .where(eq(schema.weeklyGoalProgress.weekKey, weekKey));
  }

  async updateWeeklyGoalProgress(userId: number, weekKey: string, data: Partial<schema.InsertWeeklyGoalProgress>): Promise<schema.WeeklyGoalProgress> {
    const existing = await this.getWeeklyGoalProgress(userId, weekKey);
    
    if (existing) {
      const [updated] = await db.update(schema.weeklyGoalProgress)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.weeklyGoalProgress.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(schema.weeklyGoalProgress)
      .values({ userId, weekKey, ...data })
      .returning();
    return created;
  }

  async getWeeklyGoalStatus(userId: number, weekKey: string): Promise<schema.WeeklyGoalStatus> {
    const profile = await this.getStudyProfile(userId);
    const progress = await this.getWeeklyGoalProgress(userId, weekKey);

    const goals = {
      lessons: {
        current: progress?.lessonsCompleted || 0,
        target: profile?.weeklyLessonsGoal || 10,
        completed: (progress?.lessonsCompleted || 0) >= (profile?.weeklyLessonsGoal || 10),
      },
      verses: {
        current: progress?.versesRead || 0,
        target: profile?.weeklyVersesGoal || 7,
        completed: (progress?.versesRead || 0) >= (profile?.weeklyVersesGoal || 7),
      },
      missions: {
        current: progress?.missionsCompleted || 0,
        target: profile?.weeklyMissionsGoal || 3,
        completed: (progress?.missionsCompleted || 0) >= (profile?.weeklyMissionsGoal || 3),
      },
      devotionals: {
        current: progress?.devotionalsRead || 0,
        target: profile?.weeklyDevotionalsGoal || 1,
        completed: (progress?.devotionalsRead || 0) >= (profile?.weeklyDevotionalsGoal || 1),
      },
    };

    const isGoalMet = goals.lessons.completed && goals.verses.completed && 
                      goals.missions.completed && goals.devotionals.completed;
    
    // Calculate overall progress as average of all goal progress percentages
    // Guard against zero targets to prevent NaN/Infinity
    const totalProgress = [goals.lessons, goals.verses, goals.missions, goals.devotionals]
      .reduce((sum, goal) => sum + Math.min(goal.current / Math.max(goal.target, 1), 1), 0);
    const overallProgress = Math.round((totalProgress / 4) * 100);
    
    // Calculate current day of the week in São Paulo timezone (1-7, starting from Sunday=1)
    const brazilDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dayOfWeek = brazilDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    // Convert to 1-7 where Sunday is day 1 of the new week
    const daysCompleted = dayOfWeek === 0 ? 1 : dayOfWeek + 1;
    
    return {
      weekKey,
      goals,
      isGoalMet,
      xpBonus: progress?.xpBonus || 0,
      overallProgress,
      daysCompleted,
      totalDays: 7,
    };
  }

  async incrementWeeklyLesson(userId: number, weekKey: string): Promise<void> {
    const progress = await this.getWeeklyGoalProgress(userId, weekKey);
    await this.updateWeeklyGoalProgress(userId, weekKey, {
      lessonsCompleted: (progress?.lessonsCompleted || 0) + 1,
    });
    await this.checkAndAwardWeeklyGoalBonus(userId, weekKey);
  }

  async incrementWeeklyVerse(userId: number, weekKey: string): Promise<void> {
    const progress = await this.getWeeklyGoalProgress(userId, weekKey);
    await this.updateWeeklyGoalProgress(userId, weekKey, {
      versesRead: (progress?.versesRead || 0) + 1,
    });
    await this.checkAndAwardWeeklyGoalBonus(userId, weekKey);
  }

  async incrementWeeklyMission(userId: number, weekKey: string): Promise<void> {
    const progress = await this.getWeeklyGoalProgress(userId, weekKey);
    await this.updateWeeklyGoalProgress(userId, weekKey, {
      missionsCompleted: (progress?.missionsCompleted || 0) + 1,
    });
    await this.checkAndAwardWeeklyGoalBonus(userId, weekKey);
  }

  async incrementWeeklyDevotional(userId: number, weekKey: string): Promise<void> {
    const progress = await this.getWeeklyGoalProgress(userId, weekKey);
    await this.updateWeeklyGoalProgress(userId, weekKey, {
      devotionalsRead: (progress?.devotionalsRead || 0) + 1,
    });
    await this.checkAndAwardWeeklyGoalBonus(userId, weekKey);
  }

  private async checkAndAwardWeeklyGoalBonus(userId: number, weekKey: string): Promise<void> {
    const status = await this.getWeeklyGoalStatus(userId, weekKey);
    const progress = await this.getWeeklyGoalProgress(userId, weekKey);
    
    if (status.isGoalMet && !progress?.isGoalMet) {
      const xpBonus = 50;
      await this.updateWeeklyGoalProgress(userId, weekKey, {
        isGoalMet: true,
        xpBonus,
      });
      
      // CRITICAL FIX: Insert into weeklyPracticeBonus (immutable, single source of truth)
      // Use ON CONFLICT to prevent duplicates - this is INSERT-ONLY
      await db.insert(schema.weeklyPracticeBonus)
        .values({
          userId,
          weekKey,
          bonusXp: xpBonus,
        })
        .onConflictDoNothing()
        .catch(err => {
          if (err.message?.includes('unique')) {
            console.log(`Weekly bonus already awarded for user ${userId}, week ${weekKey}`);
          } else {
            throw err;
          }
        });
      
      // FIXED: Use addXp to record the transaction for accurate daily XP calculation
      await this.addXp(userId, xpBonus, 'weekly_goal_bonus', undefined);
    }
  }

  // ==================== DEVOTIONAL READING METHODS ====================

  async confirmDevotionalRead(userId: number, devotionalId: number, weekKey?: string): Promise<schema.DevotionalReading> {
    const existing = await this.hasReadDevotional(userId, devotionalId);
    if (existing) {
      throw new Error("Devocional já foi confirmado como lido");
    }

    const [reading] = await db.insert(schema.devotionalReadings)
      .values({ userId, devotionalId, weekKey })
      .returning();
    
    if (weekKey) {
      await this.incrementWeeklyDevotional(userId, weekKey);
    }

    return reading;
  }

  async hasReadDevotional(userId: number, devotionalId: number): Promise<boolean> {
    const [reading] = await db.select().from(schema.devotionalReadings)
      .where(and(
        eq(schema.devotionalReadings.userId, userId),
        eq(schema.devotionalReadings.devotionalId, devotionalId)
      ))
      .limit(1);
    return !!reading;
  }

  async getDevotionalReadings(userId: number, limit: number = 10): Promise<schema.DevotionalReading[]> {
    return db.select().from(schema.devotionalReadings)
      .where(eq(schema.devotionalReadings.userId, userId))
      .orderBy(desc(schema.devotionalReadings.readAt))
      .limit(limit);
  }

  // ==================== DEVOTIONAL COMMENTS METHODS ====================

  async getApprovedDevotionalComments(devotionalId: number): Promise<DevotionalComment[]> {
    return db.select().from(schema.devotionalComments)
      .where(and(
        eq(schema.devotionalComments.devotionalId, devotionalId),
        eq(schema.devotionalComments.isApproved, true)
      ))
      .orderBy(desc(schema.devotionalComments.createdAt));
  }

  async getAllDevotionalComments(): Promise<DevotionalComment[]> {
    return db.select().from(schema.devotionalComments)
      .orderBy(desc(schema.devotionalComments.createdAt));
  }

  async createDevotionalComment(data: InsertDevotionalComment): Promise<DevotionalComment> {
    const [comment] = await db.insert(schema.devotionalComments)
      .values(data)
      .returning();
    return comment;
  }

  async approveDevotionalComment(id: number, approvedBy: number): Promise<DevotionalComment | null> {
    const [comment] = await db.update(schema.devotionalComments)
      .set({
        isApproved: true,
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.devotionalComments.id, id))
      .returning();
    return comment || null;
  }

  async autoApproveDevotionalComment(id: number): Promise<DevotionalComment | null> {
    const now = new Date();
    const [comment] = await db.update(schema.devotionalComments)
      .set({
        isApproved: true,
        approvedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.devotionalComments.id, id))
      .returning();
    return comment || null;
  }

  async highlightDevotionalComment(id: number, isHighlighted: boolean): Promise<DevotionalComment | null> {
    const [comment] = await db.update(schema.devotionalComments)
      .set({
        isHighlighted,
        updatedAt: new Date(),
      })
      .where(eq(schema.devotionalComments.id, id))
      .returning();
    return comment || null;
  }

  async deleteDevotionalComment(id: number): Promise<void> {
    await db.delete(schema.devotionalComments).where(eq(schema.devotionalComments.id, id));
  }

  // ==================== PUSH NOTIFICATION METHODS ====================

  async getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]> {
    return db.select().from(schema.pushSubscriptions)
      .where(eq(schema.pushSubscriptions.userId, userId));
  }

  // OPTIMIZED: Batch fetch push subscriptions for multiple users
  async getPushSubscriptionCountsByUserIds(userIds: number[]): Promise<Map<number, number>> {
    if (userIds.length === 0) return new Map();
    
    const subscriptions = await db.select()
      .from(schema.pushSubscriptions)
      .where(inArray(schema.pushSubscriptions.userId, userIds));
    
    const countMap = new Map<number, number>();
    for (const sub of subscriptions) {
      if (sub.userId) {
        countMap.set(sub.userId, (countMap.get(sub.userId) || 0) + 1);
      }
    }
    return countMap;
  }

  async updatePushSubscriptionLastUsed(subscriptionId: number): Promise<void> {
    await db.update(schema.pushSubscriptions)
      .set({ lastUsed: new Date() })
      .where(eq(schema.pushSubscriptions.id, subscriptionId));
  }

  async deletePushSubscription(userId: number, endpoint: string): Promise<void> {
    await db.delete(schema.pushSubscriptions)
      .where(and(
        eq(schema.pushSubscriptions.userId, userId),
        eq(schema.pushSubscriptions.endpoint, endpoint)
      ));
  }

  async getUsersBySecretaria(secretaria: string): Promise<User[]> {
    return db.select().from(schema.users)
      .where(and(
        eq(schema.users.secretaria, secretaria),
        eq(schema.users.isMember, true),
        eq(schema.users.activeMember, true)
      ));
  }

  async getAdminUsers(): Promise<User[]> {
    return db.select().from(schema.users)
      .where(eq(schema.users.isAdmin, true));
  }

  async getActiveMembers(): Promise<User[]> {
    return db.select().from(schema.users)
      .where(and(
        eq(schema.users.isMember, true),
        eq(schema.users.activeMember, true)
      ));
  }

  async createNotification(data: { userId: number; type: string; title: string; body: string; data?: string | null }): Promise<Notification> {
    const [notification] = await db.insert(schema.notifications)
      .values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data || null,
      })
      .returning();
    return notification;
  }

  async createNotificationsBatch(notifications: Array<{ userId: number; type: string; title: string; body: string; data?: string | null }>): Promise<Notification[]> {
    if (notifications.length === 0) return [];
    const created = await db.insert(schema.notifications)
      .values(notifications.map(n => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data || null,
      })))
      .returning();
    return created;
  }

  async getUsersWithActiveStreakNotStudiedToday(): Promise<{ userId: number; currentStreak: number }[]> {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const profiles = await db.select({
      userId: schema.studyProfiles.userId,
      currentStreak: schema.studyProfiles.currentStreak,
      lastActivityDate: schema.studyProfiles.lastActivityDate,
    })
    .from(schema.studyProfiles)
    .innerJoin(schema.users, eq(schema.studyProfiles.userId, schema.users.id))
    .where(and(
      gt(schema.studyProfiles.currentStreak, 0),
      eq(schema.users.isMember, true),
      eq(schema.users.activeMember, true),
      sql`${schema.studyProfiles.lastActivityDate} IS NOT NULL`,
      ne(schema.studyProfiles.lastActivityDate, today)
    ));

    return profiles.map(p => ({
      userId: p.userId,
      currentStreak: p.currentStreak
    }));
  }

  async getInactiveUsersByDays(days: number): Promise<{ userId: number; daysSinceLastActivity: number }[]> {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - days);
    
    const targetDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(targetDate);

    const profiles = await db.select({
      userId: schema.studyProfiles.userId,
      lastActivityDate: schema.studyProfiles.lastActivityDate,
    })
    .from(schema.studyProfiles)
    .innerJoin(schema.users, eq(schema.studyProfiles.userId, schema.users.id))
    .where(and(
      eq(schema.users.isMember, true),
      eq(schema.users.activeMember, true),
      sql`${schema.studyProfiles.lastActivityDate} IS NOT NULL`,
      eq(schema.studyProfiles.lastActivityDate, targetDateStr)
    ));

    return profiles.map(p => ({
      userId: p.userId,
      daysSinceLastActivity: days
    }));
  }

  // ==================== ANONYMOUS PUSH SUBSCRIPTION METHODS ====================

  async saveAnonymousPushSubscription(endpoint: string, p256dh: string, auth: string): Promise<{ id: number; isNew: boolean }> {
    console.log(`[Push Storage] Saving anonymous subscription, endpoint: ${endpoint.substring(0, 50)}...`);
    
    const [existing] = await db.select().from(schema.anonymousPushSubscriptions)
      .where(eq(schema.anonymousPushSubscriptions.endpoint, endpoint))
      .limit(1);
    
    if (existing) {
      console.log(`[Push Storage] Existing anonymous subscription found with id: ${existing.id}, updating...`);
      await db.update(schema.anonymousPushSubscriptions)
        .set({ p256dh, auth, lastUsed: new Date() })
        .where(eq(schema.anonymousPushSubscriptions.id, existing.id));
      return { id: existing.id, isNew: false };
    } else {
      console.log(`[Push Storage] No existing subscription, creating new one...`);
      const [inserted] = await db.insert(schema.anonymousPushSubscriptions).values({
        endpoint,
        p256dh,
        auth,
      }).returning({ id: schema.anonymousPushSubscriptions.id });
      console.log(`[Push Storage] New anonymous subscription created with id: ${inserted.id}`);
      return { id: inserted.id, isNew: true };
    }
  }

  async removeAnonymousPushSubscription(endpoint: string): Promise<void> {
    await db.delete(schema.anonymousPushSubscriptions)
      .where(eq(schema.anonymousPushSubscriptions.endpoint, endpoint));
  }

  async getAllAnonymousPushSubscriptions(): Promise<AnonymousPushSubscription[]> {
    return db.select().from(schema.anonymousPushSubscriptions);
  }

  async updateAnonymousPushSubscriptionLastUsed(subscriptionId: number): Promise<void> {
    await db.update(schema.anonymousPushSubscriptions)
      .set({ lastUsed: new Date() })
      .where(eq(schema.anonymousPushSubscriptions.id, subscriptionId));
  }

  async deleteAnonymousPushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    await db.delete(schema.anonymousPushSubscriptions)
      .where(eq(schema.anonymousPushSubscriptions.endpoint, endpoint));
  }

  // ==================== CRYSTAL AND STREAK FREEZE METHODS ====================

  async addCrystals(userId: number, amount: number, type: string, description?: string): Promise<number> {
    const profile = await this.getStudyProfile(userId);
    if (!profile) {
      throw new Error("Study profile not found");
    }
    
    const newBalance = profile.crystals + amount;
    
    await db.update(schema.studyProfiles)
      .set({ crystals: newBalance, updatedAt: new Date() })
      .where(eq(schema.studyProfiles.userId, userId));
    
    await db.insert(schema.crystalTransactions).values({
      userId,
      amount,
      type,
      description,
      balanceAfter: newBalance,
    });
    
    return newBalance;
  }

  async spendCrystals(userId: number, amount: number, type: string, description?: string): Promise<boolean> {
    const profile = await this.getStudyProfile(userId);
    if (!profile || profile.crystals < amount) {
      return false;
    }
    
    const newBalance = profile.crystals - amount;
    
    await db.update(schema.studyProfiles)
      .set({ crystals: newBalance, updatedAt: new Date() })
      .where(eq(schema.studyProfiles.userId, userId));
    
    await db.insert(schema.crystalTransactions).values({
      userId,
      amount: -amount,
      type,
      description,
      balanceAfter: newBalance,
    });
    
    return true;
  }

  async getCrystalBalance(userId: number): Promise<number> {
    const profile = await this.getStudyProfile(userId);
    return profile?.crystals ?? 0;
  }

  async getCrystalHistory(userId: number, limit: number = 50): Promise<any[]> {
    return db.select()
      .from(schema.crystalTransactions)
      .where(eq(schema.crystalTransactions.userId, userId))
      .orderBy(desc(schema.crystalTransactions.createdAt))
      .limit(limit);
  }

  async purchaseStreakFreeze(userId: number): Promise<{ success: boolean; cost: number; freezesAvailable: number }> {
    const profile = await this.getStudyProfile(userId);
    if (!profile) {
      return { success: false, cost: 0, freezesAvailable: 0 };
    }
    
    const baseCost = 10;
    const cost = baseCost + (profile.streakFreezesAvailable * 10);
    
    if (profile.crystals < cost) {
      return { success: false, cost, freezesAvailable: profile.streakFreezesAvailable };
    }
    
    const spent = await this.spendCrystals(userId, cost, "freeze_purchase", `Compra de congelamento de ofensiva (custo: ${cost} cristais)`);
    if (!spent) {
      return { success: false, cost, freezesAvailable: profile.streakFreezesAvailable };
    }
    
    const newFreezes = profile.streakFreezesAvailable + 1;
    await db.update(schema.studyProfiles)
      .set({ streakFreezesAvailable: newFreezes, updatedAt: new Date() })
      .where(eq(schema.studyProfiles.userId, userId));
    
    return { success: true, cost, freezesAvailable: newFreezes };
  }

  async useStreakFreeze(userId: number, streakToSave: number, automatic: boolean): Promise<boolean> {
    const profile = await this.getStudyProfile(userId);
    if (!profile || profile.streakFreezesAvailable <= 0) {
      return false;
    }
    
    await db.update(schema.studyProfiles)
      .set({ 
        streakFreezesAvailable: profile.streakFreezesAvailable - 1,
        totalStreakFreezeUsed: profile.totalStreakFreezeUsed + 1,
        streakWarningDay: 0,
        updatedAt: new Date() 
      })
      .where(eq(schema.studyProfiles.userId, userId));
    
    await db.insert(schema.streakFreezeHistory).values({
      userId,
      streakSaved: streakToSave,
      crystalsCost: 0,
      wasAutomatic: automatic,
    });
    
    return true;
  }

  async getStreakFreezeHistory(userId: number): Promise<any[]> {
    return db.select()
      .from(schema.streakFreezeHistory)
      .where(eq(schema.streakFreezeHistory.userId, userId))
      .orderBy(desc(schema.streakFreezeHistory.usedAt));
  }

  async checkAndAwardStreakMilestone(userId: number, currentStreak: number): Promise<{ milestone: any; crystalsAwarded: number; xpAwarded: number } | null> {
    const [milestone] = await db.select()
      .from(schema.streakMilestones)
      .where(eq(schema.streakMilestones.days, currentStreak))
      .limit(1);
    
    if (!milestone) {
      return null;
    }
    
    const [existing] = await db.select()
      .from(schema.userStreakMilestones)
      .where(and(
        eq(schema.userStreakMilestones.userId, userId),
        eq(schema.userStreakMilestones.milestoneId, milestone.id)
      ))
      .limit(1);
    
    if (existing) {
      return null;
    }
    
    await db.insert(schema.userStreakMilestones).values({
      userId,
      milestoneId: milestone.id,
      crystalsAwarded: milestone.crystalReward,
      xpAwarded: milestone.xpReward,
    });
    
    await this.addCrystals(userId, milestone.crystalReward, "streak_milestone", `Marco de ${milestone.days} dias de ofensiva: ${milestone.title}`);
    
    if (milestone.xpReward > 0) {
      // FIXED: Use addXp to record the transaction for accurate daily XP calculation
      await this.addXp(userId, milestone.xpReward, 'streak_milestone', milestone.id);
    }
    
    return { milestone, crystalsAwarded: milestone.crystalReward, xpAwarded: milestone.xpReward };
  }

  async getUsersNeedingStreakCheck(): Promise<{ userId: number; currentStreak: number; lastLessonCompletedAt: Date | null; streakWarningDay: number; streakFreezesAvailable: number }[]> {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const profiles = await db.select({
      userId: schema.studyProfiles.userId,
      currentStreak: schema.studyProfiles.currentStreak,
      lastActivityDate: schema.studyProfiles.lastActivityDate,
      lastLessonCompletedAt: schema.studyProfiles.lastLessonCompletedAt,
      streakWarningDay: schema.studyProfiles.streakWarningDay,
      streakFreezesAvailable: schema.studyProfiles.streakFreezesAvailable,
    })
    .from(schema.studyProfiles)
    .innerJoin(schema.users, eq(schema.studyProfiles.userId, schema.users.id))
    .where(and(
      eq(schema.users.isMember, true),
      eq(schema.users.activeMember, true),
      gt(schema.studyProfiles.currentStreak, 0),
      ne(schema.studyProfiles.lastActivityDate, today)
    ));

    return profiles.map(p => ({
      userId: p.userId,
      currentStreak: p.currentStreak,
      lastLessonCompletedAt: p.lastLessonCompletedAt,
      streakWarningDay: p.streakWarningDay,
      streakFreezesAvailable: p.streakFreezesAvailable,
    }));
  }

  async resetStreak(userId: number): Promise<void> {
    await db.update(schema.studyProfiles)
      .set({ 
        currentStreak: 0, 
        streakWarningDay: 0,
        updatedAt: new Date() 
      })
      .where(eq(schema.studyProfiles.userId, userId));
  }

  // Get streak recovery status for modal display
  async getStreakRecoveryStatus(userId: number): Promise<{
    needsRecovery: boolean;
    streakAtRisk: number;
    daysMissed: number;
    crystalCost: number;
    crystalsAvailable: number;
    canRecover: boolean;
    streakLost: boolean;
  } | null> {
    const profile = await this.getStudyProfile(userId);
    if (!profile) return null;

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // If studied today, no recovery needed
    if (profile.lastActivityDate === today) {
      return {
        needsRecovery: false,
        streakAtRisk: profile.currentStreak,
        daysMissed: 0,
        crystalCost: 0,
        crystalsAvailable: profile.crystals,
        canRecover: false,
        streakLost: false,
      };
    }

    // Calculate days missed
    // IMPORTANT: We subtract 1 because the current day is still available to study.
    // If lastActivityDate was yesterday, the user still has TODAY to complete a lesson.
    // The recovery modal should only appear if they COMPLETELY missed at least one day.
    // Day 1: complete lesson → lastActivityDate = today
    // Day 2: opens app (yesterday was Day 1) → daysMissed = 0 (still have today to study)
    // Day 3: opens app (Day 2 was completely missed) → daysMissed = 1 (missed Day 2)
    let daysMissed = 0;
    if (profile.lastActivityDate) {
      const lastDate = new Date(profile.lastActivityDate + 'T12:00:00');
      const todayDate = new Date(today + 'T12:00:00');
      const rawDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      // Subtract 1 because today is not a missed day yet - user can still study today
      daysMissed = Math.max(rawDiff - 1, 0);
    } else if (profile.currentStreak > 0) {
      // No lastActivityDate but has streak - edge case, give benefit of doubt
      daysMissed = 0;
    }

    // Progressive crystal costs: 1 day = 10, 2 = 25, 3 = 45, 4 = 70, 5+ = unrecoverable
    const crystalCosts: Record<number, number> = {
      1: 10,
      2: 25,
      3: 45,
      4: 70,
    };

    const crystalCost = crystalCosts[daysMissed] || 0;
    const canRecover = daysMissed > 0 && daysMissed <= 4 && profile.crystals >= crystalCost && profile.currentStreak > 0;
    const streakLost = daysMissed >= 5 && profile.currentStreak > 0;

    return {
      needsRecovery: daysMissed > 0 && profile.currentStreak > 0,
      streakAtRisk: profile.currentStreak,
      daysMissed,
      crystalCost,
      crystalsAvailable: profile.crystals,
      canRecover,
      streakLost,
    };
  }

  // Recover streak using crystals
  async recoverStreakWithCrystals(userId: number): Promise<{
    success: boolean;
    message: string;
    crystalsSpent?: number;
    newCrystalBalance?: number;
  }> {
    const status = await this.getStreakRecoveryStatus(userId);
    if (!status) {
      return { success: false, message: "Perfil de estudo não encontrado" };
    }

    if (!status.needsRecovery) {
      return { success: false, message: "Ofensiva não precisa de recuperação" };
    }

    if (status.streakLost) {
      return { success: false, message: "Ofensiva perdida - passou de 5 dias" };
    }

    if (!status.canRecover) {
      return { success: false, message: "Cristais insuficientes para recuperar" };
    }

    // Spend crystals
    const spent = await this.spendCrystals(
      userId, 
      status.crystalCost, 
      "streak_recovery", 
      `Recuperação de ofensiva de ${status.streakAtRisk} dias (${status.daysMissed} dia(s) perdido(s))`
    );

    if (!spent) {
      return { success: false, message: "Falha ao gastar cristais" };
    }

    // Update lastActivityDate to TODAY so the modal stops appearing
    // The streak continues because we're marking as if the user studied today
    // They still need to actually complete a lesson to increment the streak
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    await db.update(schema.studyProfiles)
      .set({ 
        lastActivityDate: today,
        streakWarningDay: 0,
        updatedAt: new Date() 
      })
      .where(eq(schema.studyProfiles.userId, userId));

    const newBalance = await this.getCrystalBalance(userId);

    return { 
      success: true, 
      message: "Ofensiva recuperada com sucesso!",
      crystalsSpent: status.crystalCost,
      newCrystalBalance: newBalance
    };
  }

  async updateStreakWarningDay(userId: number, day: number): Promise<void> {
    await db.update(schema.studyProfiles)
      .set({ streakWarningDay: day, updatedAt: new Date() })
      .where(eq(schema.studyProfiles.userId, userId));
  }

  async incrementStreak(userId: number): Promise<{ newStreak: number; isNewRecord: boolean }> {
    const profile = await this.getStudyProfile(userId);
    if (!profile) {
      throw new Error("Study profile not found");
    }
    
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
    
    // Use lastLessonDate to check if already incremented today (not lastActivityDate)
    // lastActivityDate may be set by streak recovery, but streak should only increment once per day
    // based on actual lesson completion (tracked by lastLessonDate)
    if (profile.lastLessonDate === today) {
      return { newStreak: profile.currentStreak, isNewRecord: false };
    }
    
    const newStreak = profile.currentStreak + 1;
    const isNewRecord = newStreak > profile.longestStreak;
    
    await db.update(schema.studyProfiles)
      .set({ 
        currentStreak: newStreak,
        longestStreak: isNewRecord ? newStreak : profile.longestStreak,
        lastActivityDate: today,
        lastLessonDate: today,
        lastLessonCompletedAt: new Date(),
        streakWarningDay: 0,
        updatedAt: new Date() 
      })
      .where(eq(schema.studyProfiles.userId, userId));
    
    return { newStreak, isNewRecord };
  }

  async checkAndAwardLessonCrystals(userId: number, isPerfect: boolean): Promise<{ crystalsAwarded: number; rewards: Array<{ type: string; amount: number; description: string }> }> {
    const profile = await this.getStudyProfile(userId);
    if (!profile) {
      throw new Error("Study profile not found");
    }
    
    const rewards: Array<{ type: string; amount: number; description: string }> = [];
    let totalCrystals = 0;
    
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    
    const isNewDay = profile.lastLessonDate !== today;
    const lastLessonDate = profile.lastLessonDate;
    
    const getYesterday = () => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(yesterday);
    };
    
    const yesterday = getYesterday();
    const wasStudyingYesterday = lastLessonDate === yesterday;
    const isConsecutiveDay = wasStudyingYesterday || lastLessonDate === today;
    
    let newConsecutivePerfect: number;
    let newConsecutiveLessons: number;
    let newLessonsToday: number;
    let newWeeklyStreak: number;
    
    if (isNewDay) {
      newLessonsToday = 1;
      if (wasStudyingYesterday) {
        newWeeklyStreak = (profile.weeklyLessonsStreak || 0) + 1;
        newConsecutivePerfect = isPerfect ? (profile.consecutivePerfectLessons || 0) + 1 : 0;
        newConsecutiveLessons = (profile.consecutiveLessons || 0) + 1;
      } else {
        newWeeklyStreak = 1;
        newConsecutivePerfect = isPerfect ? 1 : 0;
        newConsecutiveLessons = 1;
      }
    } else {
      newLessonsToday = (profile.totalLessonsCompletedToday || 0) + 1;
      newWeeklyStreak = profile.weeklyLessonsStreak || 1;
      newConsecutivePerfect = isPerfect ? (profile.consecutivePerfectLessons || 0) + 1 : 0;
      newConsecutiveLessons = (profile.consecutiveLessons || 0) + 1;
    }
    
    if (isPerfect) {
      await this.addCrystals(userId, 1, "perfect_lesson", "Licao perfeita! Sem erros.");
      rewards.push({ type: "perfect_lesson", amount: 1, description: "Licao perfeita! Sem erros." });
      totalCrystals += 1;
    }
    
    if (newConsecutivePerfect === 3) {
      await this.addCrystals(userId, 2, "perfect_streak_3", "Incrivel! 3 licoes perfeitas seguidas!");
      rewards.push({ type: "perfect_streak_3", amount: 2, description: "Incrivel! 3 licoes perfeitas seguidas!" });
      totalCrystals += 2;
    } else if (newConsecutivePerfect === 5) {
      await this.addCrystals(userId, 3, "perfect_streak_5", "Extraordinario! 5 licoes perfeitas seguidas!");
      rewards.push({ type: "perfect_streak_5", amount: 3, description: "Extraordinario! 5 licoes perfeitas seguidas!" });
      totalCrystals += 3;
    } else if (newConsecutivePerfect === 10) {
      await this.addCrystals(userId, 5, "perfect_streak_10", "Lendario! 10 licoes perfeitas seguidas!");
      rewards.push({ type: "perfect_streak_10", amount: 5, description: "Lendario! 10 licoes perfeitas seguidas!" });
      totalCrystals += 5;
    }
    
    if (newConsecutiveLessons === 5) {
      await this.addCrystals(userId, 2, "lesson_streak_5", "5 licoes concluidas em sequencia!");
      rewards.push({ type: "lesson_streak_5", amount: 2, description: "5 licoes concluidas em sequencia!" });
      totalCrystals += 2;
    } else if (newConsecutiveLessons === 10) {
      await this.addCrystals(userId, 4, "lesson_streak_10", "10 licoes concluidas em sequencia!");
      rewards.push({ type: "lesson_streak_10", amount: 4, description: "10 licoes concluidas em sequencia!" });
      totalCrystals += 4;
    } else if (newConsecutiveLessons === 15) {
      await this.addCrystals(userId, 8, "lesson_streak_15", "Impressionante! 15 licoes concluidas em sequencia!");
      rewards.push({ type: "lesson_streak_15", amount: 8, description: "Impressionante! 15 licoes concluidas em sequencia!" });
      totalCrystals += 8;
    }
    
    if (newWeeklyStreak === 7) {
      await this.addCrystals(userId, 10, "weekly_lessons_streak", "1 semana estudando todos os dias!");
      rewards.push({ type: "weekly_lessons_streak", amount: 10, description: "1 semana estudando todos os dias!" });
      totalCrystals += 10;
      newWeeklyStreak = 0;
    }
    
    await db.update(schema.studyProfiles)
      .set({ 
        consecutivePerfectLessons: newConsecutivePerfect,
        consecutiveLessons: newConsecutiveLessons,
        totalLessonsCompletedToday: newLessonsToday,
        lastLessonDate: today,
        weeklyLessonsStreak: newWeeklyStreak,
        updatedAt: new Date() 
      })
      .where(eq(schema.studyProfiles.userId, userId));
    
    return { crystalsAwarded: totalCrystals, rewards };
  }

  // ==================== WEEKLY PRACTICE (PRATIQUE) ====================

  async getWeeklyPractice(userId: number, weekId: number): Promise<schema.WeeklyPractice | null> {
    const [practice] = await db.select().from(schema.weeklyPractice)
      .where(and(
        eq(schema.weeklyPractice.userId, userId),
        eq(schema.weeklyPractice.weekId, weekId)
      ))
      .limit(1);
    return practice || null;
  }

  async createOrUpdateWeeklyPractice(userId: number, weekId: number, data: Partial<schema.InsertWeeklyPractice>): Promise<schema.WeeklyPractice> {
    const existing = await this.getWeeklyPractice(userId, weekId);
    
    if (existing) {
      const [updated] = await db.update(schema.weeklyPractice)
        .set({ ...data })
        .where(eq(schema.weeklyPractice.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(schema.weeklyPractice)
      .values({ userId, weekId, ...data })
      .returning();
    return created;
  }

  async getPracticeQuestions(weekId: number): Promise<schema.PracticeQuestion[]> {
    return db.select().from(schema.practiceQuestions)
      .where(eq(schema.practiceQuestions.weekId, weekId))
      .orderBy(asc(schema.practiceQuestions.orderIndex));
  }

  async createPracticeQuestion(data: schema.InsertPracticeQuestion): Promise<schema.PracticeQuestion> {
    const [question] = await db.insert(schema.practiceQuestions)
      .values(data)
      .returning();
    return question;
  }

  async deletePracticeQuestionsForWeek(weekId: number): Promise<void> {
    await db.delete(schema.practiceQuestions)
      .where(eq(schema.practiceQuestions.weekId, weekId));
  }

  async getWeeklyPracticeStatus(userId: number, weekId: number): Promise<schema.WeeklyPracticeStatus> {
    const week = await this.getStudyWeekById(weekId);
    if (!week) {
      return { weekId, isUnlocked: false, starsEarned: 0, isMastered: false, lessonsCompleted: 0, totalLessons: 0 };
    }

    const lessons = await this.getLessonsForWeek(weekId);
    const totalLessons = lessons.length;
    
    // OPTIMIZED: Single query to count completed lessons instead of N+1
    let lessonsCompleted = 0;
    if (lessons.length > 0) {
      const lessonIds = lessons.map(l => l.id);
      const completedProgress = await db.select({ lessonId: schema.userLessonProgress.lessonId })
        .from(schema.userLessonProgress)
        .where(and(
          eq(schema.userLessonProgress.userId, userId),
          inArray(schema.userLessonProgress.lessonId, lessonIds),
          eq(schema.userLessonProgress.status, 'completed')
        ));
      lessonsCompleted = completedProgress.length;
    }

    const isUnlocked = lessonsCompleted >= totalLessons && totalLessons > 0;
    const practice = await this.getWeeklyPractice(userId, weekId);

    return {
      weekId,
      isUnlocked,
      starsEarned: practice?.starsEarned || 0,
      isMastered: practice?.isMastered || false,
      lessonsCompleted,
      totalLessons,
    };
  }

  async generatePracticeQuestionsFromAI(weekId: number): Promise<schema.PracticeQuestion[]> {
    const week = await this.getStudyWeekById(weekId);
    if (!week) return [];

    const lessons = await this.getLessonsForWeek(weekId);
    
    // OPTIMIZED: Batch fetch all units for all lessons (single query instead of N+1)
    const lessonIds = lessons.map(l => l.id);
    const unitsByLesson = await this.getUnitsForMultipleLessons(lessonIds);
    
    // Collect existing questions from lessons to avoid duplicates
    const existingQuestionTexts: string[] = [];
    for (const lesson of lessons) {
      const units = unitsByLesson.get(lesson.id) || [];
      for (const unit of units) {
        if (['multiple_choice', 'true_false', 'fill_blank'].includes(unit.type)) {
          try {
            const content = typeof unit.content === 'string' ? JSON.parse(unit.content) : unit.content;
            const questionText = content.question || content.statement || '';
            if (questionText) {
              existingQuestionTexts.push(questionText);
            }
          } catch (e) {
            console.error('Error parsing unit content:', e);
          }
        }
      }
    }

    await this.deletePracticeQuestionsForWeek(weekId);

    // Import and use the new AI function to generate unique questions
    const { generateUniquePracticeQuestions, randomizeMultipleChoiceAnswer } = await import('./ai');
    
    try {
      const aiQuestions = await generateUniquePracticeQuestions(
        week.title,
        week.description || '',
        existingQuestionTexts
      );
      
      const practiceQuestions: schema.PracticeQuestion[] = [];
      
      for (let i = 0; i < aiQuestions.length && i < 10; i++) {
        const q = aiQuestions[i];
        try {
          // Randomize multiple choice answers for extra variety
          let content = q.content;
          if (q.type === 'multiple_choice') {
            content = randomizeMultipleChoiceAnswer(content);
          }
          
          const question = await this.createPracticeQuestion({
            weekId,
            type: q.type,
            content: JSON.stringify(content),
            orderIndex: i,
          });
          practiceQuestions.push(question);
        } catch (e) {
          console.error('Error creating practice question:', e);
        }
      }
      
      return practiceQuestions;
    } catch (error) {
      console.error('Error generating AI practice questions:', error);
      // Fallback: use existing questions from lessons if AI fails
      return this.generatePracticeQuestionsFromLessons(weekId, lessons);
    }
  }
  
  private async generatePracticeQuestionsFromLessons(weekId: number, lessons: schema.StudyLesson[]): Promise<schema.PracticeQuestion[]> {
    // Fallback: Generate questions from lessons with heavy randomization
    // This is used when AI is unavailable. Questions are shuffled and randomized.
    const practiceQuestions: schema.PracticeQuestion[] = [];
    const usedQuestions = new Set<string>();
    
    // OPTIMIZED: Batch fetch all units for all lessons (single query instead of N+1)
    const lessonIds = lessons.map(l => l.id);
    const unitsByLesson = await this.getUnitsForMultipleLessons(lessonIds);
    
    // Collect all question units from all lessons
    const allQuestionUnits: { unit: any; lesson: any }[] = [];
    for (const lesson of lessons) {
      const units = unitsByLesson.get(lesson.id) || [];
      for (const unit of units) {
        if (['multiple_choice', 'true_false', 'fill_blank'].includes(unit.type)) {
          allQuestionUnits.push({ unit, lesson });
        }
      }
    }
    
    // Shuffle all question units for randomization
    const shuffledUnits = [...allQuestionUnits];
    for (let i = shuffledUnits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledUnits[i], shuffledUnits[j]] = [shuffledUnits[j], shuffledUnits[i]];
    }
    
    const { randomizeMultipleChoiceAnswer } = await import('./ai');
    
    for (const { unit } of shuffledUnits) {
      if (practiceQuestions.length >= 10) break;
      
      const key = `${unit.type}-${unit.id}`;
      if (usedQuestions.has(key)) continue;
      usedQuestions.add(key);
      
      try {
        let content = typeof unit.content === 'string' ? JSON.parse(unit.content) : unit.content;
        
        // Heavily randomize multiple choice answers
        if (unit.type === 'multiple_choice') {
          content = randomizeMultipleChoiceAnswer(content);
        }
        
        const question = await this.createPracticeQuestion({
          weekId,
          type: unit.type,
          content: JSON.stringify(content),
          orderIndex: practiceQuestions.length,
        });
        practiceQuestions.push(question);
      } catch (e) {
        console.error('Error creating fallback practice question:', e);
      }
    }
    
    return practiceQuestions;
  }

  async completePractice(userId: number, weekId: number, correctAnswers: number, timeSpentSeconds: number): Promise<schema.WeeklyPractice> {
    const totalQuestions = 10;
    const timeLimit = 120;
    const completedWithinTime = timeSpentSeconds <= timeLimit;
    
    let starsEarned = 0;
    if (correctAnswers === totalQuestions && completedWithinTime) {
      starsEarned = 3;
    } else if (correctAnswers >= 8) {
      starsEarned = 2;
    } else if (correctAnswers >= 5) {
      starsEarned = 1;
    }
    
    const isMastered = starsEarned === 3;
    
    const practice = await this.createOrUpdateWeeklyPractice(userId, weekId, {
      starsEarned,
      correctAnswers,
      totalQuestions,
      timeSpentSeconds,
      completedWithinTime,
      isMastered,
      completedAt: new Date(),
    });

    if (isMastered) {
      const xpBonus = 50;
      await this.addXp(userId, xpBonus, 'weekly_practice_mastery', weekId);
    }
    
    return practice;
  }

  // ==================== MEMBER INTERACTION METHODS ====================

  async updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
    const now = new Date();
    await db.insert(schema.userOnlineStatus)
      .values({
        userId,
        isOnline,
        lastSeenAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.userOnlineStatus.userId,
        set: {
          isOnline,
          lastSeenAt: now,
          updatedAt: now,
        },
      });
  }

  async getUserOnlineStatus(userId: number): Promise<{ isOnline: boolean; lastSeenAt: Date } | null> {
    const [status] = await db.select()
      .from(schema.userOnlineStatus)
      .where(eq(schema.userOnlineStatus.userId, userId))
      .limit(1);
    
    if (!status) return null;
    
    // Consider user offline if not seen in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isOnline = status.isOnline && status.lastSeenAt > fiveMinutesAgo;
    
    return { isOnline, lastSeenAt: status.lastSeenAt };
  }

  async getOnlineUserIds(): Promise<number[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const results = await db.select({ userId: schema.userOnlineStatus.userId })
      .from(schema.userOnlineStatus)
      .where(and(
        eq(schema.userOnlineStatus.isOnline, true),
        sql`${schema.userOnlineStatus.lastSeenAt} > ${fiveMinutesAgo}`
      ));
    
    return results.map(r => r.userId);
  }

  async getPublicMemberProfile(targetUserId: number, requesterId: number): Promise<schema.PublicMemberProfile | null> {
    const [user] = await db.select({
      id: schema.users.id,
      fullName: schema.users.fullName,
      photoUrl: schema.users.photoUrl,
    })
      .from(schema.users)
      .where(and(
        eq(schema.users.id, targetUserId),
        eq(schema.users.isMember, true),
        eq(schema.users.isAdmin, false)
      ))
      .limit(1);
    
    if (!user) return null;

    const profile = await this.getStudyProfile(targetUserId);
    if (!profile) return null;

    const xpData = await this.getUserTotalXp(targetUserId);
    const stats = await this.getUserProfileStats(targetUserId);

    // Get user achievements with likes
    const userAchievements = await db.select({
      id: schema.userAchievements.achievementId,
      unlockedAt: schema.userAchievements.unlockedAt,
      name: schema.achievements.name,
      icon: schema.achievements.icon,
      category: schema.achievements.category,
      xpReward: schema.achievements.xpReward,
    })
      .from(schema.userAchievements)
      .innerJoin(schema.achievements, eq(schema.userAchievements.achievementId, schema.achievements.id))
      .where(eq(schema.userAchievements.userId, targetUserId))
      .orderBy(desc(schema.userAchievements.unlockedAt));

    // Get likes for each achievement
    const achievementsWithLikes = await Promise.all(userAchievements.map(async (a) => {
      const likesCount = await this.getAchievementLikesCount(targetUserId, a.id);
      const isLikedByMe = await this.hasLikedAchievement(requesterId, targetUserId, a.id);
      
      return {
        id: a.id,
        name: a.name,
        icon: a.icon,
        category: a.category,
        xpReward: a.xpReward,
        unlockedAt: a.unlockedAt?.toISOString() || '',
        likesCount,
        isLikedByMe,
      };
    }));

    // Get online status
    const onlineStatus = await this.getUserOnlineStatus(targetUserId);

    return {
      userId: user.id,
      username: user.fullName,
      photoUrl: user.photoUrl,
      level: profile.currentLevel,
      totalXp: xpData.totalXp,
      currentStreak: profile.currentStreak,
      rankingPosition: stats.rankingPosition,
      achievements: achievementsWithLikes,
      isOnline: onlineStatus?.isOnline || false,
      lastSeenAt: onlineStatus?.lastSeenAt?.toISOString() || null,
    };
  }

  // ==================== ACHIEVEMENT LIKE METHODS ====================

  async likeAchievement(userId: number, targetUserId: number, achievementId: number): Promise<boolean> {
    try {
      await db.insert(schema.achievementLikes)
        .values({
          userId,
          targetUserId,
          achievementId,
        })
        .onConflictDoNothing();
      return true;
    } catch (error) {
      console.error("[Achievement Like] Error:", error);
      return false;
    }
  }

  async unlikeAchievement(userId: number, targetUserId: number, achievementId: number): Promise<boolean> {
    try {
      await db.delete(schema.achievementLikes)
        .where(and(
          eq(schema.achievementLikes.userId, userId),
          eq(schema.achievementLikes.targetUserId, targetUserId),
          eq(schema.achievementLikes.achievementId, achievementId)
        ));
      return true;
    } catch (error) {
      console.error("[Achievement Unlike] Error:", error);
      return false;
    }
  }

  async getAchievementLikesCount(targetUserId: number, achievementId: number): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.achievementLikes)
      .where(and(
        eq(schema.achievementLikes.targetUserId, targetUserId),
        eq(schema.achievementLikes.achievementId, achievementId)
      ));
    
    return Number(result?.count || 0);
  }

  async hasLikedAchievement(userId: number, targetUserId: number, achievementId: number): Promise<boolean> {
    const [like] = await db.select()
      .from(schema.achievementLikes)
      .where(and(
        eq(schema.achievementLikes.userId, userId),
        eq(schema.achievementLikes.targetUserId, targetUserId),
        eq(schema.achievementLikes.achievementId, achievementId)
      ))
      .limit(1);
    
    return !!like;
  }

  // ==================== MEMBER ENCOURAGEMENT METHODS ====================

  async sendEncouragement(senderId: number, receiverId: number, messageKey: string, messageText: string): Promise<schema.MemberEncouragement> {
    const [encouragement] = await db.insert(schema.memberEncouragements)
      .values({
        senderId,
        receiverId,
        messageKey,
        messageText,
      })
      .returning();
    
    return encouragement;
  }

  async getReceivedEncouragements(userId: number, limit: number = 20): Promise<schema.MemberEncouragement[]> {
    return db.select()
      .from(schema.memberEncouragements)
      .where(eq(schema.memberEncouragements.receiverId, userId))
      .orderBy(desc(schema.memberEncouragements.createdAt))
      .limit(limit);
  }

  async sendEncouragementToAll(senderId: number, messageKey: string, messageText: string): Promise<number> {
    // Send to ALL members (including inactive)
    const members = await this.getAllMembers();
    let count = 0;
    
    for (const member of members) {
      if (member.id !== senderId) {
        await this.sendEncouragement(senderId, member.id, messageKey, messageText);
        count++;
      }
    }
    
    return count;
  }

  // ==================== STUDY EVENTS METHODS ====================

  async getAllStudyEvents(): Promise<StudyEvent[]> {
    return db.select()
      .from(schema.studyEvents)
      .orderBy(desc(schema.studyEvents.createdAt));
  }

  async getActiveStudyEvents(): Promise<StudyEvent[]> {
    // Return published, ended, and completed events for user display
    // Draft events are hidden from users until admin publishes them
    // "published" events with future dates appear as "upcoming/locked" to users
    // "completed" events are auto-ended by scheduler (cards distributed)
    // "ended" events are manually ended by admin
    return db.select()
      .from(schema.studyEvents)
      .where(
        or(
          eq(schema.studyEvents.status, "published"),
          eq(schema.studyEvents.status, "ended"),
          eq(schema.studyEvents.status, "completed")
        )
      )
      .orderBy(asc(schema.studyEvents.startDate));
  }

  async getStudyEventById(id: number): Promise<StudyEvent | null> {
    const [event] = await db.select()
      .from(schema.studyEvents)
      .where(eq(schema.studyEvents.id, id))
      .limit(1);
    return event || null;
  }

  async createStudyEvent(data: InsertStudyEvent): Promise<StudyEvent> {
    const [event] = await db.insert(schema.studyEvents)
      .values(data)
      .returning();
    return event;
  }

  async updateStudyEvent(id: number, data: Partial<InsertStudyEvent>): Promise<StudyEvent | null> {
    const [event] = await db.update(schema.studyEvents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.studyEvents.id, id))
      .returning();
    return event || null;
  }

  async deleteStudyEvent(id: number): Promise<void> {
    await db.delete(schema.studyEvents)
      .where(eq(schema.studyEvents.id, id));
  }

  // ==================== STUDY EVENT LESSONS METHODS ====================

  async getStudyEventLessons(eventId: number): Promise<StudyEventLesson[]> {
    return db.select()
      .from(schema.studyEventLessons)
      .where(eq(schema.studyEventLessons.eventId, eventId))
      .orderBy(asc(schema.studyEventLessons.dayNumber));
  }

  // OPTIMIZED: Lightweight lessons for event listing - excludes content and questions
  async getStudyEventLessonsLightweight(eventId: number): Promise<any[]> {
    return db.select({
      id: schema.studyEventLessons.id,
      eventId: schema.studyEventLessons.eventId,
      dayNumber: schema.studyEventLessons.dayNumber,
      title: schema.studyEventLessons.title,
      verseReference: schema.studyEventLessons.verseReference,
      xpReward: schema.studyEventLessons.xpReward,
      status: schema.studyEventLessons.status,
    })
      .from(schema.studyEventLessons)
      .where(eq(schema.studyEventLessons.eventId, eventId))
      .orderBy(asc(schema.studyEventLessons.dayNumber));
  }

  async getStudyEventLessonByDay(eventId: number, dayNumber: number): Promise<StudyEventLesson | null> {
    const [lesson] = await db.select()
      .from(schema.studyEventLessons)
      .where(and(
        eq(schema.studyEventLessons.eventId, eventId),
        eq(schema.studyEventLessons.dayNumber, dayNumber)
      ))
      .limit(1);
    return lesson || null;
  }

  async createStudyEventLesson(data: InsertStudyEventLesson): Promise<StudyEventLesson> {
    const [lesson] = await db.insert(schema.studyEventLessons)
      .values(data)
      .returning();
    return lesson;
  }

  async updateStudyEventLesson(id: number, data: Partial<InsertStudyEventLesson>): Promise<StudyEventLesson | null> {
    const [lesson] = await db.update(schema.studyEventLessons)
      .set(data)
      .where(eq(schema.studyEventLessons.id, id))
      .returning();
    return lesson || null;
  }

  async deleteStudyEventLesson(id: number): Promise<void> {
    await db.delete(schema.studyEventLessons)
      .where(eq(schema.studyEventLessons.id, id));
  }

  // ==================== USER EVENT PROGRESS METHODS ====================

  async getUserEventProgress(userId: number, eventId: number): Promise<UserEventProgress[]> {
    return db.select()
      .from(schema.userEventProgress)
      .where(and(
        eq(schema.userEventProgress.userId, userId),
        eq(schema.userEventProgress.eventId, eventId)
      ));
  }

  async getUserEventProgressBatch(userId: number, eventIds: number[]): Promise<Map<number, UserEventProgress[]>> {
    if (eventIds.length === 0) {
      return new Map();
    }
    const progress = await db.select()
      .from(schema.userEventProgress)
      .where(and(
        eq(schema.userEventProgress.userId, userId),
        inArray(schema.userEventProgress.eventId, eventIds)
      ));
    
    const map = new Map<number, UserEventProgress[]>();
    for (const p of progress) {
      const existing = map.get(p.eventId) || [];
      existing.push(p);
      map.set(p.eventId, existing);
    }
    return map;
  }

  async getUserEventLessonProgress(userId: number, lessonId: number): Promise<UserEventProgress | null> {
    const [progress] = await db.select()
      .from(schema.userEventProgress)
      .where(and(
        eq(schema.userEventProgress.userId, userId),
        eq(schema.userEventProgress.lessonId, lessonId)
      ))
      .limit(1);
    return progress || null;
  }

  async saveUserEventProgress(data: InsertUserEventProgress): Promise<UserEventProgress> {
    const [progress] = await db.insert(schema.userEventProgress)
      .values(data)
      .onConflictDoUpdate({
        target: [schema.userEventProgress.userId, schema.userEventProgress.lessonId],
        set: {
          completed: data.completed,
          score: data.score,
          totalQuestions: data.totalQuestions,
          correctAnswers: data.correctAnswers,
          usedHints: data.usedHints,
          xpEarned: data.xpEarned,
          completedAt: data.completedAt,
        }
      })
      .returning();
    return progress;
  }

  // ==================== STUDY EVENT PARTICIPANTS METHODS ====================

  async registerEventParticipant(userId: number, eventId: number): Promise<boolean> {
    try {
      await db.insert(schema.studyEventParticipants)
        .values({ userId, eventId })
        .onConflictDoNothing();
      return true;
    } catch (error) {
      console.error(`[Storage] Failed to register event participant:`, error);
      return false;
    }
  }

  async getEventParticipantsCount(eventId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(schema.studyEventParticipants)
      .where(eq(schema.studyEventParticipants.eventId, eventId));
    return result[0]?.count || 0;
  }

  // OPTIMIZED: Batch fetch participant counts for multiple events in one query
  async getEventParticipantsCountBatch(eventIds: number[]): Promise<Map<number, number>> {
    if (eventIds.length === 0) return new Map();
    
    const result = await db.select({
      eventId: schema.studyEventParticipants.eventId,
      count: sql<number>`count(*)`,
    })
      .from(schema.studyEventParticipants)
      .where(inArray(schema.studyEventParticipants.eventId, eventIds))
      .groupBy(schema.studyEventParticipants.eventId);
    
    return new Map(result.map(r => [r.eventId, r.count]));
  }

  async hasUserParticipatedInEvent(userId: number, eventId: number): Promise<boolean> {
    const [participant] = await db.select()
      .from(schema.studyEventParticipants)
      .where(and(
        eq(schema.studyEventParticipants.userId, userId),
        eq(schema.studyEventParticipants.eventId, eventId)
      ))
      .limit(1);
    return !!participant;
  }

  // ==================== COLLECTIBLE CARDS METHODS ====================

  async getAllCollectibleCards(): Promise<CollectibleCard[]> {
    return db.select()
      .from(schema.collectibleCards)
      .orderBy(desc(schema.collectibleCards.createdAt));
  }

  async getActiveCollectibleCards(): Promise<CollectibleCard[]> {
    return db.select()
      .from(schema.collectibleCards)
      .where(eq(schema.collectibleCards.isActive, true))
      .orderBy(asc(schema.collectibleCards.name));
  }

  async getCollectibleCardById(id: number): Promise<CollectibleCard | null> {
    const [card] = await db.select()
      .from(schema.collectibleCards)
      .where(eq(schema.collectibleCards.id, id))
      .limit(1);
    return card || null;
  }

  // OPTIMIZED: Batch fetch multiple cards by IDs
  async getCollectibleCardsByIds(ids: number[]): Promise<Map<number, CollectibleCard>> {
    if (ids.length === 0) return new Map();
    const cards = await db.select()
      .from(schema.collectibleCards)
      .where(inArray(schema.collectibleCards.id, ids));
    return new Map(cards.map(c => [c.id, c]));
  }

  // OPTIMIZED: Batch fetch multiple events by IDs
  async getStudyEventsByIds(ids: number[]): Promise<Map<number, StudyEvent>> {
    if (ids.length === 0) return new Map();
    const events = await db.select()
      .from(schema.studyEvents)
      .where(inArray(schema.studyEvents.id, ids));
    return new Map(events.map(e => [e.id, e]));
  }

  // OPTIMIZED: Batch fetch multiple users by IDs
  async getUsersByIds(ids: number[]): Promise<Map<number, User>> {
    if (ids.length === 0) return new Map();
    const users = await db.select()
      .from(schema.users)
      .where(inArray(schema.users.id, ids));
    return new Map(users.map(u => [u.id, u]));
  }

  async createCollectibleCard(data: InsertCollectibleCard): Promise<CollectibleCard> {
    const [card] = await db.insert(schema.collectibleCards)
      .values(data)
      .returning();
    return card;
  }

  async updateCollectibleCard(id: number, data: Partial<InsertCollectibleCard>): Promise<CollectibleCard | null> {
    const [card] = await db.update(schema.collectibleCards)
      .set(data)
      .where(eq(schema.collectibleCards.id, id))
      .returning();
    return card || null;
  }

  async deleteCollectibleCard(id: number): Promise<void> {
    await db.delete(schema.collectibleCards)
      .where(eq(schema.collectibleCards.id, id));
  }

  // ==================== USER CARDS METHODS ====================

  async getUserCards(userId: number): Promise<UserCard[]> {
    return db.select()
      .from(schema.userCards)
      .where(eq(schema.userCards.userId, userId))
      .orderBy(desc(schema.userCards.earnedAt));
  }

  async getUserCard(userId: number, cardId: number): Promise<UserCard | null> {
    const [card] = await db.select()
      .from(schema.userCards)
      .where(and(
        eq(schema.userCards.userId, userId),
        eq(schema.userCards.cardId, cardId)
      ))
      .limit(1);
    return card || null;
  }

  async awardUserCard(data: InsertUserCard): Promise<UserCard> {
    const [card] = await db.insert(schema.userCards)
      .values(data)
      .onConflictDoNothing()
      .returning();
    
    if (!card) {
      const existing = await this.getUserCard(data.userId, data.cardId);
      return existing!;
    }
    return card;
  }
  
  async getUsersWhoCompletedEvent(eventId: number, totalLessons: number): Promise<number[]> {
    const lessons = await this.getStudyEventLessons(eventId);
    const lessonIds = lessons.map(l => l.id);
    
    if (lessonIds.length === 0 || totalLessons === 0) return [];
    
    const progress = await db.select({
      userId: schema.userEventProgress.userId,
      completedLessons: sql<number[]>`array_agg(DISTINCT ${schema.userEventProgress.lessonId}) FILTER (WHERE ${schema.userEventProgress.completed} = true)`
    })
      .from(schema.userEventProgress)
      .where(inArray(schema.userEventProgress.lessonId, lessonIds))
      .groupBy(schema.userEventProgress.userId);
    
    return progress
      .filter(p => {
        const completedIds = p.completedLessons || [];
        return lessonIds.every(id => completedIds.includes(id));
      })
      .map(p => p.userId);
  }

  // Get users who completed ALL lessons in a season (same structure as events)
  // Performance is calculated based on correct answers across ALL lessons (like events)
  async getUsersWhoCompletedSeason(seasonId: number): Promise<{ userId: number; performance: number }[]> {
    const lessons = await this.getLessonsForSeason(seasonId);
    const lessonIds = lessons.map(l => l.id);
    
    if (lessonIds.length === 0) return [];
    
    // Get all users with their lesson progress for this season
    const lessonProgress = await db.select({
      userId: schema.userLessonProgress.userId,
      lessonId: schema.userLessonProgress.lessonId,
      status: schema.userLessonProgress.status,
    })
      .from(schema.userLessonProgress)
      .where(inArray(schema.userLessonProgress.lessonId, lessonIds));
    
    // Find users who completed ALL lessons
    const userCompletedLessons = new Map<number, Set<number>>();
    
    for (const p of lessonProgress) {
      if (p.status === 'completed') {
        if (!userCompletedLessons.has(p.userId)) {
          userCompletedLessons.set(p.userId, new Set());
        }
        userCompletedLessons.get(p.userId)!.add(p.lessonId);
      }
    }
    
    // Filter only users who completed ALL lessons
    const usersWhoCompletedAll: number[] = [];
    Array.from(userCompletedLessons.entries()).forEach(([userId, completedSet]) => {
      if (lessonIds.every(id => completedSet.has(id))) {
        usersWhoCompletedAll.push(userId);
      }
    });
    
    if (usersWhoCompletedAll.length === 0) return [];
    
    // Get all QUESTION units for these lessons (only responda stage with question types)
    // Question types are: multiple_choice, true_false, fill_blank
    const respondaTypes = ['multiple_choice', 'true_false', 'fill_blank'];
    const questionUnitIds: number[] = [];
    
    for (const lessonId of lessonIds) {
      const units = await db.select({ id: schema.studyUnits.id, type: schema.studyUnits.type, stage: schema.studyUnits.stage })
        .from(schema.studyUnits)
        .where(eq(schema.studyUnits.lessonId, lessonId));
      
      for (const unit of units) {
        const stage = unit.stage || 'estude';
        const unitType = unit.type || '';
        // Only count units that are questions (responda stage with question types)
        if (stage === 'responda' && respondaTypes.includes(unitType)) {
          questionUnitIds.push(unit.id);
        }
      }
    }
    
    console.log(`[Season Performance] Found ${questionUnitIds.length} question units for ${lessonIds.length} lessons`);
    
    if (questionUnitIds.length === 0) {
      // No question units means 100% for everyone who completed all lessons
      console.log(`[Season Performance] No questions found, returning 100% for all ${usersWhoCompletedAll.length} users`);
      return usersWhoCompletedAll.map(userId => ({ userId, performance: 100 }));
    }
    
    // Get unit progress (correct/incorrect answers) for all users who completed all lessons
    const unitProgress = await db.select({
      userId: schema.userUnitProgress.userId,
      unitId: schema.userUnitProgress.unitId,
      isCorrect: schema.userUnitProgress.isCorrect,
      isCompleted: schema.userUnitProgress.isCompleted,
    })
      .from(schema.userUnitProgress)
      .where(
        and(
          inArray(schema.userUnitProgress.unitId, questionUnitIds),
          inArray(schema.userUnitProgress.userId, usersWhoCompletedAll)
        )
      );
    
    // Calculate performance: (correct answers / total questions) * 100
    const userPerformance = new Map<number, { correct: number; total: number }>();
    
    // Initialize with 0 correct for all users, total = number of question units
    for (const userId of usersWhoCompletedAll) {
      userPerformance.set(userId, { correct: 0, total: questionUnitIds.length });
    }
    
    // Count correct answers per user
    for (const up of unitProgress) {
      const perf = userPerformance.get(up.userId);
      if (perf && up.isCompleted && up.isCorrect === true) {
        perf.correct++;
      }
    }
    
    // Build result with performance percentage
    const result: { userId: number; performance: number }[] = [];
    Array.from(userPerformance.entries()).forEach(([userId, data]) => {
      const performance = data.total > 0 ? (data.correct / data.total) * 100 : 0;
      console.log(`[Season Performance] User ${userId}: ${data.correct}/${data.total} = ${performance.toFixed(1)}%`);
      result.push({ userId, performance });
    });
    
    return result;
  }

  // ==================== SHOP CATEGORIES METHODS ====================

  async getShopCategories(): Promise<ShopCategory[]> {
    return db.select()
      .from(schema.shopCategories)
      .orderBy(asc(schema.shopCategories.name));
  }

  async getShopCategoriesLight(): Promise<Omit<ShopCategory, 'imageData'>[]> {
    return db.select({
      id: schema.shopCategories.id,
      name: schema.shopCategories.name,
      isDefault: schema.shopCategories.isDefault,
      createdAt: schema.shopCategories.createdAt,
    })
      .from(schema.shopCategories)
      .orderBy(asc(schema.shopCategories.name));
  }

  async getShopCategoriesWithImageCheck(ids: number[]): Promise<Map<number, boolean>> {
    if (ids.length === 0) return new Map();
    const results = await db.select({
      id: schema.shopCategories.id,
      hasImage: sql<boolean>`${schema.shopCategories.imageData} IS NOT NULL`,
    })
      .from(schema.shopCategories)
      .where(inArray(schema.shopCategories.id, ids));
    return new Map(results.map(r => [r.id, r.hasImage]));
  }

  async getShopCategoryImageData(id: number): Promise<string | null> {
    const [result] = await db.select({ imageData: schema.shopCategories.imageData })
      .from(schema.shopCategories)
      .where(eq(schema.shopCategories.id, id))
      .limit(1);
    return result?.imageData || null;
  }

  async getShopCategoryById(id: number): Promise<ShopCategory | null> {
    const [category] = await db.select()
      .from(schema.shopCategories)
      .where(eq(schema.shopCategories.id, id))
      .limit(1);
    return category || null;
  }

  async createShopCategory(data: InsertShopCategory): Promise<ShopCategory> {
    const [category] = await db.insert(schema.shopCategories)
      .values(data)
      .returning();
    return category;
  }

  async updateShopCategory(id: number, data: Partial<InsertShopCategory>): Promise<ShopCategory | null> {
    const [category] = await db.update(schema.shopCategories)
      .set(data)
      .where(eq(schema.shopCategories.id, id))
      .returning();
    return category || null;
  }

  async deleteShopCategory(id: number): Promise<void> {
    await db.delete(schema.shopCategories)
      .where(eq(schema.shopCategories.id, id));
  }

  // ==================== SHOP ITEMS METHODS ====================

  async getShopItems(onlyAvailable: boolean = false): Promise<ShopItem[]> {
    if (onlyAvailable) {
      return db.select()
        .from(schema.shopItems)
        .where(eq(schema.shopItems.isAvailable, true))
        .orderBy(desc(schema.shopItems.createdAt));
    }
    return db.select()
      .from(schema.shopItems)
      .orderBy(desc(schema.shopItems.createdAt));
  }

  async getShopItemById(id: number): Promise<ShopItem | null> {
    const [item] = await db.select()
      .from(schema.shopItems)
      .where(eq(schema.shopItems.id, id))
      .limit(1);
    return item || null;
  }

  async getShopItemsByIds(ids: number[]): Promise<ShopItem[]> {
    if (ids.length === 0) return [];
    return db.select()
      .from(schema.shopItems)
      .where(inArray(schema.shopItems.id, ids));
  }

  async getShopItemsLight(onlyAvailable: boolean = false): Promise<Omit<ShopItem, 'bannerImageData'>[]> {
    const query = db.select({
      id: schema.shopItems.id,
      name: schema.shopItems.name,
      description: schema.shopItems.description,
      price: schema.shopItems.price,
      categoryId: schema.shopItems.categoryId,
      genderType: schema.shopItems.genderType,
      hasSize: schema.shopItems.hasSize,
      isAvailable: schema.shopItems.isAvailable,
      isPreOrder: schema.shopItems.isPreOrder,
      isFeatured: schema.shopItems.isFeatured,
      featuredOrder: schema.shopItems.featuredOrder,
      allowInstallments: schema.shopItems.allowInstallments,
      maxInstallments: schema.shopItems.maxInstallments,
      isPublished: schema.shopItems.isPublished,
      stockQuantity: schema.shopItems.stockQuantity,
      createdAt: schema.shopItems.createdAt,
      updatedAt: schema.shopItems.updatedAt,
    }).from(schema.shopItems);
    
    if (onlyAvailable) {
      return query.where(eq(schema.shopItems.isAvailable, true))
        .orderBy(desc(schema.shopItems.createdAt));
    }
    return query.orderBy(desc(schema.shopItems.createdAt));
  }

  async getShopItemsByIdsLight(ids: number[]): Promise<Pick<ShopItem, 'id' | 'name' | 'price'>[]> {
    if (ids.length === 0) return [];
    return db.select({
      id: schema.shopItems.id,
      name: schema.shopItems.name,
      price: schema.shopItems.price,
    }).from(schema.shopItems)
      .where(inArray(schema.shopItems.id, ids));
  }

  async getShopItemBannerImage(id: number): Promise<string | null> {
    const [item] = await db.select({ bannerImageData: schema.shopItems.bannerImageData })
      .from(schema.shopItems)
      .where(eq(schema.shopItems.id, id))
      .limit(1);
    return item?.bannerImageData || null;
  }

  async getShopItemsWithBannerCheck(ids: number[]): Promise<{ id: number; hasBanner: boolean }[]> {
    if (ids.length === 0) return [];
    const items = await db.select({
      id: schema.shopItems.id,
      hasBanner: sql<boolean>`${schema.shopItems.bannerImageData} IS NOT NULL`,
    })
      .from(schema.shopItems)
      .where(inArray(schema.shopItems.id, ids));
    return items;
  }

  async getShopItemBannerUrls(ids: number[]): Promise<Map<number, string>> {
    if (ids.length === 0) return new Map();
    const items = await db.select({
      id: schema.shopItems.id,
      bannerImageData: schema.shopItems.bannerImageData,
    })
      .from(schema.shopItems)
      .where(inArray(schema.shopItems.id, ids));
    const map = new Map<number, string>();
    for (const item of items) {
      if (item.bannerImageData) {
        map.set(item.id, item.bannerImageData);
      }
    }
    return map;
  }

  async getShopItemImageData(imageId: number): Promise<string | null> {
    const [image] = await db.select({ imageData: schema.shopItemImages.imageData })
      .from(schema.shopItemImages)
      .where(eq(schema.shopItemImages.id, imageId))
      .limit(1);
    return image?.imageData || null;
  }

  async createShopItem(data: InsertShopItem): Promise<ShopItem> {
    const [item] = await db.insert(schema.shopItems)
      .values(data)
      .returning();
    return item;
  }

  async updateShopItem(id: number, data: Partial<InsertShopItem>): Promise<ShopItem | null> {
    const [item] = await db.update(schema.shopItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.shopItems.id, id))
      .returning();
    return item || null;
  }

  async deleteShopItem(id: number): Promise<void> {
    await db.delete(schema.shopItems)
      .where(eq(schema.shopItems.id, id));
  }

  async deductStockQuantity(itemId: number, quantity: number): Promise<{ success: boolean; newQuantity: number | null }> {
    const item = await this.getShopItemById(itemId);
    if (!item) return { success: false, newQuantity: null };
    
    // If stockQuantity is null, no stock control - just return success
    if (item.stockQuantity === null) {
      return { success: true, newQuantity: null };
    }
    
    const newQuantity = Math.max(0, item.stockQuantity - quantity);
    
    // Update stock and mark as unavailable if quantity reaches 0
    await db.update(schema.shopItems)
      .set({
        stockQuantity: newQuantity,
        isAvailable: newQuantity > 0,
        updatedAt: new Date(),
      })
      .where(eq(schema.shopItems.id, itemId));
    
    return { success: true, newQuantity };
  }

  // ==================== SHOP ITEM IMAGES METHODS ====================

  async getShopItemImages(itemId: number): Promise<ShopItemImage[]> {
    return db.select()
      .from(schema.shopItemImages)
      .where(eq(schema.shopItemImages.itemId, itemId))
      .orderBy(asc(schema.shopItemImages.sortOrder));
  }

  async getShopItemImagesByItemIds(itemIds: number[]): Promise<Map<number, ShopItemImage[]>> {
    if (itemIds.length === 0) return new Map();
    const images = await db.select()
      .from(schema.shopItemImages)
      .where(inArray(schema.shopItemImages.itemId, itemIds))
      .orderBy(asc(schema.shopItemImages.sortOrder));
    const map = new Map<number, ShopItemImage[]>();
    for (const img of images) {
      if (!map.has(img.itemId)) map.set(img.itemId, []);
      map.get(img.itemId)!.push(img);
    }
    return map;
  }

  async getShopItemImagesLight(itemId: number): Promise<Omit<ShopItemImage, 'imageData'>[]> {
    return db.select({
      id: schema.shopItemImages.id,
      itemId: schema.shopItemImages.itemId,
      gender: schema.shopItemImages.gender,
      sortOrder: schema.shopItemImages.sortOrder,
    }).from(schema.shopItemImages)
      .where(eq(schema.shopItemImages.itemId, itemId))
      .orderBy(asc(schema.shopItemImages.sortOrder));
  }

  async getShopItemImagesByItemIdsLight(itemIds: number[]): Promise<Map<number, Omit<ShopItemImage, 'imageData'>[]>> {
    if (itemIds.length === 0) return new Map();
    const images = await db.select({
      id: schema.shopItemImages.id,
      itemId: schema.shopItemImages.itemId,
      gender: schema.shopItemImages.gender,
      sortOrder: schema.shopItemImages.sortOrder,
    }).from(schema.shopItemImages)
      .where(inArray(schema.shopItemImages.itemId, itemIds))
      .orderBy(asc(schema.shopItemImages.sortOrder));
    const map = new Map<number, Omit<ShopItemImage, 'imageData'>[]>();
    for (const img of images) {
      if (!map.has(img.itemId)) map.set(img.itemId, []);
      map.get(img.itemId)!.push(img);
    }
    return map;
  }

  async getShopItemImageUrls(itemIds: number[]): Promise<Map<number, { id: number; imageData: string; sortOrder: number }[]>> {
    if (itemIds.length === 0) return new Map();
    const images = await db.select({
      id: schema.shopItemImages.id,
      itemId: schema.shopItemImages.itemId,
      imageData: schema.shopItemImages.imageData,
      sortOrder: schema.shopItemImages.sortOrder,
    }).from(schema.shopItemImages)
      .where(inArray(schema.shopItemImages.itemId, itemIds))
      .orderBy(asc(schema.shopItemImages.sortOrder));
    const map = new Map<number, { id: number; imageData: string; sortOrder: number }[]>();
    for (const img of images) {
      if (!map.has(img.itemId)) map.set(img.itemId, []);
      map.get(img.itemId)!.push({ id: img.id, imageData: img.imageData, sortOrder: img.sortOrder });
    }
    return map;
  }

  async getShopCategoryImageUrls(ids: number[]): Promise<Map<number, string>> {
    if (ids.length === 0) return new Map();
    const cats = await db.select({
      id: schema.shopCategories.id,
      imageData: schema.shopCategories.imageData,
    })
      .from(schema.shopCategories)
      .where(inArray(schema.shopCategories.id, ids));
    const map = new Map<number, string>();
    for (const cat of cats) {
      if (cat.imageData) {
        map.set(cat.id, cat.imageData);
      }
    }
    return map;
  }

  async createShopItemImage(data: InsertShopItemImage): Promise<ShopItemImage> {
    const [image] = await db.insert(schema.shopItemImages)
      .values(data)
      .returning();
    return image;
  }

  async updateShopItemImage(id: number, data: Partial<InsertShopItemImage>): Promise<ShopItemImage | null> {
    const [image] = await db.update(schema.shopItemImages)
      .set(data)
      .where(eq(schema.shopItemImages.id, id))
      .returning();
    return image || null;
  }

  async deleteShopItemImage(id: number): Promise<void> {
    await db.delete(schema.shopItemImages)
      .where(eq(schema.shopItemImages.id, id));
  }

  async reorderShopItemImages(itemId: number, imageIds: number[]): Promise<void> {
    // Get all images for this item ordered by current sort order
    const allImages = await db.select()
      .from(schema.shopItemImages)
      .where(eq(schema.shopItemImages.itemId, itemId))
      .orderBy(asc(schema.shopItemImages.sortOrder));
    
    if (allImages.length === 0) return;
    
    // Get the gender of the images being reordered
    const targetImagesSet = new Set(imageIds);
    const targetGender = allImages.find(img => targetImagesSet.has(img.id))?.gender;
    if (!targetGender) return;
    
    // Get all target gender images (including any that might not be in imageIds)
    const targetGenderImages = allImages.filter(img => img.gender === targetGender);
    const targetGenderIdsInPayload = new Set(imageIds);
    
    // Add any missing target gender images to the end (in case of incomplete payload)
    const completeTargetGenderOrder = [...imageIds];
    for (const img of targetGenderImages) {
      if (!targetGenderIdsInPayload.has(img.id)) {
        completeTargetGenderOrder.push(img.id);
      }
    }
    
    // Build final order by substituting target gender images in-place
    const finalOrder: number[] = [];
    let targetGenderIndex = 0;
    
    for (const img of allImages) {
      if (img.gender === targetGender) {
        // Replace with the image from the reordered list
        finalOrder.push(completeTargetGenderOrder[targetGenderIndex]);
        targetGenderIndex++;
      } else {
        // Non-target gender images stay in their exact original position
        finalOrder.push(img.id);
      }
    }
    
    // Update all images with their new sort order
    for (let i = 0; i < finalOrder.length; i++) {
      await db.update(schema.shopItemImages)
        .set({ sortOrder: i })
        .where(eq(schema.shopItemImages.id, finalOrder[i]));
    }
  }

  // ==================== SHOP ITEM SIZES METHODS ====================

  async getShopItemSizes(itemId: number): Promise<ShopItemSize[]> {
    return db.select()
      .from(schema.shopItemSizes)
      .where(eq(schema.shopItemSizes.itemId, itemId))
      .orderBy(asc(schema.shopItemSizes.sortOrder));
  }

  async getShopItemSizesByItemIds(itemIds: number[]): Promise<Map<number, ShopItemSize[]>> {
    if (itemIds.length === 0) return new Map();
    const sizes = await db.select()
      .from(schema.shopItemSizes)
      .where(inArray(schema.shopItemSizes.itemId, itemIds))
      .orderBy(asc(schema.shopItemSizes.sortOrder));
    const map = new Map<number, ShopItemSize[]>();
    for (const size of sizes) {
      if (!map.has(size.itemId)) map.set(size.itemId, []);
      map.get(size.itemId)!.push(size);
    }
    return map;
  }

  async createShopItemSize(data: InsertShopItemSize): Promise<ShopItemSize> {
    const [size] = await db.insert(schema.shopItemSizes)
      .values(data)
      .returning();
    return size;
  }

  async deleteShopItemSize(id: number): Promise<void> {
    await db.delete(schema.shopItemSizes)
      .where(eq(schema.shopItemSizes.id, id));
  }

  async deleteShopItemSizesByItem(itemId: number): Promise<void> {
    await db.delete(schema.shopItemSizes)
      .where(eq(schema.shopItemSizes.itemId, itemId));
  }

  // ==================== SHOP ITEM SIZE CHARTS METHODS ====================

  async getShopItemSizeCharts(itemId: number): Promise<ShopItemSizeChart[]> {
    return db.select()
      .from(schema.shopItemSizeCharts)
      .where(eq(schema.shopItemSizeCharts.itemId, itemId));
  }

  async getShopItemSizeChartsByItemIds(itemIds: number[]): Promise<Map<number, ShopItemSizeChart[]>> {
    if (itemIds.length === 0) return new Map();
    const charts = await db.select()
      .from(schema.shopItemSizeCharts)
      .where(inArray(schema.shopItemSizeCharts.itemId, itemIds));
    const map = new Map<number, ShopItemSizeChart[]>();
    for (const chart of charts) {
      if (!map.has(chart.itemId)) map.set(chart.itemId, []);
      map.get(chart.itemId)!.push(chart);
    }
    return map;
  }

  async upsertShopItemSizeChart(
    itemId: number, 
    gender: string, 
    size: string, 
    dimensions: { width?: number | null; length?: number | null; sleeve?: number | null; shoulder?: number | null }
  ): Promise<ShopItemSizeChart> {
    const existing = await db.select()
      .from(schema.shopItemSizeCharts)
      .where(and(
        eq(schema.shopItemSizeCharts.itemId, itemId),
        eq(schema.shopItemSizeCharts.gender, gender),
        eq(schema.shopItemSizeCharts.size, size)
      ));
    
    if (existing.length > 0) {
      const [chart] = await db.update(schema.shopItemSizeCharts)
        .set({
          width: dimensions.width,
          length: dimensions.length,
          sleeve: dimensions.sleeve,
          shoulder: dimensions.shoulder,
        })
        .where(eq(schema.shopItemSizeCharts.id, existing[0].id))
        .returning();
      return chart;
    } else {
      const [chart] = await db.insert(schema.shopItemSizeCharts)
        .values({
          itemId,
          gender,
          size,
          width: dimensions.width,
          length: dimensions.length,
          sleeve: dimensions.sleeve,
          shoulder: dimensions.shoulder,
        })
        .returning();
      return chart;
    }
  }

  // ==================== SHOP CART METHODS ====================

  async getCartItems(userId: number): Promise<ShopCartItem[]> {
    return db.select()
      .from(schema.shopCartItems)
      .where(eq(schema.shopCartItems.userId, userId))
      .orderBy(desc(schema.shopCartItems.addedAt));
  }

  async addToCart(data: InsertShopCartItem): Promise<ShopCartItem> {
    const [cartItem] = await db.insert(schema.shopCartItems)
      .values(data)
      .returning();
    return cartItem;
  }

  async updateCartItem(id: number, quantity: number): Promise<ShopCartItem | null> {
    const [cartItem] = await db.update(schema.shopCartItems)
      .set({ quantity })
      .where(eq(schema.shopCartItems.id, id))
      .returning();
    return cartItem || null;
  }

  async removeFromCart(id: number): Promise<void> {
    await db.delete(schema.shopCartItems)
      .where(eq(schema.shopCartItems.id, id));
  }

  async clearCart(userId: number): Promise<void> {
    await db.delete(schema.shopCartItems)
      .where(eq(schema.shopCartItems.userId, userId));
  }

  // ==================== SHOP ORDERS METHODS ====================

  async getShopOrders(filters?: { userId?: number; status?: string }): Promise<ShopOrder[]> {
    let query = db.select().from(schema.shopOrders);
    
    if (filters?.userId && filters?.status) {
      return db.select()
        .from(schema.shopOrders)
        .where(and(
          eq(schema.shopOrders.userId, filters.userId),
          eq(schema.shopOrders.orderStatus, filters.status)
        ))
        .orderBy(desc(schema.shopOrders.createdAt));
    } else if (filters?.userId) {
      return db.select()
        .from(schema.shopOrders)
        .where(eq(schema.shopOrders.userId, filters.userId))
        .orderBy(desc(schema.shopOrders.createdAt));
    } else if (filters?.status) {
      return db.select()
        .from(schema.shopOrders)
        .where(eq(schema.shopOrders.orderStatus, filters.status))
        .orderBy(desc(schema.shopOrders.createdAt));
    }
    
    return db.select()
      .from(schema.shopOrders)
      .orderBy(desc(schema.shopOrders.createdAt));
  }

  async getShopOrderById(id: number): Promise<ShopOrder | null> {
    const [order] = await db.select()
      .from(schema.shopOrders)
      .where(eq(schema.shopOrders.id, id))
      .limit(1);
    return order || null;
  }

  async getShopOrderByCode(code: string): Promise<ShopOrder | null> {
    const [order] = await db.select()
      .from(schema.shopOrders)
      .where(eq(schema.shopOrders.orderCode, code))
      .limit(1);
    return order || null;
  }

  async createShopOrder(data: InsertShopOrder): Promise<ShopOrder> {
    const [order] = await db.insert(schema.shopOrders)
      .values(data)
      .returning();
    return order;
  }

  async updateShopOrder(id: number, data: Partial<InsertShopOrder>): Promise<ShopOrder | null> {
    const [order] = await db.update(schema.shopOrders)
      .set(data)
      .where(eq(schema.shopOrders.id, id))
      .returning();
    return order || null;
  }

  // ==================== SHOP ORDER ITEMS METHODS ====================

  async getShopOrderItems(orderId: number): Promise<ShopOrderItem[]> {
    return db.select()
      .from(schema.shopOrderItems)
      .where(eq(schema.shopOrderItems.orderId, orderId));
  }

  async getShopOrderItemsByOrderIds(orderIds: number[]): Promise<Map<number, ShopOrderItem[]>> {
    if (orderIds.length === 0) return new Map();
    const items = await db.select()
      .from(schema.shopOrderItems)
      .where(inArray(schema.shopOrderItems.orderId, orderIds));
    const map = new Map<number, ShopOrderItem[]>();
    for (const item of items) {
      if (!map.has(item.orderId)) map.set(item.orderId, []);
      map.get(item.orderId)!.push(item);
    }
    return map;
  }

  async createShopOrderItem(data: InsertShopOrderItem): Promise<ShopOrderItem> {
    const [item] = await db.insert(schema.shopOrderItems)
      .values(data)
      .returning();
    return item;
  }

  async createShopOrderItemsBatch(items: InsertShopOrderItem[]): Promise<ShopOrderItem[]> {
    if (items.length === 0) return [];
    const created = await db.insert(schema.shopOrderItems)
      .values(items)
      .returning();
    return created;
  }

  // ==================== SHOP INSTALLMENTS METHODS ====================

  async getShopInstallments(orderId: number): Promise<ShopInstallment[]> {
    return db.select()
      .from(schema.shopInstallments)
      .where(eq(schema.shopInstallments.orderId, orderId))
      .orderBy(asc(schema.shopInstallments.installmentNumber));
  }

  async getShopInstallmentsByOrderId(orderId: number): Promise<ShopInstallment[]> {
    return this.getShopInstallments(orderId);
  }

  async getShopInstallmentsByOrderIds(orderIds: number[]): Promise<Map<number, ShopInstallment[]>> {
    if (orderIds.length === 0) return new Map();
    const installments = await db.select()
      .from(schema.shopInstallments)
      .where(inArray(schema.shopInstallments.orderId, orderIds))
      .orderBy(asc(schema.shopInstallments.installmentNumber));
    const map = new Map<number, ShopInstallment[]>();
    for (const inst of installments) {
      if (!map.has(inst.orderId)) map.set(inst.orderId, []);
      map.get(inst.orderId)!.push(inst);
    }
    return map;
  }

  async getShopInstallmentById(id: number): Promise<ShopInstallment | null> {
    const [installment] = await db.select()
      .from(schema.shopInstallments)
      .where(eq(schema.shopInstallments.id, id))
      .limit(1);
    return installment || null;
  }

  async getShopInstallmentByPixId(pixId: string): Promise<ShopInstallment | null> {
    const [installment] = await db.select()
      .from(schema.shopInstallments)
      .where(eq(schema.shopInstallments.paymentId, pixId))
      .limit(1);
    return installment || null;
  }

  async getShopInstallmentsDueSoon(daysAhead: number): Promise<ShopInstallment[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return db.select()
      .from(schema.shopInstallments)
      .where(
        and(
          eq(schema.shopInstallments.status, "pending"),
          gte(schema.shopInstallments.dueDate, now),
          lte(schema.shopInstallments.dueDate, futureDate)
        )
      )
      .orderBy(asc(schema.shopInstallments.dueDate));
  }

  async createShopInstallment(data: InsertShopInstallment): Promise<ShopInstallment> {
    const [installment] = await db.insert(schema.shopInstallments)
      .values(data)
      .returning();
    return installment;
  }

  async createShopInstallmentsBatch(installments: InsertShopInstallment[]): Promise<ShopInstallment[]> {
    if (installments.length === 0) return [];
    const created = await db.insert(schema.shopInstallments)
      .values(installments)
      .returning();
    return created;
  }

  async updateShopInstallment(id: number, data: Partial<InsertShopInstallment>): Promise<ShopInstallment | null> {
    const [installment] = await db.update(schema.shopInstallments)
      .set(data)
      .where(eq(schema.shopInstallments.id, id))
      .returning();
    return installment || null;
  }

  // ==================== TREASURY SETTINGS METHODS ====================

  async getTreasurySettings(year: number): Promise<TreasurySettings | null> {
    const [settings] = await db.select()
      .from(schema.treasurySettings)
      .where(eq(schema.treasurySettings.year, year))
      .limit(1);
    return settings || null;
  }

  async createTreasurySettings(data: InsertTreasurySettings): Promise<TreasurySettings> {
    const [settings] = await db.insert(schema.treasurySettings)
      .values(data)
      .returning();
    return settings;
  }

  async updateTreasurySettings(id: number, data: Partial<InsertTreasurySettings>): Promise<TreasurySettings | null> {
    const [settings] = await db.update(schema.treasurySettings)
      .set(data)
      .where(eq(schema.treasurySettings.id, id))
      .returning();
    return settings || null;
  }

  // ==================== TREASURY ENTRIES METHODS ====================

  async getTreasuryEntries(filters?: { 
    type?: string; 
    userId?: number; 
    year?: number;
    status?: string;
  }): Promise<TreasuryEntry[]> {
    let conditions = [];
    
    if (filters?.type) {
      conditions.push(eq(schema.treasuryEntries.type, filters.type as any));
    }
    if (filters?.userId) {
      conditions.push(eq(schema.treasuryEntries.userId, filters.userId));
    }
    if (filters?.year) {
      conditions.push(eq(schema.treasuryEntries.referenceYear, filters.year));
    }
    if (filters?.status) {
      conditions.push(eq(schema.treasuryEntries.paymentStatus, filters.status as any));
    }
    
    if (conditions.length > 0) {
      return db.select()
        .from(schema.treasuryEntries)
        .where(and(...conditions))
        .orderBy(desc(schema.treasuryEntries.createdAt));
    }
    
    return db.select()
      .from(schema.treasuryEntries)
      .orderBy(desc(schema.treasuryEntries.createdAt));
  }

  async getTreasuryEntryById(id: number): Promise<TreasuryEntry | null> {
    const [entry] = await db.select()
      .from(schema.treasuryEntries)
      .where(eq(schema.treasuryEntries.id, id))
      .limit(1);
    return entry || null;
  }

  async getTreasuryEntryByPixId(pixTransactionId: string): Promise<TreasuryEntry | null> {
    const [entry] = await db.select()
      .from(schema.treasuryEntries)
      .where(eq(schema.treasuryEntries.pixTransactionId, pixTransactionId))
      .limit(1);
    return entry || null;
  }

  async getTreasuryEntriesByUserAndCategory(userId: number, category: string, year?: number): Promise<TreasuryEntry[]> {
    const conditions = [
      eq(schema.treasuryEntries.userId, userId),
      eq(schema.treasuryEntries.category, category as any),
    ];
    if (year) {
      conditions.push(eq(schema.treasuryEntries.referenceYear, year));
    }
    return db.select()
      .from(schema.treasuryEntries)
      .where(and(...conditions))
      .orderBy(desc(schema.treasuryEntries.createdAt));
  }

  async createTreasuryEntry(data: InsertTreasuryEntry): Promise<TreasuryEntry> {
    const [entry] = await db.insert(schema.treasuryEntries)
      .values(data)
      .returning();
    return entry;
  }

  // Treasury receipt storage (for comprovantes)
  async createTreasuryReceipt(data: { id: string; mimeType: string; data: string }): Promise<void> {
    await db.insert(schema.treasuryReceipts)
      .values(data)
      .onConflictDoNothing();
  }

  async getTreasuryReceipt(id: string): Promise<{ mimeType: string; data: string } | null> {
    const [receipt] = await db.select({ mimeType: schema.treasuryReceipts.mimeType, data: schema.treasuryReceipts.data })
      .from(schema.treasuryReceipts)
      .where(eq(schema.treasuryReceipts.id, id));
    return receipt || null;
  }

  async updateTreasuryEntry(id: number, data: Partial<InsertTreasuryEntry>): Promise<TreasuryEntry | null> {
    const [entry] = await db.update(schema.treasuryEntries)
      .set(data)
      .where(eq(schema.treasuryEntries.id, id))
      .returning();
    return entry || null;
  }

  // ==================== TREASURY LOANS METHODS ====================

  async getTreasuryLoans(): Promise<TreasuryLoan[]> {
    return db.select()
      .from(schema.treasuryLoans)
      .orderBy(desc(schema.treasuryLoans.createdAt));
  }

  async getTreasuryLoanById(id: number): Promise<TreasuryLoan | null> {
    const [loan] = await db.select()
      .from(schema.treasuryLoans)
      .where(eq(schema.treasuryLoans.id, id))
      .limit(1);
    return loan || null;
  }

  async createTreasuryLoan(data: InsertTreasuryLoan): Promise<TreasuryLoan> {
    const [loan] = await db.insert(schema.treasuryLoans)
      .values(data)
      .returning();
    return loan;
  }

  async updateTreasuryLoan(id: number, data: Partial<InsertTreasuryLoan>): Promise<TreasuryLoan | null> {
    const [loan] = await db.update(schema.treasuryLoans)
      .set(data)
      .where(eq(schema.treasuryLoans.id, id))
      .returning();
    return loan || null;
  }

  // ==================== TREASURY LOAN INSTALLMENTS METHODS ====================

  async getTreasuryLoanInstallments(loanId: number): Promise<TreasuryLoanInstallment[]> {
    return db.select()
      .from(schema.treasuryLoanInstallments)
      .where(eq(schema.treasuryLoanInstallments.loanId, loanId))
      .orderBy(asc(schema.treasuryLoanInstallments.dueDate));
  }

  async createTreasuryLoanInstallment(data: InsertTreasuryLoanInstallment): Promise<TreasuryLoanInstallment> {
    const [installment] = await db.insert(schema.treasuryLoanInstallments)
      .values(data)
      .returning();
    return installment;
  }

  async updateTreasuryLoanInstallment(id: number, data: Partial<InsertTreasuryLoanInstallment>): Promise<TreasuryLoanInstallment | null> {
    const [installment] = await db.update(schema.treasuryLoanInstallments)
      .set(data)
      .where(eq(schema.treasuryLoanInstallments.id, id))
      .returning();
    return installment || null;
  }

  // OPTIMIZED: Batch fetch loan installments by loan IDs
  async getTreasuryLoanInstallmentsByLoanIds(loanIds: number[]): Promise<Map<number, TreasuryLoanInstallment[]>> {
    if (loanIds.length === 0) return new Map();
    const installments = await db.select()
      .from(schema.treasuryLoanInstallments)
      .where(inArray(schema.treasuryLoanInstallments.loanId, loanIds))
      .orderBy(asc(schema.treasuryLoanInstallments.dueDate));
    
    const map = new Map<number, TreasuryLoanInstallment[]>();
    for (const inst of installments) {
      const existing = map.get(inst.loanId) || [];
      existing.push(inst);
      map.set(inst.loanId, existing);
    }
    return map;
  }

  // ==================== MEMBER PERCAPTA PAYMENTS METHODS ====================

  async getMemberPercaptaPayment(userId: number, year: number): Promise<MemberPercaptaPayment | null> {
    const [payment] = await db.select()
      .from(schema.memberPercaptaPayments)
      .where(and(
        eq(schema.memberPercaptaPayments.userId, userId),
        eq(schema.memberPercaptaPayments.year, year)
      ))
      .limit(1);
    return payment || null;
  }

  async createMemberPercaptaPayment(data: InsertMemberPercaptaPayment): Promise<MemberPercaptaPayment> {
    const [payment] = await db.insert(schema.memberPercaptaPayments)
      .values(data)
      .returning();
    return payment;
  }

  async updateMemberPercaptaPayment(id: number, data: Partial<InsertMemberPercaptaPayment>): Promise<MemberPercaptaPayment | null> {
    const [payment] = await db.update(schema.memberPercaptaPayments)
      .set(data)
      .where(eq(schema.memberPercaptaPayments.id, id))
      .returning();
    return payment || null;
  }

  // ==================== MEMBER UMP PAYMENTS METHODS ====================

  async getMemberUmpPayments(userId: number, year: number): Promise<MemberUmpPayment[]> {
    return db.select()
      .from(schema.memberUmpPayments)
      .where(and(
        eq(schema.memberUmpPayments.userId, userId),
        eq(schema.memberUmpPayments.year, year)
      ))
      .orderBy(asc(schema.memberUmpPayments.month));
  }

  async getMemberUmpPayment(userId: number, year: number, month: number): Promise<MemberUmpPayment | null> {
    const [payment] = await db.select()
      .from(schema.memberUmpPayments)
      .where(and(
        eq(schema.memberUmpPayments.userId, userId),
        eq(schema.memberUmpPayments.year, year),
        eq(schema.memberUmpPayments.month, month)
      ))
      .limit(1);
    return payment || null;
  }

  async createMemberUmpPayment(data: InsertMemberUmpPayment): Promise<MemberUmpPayment> {
    const [payment] = await db.insert(schema.memberUmpPayments)
      .values(data)
      .returning();
    return payment;
  }

  async updateMemberUmpPayment(id: number, data: Partial<InsertMemberUmpPayment>): Promise<MemberUmpPayment | null> {
    const [payment] = await db.update(schema.memberUmpPayments)
      .set(data)
      .where(eq(schema.memberUmpPayments.id, id))
      .returning();
    return payment || null;
  }

  // OPTIMIZED: Batch fetch all percapta payments for a year
  async getAllMemberPercaptaPayments(year: number): Promise<Map<number, MemberPercaptaPayment>> {
    const payments = await db.select()
      .from(schema.memberPercaptaPayments)
      .where(eq(schema.memberPercaptaPayments.year, year));
    
    const map = new Map<number, MemberPercaptaPayment>();
    for (const payment of payments) {
      map.set(payment.userId, payment);
    }
    return map;
  }

  // OPTIMIZED: Batch fetch all UMP payments for a year
  async getAllMemberUmpPayments(year: number): Promise<Map<number, MemberUmpPayment[]>> {
    const payments = await db.select()
      .from(schema.memberUmpPayments)
      .where(eq(schema.memberUmpPayments.year, year))
      .orderBy(asc(schema.memberUmpPayments.month));
    
    const map = new Map<number, MemberUmpPayment[]>();
    for (const payment of payments) {
      const existing = map.get(payment.userId) || [];
      existing.push(payment);
      map.set(payment.userId, existing);
    }
    return map;
  }

  // ==================== TREASURY DASHBOARD METHODS ====================

  async getTreasuryDashboardSummary(year: number): Promise<{
    totalIncome: number;
    totalExpense: number;
    balance: number;
    pendingPayments: number;
    membersUpToDate: number;
    membersOverdue: number;
    pendingLoans: number;
    pendingInstallments: number;
  }> {
    const entries = await this.getTreasuryEntries({ year });
    
    let totalIncome = 0;
    let totalExpense = 0;
    let pendingPayments = 0;
    
    for (const entry of entries) {
      // Status is "completed" when payment is confirmed via PIX webhook or manual check
      if (entry.paymentStatus === "completed" || entry.paymentStatus === "paid") {
        if (entry.type === "income") {
          totalIncome += entry.amount;
        } else {
          totalExpense += entry.amount;
        }
      } else if (entry.paymentStatus === "pending") {
        pendingPayments += entry.amount;
      }
    }
    
    // Only "sócio ativo" (activeMember = true) pay taxes, not just any isMember
    const allMembers = await this.getAllMembers(true);
    const activeMemberIds = allMembers.filter(m => m.activeMember === true).map(m => m.id);
    
    // OPTIMIZED: Batch fetch all percapta payments instead of N+1
    const percaptaMap = await this.getAllMemberPercaptaPayments(year);
    let membersUpToDate = 0;
    for (const memberId of activeMemberIds) {
      const percapta = percaptaMap.get(memberId);
      // Check paidAt instead of isPaid (paidAt is set when payment is confirmed)
      if (percapta?.paidAt) {
        membersUpToDate++;
      }
    }
    
    // Get pending loans count
    const loans = await this.getTreasuryLoans();
    const pendingLoans = loans.filter(l => l.status === 'active').length;
    
    // Get pending installments count
    const unpaidInstallments = await this.getAllUnpaidLoanInstallments();
    const pendingInstallments = unpaidInstallments.length;
    
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      pendingPayments,
      membersUpToDate,
      membersOverdue: activeMemberIds.length - membersUpToDate,
      pendingLoans,
      pendingInstallments,
    };
  }

  // ==================== TREASURY SCHEDULER HELPERS ====================

  async getTreasurer(): Promise<User | null> {
    const [treasurer] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.isTreasurer, true))
      .limit(1);
    return treasurer || null;
  }

  async getAllUnpaidLoanInstallments(): Promise<(TreasuryLoanInstallment & { loanDescription?: string })[]> {
    const loans = await this.getTreasuryLoans();
    const result: (TreasuryLoanInstallment & { loanDescription?: string })[] = [];
    
    for (const loan of loans) {
      if (loan.status === 'closed') continue;
      const installments = await this.getTreasuryLoanInstallments(loan.id);
      for (const inst of installments) {
        if (!inst.paidAt) {
          result.push({ ...inst, loanDescription: loan.description || undefined });
        }
      }
    }
    
    return result;
  }

  async resetYearlyTaxes(newYear: number): Promise<void> {
    // Percapta and UMP payments for new year are created on-demand when members access their financial panel
    // This method ensures treasury settings exist for the new year (copies from previous year if needed)
    const existingSettings = await this.getTreasurySettings(newYear);
    if (!existingSettings) {
      const lastYearSettings = await this.getTreasurySettings(newYear - 1);
      if (lastYearSettings) {
        await this.createTreasurySettings({
          year: newYear,
          percaptaAmount: lastYearSettings.percaptaAmount,
          umpMonthlyAmount: lastYearSettings.umpMonthlyAmount,
          pixKey: lastYearSettings.pixKey,
          pixKeyType: lastYearSettings.pixKeyType,
        });
        console.log(`[Storage] Treasury settings for ${newYear} created from ${newYear - 1} values`);
      } else {
        await this.createTreasurySettings({
          year: newYear,
          percaptaAmount: 0,
          umpMonthlyAmount: 0,
          pixKey: null,
          pixKeyType: null,
        });
        console.log(`[Storage] Treasury settings for ${newYear} created with default values`);
      }
    }
    console.log(`[Storage] Year reset completed for ${newYear}`);
  }

  async getTreasuryMonthSummary(year: number, month: number): Promise<{
    totalIncome: number;
    totalExpense: number;
    balance: number;
  }> {
    const entries = await this.getTreasuryEntries({ year });
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    for (const entry of entries) {
      if (entry.paymentStatus !== "paid") continue;
      
      // Check if entry is from the specified month
      const entryDate = entry.paidAt || entry.createdAt;
      if (!entryDate) continue;
      
      const entryMonth = new Date(entryDate).getMonth() + 1;
      if (entryMonth !== month) continue;
      
      if (entry.type === "income") {
        totalIncome += entry.amount;
      } else {
        totalExpense += entry.amount;
      }
    }
    
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }

  // ==================== EVENT FEES ====================

  async createEventFee(data: InsertEventFee): Promise<EventFee> {
    const [fee] = await db.insert(schema.eventFees).values(data).returning();
    return fee;
  }

  async getEventFee(eventId: number): Promise<EventFee | undefined> {
    const [fee] = await db.select().from(schema.eventFees).where(eq(schema.eventFees.eventId, eventId));
    return fee;
  }

  async updateEventFee(eventId: number, data: Partial<InsertEventFee>): Promise<EventFee | undefined> {
    const [fee] = await db.update(schema.eventFees)
      .set(data)
      .where(eq(schema.eventFees.eventId, eventId))
      .returning();
    return fee;
  }

  async deleteEventFee(eventId: number): Promise<boolean> {
    const result = await db.delete(schema.eventFees).where(eq(schema.eventFees.eventId, eventId)).returning();
    return result.length > 0;
  }

  async getEventsWithFees(): Promise<Array<{ event: SiteEvent; fee: EventFee }>> {
    const results = await db.select()
      .from(schema.eventFees)
      .innerJoin(schema.siteEvents, eq(schema.eventFees.eventId, schema.siteEvents.id));
    
    return results.map(r => ({
      event: r.site_events,
      fee: r.event_fees,
    }));
  }

  // ==================== EVENT CONFIRMATIONS ====================

  async createEventConfirmation(data: InsertEventConfirmation): Promise<EventConfirmation> {
    const [confirmation] = await db.insert(schema.eventConfirmations).values(data).returning();
    return confirmation;
  }

  async getEventConfirmation(eventId: number, userId: number): Promise<EventConfirmation | undefined> {
    const [confirmation] = await db.select().from(schema.eventConfirmations)
      .where(and(
        eq(schema.eventConfirmations.eventId, eventId),
        eq(schema.eventConfirmations.userId, userId)
      ));
    return confirmation;
  }

  async getEventConfirmations(eventId: number): Promise<EventConfirmation[]> {
    return db.select().from(schema.eventConfirmations)
      .where(eq(schema.eventConfirmations.eventId, eventId));
  }

  async getEventConfirmationsWithUsers(eventId: number): Promise<Array<EventConfirmation & { user: User }>> {
    const results = await db.select()
      .from(schema.eventConfirmations)
      .innerJoin(schema.users, eq(schema.eventConfirmations.userId, schema.users.id))
      .where(eq(schema.eventConfirmations.eventId, eventId));
    
    return results.map(r => ({
      ...r.event_confirmations,
      user: r.users,
    }));
  }

  async deleteEventConfirmation(eventId: number, userId: number): Promise<boolean> {
    const result = await db.delete(schema.eventConfirmations)
      .where(and(
        eq(schema.eventConfirmations.eventId, eventId),
        eq(schema.eventConfirmations.userId, userId)
      ))
      .returning();
    return result.length > 0;
  }

  async updateEventConfirmation(confirmationId: number, data: Partial<InsertEventConfirmation>): Promise<EventConfirmation | undefined> {
    const [confirmation] = await db.update(schema.eventConfirmations)
      .set(data)
      .where(eq(schema.eventConfirmations.id, confirmationId))
      .returning();
    return confirmation;
  }

  async getMemberEventConfirmationsWithFees(userId: number, year: number): Promise<Array<{
    confirmation: EventConfirmation;
    event: SiteEvent | null;
    fee: EventFee | null;
    entry: TreasuryEntry | null;
  }>> {
    const confirmations = await db.select()
      .from(schema.eventConfirmations)
      .where(eq(schema.eventConfirmations.userId, userId))
      .orderBy(desc(schema.eventConfirmations.confirmedAt));
    
    if (confirmations.length === 0) return [];
    
    const eventIds = confirmations.map(c => c.eventId);
    const eventsData = await db.select().from(schema.siteEvents)
      .where(inArray(schema.siteEvents.id, eventIds));
    
    const yearEvents = eventsData.filter(e => {
      if (!e.startDate) return false;
      return new Date(e.startDate).getFullYear() === year;
    });
    const yearEventIds = new Set(yearEvents.map(e => e.id));
    const eventsMap = new Map(yearEvents.map(e => [e.id, e]));
    
    const allFees = await db.select().from(schema.eventFees)
      .where(inArray(schema.eventFees.eventId, Array.from(yearEventIds)));
    const feesMap = new Map(allFees.map(f => [f.eventId, f]));
    
    const yearConfirmations = confirmations.filter(c => yearEventIds.has(c.eventId));
    const entryIds = yearConfirmations.filter(c => c.entryId).map(c => c.entryId!);
    let entriesMap = new Map<number, TreasuryEntry>();
    if (entryIds.length > 0) {
      const entriesData = await db.select().from(schema.treasuryEntries)
        .where(inArray(schema.treasuryEntries.id, entryIds));
      entriesMap = new Map(entriesData.map(e => [e.id, e]));
    }
    
    return yearConfirmations.map(conf => ({
      confirmation: conf,
      event: eventsMap.get(conf.eventId) || null,
      fee: feesMap.get(conf.eventId) || null,
      entry: conf.entryId ? entriesMap.get(conf.entryId) || null : null,
    }));
  }

  async getEventsWithPendingFees(daysBeforeDeadline: number): Promise<Array<{
    event: SiteEvent;
    fee: EventFee;
    unpaidConfirmations: Array<EventConfirmation & { user: User }>;
  }>> {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + daysBeforeDeadline);
    
    const startOfTargetDay = new Date(targetDate);
    startOfTargetDay.setHours(0, 0, 0, 0);
    const endOfTargetDay = new Date(targetDate);
    endOfTargetDay.setHours(23, 59, 59, 999);
    
    const eventsWithFees = await this.getEventsWithFees();
    const result: Array<{
      event: SiteEvent;
      fee: EventFee;
      unpaidConfirmations: Array<EventConfirmation & { user: User }>;
    }> = [];
    
    for (const { event, fee } of eventsWithFees) {
      if (!fee.deadline) continue;
      const deadline = new Date(fee.deadline);
      
      if (deadline >= startOfTargetDay && deadline <= endOfTargetDay) {
        const confirmations = await this.getEventConfirmationsWithUsers(event.id);
        const unpaidConfirmations = confirmations.filter(c => !c.entryId);
        
        if (unpaidConfirmations.length > 0) {
          result.push({ event, fee, unpaidConfirmations });
        }
      }
    }
    
    return result;
  }

  async getEventConfirmationCount(eventId: number): Promise<{ members: number; visitors: number }> {
    const confirmations = await this.getEventConfirmations(eventId);
    let members = 0;
    let visitors = 0;
    
    for (const c of confirmations) {
      if (c.isVisitor) {
        visitors += (c.visitorCount || 1);
      } else {
        members++;
        visitors += (c.visitorCount || 0);
      }
    }
    
    return { members, visitors };
  }

  // OPTIMIZED: Batch fetch event confirmation counts by event IDs
  async getEventConfirmationCountsByEventIds(eventIds: number[]): Promise<Map<number, { members: number; visitors: number }>> {
    if (eventIds.length === 0) return new Map();
    
    const confirmations = await db.select()
      .from(schema.eventConfirmations)
      .where(inArray(schema.eventConfirmations.eventId, eventIds));
    
    const map = new Map<number, { members: number; visitors: number }>();
    
    // Initialize all event IDs with zero counts
    for (const eventId of eventIds) {
      map.set(eventId, { members: 0, visitors: 0 });
    }
    
    // Count confirmations per event
    for (const c of confirmations) {
      const counts = map.get(c.eventId)!;
      if (c.isVisitor) {
        counts.visitors += (c.visitorCount || 1);
      } else {
        counts.members++;
        counts.visitors += (c.visitorCount || 0);
      }
    }
    
    return map;
  }

  // Promo Codes Methods
  async getPromoCodes(): Promise<PromoCode[]> {
    return db.select().from(schema.promoCodes).orderBy(desc(schema.promoCodes.createdAt));
  }

  async getPromoCodeById(id: number): Promise<PromoCode | null> {
    const [code] = await db.select().from(schema.promoCodes).where(eq(schema.promoCodes.id, id));
    return code || null;
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | null> {
    const [result] = await db.select().from(schema.promoCodes)
      .where(eq(schema.promoCodes.code, code.toUpperCase()));
    return result || null;
  }

  async createPromoCode(data: InsertPromoCode): Promise<PromoCode> {
    const [code] = await db.insert(schema.promoCodes).values({
      ...data,
      code: data.code.toUpperCase(),
    }).returning();
    return code;
  }

  async updatePromoCode(id: number, data: Partial<InsertPromoCode>): Promise<PromoCode | null> {
    const updateData = { ...data };
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }
    const [code] = await db.update(schema.promoCodes)
      .set(updateData)
      .where(eq(schema.promoCodes.id, id))
      .returning();
    return code || null;
  }

  async deletePromoCode(id: number): Promise<void> {
    await db.delete(schema.promoCodes).where(eq(schema.promoCodes.id, id));
  }

  async incrementPromoCodeUsage(id: number): Promise<void> {
    await db.update(schema.promoCodes)
      .set({ usedCount: sql`${schema.promoCodes.usedCount} + 1` })
      .where(eq(schema.promoCodes.id, id));
  }

  // Sent Event Notifications - persists notification cache in database
  async hasEventNotificationBeenSent(cacheKey: string): Promise<boolean> {
    const result = await db.select({ id: schema.sentEventNotifications.id })
      .from(schema.sentEventNotifications)
      .where(eq(schema.sentEventNotifications.cacheKey, cacheKey))
      .limit(1);
    return result.length > 0;
  }

  async markEventNotificationSent(cacheKey: string, eventId: number, notificationType: string): Promise<void> {
    await db.insert(schema.sentEventNotifications)
      .values({ cacheKey, eventId, notificationType })
      .onConflictDoNothing();
  }

  async cleanOldEventNotifications(maxAgeHours: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const result = await db.delete(schema.sentEventNotifications)
      .where(sql`${schema.sentEventNotifications.sentAt} < ${cutoffDate}`)
      .returning({ id: schema.sentEventNotifications.id });
    return result.length;
  }
  
  // ==================== SCHEDULER REMINDERS METHODS ====================
  
  async hasSentSchedulerReminder(reminderKey: string): Promise<boolean> {
    const [existing] = await db.select({ id: schema.sentSchedulerReminders.id })
      .from(schema.sentSchedulerReminders)
      .where(eq(schema.sentSchedulerReminders.reminderKey, reminderKey))
      .limit(1);
    return !!existing;
  }
  
  async markSchedulerReminderSent(reminderKey: string, reminderType: string, relatedId?: number): Promise<void> {
    await db.insert(schema.sentSchedulerReminders)
      .values({ reminderKey, reminderType, relatedId })
      .onConflictDoNothing();
  }
  
  async cleanOldSchedulerReminders(maxAgeHours: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const result = await db.delete(schema.sentSchedulerReminders)
      .where(sql`${schema.sentSchedulerReminders.sentAt} < ${cutoffDate}`)
      .returning({ id: schema.sentSchedulerReminders.id });
    return result.length;
  }
  async linkAnonymousSubscriptionToUser(anonymousSubscriptionId: number, userId: number): Promise<void> {
    console.log(`[Push Storage] linkAnonymousSubscriptionToUser called: anonSubId=${anonymousSubscriptionId}, userId=${userId}`);
    
    const [subscription] = await db
      .select()
      .from(schema.anonymousPushSubscriptions)
      .where(eq(schema.anonymousPushSubscriptions.id, anonymousSubscriptionId));

    if (!subscription) {
      console.log(`[Push Storage] Anonymous subscription ${anonymousSubscriptionId} NOT FOUND in database`);
      return;
    }
    
    console.log(`[Push Storage] Found anonymous subscription: id=${subscription.id}, endpoint=${subscription.endpoint.substring(0, 50)}...`);
    
    // Check if this subscription already exists for this user to avoid duplicates
    const [existing] = await db
      .select()
      .from(schema.pushSubscriptions)
      .where(
        and(
          eq(schema.pushSubscriptions.userId, userId),
          eq(schema.pushSubscriptions.endpoint, subscription.endpoint)
        )
      );

    if (existing) {
      console.log(`[Push Storage] User ${userId} already has this endpoint registered, skipping duplicate insert`);
    } else {
      console.log(`[Push Storage] Creating new push subscription for user ${userId}...`);
      await db.insert(schema.pushSubscriptions).values({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      });
      console.log(`[Push Storage] Push subscription created successfully for user ${userId}`);
    }
    
    // Delete the anonymous subscription after linking
    console.log(`[Push Storage] Deleting anonymous subscription ${anonymousSubscriptionId} after linking...`);
    await db
      .delete(schema.anonymousPushSubscriptions)
      .where(eq(schema.anonymousPushSubscriptions.id, anonymousSubscriptionId));
    console.log(`[Push Storage] Anonymous subscription ${anonymousSubscriptionId} deleted, link complete for user ${userId}`);

  }
  // ==================== AUTOMAÇÕES (INSTAGRAM & BIRTHDAY) ====================

  async getMembersByBirthday(day: number, month: number): Promise<User[]> {
    // Busca membros ativos que fazem aniversário no dia/mês especificado
    // Usa extração SQL direta para garantir compatibilidade com datas
    return db.select()
      .from(schema.users)
      .where(and(
        eq(schema.users.isMember, true),
        eq(schema.users.activeMember, true),
        sql`EXTRACT(MONTH FROM ${schema.users.birthDate}) = ${month}`,
        sql`EXTRACT(DAY FROM ${schema.users.birthDate}) = ${day}`
      ));
  }

  async getDailyStoryImage(dateStr: string): Promise<string | null> {
    // Busca se já existe uma imagem gerada para o versículo do dia nesta data
    // Converte a data para comparar apenas o dia (ignorando hora)
    const [post] = await db.select({ imageUrl: schema.dailyVersePosts.imageUrl })
      .from(schema.dailyVersePosts)
      .where(and(
        eq(schema.dailyVersePosts.isActive, true),
        sql`DATE(${schema.dailyVersePosts.publishedAt}) = DATE(${dateStr})`
      ))
      .limit(1);
    
    return post?.imageUrl || null;
  }

  async saveDailyStoryImage(data: { date: string; imageUrl: string; verse: string; reference: string; theme?: string }): Promise<any> {
    // Salva a imagem gerada na tabela de posts diários
    // Define expiração para 24h após a publicação
    const publishedAt = new Date(data.date);
    const expiresAt = new Date(publishedAt.getTime() + 24 * 60 * 60 * 1000);

    return this.createDailyVersePost({
      imageUrl: data.imageUrl,
      verse: data.verse,
      reference: data.reference,
      publishedAt: publishedAt,
      expiresAt: expiresAt,
      isActive: true,
      socialPlatform: 'instagram',
      // Se houver campo de tema no schema, adicione aqui, senão ignore
      // theme: data.theme 
    });
  }
}

export const storage = new DatabaseStorage();
