import { Router } from "express";
import { sendWhatsAppTextMessage } from "../services/whatsapp/whatsapp.service";

const router = Router();

router.post("/test-send", async (req, res) => {
  try {
    const {
      phoneNumberId,
      accessToken,
      to,
      message,
    } = req.body;

    if (
      !phoneNumberId ||
      !accessToken ||
      !to ||
      !message
    ) {
      return res.status(400).json({
        success: false,
        message:
          "phoneNumberId, accessToken, to and message are required",
      });
    }

    const result =
      await sendWhatsAppTextMessage(
        phoneNumberId,
        accessToken,
        to,
        message
      );

    return res.status(200).json(result);
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