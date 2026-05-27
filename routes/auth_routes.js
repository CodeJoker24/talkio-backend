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






router.post("/logout", async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required to execute session cleanups." });
        }
        const { error } = await db.from("talkio")
            .update({ status: "offline" })
            .eq("id", userId);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({ message: "Presence states successfully synchronized to offline status." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
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



module.exports = router;