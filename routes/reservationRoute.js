const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const Reservation = require("../models/reservationModel");
const User = require("../models/userModel");
const TableStat = require("../models/tableStatModel");
const {
  snap,
  updateResPaymentStatus,
  cancelMidtransTransaction,
} = require("../utils/midtrans");
const { getResNumber } = require("../utils/counterUtils");

//get all reservations
router.get("/reservation", async (req, res) => {
  try {
    const search = req.query.search || "";
    const date = req.query.date || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const paymentStatus = req.query.paymentStatus || "";
    const resType = req.query.orderType || "";
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

    if (resType) {
      const validResType = ["cashier", "online"];
      const selectedResType =
        validResType.includes(resType) && search === "" ? resType : null;
      match.resType = selectedResType;
    }

    const reservations = await Reservation.aggregate([
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
          localField: "tableIds",
          foreignField: "_id",
          as: "tableInfo",
        },
      },
      {
        $unwind: {
          path: "$userInfo",
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
        $project: {
          _id: 1,
          resNumber: 1,
          userInfo: {
            _id: 1,
            username: 1,
            useremail: 1,
            phoneNumber: 1,
          },
          tableInfo: {
            _id: 1,
            tableNumber: 1,
          },
          reservationDate: 1,
          reservationTime: 1,
          reservationStatus: 1,
          resType: 1,
          paymentMethod: 1,
          paymentStatus: 1,
          notes: 1,
          createdAt: 1,
        },
      },
      { $sort: selectedSort },
      { $skip: skip },
      { $limit: selectedLimit },
    ]).exec();

    const totalDocuments = await Reservation.aggregate([
      {
        $match: match,
      },
      {
        $count: "totalCount",
      },
    ]);
    const totalDataCount = totalDocuments[0]?.totalCount || 0;

    return res.status(200).json({
      data: reservations,
      dataCount: totalDataCount,
      currentPage: page,
      totalPages: Math.ceil(totalDataCount / selectedLimit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//create reservation
router.post("/reservation", verifyToken(), async (req, res) => {
  try {
    const {
      username,
      useremail,
      phoneNumber,
      tableIds,
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
      !Array.isArray(tableIds) ||
      tableIds.length === 0
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
      tableIds.map((id) => ({
        tableId: id,
        date: reservationDate,
        status: "Reserved",
      }))
    );

    const newResNumber = await getResNumber();

    //create new reservation
    const newReservation = new Reservation({
      resNumber: newResNumber,
      userId: req.user._id,
      tableIds,
      reservationDate,
      reservationTime,
      notes,
      reservationStatus: "Pending",
    });
    await newReservation.save();

    //midtrans transaction
    const parameter = {
      transaction_details: {
        order_id: `res-${newReservation._id}`,
        gross_amount: 30000,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: username,
        email: useremail,
        phone: phoneNumber,
      },
    };
    const midtransToken = await snap.createTransactionToken(parameter);
    await Reservation.findByIdAndUpdate(newReservation._id, {
      snapToken: midtransToken,
    });
    res.status(201).json({
      message: "Reservation created successfully",
      token: midtransToken,
      reservationId: newReservation._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//update reservation
router.patch("/reservation/:id", async (req, res) => {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const { reservationStatus } = req.body;
    const reservationId = req.params.id;

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    if (reservation.reservationStatus === "Cancelled") {
      return res.status(400).json({
        message: "Sorry! Can't update the already cancelled reservation",
      });
    }
    if (
      reservation.reservationDate < currentDate &&
      reservationStatus !== "Cancelled"
    ) {
      return res
        .status(400)
        .json({ message: "Sorry! Can't update an outdated reservation" });
    }
    if (
      reservationStatus === "Cancelled" &&
      reservation.paymentStatus === "Paid"
    ) {
      return res.status(400).json({
        message:
          "Sorry! Can't cancel the reservation because the customer has already paid",
      });
    }
    if (
      reservationStatus === "Confirmed" &&
      reservation.paymentStatus === "Pending"
    ) {
      return res.status(400).json({
        message:
          "Sorry! Can't confirm the reservation because the customer has not paid",
      });
    }

    if (reservationStatus === "Confirmed") {
      await TableStat.updateMany(
        { tableId: { $in: reservation.tableIds } },
        { status: "Occupied" }
      );
    } else if (reservationStatus === "Pending") {
      await TableStat.updateMany(
        { tableId: { $in: reservation.tableIds } },
        { status: "Reserved" }
      );
    } else if (reservationStatus === "Cancelled") {
      await TableStat.updateMany(
        { tableId: { $in: reservation.tableIds } },
        { status: "Available" }
      );
      if (reservation.paymentStatus !== "Cancelled") {
        const midtransCancelRes = await cancelMidtransTransaction(
          reservationId
        );
        if (midtransCancelRes.status_code !== 200) {
          return res.status(400).json("Failed to cancel payment in midtrans");
        }
      }
    } else {
      return res.status(400).json({ message: "Invalid reservation status" });
    }

    await Reservation.findByIdAndUpdate(reservationId, {
      reservationStatus: reservationStatus,
    });

    res.status(200).json({
      message: "Reservation updated",
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
      return res.status(404).json({ message: "Reservation not found" });
    }

    await Reservation.findByIdAndDelete(reservationId);
    await TableStat.deleteMany({ tableId: { $in: reservation.tableIds } });

    res.status(200).json({
      message: "Reservation deleted",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//midtrans notif
router.post("/res-notification", (req, res) => {
  console.log("endpoint hit");
  const data = req.body;

  Reservation.findOne({ _id: data.order_id }).then((reservation) => {
    if (reservation) {
      updateResPaymentStatus(reservation._id, data).then((result) => {
        console.log("result", result);
      });
    }
  });

  return res.status(200).json({
    status: "success",
    message: "OK",
  });
});

module.exports = router;
