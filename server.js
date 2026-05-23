const express = require("express");
const cors = require("cors");
const db = require("./lib/db");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const authRoutes = require("./routes/auth_routes");

app.use(cors());
app.use(express.json());
app.use("/api/auth_routes", authRoutes);



app.get("/", (req, res)=>{
    res.send("App is running!")
});

app.listen(PORT, ()=>{
console.log(`App is listening on port http://127.0.0.1:${PORT}`)
})
