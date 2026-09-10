const express = require("express");
const mongoose = require("mongoose");
const Item = require("../models/Item");
const { authenticate, requireAdmin, requireStudent } = require("../middleware_auth");

const router = express.Router();

// Public: approved items only. Admins can still see everything from the admin UI.
router.get("/", async (req, res) => {
  try {
    const items = await Item.find({ status: "Approved" }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch items", error: error.message });
  }
});

// Logged-in student: their own reports.
router.get("/mine/count", authenticate, requireStudent, async (req, res) => {
  try {
    const count = await Item.countDocuments({ createdBy: req.user._id });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Failed to count your reports" });
  }
});

router.get("/mine", authenticate, requireStudent, async (req, res) => {
  try {
    const items = await Item.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your reports", error: error.message });
  }
});

// Admin: all reports.
router.get("/admin/all", authenticate, requireAdmin, async (req, res) => {
  try {
    const items = await Item.find().populate("createdBy", "name email").sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admin reports", error: error.message });
  }
});

// Admin: single report, including pending/rejected items.
router.get("/admin/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid item ID" });
    const item = await Item.findById(req.params.id).populate("createdBy", "name email");
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch item", error: error.message });
  }
});

// Logged-in student: create a report.
router.post("/", authenticate, requireStudent, async (req, res) => {
  try {
    const { title, description, category, type, location, date, contact } = req.body;
    if (!title || !description || !category || !type || !location || !date || !contact) {
      return res.status(400).json({ message: "All item fields are required" });
    }

    const item = await Item.create({
      title, description, category, type, location, date, contact,
      createdBy: req.user._id,
      status: "Pending"
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: "Failed to create item", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }
    const item = await Item.findOne({ _id: req.params.id, status: "Approved" });
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch item", error: error.message });
  }
});

// Owner can edit their own pending/rejected report; admin can edit anything.
router.put("/:id", authenticate, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid item ID" });
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const isAdmin = req.user.role === "admin";
    const isOwner = item.createdBy && item.createdBy.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) return res.status(403).json({ message: "You cannot edit this item" });

    const allowed = ["title", "description", "category", "location", "date", "contact"];
    if (isAdmin) allowed.push("type", "status");
    for (const field of allowed) if (req.body[field] !== undefined) item[field] = req.body[field];

    const updated = await item.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Failed to update item", error: error.message });
  }
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid item ID" });
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    await item.deleteOne();
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete item", error: error.message });
  }
});

module.exports = router;
