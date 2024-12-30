const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema({
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ["Public", "Private"],
        default: "Private"
    } 
}, {
    timestamps: true
})

const Comment = mongoose.model('Comment', commentSchema, 'comments')
module.exports = Comment