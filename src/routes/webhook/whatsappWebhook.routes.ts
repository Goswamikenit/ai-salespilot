import { Router } from "express";
import { verifyWhatsAppWebhook,
        receiveWhatsAppWebhook
 } from "../../controllers/webhook/whatsappWebhook.controller";

const router = Router();

router.get("/", verifyWhatsAppWebhook);
router.post("/", receiveWhatsAppWebhook);

export default router;