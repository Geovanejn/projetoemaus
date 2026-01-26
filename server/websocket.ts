import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

let io: SocketIOServer | null = null;

interface ElectionRoom {
  electionId: number;
  clients: Set<string>;
}

interface StudyRoom {
  userId: number;
  socketId: string;
}

interface AuthenticatedSocket extends Socket {
  userId?: number;
  isAdmin?: boolean;
  isMember?: boolean;
}

interface DecodedToken {
  id: number;         // JWT uses "id" not "userId"
  userId?: number;    // Fallback for compatibility
  isAdmin?: boolean;
  isMember?: boolean;
}

const electionRooms = new Map<number, ElectionRoom>();
const studyRooms = new Map<number, StudyRoom>();
const authenticatedSockets = new Map<string, { userId: number; isAdmin: boolean; isMember: boolean }>();
const onlineUsers = new Map<number, { socketId: string; joinedAt: Date; userName?: string; photoUrl?: string }>();

export function initializeWebSocket(server: HTTPServer): SocketIOServer {
  // Build allowed origins for CORS
  const getAllowedOrigins = (): string | string[] => {
    if (process.env.NODE_ENV !== "production") {
      return "*";
    }
    
    const origins: string[] = [];
    
    // Render production URL
    if (process.env.RENDER_EXTERNAL_URL) {
      origins.push(process.env.RENDER_EXTERNAL_URL);
    }
    
    // Custom domain if configured
    if (process.env.APP_URL) {
      origins.push(process.env.APP_URL);
    }
    
    // Replit URLs (for Replit deployment)
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.push(process.env.REPLIT_DEV_DOMAIN);
    }
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      origins.push(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    }
    
    // Common production domains
    origins.push("https://emausump.onrender.com");
    origins.push("https://umpemaus.com.br");
    origins.push("https://www.umpemaus.com.br");
    
    // Filter empty strings
    return origins.filter(o => o.length > 0);
  };

  io = new SocketIOServer(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");
    const jwtSecret = process.env.JWT_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && !jwtSecret) {
      console.error("[WebSocket] JWT_SECRET not configured in production - rejecting connection");
      return next(new Error("Server misconfiguration"));
    }
    
    if (!token) {
      if (isProduction) {
        console.log(`[WebSocket] Connection without token rejected in production: ${socket.id}`);
        return next(new Error("Authentication required"));
      }
      console.log(`[WebSocket] Connection without token from ${socket.id} - allowing with limited access in development`);
      socket.userId = undefined;
      socket.isAdmin = false;
      socket.isMember = false;
      return next();
    }

    try {
      const secret = jwtSecret || "dev-only-secret-not-for-production";
      const decoded = jwt.verify(token, secret) as DecodedToken;
      // JWT uses "id" field, not "userId" - support both for compatibility
      const userId = decoded.id || decoded.userId;
      socket.userId = userId;
      socket.isAdmin = decoded.isAdmin || false;
      socket.isMember = decoded.isMember || false;
      
      if (userId) {
        authenticatedSockets.set(socket.id, {
          userId: userId,
          isAdmin: socket.isAdmin,
          isMember: socket.isMember,
        });
      }
      
      console.log(`[WebSocket] Authenticated connection: ${socket.id}, userId: ${userId}`);
      next();
    } catch (error) {
      if (isProduction) {
        console.log(`[WebSocket] Invalid token rejected in production: ${socket.id}`);
        return next(new Error("Invalid authentication token"));
      }
      console.log(`[WebSocket] Invalid token from ${socket.id} - allowing with limited access in development`);
      socket.userId = undefined;
      socket.isAdmin = false;
      socket.isMember = false;
      next();
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}, authenticated: ${!!socket.userId}`);

    socket.on("join:election", ({ electionId }: { electionId: number }) => {
      if (!socket.userId || (!socket.isAdmin && !socket.isMember)) {
        socket.emit("error", { message: "Authentication required to join election room" });
        console.log(`[WebSocket] Unauthorized join:election attempt from ${socket.id}`);
        return;
      }

      const roomName = `election:${electionId}`;
      socket.join(roomName);
      
      if (!electionRooms.has(electionId)) {
        electionRooms.set(electionId, { electionId, clients: new Set() });
      }
      electionRooms.get(electionId)!.clients.add(socket.id);
      
      console.log(`[WebSocket] Client ${socket.id} (user ${socket.userId}) joined election room ${electionId}`);
    });

    socket.on("leave:election", ({ electionId }: { electionId: number }) => {
      const roomName = `election:${electionId}`;
      socket.leave(roomName);
      
      const room = electionRooms.get(electionId);
      if (room) {
        room.clients.delete(socket.id);
        if (room.clients.size === 0) {
          electionRooms.delete(electionId);
        }
      }
      
      console.log(`[WebSocket] Client ${socket.id} left election room ${electionId}`);
    });

    socket.on("join:study", ({ userId }: { userId: number }) => {
      if (!socket.userId || socket.userId !== userId) {
        socket.emit("error", { message: "You can only join your own study room" });
        console.log(`[WebSocket] Unauthorized join:study attempt from ${socket.id} for user ${userId}`);
        return;
      }

      const roomName = `study:${userId}`;
      socket.join(roomName);
      studyRooms.set(userId, { userId, socketId: socket.id });
      
      console.log(`[WebSocket] Client ${socket.id} (user ${socket.userId}) joined study room`);
    });

    socket.on("leave:study", ({ userId }: { userId: number }) => {
      const roomName = `study:${userId}`;
      socket.leave(roomName);
      studyRooms.delete(userId);
      
      console.log(`[WebSocket] Client ${socket.id} left study room for user ${userId}`);
    });

    socket.on("join:presence", async ({ userId, userName, photoUrl }: { userId: number; userName?: string; photoUrl?: string }) => {
      if (!socket.userId || socket.userId !== userId) {
        socket.emit("error", { message: "You can only join presence with your own user ID" });
        console.log(`[WebSocket] Unauthorized join:presence attempt from ${socket.id} for user ${userId}`);
        return;
      }

      socket.join("presence:study");
      onlineUsers.set(userId, { socketId: socket.id, joinedAt: new Date(), userName, photoUrl });
      
      // Update database with online status
      try {
        await storage.updateUserOnlineStatus(userId, true);
        console.log(`[WebSocket] Updated DB: User ${userId} is now online`);
      } catch (err) {
        console.error(`[WebSocket] Failed to update online status in DB for user ${userId}:`, err);
      }
      
      io?.to("presence:study").emit("presence:update", {
        type: "join",
        userId,
        userName,
        photoUrl,
        onlineUsers: Array.from(onlineUsers.entries()).map(([id, data]) => ({
          userId: id,
          userName: data.userName,
          photoUrl: data.photoUrl,
          joinedAt: data.joinedAt.toISOString(),
        })),
        timestamp: new Date().toISOString(),
      });
      
      console.log(`[WebSocket] User ${userId} (${userName}) joined presence room. Online: ${onlineUsers.size}`);
    });

    socket.on("leave:presence", async ({ userId }: { userId: number }) => {
      socket.leave("presence:study");
      const userData = onlineUsers.get(userId);
      onlineUsers.delete(userId);
      
      // Update database with offline status
      try {
        await storage.updateUserOnlineStatus(userId, false);
        console.log(`[WebSocket] Updated DB: User ${userId} is now offline`);
      } catch (err) {
        console.error(`[WebSocket] Failed to update offline status in DB for user ${userId}:`, err);
      }
      
      io?.to("presence:study").emit("presence:update", {
        type: "leave",
        userId,
        userName: userData?.userName,
        onlineUsers: Array.from(onlineUsers.entries()).map(([id, data]) => ({
          userId: id,
          userName: data.userName,
          photoUrl: data.photoUrl,
          joinedAt: data.joinedAt.toISOString(),
        })),
        timestamp: new Date().toISOString(),
      });
      
      console.log(`[WebSocket] User ${userId} left presence room. Online: ${onlineUsers.size}`);
    });

    socket.on("disconnect", async (reason) => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}, reason: ${reason}`);
      
      authenticatedSockets.delete(socket.id);
      
      electionRooms.forEach((room, electionId) => {
        room.clients.delete(socket.id);
        if (room.clients.size === 0) {
          electionRooms.delete(electionId);
        }
      });

      studyRooms.forEach((room, userId) => {
        if (room.socketId === socket.id) {
          studyRooms.delete(userId);
        }
      });

      // Handle presence disconnection and update database
      for (const [userId, data] of onlineUsers.entries()) {
        if (data.socketId === socket.id) {
          onlineUsers.delete(userId);
          
          // Update database with offline status
          try {
            await storage.updateUserOnlineStatus(userId, false);
            console.log(`[WebSocket] Updated DB: User ${userId} is now offline (disconnect)`);
          } catch (err) {
            console.error(`[WebSocket] Failed to update offline status in DB for user ${userId}:`, err);
          }
          
          io?.to("presence:study").emit("presence:update", {
            type: "leave",
            userId,
            userName: data.userName,
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, d]) => ({
              userId: id,
              userName: d.userName,
              photoUrl: d.photoUrl,
              joinedAt: d.joinedAt.toISOString(),
            })),
            timestamp: new Date().toISOString(),
          });
          console.log(`[WebSocket] User ${userId} disconnected from presence. Online: ${onlineUsers.size}`);
        }
      }
    });
  });

  console.log("[WebSocket] Server initialized");
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitElectionUpdate(electionId: number, event: string, data: unknown): void {
  if (!io) {
    console.warn("[WebSocket] Cannot emit, server not initialized");
    return;
  }
  
  const roomName = `election:${electionId}`;
  io.to(roomName).emit(event, data);
  console.log(`[WebSocket] Emitted ${event} to election room ${electionId}`);
}

