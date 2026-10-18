import { Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../config/database";
import { AuthRequest } from "../middlewares/auth.middleware";

// CREATE MESSAGE
export async function createMessage(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;

    const {
      conversationId,
      direction,
      status = "PENDING",
      content,
      externalId,
      aiGenerated = false,
    } = req.body;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    if (!conversationId || !direction || !content) {
      return res.status(400).json({
        success: false,
        message:
          "Conversation ID, direction and content are required",
      });
    }

    const validDirections = ["INBOUND", "OUTBOUND"];
    const validStatuses = [
      "PENDING",
      "SENT",
      "DELIVERED",
      "READ",
      "FAILED",
    ];

    if (!validDirections.includes(direction)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message direction",
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message status",
      });
    }

    // Check conversation belongs to logged-in organization
    const [conversations]: any = await db.execute(
      `SELECT id
       FROM conversations
       WHERE id = ?
       AND organization_id = ?`,
      [conversationId, organizationId]
    );

    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found in your organization",
      });
    }

    const id = randomUUID();

    await db.execute(
      `INSERT INTO messages
       (
         id,
         conversation_id,
         direction,
         status,
         content,
         external_id,
         ai_generated
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        conversationId,
        direction,
        status,
        content,
        externalId || null,
        aiGenerated ? 1 : 0,
      ]
    );

    // Update conversation last message time
    await db.execute(
      `UPDATE conversations
       SET last_message_at = CURRENT_TIMESTAMP
       WHERE id = ?
       AND organization_id = ?`,
      [conversationId, organizationId]
    );

    return res.status(201).json({
      success: true,
      message: "Message created successfully",
      data: {
        id,
        conversationId,
        direction,
        status,
        content,
        externalId: externalId || null,
        aiGenerated: Boolean(aiGenerated),
      },
    });
  } catch (error) {
    console.error("Create message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create message",
    });
  }
}


// GET ALL MESSAGES
export async function getMessages(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const { conversationId } = req.query;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    let query = `
      SELECT
        m.id,
        m.conversation_id,
        m.direction,
        m.status,
        m.content,
        m.external_id,
        m.ai_generated,
        m.created_at

      FROM messages m

      INNER JOIN conversations c
        ON m.conversation_id = c.id

      WHERE c.organization_id = ?
    `;

    const params: any[] = [organizationId];

    if (conversationId) {
      query += ` AND m.conversation_id = ?`;
      params.push(conversationId);
    }

    query += ` ORDER BY m.created_at ASC`;

    const [rows] = await db.execute(query, params);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
}


// GET MESSAGE BY ID
export async function getMessageById(
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
        m.id,
        m.conversation_id,
        m.direction,
        m.status,
        m.content,
        m.external_id,
        m.ai_generated,
        m.created_at

       FROM messages m

       INNER JOIN conversations c
         ON m.conversation_id = c.id

       WHERE m.id = ?
       AND c.organization_id = ?`,
      [id, organizationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch message",
    });
  }
}


// UPDATE MESSAGE
export async function updateMessage(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    const {
      status,
      content,
      aiGenerated,
    } = req.body;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    const validStatuses = [
      "PENDING",
      "SENT",
      "DELIVERED",
      "READ",
      "FAILED",
    ];

    if (
      status &&
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid message status",
      });
    }

    const [existingMessages]: any = await db.execute(
      `SELECT m.id
       FROM messages m

       INNER JOIN conversations c
         ON m.conversation_id = c.id

       WHERE m.id = ?
       AND c.organization_id = ?`,
      [id, organizationId]
    );

    if (existingMessages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    await db.execute(
      `UPDATE messages m
       INNER JOIN conversations c
         ON m.conversation_id = c.id

       SET
         m.status = COALESCE(?, m.status),
         m.content = COALESCE(?, m.content),
         m.ai_generated = COALESCE(?, m.ai_generated)

       WHERE m.id = ?
       AND c.organization_id = ?`,
      [
        status ?? null,
        content ?? null,
        aiGenerated === undefined
          ? null
          : aiGenerated
            ? 1
            : 0,
        id,
        organizationId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Message updated successfully",
    });
  } catch (error) {
    console.error("Update message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update message",
    });
  }
}


// DELETE MESSAGE
export async function deleteMessage(
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
      `DELETE m
       FROM messages m

       INNER JOIN conversations c
         ON m.conversation_id = c.id

       WHERE m.id = ?
       AND c.organization_id = ?`,
      [id, organizationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
}