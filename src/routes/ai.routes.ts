import { Router } from "express";
import { generateAIResponse } from "../services/ai/ai.service";

const router = Router();

router.post("/test", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const result =
      await generateAIResponse(message);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("AI test error:", error);

    return res.status(500).json({
      success: false,
      message: "AI processing failed",
    });
  }
});

export default router;