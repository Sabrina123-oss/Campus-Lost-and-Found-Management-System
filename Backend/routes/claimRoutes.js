const express = require("express");
const mongoose = require("mongoose");
const Claim = require("../models/Claim");
const Item = require("../models/Item");
const {
  authenticate,
  requireAdmin,
  requireStudent
} = require("../middleware_auth");

const router = express.Router();


// ======================================================
// STUDENT - SUBMIT CLAIM
// ======================================================

router.post("/", authenticate, requireStudent, async (req, res) => {
  try {
    const { item, reason } = req.body;

    if (!mongoose.isValidObjectId(item) || !reason?.trim()) {
      return res.status(400).json({
        message: "Item and reason are required"
      });
    }

    // Allow BOTH Lost and Found items
    const claimableItem = await Item.findOne({
      _id: item,
      status: "Approved",
      type: { $in: ["Lost", "Found"] }
    });

    if (!claimableItem) {
      return res.status(404).json({
        message: "Item not available for claiming"
      });
    }

    // Prevent duplicate pending claim
    const duplicate = await Claim.findOne({
      item: item,
      claimantEmail: req.user.email,
      status: "Pending"
    });

    if (duplicate) {
      return res.status(409).json({
        message: "You already have a pending claim for this item"
      });
    }

    const claim = await Claim.create({
      item: item,
      claimantName: req.user.name,
      claimantEmail: req.user.email,
      reason: reason.trim(),
      status: "Pending"
    });

    res.status(201).json({
      message: "Claim submitted successfully",
      claim
    });

  } catch (error) {
    console.error("Submit claim error:", error);

    res.status(400).json({
      message: "Failed to submit claim",
      error: error.message
    });
  }
});


// ======================================================
// STUDENT - COUNT MY CLAIMS
// ======================================================

router.get("/mine/count", authenticate, requireStudent, async (req, res) => {
  try {
    const count = await Claim.countDocuments({
      claimantEmail: req.user.email
    });

    res.json({ count });

  } catch (error) {
    console.error("My claim count error:", error);

    res.status(500).json({
      message: "Failed to count your claims"
    });
  }
});


// ======================================================
// STUDENT - MY CLAIMS
// ======================================================

router.get("/mine", authenticate, requireStudent, async (req, res) => {
  try {
    const claims = await Claim.find({
      claimantEmail: req.user.email
    })
      .populate("item", "title type location status")
      .sort({ createdAt: -1 });

    res.json(claims);

  } catch (error) {
    console.error("My claims error:", error);

    res.status(500).json({
      message: "Failed to load your claims"
    });
  }
});


// ======================================================
// ADMIN - GET ALL CLAIMS
// IMPORTANT FOR REPORTS
// ======================================================

router.get("/all", authenticate, requireAdmin, async (req, res) => {
  try {
    const claims = await Claim.find({})
      .populate("item")
      .sort({ createdAt: -1 });

    res.json(claims);

  } catch (error) {
    console.error("All claims error:", error);

    res.status(500).json({
      message: "Failed to load all claims"
    });
  }
});


// ======================================================
// ADMIN - GET PENDING CLAIMS
// ======================================================

router.get("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const claims = await Claim.find({
      status: "Pending"
    })
      .populate("item")
      .sort({ createdAt: -1 });

    res.json(claims);

  } catch (error) {
    console.error("Pending claims error:", error);

    res.status(500).json({
      message: "Failed to load claims"
    });
  }
});


// ======================================================
// ADMIN - COUNT PENDING CLAIMS
// ======================================================

router.get("/count", authenticate, requireAdmin, async (req, res) => {
  try {
    const count = await Claim.countDocuments({
      status: "Pending"
    });

    res.json({ count });

  } catch (error) {
    console.error("Pending claim count error:", error);

    res.status(500).json({
      message: "Failed to count claims"
    });
  }
});


// ======================================================
// ADMIN - APPROVE / REJECT CLAIM
// ======================================================

router.put("/:id/status", authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid claim status"
      });
    }

    const claim = await Claim.findByIdAndUpdate(
      req.params.id,
      {
        status: status
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!claim) {
      return res.status(404).json({
        message: "Claim not found"
      });
    }


    // ==================================================
    // IMPORTANT:
    // When claim is approved, mark the item as Claimed.
    // ==================================================

    if (status === "Approved") {
      await Item.findByIdAndUpdate(
        claim.item,
        {
          status: "Claimed"
        },
        {
          new: true
        }
      );
    }

    res.json({
      message: `Claim ${status.toLowerCase()} successfully`,
      claim
    });

  } catch (error) {
    console.error("Update claim error:", error);

    res.status(500).json({
      message: "Failed to update claim",
      error: error.message
    });
  }
});


module.exports = router;