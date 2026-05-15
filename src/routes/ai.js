import express from "express";
import { routerAgent } from "../ai/routerAgent.js";
import ConversationRepository from "../repositories/ConversationRepository.js";
import MessageRepository from "../repositories/MessageRepository.js";
import { validate } from "../middlewares/validate.js";
import { AiChatSchema } from "../shared/schemas.js";
import logger from "../lib/logger.js";

const router = express.Router();
const conversationRepo = new ConversationRepository();
const messageRepo = new MessageRepository();

// GET /ai/conversations
router.get("/conversations", async (req, res, next) => {
  try {
    const conversations = await conversationRepo.getRecentByUserId(req.user.id);
    return res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// GET /ai/conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res, next) => {
  try {
    const conversation = await conversationRepo.getById(req.params.id);
    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Conversación no encontrada" } });
    }
    const messages = await messageRepo.getByConversationId(req.params.id);
    return res.json(messages);
  } catch (err) {
    next(err);
  }
});

// POST /ai/chat
router.post("/chat", validate(AiChatSchema), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message, conversationId: providedConversationId } = req.body;

    logger.info("[AI/chat] request", { userId, length: message.length });

    let conversationId = providedConversationId;
    let isNewConversation = false;

    if (!conversationId) {
      const newConv = await conversationRepo.create(userId);
      conversationId = newConv.id;
      isNewConversation = true;
    } else {
      const existing = await conversationRepo.getById(conversationId);
      if (!existing || existing.userId !== userId) {
        // The provided conversationId is invalid or belongs to another user.
        // Return a clear error rather than silently creating a new conversation,
        // which would cause unbounded orphan-conversation proliferation.
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_CONVERSATION", message: "Conversación no válida. Inicia una nueva." },
        });
      }
    }

    const priorMessages = isNewConversation
      ? []
      : await messageRepo.getByConversationId(conversationId);

    await messageRepo.create(conversationId, "user", message);

    if (isNewConversation) {
      const title = message.slice(0, 50).trim() + (message.length > 50 ? "..." : "");
      await conversationRepo.updateTitle(conversationId, title);
    }

    const userRole = req.user?.role || "student";
    const responseObj = await routerAgent(message, userId, priorMessages, userRole);

    const resultText = typeof responseObj?.result === "string"
      ? responseObj.result
      : typeof responseObj === "string" ? responseObj : "";

    const actionPerformed = responseObj?.actionPerformed || null;
    const toolData        = responseObj?.data || null;
    const steps           = responseObj?.steps || [];

    await messageRepo.create(conversationId, "bot", resultText);

    logger.info("[AI/chat] response", { userId, length: resultText.length, actionPerformed, steps: steps.length });

    return res.json({ result: resultText, conversationId, actionPerformed, data: toolData, steps });
  } catch (err) {
    next(err);
  }
});

export default router;
