const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    useremail: {
        type: String, 
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        required: true
    },
    refreshToken: {
        type: String
    }
}, {
    timestamps: true
})

const User = mongoose.model('User', userSchema, 'users')
module.exports = User