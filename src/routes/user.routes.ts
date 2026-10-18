import { Router } from "express";

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
} from "../controllers/user.controller";

import { authenticateToken } from "../middlewares/auth.middleware";
const router = Router();
router.post("/login", loginUser);

// Baaki user APIs protected
router.post("/", authenticateToken, createUser);
router.get("/", authenticateToken, getUsers);
router.get("/:id", authenticateToken, getUserById);
router.put("/:id", authenticateToken, updateUser);
router.delete("/:id", authenticateToken, deleteUser);
export default router;