import { db } from "../../config/database";

export async function findWhatsAppAccountByPhoneNumberId(
  phoneNumberId: string
) {
  const [rows]: any = await db.execute(
    `SELECT id, organization_id, phone_number_id
     FROM whatsapp_accounts
     WHERE phone_number_id = ?
     LIMIT 1`,
    [phoneNumberId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

export async function findOrCreateCustomer(
  organizationId: string,
  phone: string,
  name?: string
) {
  const [existingCustomers]: any = await db.execute(
    `SELECT id, organization_id, name, phone, email
     FROM customers
     WHERE organization_id = ?
     AND phone = ?
     LIMIT 1`,
    [organizationId, phone]
  );

  if (existingCustomers.length > 0) {
    return {
      customer: existingCustomers[0],
      created: false,
    };
  }

  const { randomUUID } = await import("crypto");

  const customerId = randomUUID();

  await db.execute(
    `INSERT INTO customers
     (id, organization_id, name, phone)
     VALUES (?, ?, ?, ?)`,
    [
      customerId,
      organizationId,
      name || null,
      phone,
    ]
  );

  const [newCustomers]: any = await db.execute(
    `SELECT id, organization_id, name, phone, email
     FROM customers
     WHERE id = ?
     LIMIT 1`,
    [customerId]
  );

  return {
    customer: newCustomers[0],
    created: true,
  };
}

export async function findOrCreateConversation(
  organizationId: string,
  customerId: string,
  whatsappAccountId: string
) {
  const [existingConversations]: any = await db.execute(
    `SELECT id, organization_id, customer_id, whatsapp_account_id,
            channel, status, last_message_at
     FROM conversations
     WHERE organization_id = ?
       AND customer_id = ?
       AND whatsapp_account_id = ?
       AND status = 'OPEN'
     LIMIT 1`,
    [
      organizationId,
      customerId,
      whatsappAccountId,
    ]
  );

  if (existingConversations.length > 0) {
    return {
      conversation: existingConversations[0],
      created: false,
    };
  }

  const { randomUUID } = await import("crypto");

  const conversationId = randomUUID();

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
     VALUES (?, ?, ?, ?, 'WHATSAPP', 'OPEN')`,
    [
      conversationId,
      organizationId,
      customerId,
      whatsappAccountId,
    ]
  );

  const [newConversations]: any = await db.execute(
    `SELECT id, organization_id, customer_id,
            whatsapp_account_id, channel, status,
            last_message_at
     FROM conversations
     WHERE id = ?
     LIMIT 1`,
    [conversationId]
  );

  return {
    conversation: newConversations[0],
    created: true,
  };
}


export async function saveIncomingMessage(
  conversationId: string,
  content: string,
  externalId: string
) {
  // 1. Check if this webhook message already exists
  const [existingMessages]: any = await db.execute(
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
     WHERE external_id = ?
     LIMIT 1`,
    [externalId]
  );

  // 2. If already exists, return existing message
  if (existingMessages.length > 0) {
    return {
      message: existingMessages[0],
      created: false,
    };
  }

  // 3. Create new message
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
     VALUES (?, ?, 'INBOUND', 'DELIVERED', ?, ?, FALSE)`,
    [
      messageId,
      conversationId,
      content,
      externalId,
    ]
  );

  // 4. Update conversation last message time
  await db.execute(
    `UPDATE conversations
     SET last_message_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [conversationId]
  );

  // 5. Get saved message
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

  return {
    message: messages[0],
    created: true,
  };
}
export async function updateMessageStatus(
  externalId: string,
  status: "SENT" | "DELIVERED" | "READ" | "FAILED"
) {
  // Find message
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
     WHERE external_id = ?
     LIMIT 1`,
    [externalId]
  );

  // Message not found
  if (messages.length === 0) {
    return null;
  }

  const message = messages[0];

  // Update status
  await db.execute(
    `UPDATE messages
     SET status = ?
     WHERE id = ?`,
    [status, message.id]
  );

  // Get updated message
  const [updatedMessages]: any = await db.execute(
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
    [message.id]
  );

  return updatedMessages[0];
}