export function emitVoteUpdate(electionId: number, positionId: number, candidateId: number): void {
  emitElectionUpdate(electionId, "election:vote", {
    electionId,
    positionId,
    candidateId,
    timestamp: new Date().toISOString(),
  });
}

export function emitResultUpdate(electionId: number, positionId: number, winnerId: number | null): void {
  emitElectionUpdate(electionId, "election:result", {
    electionId,
    positionId,
    winnerId,
    timestamp: new Date().toISOString(),
  });
}

export function emitAttendanceUpdate(electionId: number, memberId: number, present: boolean): void {
  emitElectionUpdate(electionId, "election:attendance", {
    electionId,
    memberId,
    present,
    timestamp: new Date().toISOString(),
  });
}

export function emitStudyUpdate(userId: number, event: string, data: unknown): void {
  if (!io) {
    console.warn("[WebSocket] Cannot emit, server not initialized");
    return;
  }
  
  const roomName = `study:${userId}`;
  io.to(roomName).emit(event, data);
  console.log(`[WebSocket] Emitted ${event} to study room for user ${userId}`);
}

export function emitXPGained(userId: number, amount: number, source: string): void {
  emitStudyUpdate(userId, "study:xp", {
    userId,
    amount,
    source,
    timestamp: new Date().toISOString(),
  });
}

export function emitAchievementUnlocked(userId: number, achievementId: number, achievementName: string): void {
  emitStudyUpdate(userId, "study:achievement", {
    userId,
    achievementId,
    achievementName,
    timestamp: new Date().toISOString(),
  });
}

export function emitStreakUpdate(userId: number, currentStreak: number, isNewRecord: boolean): void {
  emitStudyUpdate(userId, "study:streak", {
    userId,
    currentStreak,
    isNewRecord,
    timestamp: new Date().toISOString(),
  });
}

export function getConnectedClients(): { elections: number; study: number; total: number } {
  const electionClients = Array.from(electionRooms.values())
    .reduce((sum, room) => sum + room.clients.size, 0);
  const studyClients = studyRooms.size;
  
  return {
    elections: electionClients,
    study: studyClients,
    total: io ? io.engine.clientsCount : 0,
  };
}

export function getOnlineUsers(): Array<{ userId: number; userName?: string; photoUrl?: string; joinedAt: string }> {
  return Array.from(onlineUsers.entries()).map(([userId, data]) => ({
    userId,
    userName: data.userName,
    photoUrl: data.photoUrl,
    joinedAt: data.joinedAt.toISOString(),
  }));
}

export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId);
}
