const express = require("express");
const router = express.Router();
const db = require("../lib/db");

// Signup route
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user exists
        const { data: existingUser } = await db
            .from("users")
            .select("*")
            .eq("email", email)
            .single();
        
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }
        
        // Create new user
        const { data, error } = await db
            .from("users")
            .insert([{ name, email, password }])
            .select();
        
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(201).json({ 
            message: "User created successfully", 
            user: data[0] 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login route
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const { data, error } = await db
            .from("users")
            .select("*")
            .eq("email", email)
            .single();
        
        if (error || !data) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
        
        // Check password (plain text - not secure, but for now)
        if (data.password !== password) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
        
        // Create session (simple)
        const session = {
            user_id: data.id,
            created_at: new Date()
        };
        
        res.status(200).json({ 
            message: "Login successful", 
            user: { id: data.id, name: data.name, email: data.email },
            session: session
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;