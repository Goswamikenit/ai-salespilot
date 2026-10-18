import { Router } from "express";

import {
  createMessage,
  getMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
} from "../controllers/message.controller";

import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken, createMessage);

router.get("/", authenticateToken, getMessages);

router.get("/:id", authenticateToken, getMessageById);

router.put("/:id", authenticateToken, updateMessage);

router.delete("/:id", authenticateToken, deleteMessage);

export default router;