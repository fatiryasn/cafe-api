const router = require('express').Router()
const verifyToken = require('../middleware/verifyToken')
const Comment = require('../models/commentModel')

//get all comments
router.get('/comment', async (req, res) => {
    try {
        let sort = req.query.sort
         
        switch(sort){
            case "newest":
                sort = {createdAt: -1}
                break
            case "oldest":
                sort = {createdAt: 1}
                break
            default:
                sort = {_id : 1}
        }
        const comments = await Comment.find().sort(sort).populate('userId', 'username') 
        if (!comments || comments.length <= 0){
            return res.status(404).json({message: "No comment found"})
        }
        res.status(200).json({
            data: comments,
            dataCount: await Comment.countDocuments()
        })
    } catch (error) {
        res.status(500).json({message: error.message})
    }
})

//create comment
router.post('/comment', verifyToken(), async (req, res) => {
    try {
        const userId = req.user._id
        const commented = await Comment.findOne({userId: userId})
        if(commented){
            return res.status(400).json({message: "Cannot commenting more than one"})
        }

        const {comment} = req.body
        if (!comment || comment.length <= 0){
            return res.status(400).json({message: "Request is incomplete"})
        }
        if(comment.length > 150){
            return res.status(400).json({message: "Limit is reached"})
        }
        const newComment = await Comment.create({
            comment: comment,
            userId: req.user._id
        })
        res.status(201).json({
            message: "Comment created",
            data: newComment
        })
    } catch (error) {
        res.status(500).json({message: error.message})
    }
})

//delete comment
router.delete('/comment/:id', verifyToken(), async (req, res) => {
    try {
        const commentId = req.params.id
        const comment = await Comment.findById(commentId)
        if (!comment){
            return res.status(404).json({message: "No comment found"})
        }
        if(comment.userId.toString() !== req.user._id){
            return res.status(403).json({message: "Unauthorized to delete this comment"})
        }
        await Comment.deleteOne({_id: commentId})
        return res.status(200).json({
          message: "Comment deleted",
          data: comment,
        });
    } catch (error) {
       res.status(500).json({message: error.message}) 
    }
})

module.exports = router