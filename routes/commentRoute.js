const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const Comment = require("../models/commentModel");
const User = require("../models/userModel");
const { getComAggregationPipeline } = require("../utils/orderUtils");

router.get("/comment", async (req, res) => {
  try {
    //sort handling
    let sort = req.query.sort || "";
    const search = req.query.search || "";
    const status = req.query.status || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    //limit handling
    const skip = (page - 1) * limit;
    const limitOptions = [50, 70, 100];
    const selectedLimit = limitOptions.includes(limit) ? limit : 50;

    //filter
    const match = {};

    const sortOptions = {
      asc: { "userInfo.username": 1 },
      dsc: { "userInfo.username": -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    };
    const selectedSort = sortOptions[sort] || sortOptions.newest;

    if (status) {
      const validStatus = ["Private", "Public"];
      const selectedStatus = validStatus.includes(status) ? status : null;
      match.status = selectedStatus;
    }

    const comments = await Comment.aggregate(
      getComAggregationPipeline(
        match,
        selectedSort,
        skip,
        selectedLimit,
        search
      )
    );

    const totalDocuments = await Comment.aggregate([
      {
        $match: match,
      },
      {
        $count: "totalCount",
      },
    ]);
    const totalDataCount = totalDocuments[0]?.totalCount || 0;

    res.status(200).json({
      data: comments,
      dataCount: totalDataCount,
      currentPage: page,
      totalPages: Math.ceil(totalDataCount / selectedLimit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//get comment stat
router.get("/comment-stat", async (req, res) => {
  try {
    const statusStats = await Comment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const commentDateStats = await Comment.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const topCommenter = await Comment.aggregate([
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          username: "$user.username",
          email: "$user.useremail",
          commentCount: "$count",
        },
      },
    ]);

    res.status(200).json({
      statusStats,
      commentDateStats,
      topCommenter: topCommenter[0] || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//create comment
router.post("/comment", verifyToken(), async (req, res) => {
  try {
    const userId = req.user._id;

    const now = new Date();
    const startOfDay = new Date(now.toDateString());

    const commentedToday = await Comment.findOne({
      userId: userId,
      createdAt: { $gte: startOfDay },
    });
    if (commentedToday) {
      return res
        .status(400)
        .json({ message: "Sorry! Only one feedback per day" });
    }

    const { comment, username, useremail } = req.body;
    if (!comment || comment.length <= 0) {
      return res.status(400).json({ message: "Request is incomplete" });
    }
    if (comment.length > 150) {
      return res.status(400).json({ message: "Limit is reached" });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user._id },
      { username, useremail }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newComment = await Comment.create({
      comment: comment,
      userId: req.user._id,
    });
    res.status(201).json({
      message: "Comment created",
      data: newComment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//update status comment
router.put("/comment/:id", verifyToken("admin"), async (req, res) => {
  const commentId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Request is incomplete" });
  }

  const validStatuses = ["Public", "Private"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  const comment = await Comment.findByIdAndUpdate(commentId, {
    status: status,
  });
  if (!comment) {
    return res.status(404).json({ message: "Comment not found" });
  }

  res.status(200).json({
    message: "Comment updated",
  });
});

//delete comment
router.delete("/comment/:id", verifyToken(), async (req, res) => {
  try {
    const commentId = req.params.id;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "No comment found" });
    }
    if (
      comment.userId.toString() !== req.user._id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this comment" });
    }
    await Comment.deleteOne({ _id: commentId });
    return res.status(200).json({
      message: "Comment deleted",
      data: comment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
