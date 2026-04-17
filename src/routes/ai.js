import express from "express";
import { routerAgent } from "../ai/routerAgent.js";
import ConversationRepository from "../repositories/ConversationRepository.js";
import MessageRepository from "../repositories/MessageRepository.js";

const router = express.Router();
const conversationRepo = new ConversationRepository();
const messageRepo = new MessageRepository();

// GET /ai/conversations - Get all recent conversations for the user (with lazy cleanup)
router.get("/conversations", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const conversations = await conversationRepo.getRecentByUserId(userId);
    return res.json(conversations);
  } catch (err) {
    console.error("[AI/conversations] error", err);
    return res.status(500).json({ error: "Error al obtener conversaciones" });
  }
});

// GET /ai/conversations/:id/messages - Get messages for a specific conversation
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const userId = req.user?.id;
    const conversationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Verify ownership
    const conversation = await conversationRepo.getById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ error: "Conversación no encontrada" });
    }

    const messages = await messageRepo.getByConversationId(conversationId);
    return res.json(messages);
  } catch (err) {
    console.error("[AI/messages] error", err);
    return res.status(500).json({ error: "Error al obtener mensajes" });
  }
});

// POST /ai/chat - Send a message
router.post("/chat", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { message, conversationId: providedConversationId } = req.body || {};

    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message debe ser texto" });
    }

    console.info("[AI/chat] request", { userId, preview: message.slice(0, 80), conversationId: providedConversationId });

    let conversationId = providedConversationId;
    let isNewConversation = false;

    // 1. Create or validate conversation
    if (!conversationId) {
      const newConv = await conversationRepo.create(userId); // Title default is 'Nueva conversación'
      conversationId = newConv.id;
      isNewConversation = true;
    } else {
      // Verify ownership if ID provided
      const existing = await conversationRepo.getById(conversationId);
      if (!existing || existing.userId !== userId) {
        // If invalid ID, treat as new conversation
        const newConv = await conversationRepo.create(userId);
        conversationId = newConv.id;
        isNewConversation = true;
      }
    }

    // 2. Save User Message
    await messageRepo.create(conversationId, "user", message);

    // 3. Update Title if it's the first user message
    if (isNewConversation) {
      const title = message.slice(0, 50).trim() + (message.length > 50 ? "..." : "");
      await conversationRepo.updateTitle(conversationId, title);
    }

    // 4. Get AI Response
    const responseObj = await routerAgent(message, userId);

    const resultText = typeof responseObj?.result === "string"
      ? responseObj.result
      : typeof responseObj === "string"
        ? responseObj
        : "";

    const actionPerformed = responseObj?.actionPerformed || null;
    const toolData = responseObj?.data || null;

    // 5. Save AI Message
    await messageRepo.create(conversationId, "bot", resultText);

    console.info("[AI/chat] response", { userId, preview: resultText.slice(0, 80), actionPerformed });

    return res.json({ result: resultText, conversationId, actionPerformed, data: toolData });
  } catch (err) {
    console.error("[AI/chat] error", err);
    return res.status(500).json({ error: "Error en IA" });
  }
});

export default router;
