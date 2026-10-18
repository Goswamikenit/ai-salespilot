import axios from "axios";
import { db } from "../../config/database";

// =========================================
// WhatsApp Cloud API Configuration
// =========================================

const WHATSAPP_API_VERSION =
  process.env.WHATSAPP_API_VERSION || "v23.0";

const WHATSAPP_API_BASE_URL =
  `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

// =========================================
// Get WhatsApp Account
// =========================================

async function getWhatsAppAccount(
  phoneNumberId: string
) {
  const [rows]: any = await db.execute(
    `SELECT
       id,
       organization_id,
       phone_number_id,
       waba_id,
       phone_number,
       display_name,
       access_token
     FROM whatsapp_accounts
     WHERE phone_number_id = ?
     LIMIT 1`,
    [phoneNumberId]
  );

  if (!rows.length) {
    throw new Error(
      "WhatsApp account not found"
    );
  }

  return rows[0];
}

// =========================================
// Send WhatsApp Text Message
// =========================================

export async function sendWhatsAppTextMessage(
  phoneNumberId: string,
  to: string,
  message: string
) {
  try {
    // Get account + token from database
    const account =
      await getWhatsAppAccount(phoneNumberId);

    const url =
      `${WHATSAPP_API_BASE_URL}/${phoneNumberId}/messages`;

    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      },
      {
        headers: {
          Authorization:
            `Bearer ${account.access_token}`,
          "Content-Type":
            "application/json",
        },
      }
    );

    return {
      success: true,
      whatsappAccountId: account.id,
      organizationId: account.organization_id,
      messageId:
        response.data?.messages?.[0]?.id || null,
      data: response.data,
    };
  } catch (error: any) {
    console.error(
      "❌ WhatsApp send message error:",
      error.response?.data ||
        error.message
    );

    throw new Error(
      error.response?.data?.error?.message ||
        "Failed to send WhatsApp message"
    );
  }
}