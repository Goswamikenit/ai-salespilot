import { Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../config/database";
import { AuthRequest } from "../middlewares/auth.middleware";

// CREATE CONVERSATION
export async function createConversation(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;

    const {
      customerId,
      whatsappAccountId,
      channel = "WHATSAPP",
      status = "OPEN",
    } = req.body;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    if (!customerId || !whatsappAccountId) {
      return res.status(400).json({
        success: false,
        message:
          "Customer ID and WhatsApp account ID are required",
      });
    }

    const validChannels = ["WHATSAPP", "INSTAGRAM"];
    const validStatuses = ["OPEN", "CLOSED"];

    if (!validChannels.includes(channel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel",
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation status",
      });
    }

    // Check customer belongs to logged-in organization
    const [customers]: any = await db.execute(
      `SELECT id
       FROM customers
       WHERE id = ?
       AND organization_id = ?`,
      [customerId, organizationId]
    );

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found in your organization",
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

    // Prevent duplicate OPEN conversation
    if (status === "OPEN") {
      const [existingConversations]: any = await db.execute(
        `SELECT id
         FROM conversations
         WHERE organization_id = ?
         AND customer_id = ?
         AND whatsapp_account_id = ?
         AND status = 'OPEN'`,
        [
          organizationId,
          customerId,
          whatsappAccountId,
        ]
      );

      if (existingConversations.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            "An open conversation already exists for this customer",
          data: {
            id: existingConversations[0].id,
          },
        });
      }
    }

    const id = randomUUID();

    await db.execute(
      `INSERT INTO conversations
       (
         id,
         organization_id,
         customer_id,
         whatsapp_account_id,
         channel,
         status
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        organizationId,
        customerId,
        whatsappAccountId,
        channel,
        status,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      data: {
        id,
        organizationId,
        customerId,
        whatsappAccountId,
        channel,
        status,
      },
    });
  } catch (error) {
    console.error("Create conversation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create conversation",
    });
  }
}


// GET ALL CONVERSATIONS
export async function getConversations(
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
        c.customer_id,
        c.whatsapp_account_id,
        c.channel,
        c.status,
        c.last_message_at,
        c.created_at,
        c.updated_at,

        cu.name AS customer_name,
        cu.phone AS customer_phone,

        wa.display_name AS whatsapp_display_name,
        wa.phone_number AS whatsapp_phone_number

       FROM conversations c

       INNER JOIN customers cu
         ON c.customer_id = cu.id

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
    console.error("Get conversations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
    });
  }
}


// GET CONVERSATION BY ID
export async function getConversationById(
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
        c.customer_id,
        c.whatsapp_account_id,
        c.channel,
        c.status,
        c.last_message_at,
        c.created_at,
        c.updated_at,

        cu.name AS customer_name,
        cu.phone AS customer_phone,

        wa.display_name AS whatsapp_display_name,
        wa.phone_number AS whatsapp_phone_number

       FROM conversations c

       INNER JOIN customers cu
         ON c.customer_id = cu.id

       INNER JOIN whatsapp_accounts wa
         ON c.whatsapp_account_id = wa.id

       WHERE c.id = ?
       AND c.organization_id = ?`,
      [id, organizationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get conversation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversation",
    });
  }
}


// UPDATE CONVERSATION
export async function updateConversation(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    const { status } = req.body;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    const validStatuses = ["OPEN", "CLOSED"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required: OPEN or CLOSED",
      });
    }

    const [existingConversations]: any = await db.execute(
      `SELECT id
       FROM conversations
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (existingConversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    await db.execute(
      `UPDATE conversations
       SET status = ?
       WHERE id = ?
       AND organization_id = ?`,
      [
        status,
        id,
        organizationId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Conversation updated successfully",
    });
  } catch (error) {
    console.error("Update conversation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update conversation",
    });
  }
}


// DELETE CONVERSATION
export async function deleteConversation(
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
      `DELETE FROM conversations
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Delete conversation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete conversation",
    });
  }
}