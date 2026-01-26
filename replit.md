# Site UMP Emaús

## Overview
This project is a comprehensive web system for the União de Mocidade Presbiteriana (UMP) of the Emaús Presbyterian Church. It aims to enhance community engagement, streamline event management, and provide spiritual resources through a public website, a members-only area, and an administrative panel. Key capabilities include daily devotionals, event scheduling, member management, social media integration, an interactive gamified study system (DeoGlory), and a Treasury Module for financial management, member fee tracking, and e-commerce with payment integration. The system focuses on community, spiritual growth, and efficient administration.

## User Preferences
- I prefer simple and direct language.
- I want iterative development with frequent, small updates rather than large, infrequent ones.
- Ask for my confirmation before implementing any major architectural changes or refactoring.
- I prefer detailed explanations for complex features or decisions.
- Do not make changes to the folder `Z`.
- Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
The front-end uses React with a responsive design, consistent card layouts, and a specific color scheme. The DeoGlory system features gamified elements, animated feedback, and golden styling for completed sections. Accessibility includes text-to-speech normalization. The e-commerce shop utilizes a Jesuscopy-style design with carousels and product galleries.

### Technical Implementations
- **Frontend**: React
- **Backend**: Express.js
- **Database**: PostgreSQL (managed with Drizzle ORM)
- **Authentication**: JWT for API security (96h token expiration).
- **Scheduled Tasks**: Background tasks for Instagram sync, event/devotional notifications, daily missions, and abandoned cart reminders.
- **Real-time Features**: Push notifications and WebSocket-based online status. Push notification subscriptions are automatically synced.
- **AI Integration**: Generates exercises and questions from topics/PDFs with quota tracking. Prioritizes `gemini-3-flash-preview` and similar models. Includes an "Anti-Chute" (Anti-Guessing) system for question quality.
- **Study System (DeoGlory)**: Features an XP system, daily missions, ranking, crystal rewards, achievements, and supports multiple-choice, true/false, and fill-in-the-blank quizzes. Optimized for efficient data fetching.
- **Admin Panel**: Manages users, events, devotionals, directory, marketing, and the DeoGlory system (lesson management, AI generation).
- **Special Events System**: Events can include AI-generated lessons, collectible cards with rarity, image uploads, and countdowns.
- **Treasury Module**: Manages member fees (Percapta, UMP), an e-commerce store, and event fees. Integrates Mercado Pago PIX, offers financial dashboards, and role-based access. Supports "Day 10 Rule" for UMP payments, full-year anticipation, and abandoned cart reminders.
- **Daily Verse System**: Automated daily Bible verse publishing with AI-generated reflections, stock images, public page, social media sharing, and push notifications.
- **Instagram Stories Auto-Publish**: Automated story publishing to Instagram at scheduled times:
  - 07:05 - Daily verse story with background image
  - 07:10 - Daily reflection story
  - 08:05 - Birthday congratulation stories (if any birthdays)
  - Uses server-side image generation (node-canvas + sharp) for JPEG output
  - Requires INSTAGRAM_ACCOUNT_ID, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_ACCESS_TOKEN
- **E-commerce Shop (Loja)**: Features product display with categories, banners, promotional codes, and stock inventory control. Supports PIX installment payments and manual orders for external customers. Multiple image upload is available for products.

### System Design Choices
- **Modular Project Structure**: Clear separation of client, server, and shared code.
- **Database Schema**: Managed with Drizzle ORM.
- **Environment Configuration**: Uses environment variables.
- **Deployment**: Optimized for Render with lazy database initialization.
- **Performance Optimizations**: Extensive use of batch queries, caching, data projection, HTTP compression, and database indexing. Shop and DeoGlory modules are highly optimized with specific data fetching strategies, image processing (Sharp WebP compression), and in-memory caching for images.
- **Season Management**: Seasons can be ended, triggering card distribution based on performance, notifications to participants, and congratulatory emails to top performers. Rankings are automatically backfilled if empty. Access to ended season lessons is blocked.
- **Admin API Validation**: Strict Zod schemas for all admin UPDATE endpoints.
- **Error Handling**: Centralized with `AppError` and logging.
- **Image URL Conversion**: Helper functions convert internal R2 URLs to public URLs for frontend display.

## External Dependencies
- **PostgreSQL**: Primary database.
- **Instagram Graph API**: For social media integration.
- **Web Push Notifications (VAPID)**: For real-time alerts.
- **Gemini API**: For AI-powered content generation.
- **React**: Frontend library.
- **Express.js**: Backend framework.
- **Drizzle ORM**: Database interaction.
- **Mercado Pago API**: For PIX payment integration.
- **React Markdown**: For rendering Markdown content.