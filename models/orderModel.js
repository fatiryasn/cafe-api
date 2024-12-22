const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    products: [
        {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Product",
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        },
    ],
    totalAmount: {
        type: Number,
        required: true,
    },
    paymentStatus: { type: String, default: "pending" },
    paymentDetails: {
        transactionId: { type: String },
        paymentMethod: { type: String },
        transactionTime: { type: Date },
        paymentGatewayResponse: { type: Object },
    },
    orderStatus: { type: String, default: "pending" },
},
    {timestamps: true}
);

const Order = mongoose.model('Order', orderSchema, 'orders')
module.exports = Order