const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("./models/User");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const email = (process.env.ADMIN_EMAIL || "admin@campusfind.com").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!password) throw new Error("Set ADMIN_PASSWORD in .env before creating the admin account.");

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log("Admin already exists.");
      return;
    }

    const admin = await User.create({
      name: process.env.ADMIN_NAME || "CampusFind Admin",
      email,
      password: await bcrypt.hash(password, 10),
      role: "admin"
    });
    console.log(`Admin created successfully: ${admin.email}`);
  } catch (error) {
    console.error("Failed to create admin:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
