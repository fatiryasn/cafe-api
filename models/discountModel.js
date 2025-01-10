const mongoose = require('mongoose')

const discountSchema = new mongoose.Schema({
    discountCode: {
        type: String,
        required: true,
        unique: true,
    },
    discountValue: {
        type: Number,
        required: true
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"]
    },
    expiryDate: {
        type: Date,
        required: true 
    },
    costInCoins: {
        type: Number,
        required: true
    },
    forUserId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        ref: 'User'
    }
})

const Discount = mongoose.model("Discount", discountSchema, 'discounts')
module.exports = Discount 