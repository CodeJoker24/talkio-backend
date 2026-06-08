const express = require("express");
const router = express.Router();
const db = require("../lib/db"); 


router.post("/", async (req, res) => {
  const { senderId, receiverId, messageText } = req.body;

  if (!senderId || !receiverId || !messageText?.trim()) {
    return res.status(400).json({ error: "Missing required message parameters." });
  }

  try {
    const { data, error } = await db
      .from("messages")
      .insert([
        {
          sender_id: senderId,
          receiver_id: receiverId,
          message_text: messageText.trim()
        }
      ])
      .select("*")
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    console.error("Error saving message:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/:userId/:buddyId", async (req, res) => {
  const { userId, buddyId } = req.params;

  try {
    const { data, error } = await db
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${buddyId}),and(sender_id.eq.${buddyId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching message history:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;