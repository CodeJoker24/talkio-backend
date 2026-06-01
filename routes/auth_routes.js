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
   
    const { data: buddy, error: findError } = await supabase
      .from("talkio")
      .select("id")
      .eq("username", buddyUsername)
      .single();

    if (findError || !buddy) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (buddy.id === currentUserId) {
      return res.status(400).json({ message: "You cannot add yourself!" });
    }

    
    const { error: insertError } = await supabase
      .from("contacts")
      .insert([{ user_id: currentUserId, buddy_id: buddy.id }]);

    if (insertError) {
      
      if (insertError.code === "23505") {
        return res.status(400).json({ message: "This buddy is already added!" });
      }
      throw insertError;
    }

    res.status(200).json({ message: "Buddy added successfully!" });
  } catch (error) {
    console.error("Error adding buddy:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.get("/buddies/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
   
    const { data, error } = await supabase
      .from("contacts")
      .select(`
        buddy_id,
        talkio!contacts_buddy_id_fkey (
          id,
          name,
          username,
          status,
          email
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;

    
    const buddies = data.map(item => item.talkio);
    res.status(200).json(buddies);
  } catch (error) {
    console.error("Error fetching buddies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



module.exports = router;