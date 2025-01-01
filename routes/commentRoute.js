const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const Comment = require("../models/commentModel");
const User = require("../models/userModel")

router.get("/comment", async (req, res) => {
  try {
    // Sort handling
    let sort = req.query.sort === "newest" ? { createdAt: -1 } : { _id: 1 };

    // Pagination and limit handling
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limitOptions = [10, 20, 50];
    const limit = limitOptions.includes(parseInt(req.query.limit))
      ? parseInt(req.query.limit)
      : 10;
    const skip = (page - 1) * limit;

    // Status filter handling
    const status = req.query.status || "";
    const statusOptions = ["Public", "Private"];
    if (status && !statusOptions.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    const query = status ? { status } : {};

    // Query comments
    const collation = { locale: "en", strength: 2 };
    const dataCount = await Comment.countDocuments(query);
    const comments = await Comment.find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .populate("userId", "username")
      .collation(collation);

    // If no comments found
    if (!comments || comments.length === 0) {
      return res
        .status(200)
        .json({ data: [], dataCount: 0, message: "No comments found" });
    }

    // Success response
    res.status(200).json({
      data: comments,
      dataCount,
      currentPage: page,
      totalPages: Math.ceil(dataCount / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//create comment
router.post("/comment", verifyToken(), async (req, res) => {
  try {
    const userId = req.user._id;
    const commented = await Comment.findOne({ userId: userId });
    if (commented) {
      return res
        .status(400)
        .json({ message: "Cannot commenting more than one" });
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

  if(!status){
    return res.status(400).json({message: "Request is incomplete"})
  }

  const validStatuses = ["Public", "Private"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  const comment = await Comment.findByIdAndUpdate(commentId, {
    status: status,
  });
  if (!comment){
    return res.status(404).json({message: "Comment not found"})
  }

  res.status(200).json({
    message: "Comment updated"
  })
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
