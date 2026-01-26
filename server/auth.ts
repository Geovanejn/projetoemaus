import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { User } from "@shared/schema";

// JWT_SECRET é OBRIGATÓRIO em todos os ambientes para segurança
if (!process.env.JWT_SECRET) {
  throw new Error(
    "ERRO CRITICO: JWT_SECRET nao definido! " +
    "Configure o secret JWT_SECRET nas variaveis de ambiente antes de iniciar o servidor."
  );
}

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthRequest extends Request {
  user?: Omit<User, "password"> & { id: number };
}

export function generateToken(user: Omit<User, "password">): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      isAdmin: user.isAdmin,
      isMember: user.isMember,
      isTreasurer: user.isTreasurer,
      secretaria: user.secretaria
    },
    JWT_SECRET,
    { expiresIn: "96h" }
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    // Log warning for notification routes to help debug subscription issues
    if (req.path.includes('/notifications/')) {
      console.warn(`[Auth] Missing token for notification route: ${req.method} ${req.path}`);
    }
    return res.status(401).json({ message: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Omit<User, "password"> & { id: number };
    req.user = decoded;
    next();
  } catch (error: any) {
    // Log warning for notification routes to help debug subscription issues
    if (req.path.includes('/notifications/')) {
      console.warn(`[Auth] Invalid token for notification route: ${req.method} ${req.path} - ${error.message || 'Unknown error'}`);
    }
    return res.status(403).json({ message: "Token inválido" });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Acesso negado: apenas administradores" });
  }
  next();
}

export function requireMember(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.isMember && !req.user?.isAdmin) {
    return res.status(403).json({ message: "Acesso negado: apenas membros" });
  }
  next();
}

export function requireAdminOrMarketing(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.isAdmin && req.user?.secretaria !== "marketing") {
    return res.status(403).json({ message: "Acesso negado: apenas administradores ou secretaria de marketing" });
  }
  next();
}

export function requireAdminOrEspiritualidade(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.isAdmin && req.user?.secretaria !== "espiritualidade") {
    return res.status(403).json({ message: "Acesso negado: apenas administradores ou secretaria de espiritualidade" });
  }
  next();
}

export function requireMarketing(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.isAdmin && req.user?.secretaria !== "marketing") {
    return res.status(403).json({ message: "Acesso negado: apenas administradores ou secretaria de marketing" });
  }
  next();
}

export function requireTreasurer(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.isAdmin && !req.user?.isTreasurer) {
    return res.status(403).json({ message: "Acesso negado: apenas administradores ou tesoureiro" });
  }
  next();
}

export function requireMarketingOrTreasurer(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const isMarketing = req.user?.secretaria === "marketing";
  const isTreasurer = req.user?.isTreasurer;
  const isAdmin = req.user?.isAdmin;
  
  if (!isAdmin && !isTreasurer && !isMarketing) {
    return res.status(403).json({ message: "Acesso negado: apenas administradores, tesoureiro ou secretaria de marketing" });
  }
  next();
}
