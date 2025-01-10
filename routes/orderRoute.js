const router = require("express").Router();
const { snap } = require("../utils/midtrans");
const Order = require("../models/orderModel");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const verifyToken = require("../middleware/verifyToken");
const Discount = require("../models/discountModel");

router.post("/order", async (req, res) => {
  console.log("hit")
  try {
    const {products, finalPrice, paymentMethod, tableId, customerEmail, discountCode} = req.body;
    if (
      !products ||
      !Array.isArray(products) ||
      !finalPrice ||
      !paymentMethod
    ) {
      return res.status(400).json({ message: "Request is incomplete" });
    }

    let user = null;

    //validate email
    if (customerEmail) {
      user = await User.findOneAndUpdate(
        { useremail: customerEmail },
        { loyaltyCoins: 50 }
      );
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    //validate discount
    if (discountCode) {
      const discount = await Discount.findOne({ discountCode: discountCode });
      if (!discount) {
        return res.status(204).json({ message: "Discount not found" });
      }
      const now = new Date();
      if (discount.expiryDate < now) {
        return res.status(400).json({ message: "Discount has expired" });
      }
      if (discount.forUserId) {
        return res.status(400).json({ message: "Discount code is used" });
      }
      await Discount.findByIdAndUpdate(discount._id, { forUserId: user._id });
    }

    let newOrder;
    //cash payment
    if (paymentMethod === "Cash") {
      newOrder = new Order({
        userId: user ? user._id : null,
        tableId: tableId || null,
        orderType: "cashier",
        products: products,
        fee: finalPrice,
        paymentMethod,
        paymentStatus: "Paid",
      });

      await newOrder.save();

      res.status(201).json({
        message: "New order created successfully with cash payment.",
        orderId: newOrder._id,
      });
      //online payment
    } else if (paymentMethod === "Online") {
      newOrder = new Order({
        userId: user ? user._id : null,
        tableId: tableId || null,
        orderType: "cashier",
        products: products,
        fee: finalPrice,
        paymentStatus: "Pending", 
      });

      await newOrder.save();

      //midtrans parameter
      const parameter = {
        transaction_details: {
          order_id: `order-${newOrder._id}`,
          gross_amount: finalPrice,
        },
        credit_card: {
          secure: true,
        },
        customer_details: {
          first_name: user?.username || "Guest",
          email: user?.useremail || null,
          phone: user?.phoneNumber || null,
        },
        item_details: products.map((product) => ({
          id: product._id,
          price: product.productPrice,
          quantity: product.quantity,
          name: product.productName,
        })),
      };

      const midtransToken = await snap.createTransactionToken(parameter);
      await Order.findByIdAndUpdate(newOrder._id, { snapToken: midtransToken });

      res.status(201).json({
        message:
          "New order created successfully! Please proceed with online payment.",
        snapToken: midtransToken,
        orderId: newOrder._id
      });
    } else {
      res.status(400).json({ message: "Invalid payment method" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//delete order
router.delete("/order/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await Order.findByIdAndDelete(orderId);

    res.status(200).json({
      message: "Order deleted",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
