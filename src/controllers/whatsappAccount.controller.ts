import { Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../config/database";
import { AuthRequest } from "../middlewares/auth.middleware";

// CREATE WHATSAPP ACCOUNT
export async function createWhatsappAccount(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;

    const {
      phoneNumberId,
      wabaId,
      businessId,
      phoneNumber,
      displayName,
      accessToken,
    } = req.body;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    if (!phoneNumberId || !wabaId || !accessToken) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number ID, WABA ID and access token are required",
      });
    }

    // Check duplicate phone number ID
    const [existingAccounts]: any = await db.execute(
      `SELECT id
       FROM whatsapp_accounts
       WHERE phone_number_id = ?`,
      [phoneNumberId]
    );

    if (existingAccounts.length > 0) {
      return res.status(409).json({
        success: false,
        message: "WhatsApp account already exists",
      });
    }

    const id = randomUUID();

    await db.execute(
      `INSERT INTO whatsapp_accounts
       (
         id,
         organization_id,
         phone_number_id,
         waba_id,
         business_id,
         phone_number,
         display_name,
         access_token
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        organizationId,
        phoneNumberId,
        wabaId,
        businessId || null,
        phoneNumber || null,
        displayName || null,
        accessToken,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "WhatsApp account created successfully",
      data: {
        id,
        organizationId,
        phoneNumberId,
        wabaId,
        businessId: businessId || null,
        phoneNumber: phoneNumber || null,
        displayName: displayName || null,
      },
    });
  } catch (error) {
    console.error("Create WhatsApp account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create WhatsApp account",
    });
  }
}


// GET ALL WHATSAPP ACCOUNTS
export async function getWhatsappAccounts(
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
        id,
        organization_id,
        phone_number_id,
        waba_id,
        business_id,
        phone_number,
        display_name,
        created_at,
        updated_at
       FROM whatsapp_accounts
       WHERE organization_id = ?
       ORDER BY created_at DESC`,
      [organizationId]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get WhatsApp accounts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch WhatsApp accounts",
    });
  }
}


// GET WHATSAPP ACCOUNT BY ID
export async function getWhatsappAccountById(
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
        id,
        organization_id,
        phone_number_id,
        waba_id,
        business_id,
        phone_number,
        display_name,
        created_at,
        updated_at
       FROM whatsapp_accounts
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "WhatsApp account not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get WhatsApp account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch WhatsApp account",
    });
  }
}


// UPDATE WHATSAPP ACCOUNT
export async function updateWhatsappAccount(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    const {
      phoneNumberId,
      wabaId,
      businessId,
      phoneNumber,
      displayName,
      accessToken,
    } = req.body;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    const [existingAccounts]: any = await db.execute(
      `SELECT id
       FROM whatsapp_accounts
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (existingAccounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "WhatsApp account not found",
      });
    }

    // Check phone number ID uniqueness if changing it
    if (phoneNumberId) {
      const [duplicateAccounts]: any = await db.execute(
        `SELECT id
         FROM whatsapp_accounts
         WHERE phone_number_id = ?
         AND id != ?`,
        [phoneNumberId, id]
      );

      if (duplicateAccounts.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Phone number ID already exists",
        });
      }
    }

    await db.execute(
      `UPDATE whatsapp_accounts
       SET
         phone_number_id = COALESCE(?, phone_number_id),
         waba_id = COALESCE(?, waba_id),
         business_id = COALESCE(?, business_id),
         phone_number = COALESCE(?, phone_number),
         display_name = COALESCE(?, display_name),
         access_token = COALESCE(?, access_token)
       WHERE id = ?
       AND organization_id = ?`,
      [
        phoneNumberId ?? null,
        wabaId ?? null,
        businessId ?? null,
        phoneNumber ?? null,
        displayName ?? null,
        accessToken ?? null,
        id,
        organizationId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "WhatsApp account updated successfully",
    });
  } catch (error) {
    console.error("Update WhatsApp account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update WhatsApp account",
    });
  }
}


// DELETE WHATSAPP ACCOUNT
export async function deleteWhatsappAccount(
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
      `DELETE FROM whatsapp_accounts
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "WhatsApp account not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "WhatsApp account deleted successfully",
    });
  } catch (error) {
    console.error("Delete WhatsApp account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete WhatsApp account",
    });
  }
}