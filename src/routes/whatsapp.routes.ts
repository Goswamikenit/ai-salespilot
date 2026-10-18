import { Router } from "express";
import { sendWhatsAppTextMessage } from "../services/whatsapp/whatsapp.service";
import { findWhatsAppAccount } from "../services/whatsapp/whatsappAccount.service";

const router = Router();

router.post("/test-send", async (req, res) => {
    try {
        const {
            phoneNumberId,
            to,
            message,
        } = req.body;

        if (!phoneNumberId || !to || !message) {
            return res.status(400).json({
                success: false,
                message:
                    "phoneNumberId, to and message are required",
            });
        }

        // Find WhatsApp account from database
        const whatsappAccount =
            await findWhatsAppAccount(phoneNumberId);

        if (!whatsappAccount) {
            return res.status(404).json({
                success: false,
                message:
                    "WhatsApp account not found for this phoneNumberId",
            });
        }

        // Send message
        // Access token is now handled inside whatsapp.service.ts
        const result =
            await sendWhatsAppTextMessage(
                whatsappAccount.phone_number_id,
                to,
                message
            );

        return res.status(200).json({
            success: true,
            whatsappAccountId:
                whatsappAccount.id,
            organizationId:
                whatsappAccount.organization_id,
            ...result,
        });
    } catch (error: any) {
        console.error(
            "WhatsApp test send error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to send WhatsApp message",
        });
    }
});

export default router;