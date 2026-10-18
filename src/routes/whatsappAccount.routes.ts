import { Router } from "express";

import {
  createWhatsappAccount,
  getWhatsappAccounts,
  getWhatsappAccountById,
  updateWhatsappAccount,
  deleteWhatsappAccount,
} from "../controllers/whatsappAccount.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken, createWhatsappAccount);

router.get("/", authenticateToken, getWhatsappAccounts);

router.get("/:id", authenticateToken, getWhatsappAccountById);

router.put("/:id", authenticateToken, updateWhatsappAccount);

router.delete("/:id", authenticateToken, deleteWhatsappAccount);

export default router;