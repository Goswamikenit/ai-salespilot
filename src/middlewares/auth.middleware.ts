import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is required",
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Bearer token is required",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "JWT secret is not configured",
      });
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
      organizationId: string;
      role: string;
    };

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}