import { Router } from "express";

import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from "../controllers/campaign.controller";

import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken, createCampaign);

router.get("/", authenticateToken, getCampaigns);

router.get("/:id", authenticateToken, getCampaignById);

router.put("/:id", authenticateToken, updateCampaign);

router.delete("/:id", authenticateToken, deleteCampaign);

export default router;