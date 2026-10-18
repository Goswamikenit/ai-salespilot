import { Router } from "express";

import {
  createConversation,
  getConversations,
  getConversationById,
  updateConversation,
  deleteConversation,
} from "../controllers/conversation.controller";

import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken, createConversation);

router.get("/", authenticateToken, getConversations);

router.get("/:id", authenticateToken, getConversationById);

router.put("/:id", authenticateToken, updateConversation);

router.delete("/:id", authenticateToken, deleteConversation);
export default router;