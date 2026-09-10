const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const itemRoutes = require("./routes/itemRoutes");
const authRoutes = require("./routes/authRoutes");
const claimRoutes = require("./routes/claimRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from .env");
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing from .env");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => res.json({ message: "CampusFind API is running" }));
app.get("/api/health", (req, res) => res.json({ ok: mongoose.connection.readyState === 1 }));

app.use("/api/items", itemRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/users", userRoutes);

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB connected successfully!");
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

start();
