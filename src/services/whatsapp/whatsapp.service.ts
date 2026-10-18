import axios from "axios";

// =========================================
// WhatsApp Cloud API Configuration
// =========================================

const WHATSAPP_API_VERSION =
  process.env.WHATSAPP_API_VERSION || "v23.0";

const WHATSAPP_API_BASE_URL =
  `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

// =========================================
// Send WhatsApp Text Message
// =========================================

export async function sendWhatsAppTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  message: string
) {
  try {
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
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },
      }
    );

    return {
      success: true,

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