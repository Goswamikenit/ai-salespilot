import { Request, Response } from "express";

import {
  findWhatsAppAccountByPhoneNumberId,
  findOrCreateCustomer,
  findOrCreateConversation,
  saveIncomingMessage,
  updateMessageStatus,
} from "../../services/webhook/whatsappWebhook.service";

import {
  generateAIResponse,
  saveAIMessage,
  markAIMessageAsSent,
} from "../../services/ai/ai.service";

import {
  sendWhatsAppTextMessage,
} from "../../services/whatsapp/whatsapp.service";

// =========================================
// WhatsApp Webhook Verification
// =========================================

export function verifyWhatsAppWebhook(
  req: Request,
  res: Response
) {
  try {
    const mode =
      req.query["hub.mode"];

    const token =
      req.query["hub.verify_token"];

    const challenge =
      req.query["hub.challenge"];

    const verifyToken =
      process.env.WHATSAPP_VERIFY_TOKEN;

    if (!verifyToken) {
      return res.status(500).json({
        success: false,
        message:
          "WhatsApp verify token is not configured",
      });
    }

    if (
      mode === "subscribe" &&
      token === verifyToken
    ) {
      return res
        .status(200)
        .send(challenge);
    }

    return res.status(403).json({
      success: false,
      message:
        "Webhook verification failed",
    });
  } catch (error) {
    console.error(
      "WhatsApp webhook verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Webhook verification failed",
    });
  }
}

// =========================================
// Receive WhatsApp Webhook
// =========================================

