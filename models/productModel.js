const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    productName:{
        type: String,
        required: true,
        trim: true,
        maxLength: 20
    },
    productDescription:{
        type: String,
        required: true,
        trim: true,
        maxLength: 120
    },
    productPrice:{
        type: Number,
        required: true,
        min: 0
    },
    productImagePath:{
        type: String,
        required: true
    },
    productCategory:{
        type: String,
        enum: ['drink', 'food', 'other'],
        required: true
    },
    totalSales: {
        type: Number,
        default: 0,
    },
    isAvailable:{
        type: String,
        enum: ['Available', 'Unavailable'],
        required: true,
    }
},
    {timestamps: true}
)

const Product = mongoose.model('Product', productSchema, 'products')
module.exports = Product