const mongoose = require("mongoose")

const tableStatSchema = new mongoose.Schema({
    tableId: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table'
    },
    status: {
        required: true,
        type: String,
        enum: ["Available", "Reserved", "Occupied"],
        default: "Available"
    },
    date: {
        required: true,
        type: Date
    }
})

const TableStat = mongoose.model('TableStat', tableStatSchema, 'tablestats')
module.exports = TableStat

