const Comment = require('../models/commentModel')
const Order = require('../models/orderModel')
const Product = require('../models/productModel')
const Reservation = require('../models/reservationModel')
const Table = require('../models/tableModel')
const User = require('../models/userModel')

const router = require('express').Router()

router.get('/all-data-count', async (req, res) => {
    try {
        const productCount = await Product.countDocuments()
        const userCount = await User.countDocuments()
        const commentCount = await Comment.countDocuments()
        const tableCount = await Table.countDocuments()
        const orderCount = await Order.countDocuments()
        const reservationCount = await Reservation.countDocuments()

        return res.status(200).json({
            productCount,
            userCount,
            commentCount,
            tableCount,
            orderCount,
            reservationCount
        })

    } catch (error) {
        res.status(500).json({message: error.message})
    }
})

module.exports = router