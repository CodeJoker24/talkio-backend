const { createClient } = require("@supabase/supabase-js/dist/index.cjs")
require("dotenv").config();

const db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
)

module.exports = db;