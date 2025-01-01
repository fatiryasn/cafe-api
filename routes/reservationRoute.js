const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const Reservation = require("../models/reservationModel");
const Table = require("../models/tableModel");
const User = require("../models/userModel");
const TableStat = require("../models/tableStatModel");
const snap = require("../utils/midtrans")

//get all reservations
router.get("/reservation", async (req, res) => {
  try {
    let sort = req.query.sort || "default";
    const status = req.query.category || "";

    // Sort handling
    switch (sort) {
      case "asc":
        sort = { reservationDate: 1 };
        break;
      case "dsc":
        sort = { reservationDate: -1 };
        break;
      case "newest":
        sort = { createdAt: -1 };
        break;
      default:
        sort = { _id: 1 };
    }

    const statusOptions = ["Pending", "Confirmed", "Cancelled"];
    const filterStatus = statusOptions.includes(status) ? { status } : {};

    const reservations = await Reservation.find(filterStatus)
      .sort(sort)
      .populate("userId", "username useremail")
      .populate("tableId", "tableNumber capacity")
      .exec();

    if (!reservations || reservations.length === 0) {
      return res.status(404).json({ message: "No reservations found" });
    }

    return res.status(200).json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

//create reservation
router.post("/reservation", verifyToken(), async (req, res) => {
  try {
    const {
      username,
      useremail,
      phoneNumber,
      tableId,
      reservationDate,
      reservationTime,
      notes,
    } = req.body;
    if (
      !username ||
      !useremail ||
      !phoneNumber ||
      !reservationDate ||
      !reservationTime ||
      !Array.isArray(tableId) ||
      tableId.length === 0
    ) {
      return res.status(400).json({ message: "Request is incomplete" });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user._id },
      { username, useremail, phoneNumber }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await TableStat.insertMany(
      tableId.map((id) => ({
        tableId: id,
        date: reservationDate,
        status: "Reserved",
      }))
    );

    //create new reservation
    const newReservation = new Reservation({
      userId: req.user._id,
      tableId,
      reservationDate,
      reservationTime,
      notes,
      status: "Pending",
    });
    await newReservation.save();

    //midtrans transaction
    const parameter = {
      transaction_details: {
        order_id: `reservation-${newReservation._id}`,
        gross_amount: 30000
      },
      credit_card: {
        secure: true
      },
      customer_details:{
        first_name: username,
        email: useremail,
        phone: phoneNumber
      },
    }
    const midtransToken = await snap.createTransactionToken(parameter)
    res.status(201).json({
      message: "Reservation created successfully",
      token: midtransToken
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//delete reservation
router.delete("/reservation/:id", async (req, res) => {
  try {
    const reservationId = req.params.id;
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: "No reservation found" });
    }
    const table = await Table.findById(reservation.tableId);
    table.status = "Available";
    await table.save();

    await Reservation.deleteOne({ _id: reservationId });
    res.status(200).json({
      message: "Reservation deleted",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
