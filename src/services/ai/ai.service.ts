import { db } from "../../config/database";

export interface AIResponse {
  reply: string;
  intent: string;
  confidence: number;
}

export async function generateAIResponse(
  message: string
): Promise<AIResponse> {
  const normalizedMessage =
    message.toLowerCase().trim();

  if (
    normalizedMessage.includes("price") ||
    normalizedMessage.includes("cost")
  ) {
    return {
      reply:
        "Sure! I can help you with the product pricing. Please let me know which product you're interested in.",
      intent: "PRODUCT_PRICE",
      confidence: 0.95,
    };
  }

  if (
    normalizedMessage.includes("hello") ||
    normalizedMessage.includes("hi") ||
    normalizedMessage.includes("hey")
  ) {
    return {
      reply:
        "Hello! 👋 Welcome to our business. How can I help you today?",
      intent: "GREETING",
      confidence: 0.98,
    };
  }

  if (
    normalizedMessage.includes("buy") ||
    normalizedMessage.includes("order") ||
    normalizedMessage.includes("purchase")
  ) {
    return {
      reply:
        "Sure! I'd be happy to help you place an order. Which product would you like to order?",
      intent: "PURCHASE_INTENT",
      confidence: 0.92,
    };
  }

  return {
    reply:
      "Thanks for your message! I'd be happy to help. Could you please tell me a little more about what you're looking for?",
    intent: "GENERAL_QUERY",
    confidence: 0.75,
  };
}

// =========================================
// Save AI Generated Message
// =========================================

export async function saveAIMessage(
  conversationId: string,
  content: string
) {
  const { randomUUID } = await import("crypto");

  const messageId = randomUUID();

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
     VALUES (?, ?, 'OUTBOUND', 'PENDING', ?, NULL, TRUE)`,
    [
      messageId,
      conversationId,
      content,
    ]
  );

  // Update conversation last message time
  await db.execute(
    `UPDATE conversations
     SET last_message_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [conversationId]
  );

  const [messages]: any = await db.execute(
    `SELECT
       id,
       conversation_id,
       direction,
       status,
       content,
       external_id,
       ai_generated,
       created_at
     FROM messages
     WHERE id = ?
     LIMIT 1`,
    [messageId]
  );

  return messages[0];
}

export async function markAIMessageAsSent(
  messageId: string,
  externalId: string
) {
  await db.execute(
    `UPDATE messages
     SET
       status = 'SENT',
       external_id = ?
     WHERE id = ?`,
    [externalId, messageId]
  );

  const [messages]: any = await db.execute(
    `SELECT
       id,
       conversation_id,
       direction,
       status,
       content,
       external_id,
       ai_generated,
       created_at
     FROM messages
     WHERE id = ?
     LIMIT 1`,
    [messageId]
  );

  return messages[0];
}