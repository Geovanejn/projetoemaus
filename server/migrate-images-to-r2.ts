import { storage } from "./storage";
import { uploadBase64ToR2, isR2Configured, isBase64Url, type ImageCategory } from "./r2-storage";

let totalMigrated = 0;
let totalFailed = 0;
let totalSkipped = 0;

async function migrateField(
  table: string,
  id: number | string,
  field: string,
  value: string | null,
  category: ImageCategory,
  updateFn: (newUrl: string) => Promise<void>
): Promise<void> {
  if (!value || !isBase64Url(value)) {
    totalSkipped++;
    return;
  }

  try {
    const r2Url = await uploadBase64ToR2(value, category);
    await updateFn(r2Url);
    totalMigrated++;
    console.log(`[Migration] ✓ ${table}.${field} (id: ${id})`);
  } catch (error) {
    totalFailed++;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Migration] ✗ ${table}.${field} (id: ${id}): ${errorMsg}`);
  }
}

export async function runImageMigration(): Promise<void> {
  if (!isR2Configured()) {
    console.log("[Migration] R2 not configured, skipping migration");
    return;
  }

  console.log("[Migration] Starting image migration to R2...");
  const startTime = Date.now();

  try {
    const members = await storage.getAllMembers();
    for (const member of members) {
      if (member.photoUrl && isBase64Url(member.photoUrl)) {
        await migrateField("users", member.id, "photoUrl", member.photoUrl, "members", async (newUrl) => {
          await storage.updateUser(member.id, { photoUrl: newUrl });
        });
      }
    }

    const devotionals = await storage.getAllDevotionals();
    for (const devotional of devotionals) {
      if (devotional.imageUrl && isBase64Url(devotional.imageUrl)) {
        await migrateField("devotionals", devotional.id, "imageUrl", devotional.imageUrl, "devotionals", async (newUrl) => {
          await storage.updateDevotional(devotional.id, { imageUrl: newUrl });
        });
      }
    }

    const seasons = await storage.getAllSeasons();
    for (const season of seasons) {
      if (season.coverImageUrl && isBase64Url(season.coverImageUrl)) {
        await migrateField("seasons", season.id, "coverImageUrl", season.coverImageUrl, "lessons", async (newUrl) => {
          await storage.updateSeason(season.id, { coverImageUrl: newUrl });
        });
      }
    }

    const categories = await storage.getShopCategories();
    for (const category of categories) {
      const fullCategory = await storage.getShopCategoryById(category.id);
      if (fullCategory?.imageData && isBase64Url(fullCategory.imageData)) {
        await migrateField("shopCategories", category.id, "imageData", fullCategory.imageData, "categories", async (newUrl) => {
          await storage.updateShopCategory(category.id, { imageData: newUrl });
        });
      }
    }

    const items = await storage.getShopItems();
    for (const item of items) {
      if (item.bannerImageData && isBase64Url(item.bannerImageData)) {
        await migrateField("shopItems", item.id, "bannerImageData", item.bannerImageData, "banners", async (newUrl) => {
          await storage.updateShopItem(item.id, { bannerImageData: newUrl });
        });
      }
    }

    const banners = await storage.getAllBanners();
    for (const banner of banners) {
      if (banner.imageUrl && isBase64Url(banner.imageUrl)) {
        await migrateField("banners", banner.id, "imageUrl", banner.imageUrl, "banners", async (newUrl) => {
          await storage.updateBanner(banner.id, { imageUrl: newUrl });
        });
      }
    }

    const events = await storage.getAllStudyEvents();
    for (const event of events) {
      if (event.imageUrl && isBase64Url(event.imageUrl)) {
        await migrateField("studyEvents", event.id, "imageUrl", event.imageUrl, "events", async (newUrl) => {
          await storage.updateStudyEvent(event.id, { imageUrl: newUrl });
        });
      }
    }

    const cards = await storage.getAllCollectibleCards();
    for (const card of cards) {
      if (card.imageUrl && isBase64Url(card.imageUrl)) {
        await migrateField("collectibleCards", card.id, "imageUrl", card.imageUrl, "cards", async (newUrl) => {
          await storage.updateCollectibleCard(card.id, { imageUrl: newUrl });
        });
      }
    }

    // Site events (agenda)
    const siteEvents = await storage.getAllSiteEvents();
    for (const event of siteEvents) {
      if (event.imageUrl && isBase64Url(event.imageUrl)) {
        await migrateField("siteEvents", event.id, "imageUrl", event.imageUrl, "events", async (newUrl) => {
          await storage.updateSiteEvent(event.id, { imageUrl: newUrl });
        });
      }
    }

    // Board members (elections)
    const boardMembers = await storage.getAllBoardMembers(false);
    for (const member of boardMembers) {
      if (member.photoUrl && isBase64Url(member.photoUrl)) {
        await migrateField("boardMembers", member.id, "photoUrl", member.photoUrl, "members", async (newUrl) => {
          await storage.updateBoardMember(member.id, { photoUrl: newUrl });
        });
      }
    }

    // Shop item images (product gallery)
    const shopItems = await storage.getShopItems();
    for (const item of shopItems) {
      const images = await storage.getShopItemImages(item.id);
      for (const img of images) {
        if (img.imageData && isBase64Url(img.imageData)) {
          await migrateField("shopItemImages", img.id, "imageData", img.imageData, "shop", async (newUrl) => {
            await storage.updateShopItemImage(img.id, { imageData: newUrl });
          });
        }
      }
    }

  } catch (error) {
    console.error("[Migration] Fatal error:", error);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Migration] Completed in ${duration}s`);
  console.log(`[Migration] Migrated: ${totalMigrated}, Failed: ${totalFailed}, Skipped: ${totalSkipped}`);
}
