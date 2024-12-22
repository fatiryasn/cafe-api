const mongoose = require('mongoose')

const tableSchema = new mongoose.Schema({
    tableNumber:{
        type: Number,
        required: true,
        unique: true     
    },
    status: {
        type: String,
        enum: ['Available', 'Reserved', 'Occupied'],
        default: 'Available'
    },
    capacity:{
        type: Number,
        required: true
    }
})

const Table = mongoose.model('Table', tableSchema, 'tables')
module.exports = Table