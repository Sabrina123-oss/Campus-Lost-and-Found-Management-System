const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const { authenticate, requireAdmin } = require("../middleware_auth");

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to get users" });
  }
});

router.get("/count", async (req, res) => {
  try {
    res.json({ count: await User.countDocuments() });
  } catch (error) {
    res.status(500).json({ message: "Failed to count users" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user ID" });
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to get user" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user ID" });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, role, status } = req.body;
    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (role !== undefined) {
      if (!["student", "admin"].includes(role)) return res.status(400).json({ message: "Invalid role" });
      user.role = role;
    }
    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) return res.status(400).json({ message: "Invalid status" });
      user.status = status;
    }

    const updated = await user.save();
    const safe = updated.toObject();
    delete safe.password;
    res.json(safe);
  } catch (error) {
    const duplicate = error.code === 11000;
    res.status(duplicate ? 409 : 500).json({ message: duplicate ? "Email already registered" : "Failed to update user", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user ID" });
    if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: "You cannot delete your own admin account" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.status = "inactive";
    await user.save();
    res.json({ message: "User suspended successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to suspend user" });
  }
});

module.exports = router;
