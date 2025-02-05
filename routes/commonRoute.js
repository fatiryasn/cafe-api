const verifyToken = require("../middleware/verifyToken");
const Comment = require("../models/commentModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Reservation = require("../models/reservationModel");
const Table = require("../models/tableModel");
const User = require("../models/userModel");
const {
  updateResPaymentStatus,
  updateOrdPaymentStatus,
} = require("../utils/midtrans");
const { getOrderAggregationPipeline, getResAggregationPipeline } = require("../utils/orderUtils");

const router = require("express").Router();

router.get("/all-data-count", async (req, res) => {
  try {
    const productCount = await Product.countDocuments();
    const userCount = await User.countDocuments();
    const commentCount = await Comment.countDocuments();
    const tableCount = await Table.countDocuments();
    const orderCount = await Order.countDocuments();
    const reservationCount = await Reservation.countDocuments();

    return res.status(200).json({
      productCount,
      userCount,
      commentCount,
      tableCount,
      orderCount,
      reservationCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//midtrans notif
router.post("/midtrans-notification", (req, res) => {
  const data = req.body;

  if (data.order_id.startsWith("order-")) {
    Order.findOne({ _id: data.order_id.split("-")[1] }).then((order) => {
      if (order) {
        updateOrdPaymentStatus(data.order_id, data).then((result) => {
          console.log("result ", result);
        });
      }
    });
  } else if (data.order_id.startsWith("res-")) {
    Reservation.findOne({ _id: data.order_id.split("-")[1] }).then(
      (reservation) => {
        if (reservation) {
          updateResPaymentStatus(data.order_id, data).then((result) => {
            console.log("result ", result);
          });
        }
      }
    );
  }

  return res.status(200).json({
    status: "success",
    message: "OK",
  });
});

//today revenue
router.get("/daily-revenue", async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const reservationCount = await Reservation.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalOrderFee = orders.reduce((sum, order) => sum + order.fee, 0);
    const reservationFee = reservationCount * 30000;

    const totalRevenue = totalOrderFee + reservationFee;

    return res.status(200).json({
      orders: totalOrderFee,
      reservations: reservationFee,
      total: totalRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//get user loyalty
router.get("/user-loyalty", verifyToken(), async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Cant find user" });
    }
    res.status(200).json({
      userData: user,
    });
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message });
  }
});

//rev over time
router.get("/total-revenue", async (req, res) => {
  try {
    const { filter } = req.query;
    let startDate, endDate, groupBy, totalData;
    const now = new Date();

    switch (filter) {
      case "daily":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        groupBy = "daily";
        totalData = 30;
        break;

      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        endDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        groupBy = "monthly";
        totalData = 12;
        break;

      case "yearly":
        startDate = new Date(now.getFullYear() - 4, 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        groupBy = "yearly";
        totalData = 5;
        break;

      default:
        return res
          .status(400)
          .json({ message: "Invalid filter. Use daily, monthly, or yearly." });
    }

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });
    const reservations = await Reservation.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const revenueData = {};

    const getGroupingKey = (date) => {
      const d = new Date(date);
      if (groupBy === "daily") return d.toISOString().split("T")[0];
      if (groupBy === "monthly")
        return `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (groupBy === "yearly") return `${d.getFullYear()}`;
    };

    orders.forEach((order) => {
      const key = getGroupingKey(order.createdAt);
      revenueData[key] = (revenueData[key] || 0) + order.fee;
    });
    reservations.forEach((reservation) => {
      const key = getGroupingKey(reservation.createdAt);
      revenueData[key] = (revenueData[key] || 0) + 30000;
    });

    const revenueArray = [];
    for (let i = totalData - 1; i >= 0; i--) {
      let key;
      if (groupBy === "daily") {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        key = date.toISOString().split("T")[0];
      } else if (groupBy === "monthly") {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      } else if (groupBy === "yearly") {
        key = (now.getFullYear() - i).toString();
      }
      revenueArray.push({ date: key, revenue: revenueData[key] || 0 });
    }

    res.status(200).json(revenueArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});




module.exports = router;


module.exports = router;