export async function receiveWhatsAppWebhook(
  req: Request,
  res: Response
) {
  try {
    console.log(
      "📩 WhatsApp webhook received:",
      JSON.stringify(
        req.body,
        null,
        2
      )
    );

    // =========================================
    // Get Webhook Data
    // =========================================

    const entry =
      req.body?.entry?.[0];

    const change =
      entry?.changes?.[0];

    const value =
      change?.value;

    const phoneNumberId =
      value?.metadata?.phone_number_id;

    if (!phoneNumberId) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number ID not found in webhook",
      });
    }

    // =========================================
    // 1. Handle WhatsApp Message Status
    // =========================================

    const statuses =
      value?.statuses;

    if (
      statuses &&
      statuses.length > 0
    ) {
      const statusData =
        statuses[0];

      const externalMessageId =
        statusData.id;

      const whatsappStatus =
        statusData.status;

      if (
        !externalMessageId ||
        !whatsappStatus
      ) {
        return res.status(200).json({
          success: true,
          message:
            "Status webhook received, but status data is incomplete",
        });
      }

      // =========================================
      // Map WhatsApp Status
      // =========================================

      const statusMap: Record<
        string,
        | "SENT"
        | "DELIVERED"
        | "READ"
        | "FAILED"
      > = {
        sent: "SENT",
        delivered: "DELIVERED",
        read: "READ",
        failed: "FAILED",
      };

      const mappedStatus =
        statusMap[whatsappStatus];

      // =========================================
      // Unsupported Status
      // =========================================

      if (!mappedStatus) {
        return res.status(200).json({
          success: true,
          message:
            "Status received but not supported yet",
          data: {
            status:
              whatsappStatus,
          },
        });
      }

      // =========================================
      // Update Message Status
      // =========================================

      const updatedMessage =
        await updateMessageStatus(
          externalMessageId,
          mappedStatus
        );

      // =========================================
      // Message Not Found
      // =========================================

      if (!updatedMessage) {
        return res.status(200).json({
          success: true,
          message:
            "Status received, but message was not found",
          data: {
            externalMessageId,
            status:
              mappedStatus,
          },
        });
      }

      console.log(
        "✅ Message status updated:",
        {
          messageId:
            updatedMessage.id,

          externalId:
            updatedMessage.external_id,

          status:
            updatedMessage.status,
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Message status updated successfully",
        data: {
          messageId:
            updatedMessage.id,

          externalMessageId:
            updatedMessage.external_id,

          status:
            updatedMessage.status,
        },
      });
    }

    // =========================================
    // 2. Find WhatsApp Account
    // =========================================

    const whatsappAccount =
      await findWhatsAppAccountByPhoneNumberId(
        phoneNumberId
      );

    if (!whatsappAccount) {
      return res.status(404).json({
        success: false,
        message:
          "WhatsApp account not found",
      });
    }

    console.log(
      "✅ WhatsApp account found:",
      {
        id:
          whatsappAccount.id,

        organizationId:
          whatsappAccount.organization_id,

        phoneNumberId:
          whatsappAccount.phone_number_id,
      }
    );

    // =========================================
    // 3. Get Customer Information
    // =========================================

    const contact =
      value?.contacts?.[0];

    const customerPhone =
      contact?.wa_id ||
      value?.messages?.[0]?.from;

    const customerName =
      contact?.profile?.name ||
      null;

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        message:
          "Customer phone number not found in webhook",
      });
    }

    // =========================================
    // 4. Find or Create Customer
    // =========================================

    const customerResult =
      await findOrCreateCustomer(
        whatsappAccount.organization_id,
        customerPhone,
        customerName
      );

    console.log(
      "✅ Customer processed:",
      {
        customerId:
          customerResult.customer.id,

        name:
          customerResult.customer.name,

        phone:
          customerResult.customer.phone,

        created:
          customerResult.created,
      }
    );

    // =========================================
    // 5. Find or Create Conversation
    // =========================================

    const conversationResult =
      await findOrCreateConversation(
        whatsappAccount.organization_id,
        customerResult.customer.id,
        whatsappAccount.id
      );

    console.log(
      "✅ Conversation processed:",
      {
        conversationId:
          conversationResult
            .conversation.id,

        customerId:
          conversationResult
            .conversation.customer_id,

        whatsappAccountId:
          conversationResult
            .conversation
            .whatsapp_account_id,

        created:
          conversationResult.created,
      }
    );

    // =========================================
    // 6. Get Incoming Message
    // =========================================

    const incomingMessage =
      value?.messages?.[0];

    if (!incomingMessage) {
      return res.status(200).json({
        success: true,
        message:
          "Webhook received, but no message found",
      });
    }

    // =========================================
    // 7. Check Message Type
    // =========================================

    const messageType =
      incomingMessage.type;

    if (
      messageType !== "text"
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Webhook received, but message type is not supported yet",
        data: {
          messageType,
        },
      });
    }

    // =========================================
    // 8. Get Message Data
    // =========================================

    const messageContent =
      incomingMessage.text?.body;

    const externalMessageId =
      incomingMessage.id;

    if (
      !messageContent ||
      !externalMessageId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message content or message ID not found",
      });
    }

    // =========================================
    // 9. Save Incoming Message
    // =========================================

    const savedMessageResult =
      await saveIncomingMessage(
        conversationResult
          .conversation.id,

        messageContent,

        externalMessageId
      );

    const savedMessage =
      savedMessageResult.message;

    console.log(
      "✅ Incoming message processed:",
      {
        messageId:
          savedMessage.id,

        conversationId:
          savedMessage.conversation_id,

        content:
          savedMessage.content,

        externalId:
          savedMessage.external_id,

        created:
          savedMessageResult.created,
      }
    );

    // =========================================
    // 10. Generate AI Response
    // =========================================

    const aiResponse =
      await generateAIResponse(
        messageContent
      );

    console.log(
      "🤖 AI response generated:",
      {
        reply:
          aiResponse.reply,

        intent:
          aiResponse.intent,

        confidence:
          aiResponse.confidence,
      }
    );

    // =========================================
    // 11. Save AI Generated Message
    // =========================================

    const aiMessage =
      await saveAIMessage(
        conversationResult
          .conversation.id,

        aiResponse.reply
      );

    console.log(
      "🤖 AI message saved:",
      {
        messageId:
          aiMessage.id,

        conversationId:
          aiMessage.conversation_id,

        content:
          aiMessage.content,

        status:
          aiMessage.status,

        aiGenerated:
          aiMessage.ai_generated,
      }
    );

    // =========================================
    // 12. Send AI Response to WhatsApp
    // =========================================

    const whatsappSendResult =
      await sendWhatsAppTextMessage(
        phoneNumberId,
        customerPhone,
        aiResponse.reply
      );

    console.log(
      "📤 AI response sent to WhatsApp:",
      {
        messageId:
          whatsappSendResult.messageId,
      }
    );

    // =========================================
    // 13. Mark AI Message as SENT
    // =========================================

    let sentAIMessage =
      aiMessage;

    if (
      whatsappSendResult.messageId
    ) {
      sentAIMessage =
        await markAIMessageAsSent(
          aiMessage.id,
          whatsappSendResult.messageId
        );

      console.log(
        "✅ AI message marked as SENT:",
        {
          messageId:
            sentAIMessage.id,

          externalId:
            sentAIMessage.external_id,

          status:
            sentAIMessage.status,
        }
      );
    }

    // =========================================
    // 14. Final Response
    // =========================================

    return res.status(200).json({
      success: true,

      message:
        "Webhook received, AI response generated and sent successfully",

      data: {
        // WhatsApp Account
        whatsappAccountId:
          whatsappAccount.id,

        organizationId:
          whatsappAccount.organization_id,

        // Customer
        customerId:
          customerResult.customer.id,

        customerCreated:
          customerResult.created,

        // Conversation
        conversationId:
          conversationResult
            .conversation.id,

        conversationCreated:
          conversationResult.created,

        // Incoming Message
        incomingMessageId:
          savedMessage.id,

        messageCreated:
          savedMessageResult.created,

        incomingMessage:
          savedMessage.content,

        // AI Response
        aiMessageId:
          sentAIMessage.id,

        aiReply:
          aiResponse.reply,

        aiIntent:
          aiResponse.intent,

        aiConfidence:
          aiResponse.confidence,

        aiMessageStatus:
          sentAIMessage.status,

        aiExternalId:
          sentAIMessage.external_id,

        aiGenerated:
          sentAIMessage.ai_generated,
      },
    });
  } catch (error) {
    console.error(
      "WhatsApp webhook receive error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Webhook processing failed",
    });
  }
}