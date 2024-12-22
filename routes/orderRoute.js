const router = require('express').Router()
const snap = require('../utils/midtrans')
const Order = require('../models/orderModel');
const User = require('../models/userModel')
const Product = require('../models/productModel')
const verifyToken = require('../middleware/verifyToken');


//create order
router.post("/order", verifyToken(), async (req, res) => { 
  try {
    const userId = req.user._id;
    const { products, totalAmount } = req.body;

    if (!products || !totalAmount) {
      return res
        .status(400)
        .json({ message: "Products and totalAmount are required" });
    }
    if (!Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ message: "Products must be a non-empty array." });
    }
    if (typeof totalAmount !== "number" || totalAmount <= 0) {
      return res
        .status(400)
        .json({ message: "Total amount must be a positive number." });
    }

    const newOrder = new Order({
      userId,
      products,
      totalAmount,
    });
    const savedOrder = await newOrder.save();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "No user found" });
    }

    const transactionDetails = {
      order_id: `order-${savedOrder._id}-${Date.now()}`,
      gross_amount: totalAmount,
    };
    const customerDetails = {
      first_name: user.username,
      email: user.useremail,
    };
    const itemDetails = await Promise.all(
      products.map(async (product) => {
        const productData = await Product.findById(product.productId);
        if (!productData) {
          throw new Error(`Product with ID ${product.productId} not found`);
        }
        return {
          id: productData._id.toString(),
          name: productData.productName,
          price: product.price,
          quantity: product.quantity,
        };
      })
    );
    const parameter = {
      transaction_details: transactionDetails,
      item_details: itemDetails,
      credit_card: { secure: true },
      customer_details: customerDetails,
    };

    const transaction = await snap.createTransaction(parameter);

    res.json({
      redirectUrl: transaction.redirect_url,
      snap_token: transaction.token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router