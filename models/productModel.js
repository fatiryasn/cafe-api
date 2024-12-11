const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    productName:{
        type: String,
        required: true
    },
    productDescription:{
        type: String,
        required: true
    },
    productPrice:{
        type: Number,
        required: true
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
        default: 0
    }
},
    {timestamps: true}
)

const Product = mongoose.model('Product', productSchema, 'products')
module.exports = Product