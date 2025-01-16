const router = require("express").Router();
const { snap } = require("../utils/midtrans");
const Order = require("../models/orderModel");
const User = require("../models/userModel");
const verifyToken = require("../middleware/verifyToken");
const Discount = require("../models/discountModel");
const { getOrderNumber } = require("../utils/counterUtils");

router.get("/order", async (req, res) => {
  try {
    const search = req.query.search || "";
    const date = req.query.date || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const paymentStatus = req.query.paymentStatus || "";
    const orderType = req.query.orderType || "";
    let sort = req.query.sort || "default";

    //limit handling
    const skip = (page - 1) * limit;
    const limitOptions = [50, 70, 100];
    const selectedLimit = limitOptions.includes(limit) ? limit : 50;

    //filter
    const match = {};

    const sortOptions = {
      asc: { "userInfo.username": 1 },
      dsc: { "userInfo.username": -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    };
    const selectedSort = sortOptions[sort] || sortOptions.newest;

    if (date) {
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(queryDate);
      const endOfDay = new Date(queryDate);
      endOfDay.setHours(23, 59, 59, 999);

      match.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    if (paymentStatus) {
      const validPaymentStatus = ["Pending", "Paid", "Cancelled"];
      const selectedPaymentStatus =
        validPaymentStatus.includes(paymentStatus) && search === ""
          ? paymentStatus
          : null;
      match.paymentStatus = selectedPaymentStatus;
    }

    if (orderType) {
      const validOrderType = ["cashier", "online"];
      const selectedOrderType =
        validOrderType.includes(orderType) && search === "" ? orderType : null;
      match.orderType = selectedOrderType;
    }

    const orders = await Order.aggregate([
      { $match: match },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $lookup: {
          from: "tables",
          localField: "tableId",
          foreignField: "_id",
          as: "tableInfo",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $unwind: {
          path: "$userInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$tableInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$profuctInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [
            { "userInfo.username": { $regex: search, $options: "i" } },
            { "userInfo.useremail": { $regex: search, $options: "i" } },
            { orderNumber: { $regex: search, $options: "i" } },
            { userInfo: { $eq: null } },
          ],
        },
      },
      {
        $addFields: {
          "productInfo.quantity": {
            $arrayElemAt: [
              "$products.quantity",
              {
                $indexOfArray: [
                  "$products.productId",
                  "$productInfo._id",
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          orderNumber: 1,
          userInfo: {
            _id: 1,
            username: 1,
            useremail: 1,
          },
          tableInfo: {
            _id: 1,
            tableNumber: 1,
          },
          orderType: 1,
          productInfo: {
            _id: 1,
            productName: 1,
            productPrice: 1,
            quantity: 1
          },
          fee: 1,
          paymentMethod: 1,
          paymentStatus: 1,
          createdAt: 1,
        },
      },
      { $sort: selectedSort },
      { $skip: skip },
      { $limit: selectedLimit },
    ]).exec();

    const totalDocuments = await Order.aggregate([
      {
        $match: match,
      },
      {
        $count: "totalCount",
      },
    ]);
    const totalDataCount = totalDocuments[0]?.totalCount || 0;

    return res.status(200).json({
      data: orders,
      dataCount: totalDataCount,
      currentPage: page,
      totalPages: Math.ceil(totalDataCount / selectedLimit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.error(error);
  }
});

//create order
router.post("/order", verifyToken("cashier"), async (req, res) => {
  try {
    const {
      products,
      finalPrice,
      paymentMethod,
      tableId,
      customerEmail,
      cashierId,
      discountId,
    } = req.body;
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
    if (discountId) {
      const discount = await Discount.findById(discountId);
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

    const newOrderNumber = await getOrderNumber();
    let newOrder;
    //cash payment
    if (paymentMethod === "Cash") {
      newOrder = new Order({
        orderNumber: newOrderNumber,
        userId: user ? user._id : null,
        tableId: tableId || null,
        orderType: "cashier",
        cashier: cashierId,
        discount: discountId,
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
        orderNumber: newOrderNumber,
        userId: user ? user._id : null,
        tableId: tableId || null,
        orderType: "cashier",
        discount: discountId,
        products: products,
        fee: finalPrice,
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
        orderId: newOrder._id,
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
