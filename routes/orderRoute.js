const router = require('express').Router()
const snap = require('../utils/midtrans')
const Order = require('../models/orderModel');
const verifyToken = require('../middleware/verifyToken');

router.post("/order", verifyToken, async (req, res) => { 
  try {
    const userId = req.user._id
    const { products, totalAmount } = req.body;
  
    if (!products || !totalAmount) {
      return res.status(400).json({ message: "Products and totalAmount are required" });
    }

    const newOrder = new Order({
      userId,
      products,
      totalAmount,
    });
    const savedOrder = await newOrder.save();

    const parameter = {
      transaction_details: {
        order_id: `order-${savedOrder._id}`,
        gross_amount: totalAmount,
      },
       credit_card: { secure: true },
    };

    const transaction = await snap.createTransaction(parameter);

    res.json({ redirectUrl: transaction.redirect_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router