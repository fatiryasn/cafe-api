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
        maxLength: 100
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
    productStock:{
        type: Number,
        required: true,
        default: 0,
        min: 0
    }
},
    {timestamps: true}
)

const Product = mongoose.model('Product', productSchema, 'products')
module.exports = Product