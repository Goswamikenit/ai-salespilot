import "dotenv/config";
import express from "express";
import cors from "cors";
import organizationRoutes from "./routes/organization.routes";
import userRoutes from "./routes/user.routes";
import whatsappAccountRoutes from "./routes/whatsappAccount.routes";
import customerRoutes from "./routes/customer.routes";
import conversationRoutes from "./routes/conversation.routes";
import messageRoutes from "./routes/message.routes";
import campaignRoutes from "./routes/campaign.routes";
import authRoutes from "./routes/auth.routes";
import whatsappWebhookRoutes from "./routes/webhook/whatsappWebhook.routes";
import aiRoutes from "./routes/ai.routes";

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/organizations", organizationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/whatsapp-accounts", whatsappAccountRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/webhooks/whatsapp", whatsappWebhookRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/webhooks/whatsapp", whatsappWebhookRoutes);

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "AI SalesPilot API is running",
  });
});

app.get("/db-health", async (_req, res) => {
  try {
    const { testDatabase } = await import("./config/database.js");

    await testDatabase();

    res.json({
      success: true,
      message: "MySQL database is connected",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "MySQL database connection failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});