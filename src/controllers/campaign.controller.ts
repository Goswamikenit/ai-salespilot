import { Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../config/database";
import { AuthRequest } from "../middlewares/auth.middleware";

// CREATE CAMPAIGN
export async function createCampaign(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;

    const {
      whatsappAccountId,
      name,
      messageTemplate,
      status = "DRAFT",
      scheduledAt,
    } = req.body;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    if (
      !whatsappAccountId ||
      !name ||
      !messageTemplate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "WhatsApp account ID, name and message template are required",
      });
    }

    const validStatuses = [
      "DRAFT",
      "SCHEDULED",
      "RUNNING",
      "COMPLETED",
      "PAUSED",
      "FAILED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign status",
      });
    }

    // Check WhatsApp account belongs to logged-in organization
    const [whatsappAccounts]: any = await db.execute(
      `SELECT id
       FROM whatsapp_accounts
       WHERE id = ?
       AND organization_id = ?`,
      [whatsappAccountId, organizationId]
    );

    if (whatsappAccounts.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "WhatsApp account not found in your organization",
      });
    }

    const id = randomUUID();

    await db.execute(
      `INSERT INTO campaigns
       (
         id,
         organization_id,
         whatsapp_account_id,
         name,
         message_template,
         status,
         scheduled_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        organizationId,
        whatsappAccountId,
        name,
        messageTemplate,
        status,
        scheduledAt || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      data: {
        id,
        organizationId,
        whatsappAccountId,
        name,
        messageTemplate,
        status,
        scheduledAt: scheduledAt || null,
      },
    });
  } catch (error) {
    console.error("Create campaign error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create campaign",
    });
  }
}


// GET ALL CAMPAIGNS
export async function getCampaigns(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    const [rows] = await db.execute(
      `SELECT
        c.id,
        c.organization_id,
        c.whatsapp_account_id,
        c.name,
        c.message_template,
        c.status,
        c.scheduled_at,
        c.created_at,
        c.updated_at,

        wa.display_name,
        wa.phone_number

       FROM campaigns c

       INNER JOIN whatsapp_accounts wa
         ON c.whatsapp_account_id = wa.id

       WHERE c.organization_id = ?

       ORDER BY c.created_at DESC`,
      [organizationId]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get campaigns error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns",
    });
  }
}


// GET CAMPAIGN BY ID
export async function getCampaignById(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    const [rows]: any = await db.execute(
      `SELECT
        c.id,
        c.organization_id,
        c.whatsapp_account_id,
        c.name,
        c.message_template,
        c.status,
        c.scheduled_at,
        c.created_at,
        c.updated_at,

        wa.display_name,
        wa.phone_number

       FROM campaigns c

       INNER JOIN whatsapp_accounts wa
         ON c.whatsapp_account_id = wa.id

       WHERE c.id = ?
       AND c.organization_id = ?`,
      [id, organizationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get campaign error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch campaign",
    });
  }
}


// UPDATE CAMPAIGN
export async function updateCampaign(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    const {
      name,
      messageTemplate,
      status,
      scheduledAt,
    } = req.body;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    const validStatuses = [
      "DRAFT",
      "SCHEDULED",
      "RUNNING",
      "COMPLETED",
      "PAUSED",
      "FAILED",
    ];

    if (
      status &&
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign status",
      });
    }

    const [existingCampaigns]: any = await db.execute(
      `SELECT id
       FROM campaigns
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (existingCampaigns.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    await db.execute(
      `UPDATE campaigns
       SET
         name = COALESCE(?, name),
         message_template = COALESCE(?, message_template),
         status = COALESCE(?, status),
         scheduled_at = COALESCE(?, scheduled_at)
       WHERE id = ?
       AND organization_id = ?`,
      [
        name ?? null,
        messageTemplate ?? null,
        status ?? null,
        scheduledAt ?? null,
        id,
        organizationId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Campaign updated successfully",
    });
  } catch (error) {
    console.error("Update campaign error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update campaign",
    });
  }
}


// DELETE CAMPAIGN
export async function deleteCampaign(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    const [result]: any = await db.execute(
      `DELETE FROM campaigns
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("Delete campaign error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete campaign",
    });
  }
}