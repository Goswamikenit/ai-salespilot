import { Router } from "express";
import {
  authenticateToken,
  AuthRequest,
} from "../middlewares/auth.middleware";

const router = Router();

router.get("/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Authenticated user",
      data: {
        userId: req.user?.userId,
        organizationId: req.user?.organizationId,
        role: req.user?.role,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get authenticated user",
    });
  }
});

export default router;