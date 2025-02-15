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
    status: {
        type: String,
        enum: ["Available", "Owned", "Used", "Expired"],
        default: "Available"
    },
    ownedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
})

const Discount = mongoose.model("Discount", discountSchema, 'discounts')
module.exports = Discount 