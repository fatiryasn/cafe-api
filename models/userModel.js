const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        maxLength: 20
    },
    useremail: {
        type: String, 
        required: true,
        unique: true,
        maxLength: 35
    },
    phoneNumber: {
        type: String,
        maxLength: 14
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
    loyaltyCoins: {
        type: Number,
        default: 0
    },
    refreshToken: {
        type: String
    }
}, {
    timestamps: true
})

const User = mongoose.model('User', userSchema, 'users')
module.exports = User