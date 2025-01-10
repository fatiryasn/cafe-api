const Comment = require("../models/commentModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Reservation = require("../models/reservationModel");
const Table = require("../models/tableModel");
const User = require("../models/userModel");
const {updateResPaymentStatus, updateOrdPaymentStatus} = require("../utils/midtrans")

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
  console.log("endpoint hit");
  const data = req.body;

  if (data.order_id.startsWith("order-")) {
    Order.findOne({_id: data.order_id.split("-")[1]}).then((order) => {
        if(order){
            updateOrdPaymentStatus(data.order_id, data).then((result) => {
                console.log("result ",result)
            })
        }
    })
  } else if (data.order_id.startsWith("res-")) {
    Reservation.findOne({ _id: data.order_id.split("-")[1] }).then((reservation) => {
      if (reservation) {
        updateResPaymentStatus(data.order_id, data).then((result) => {
          console.log("result ", result);
        });
      }
    });
  }

  return res.status(200).json({
    status: "success",
    message: "OK",
  });
});

module.exports = router;
