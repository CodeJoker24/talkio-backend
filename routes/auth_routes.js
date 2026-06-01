const express = require("express");
const router = express.Router();
const db = require("../lib/db"); 


router.post("/signup", async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        const { data, error: authError } = await db.auth.signUp({
            email,
            password
        });

        if (authError) {
            return res.status(400).json({ error: authError.message });
        }

        const { error: tableError } = await db.from("talkio")
            .insert({
                id: data.user.id,
                name,
                username: username.toLowerCase().trim(),
                email,
                status: "offline"
            });

        if (tableError) {
            return res.status(400).json({ error: tableError.message });
        }

        return res.status(201).json({ 
            message: "Account created successfully" 
        });

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
});


router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const { data: authData, error } = await db.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            if (error.message === "Email not confirmed") {
                return res.status(400).json({ error: "Check your email for Confirmation" });
            }
            return res.status(400).json({ error: error.message });
        }

        const { data: tableData, error: profileError } = await db.from("talkio")
            .select("*")
            .eq("id", authData.user.id)
            .single();

        if (profileError) {
            return res.status(400).json({ error: "Profile record not found." });
        }

        await db.from("talkio")
            .update({ status: "online" })
            .eq("id", authData.user.id);

        return res.json({
            message: "Login Successful",
            user: {
                id: tableData.id,
                email: tableData.email,
                name: tableData.name,
                username: tableData.username,
                status: "online"
            },
            session: authData.session
        });

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
});




router.get("/users/:currentUserId", async (req, res) => {
    try {
        const { currentUserId } = req.params;

        if (!currentUserId) {
            return res.status(400).json({ error: "Current User ID is required." });
        }

        const { data: users, error } = await db.from("talkio")
            .select("id, name, username, status")
            .neq("id", currentUserId); 

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json(users);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});




router.post("/add-buddy", async (req, res) => {
  const { currentUserId, buddyUsername } = req.body;

  try {
    
    const { data: buddy, error: findError } = await db
      .from("talkio")
      .select("id")
      .eq("username", buddyUsername.toLowerCase().trim())
      .single();

    if (findError || !buddy) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (buddy.id === currentUserId) {
      return res.status(400).json({ message: "You cannot add yourself!" });
    }

  
    const { data: existing, error: checkError } = await db
      .from("contacts")
      .select("*")
      .or(`and(user_id.eq.${currentUserId},buddy_id.eq.${buddy.id}),and(user_id.eq.${buddy.id},buddy_id.eq.${currentUserId})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(400).json({ message: "A friend request is already pending between you two!" });
      }
      return res.status(400).json({ message: "You are already buddies!" });
    }

    
    const { error: insertError } = await db
      .from("contacts")
      .insert([{ user_id: currentUserId, buddy_id: buddy.id, status: "pending" }]);

    if (insertError) throw insertError;

    res.status(200).json({ message: "Friend request sent successfully!" });
  } catch (error) {
    console.error("Error sending request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.get("/buddies/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    
    const { data, error } = await db
      .from("contacts")
      .select(`
        user_id,
        buddy_id,
        sender:talkio!contacts_user_id_fkey(id, name, username, status),
        receiver:talkio!contacts_buddy_id_fkey(id, name, username, status)
      `)
      .eq("status", "accepted")
      .or(`user_id.eq.${userId},buddy_id.eq.${userId}`);

    if (error) throw error;

   
    const buddies = data.map(item => {
      return item.user_id === userId ? item.receiver : item.sender;
    });

    res.status(200).json(buddies);
  } catch (error) {
    console.error("Error fetching buddies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.get("/requests/pending/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    
    const { data, error } = await db
      .from("contacts")
      .select(`
        id,
        user_id,
        sender:talkio!contacts_user_id_fkey(id, name, username)
      `)
      .eq("buddy_id", userId)
      .eq("status", "pending");

    if (error) throw error;

    const pendingRequests = data.map(item => ({
      requestId: item.id,
      ...item.sender
    }));

    res.status(200).json(pendingRequests);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.post("/requests/accept", async (req, res) => {
  const { requestId } = req.body;

  try {
    const { error } = await db
      .from("contacts")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (error) throw error;

    res.status(200).json({ message: "Friend request accepted!" });
  } catch (error) {
    console.error("Error accepting request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;