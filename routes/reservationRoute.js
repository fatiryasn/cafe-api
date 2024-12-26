const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const Reservation = require("../models/reservationModel");
const Table = require("../models/tableModel");

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
    const { tableId, reservationDate, reservationTime, notes } =
      req.body;
    if (!tableId || !reservationDate || !reservationTime || !notes) {
      return res.status(400).json({ message: "Request is incomplete" });
    }

    const formattedDate = new Date(reservationDate.split("/").reverse().join("-"));

    if (isNaN(formattedDate.getTime())) {
      return res.status(400).json({ message: "Invalid reservation date format" });
    }


    const table = await Table.findById(tableId)
    if (!table){
      return res.status(404).json({message: "Table not found"})
    }
    if (table.status !== "Available"){
      return res.status(400).json({message: `Table is ${table.status}`})
    }

    const newReservation = {
      userId: req.user._id,
      tableId,
      reservationDate: formattedDate,
      reservationTime,
      notes,
    };
    table.status = "Reserved"
    await table.save()

    await Reservation.create(newReservation);
    res.status(201).json({
      message: "Reservation created"
    })
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//delete reservation
router.delete('/reservation/:id', async (req, res) => {
  try {
    const reservationId = req.params.id
    const reservation = await Reservation.findById(reservationId)
    if (!reservation){
      return res.status(404).json({message: "No reservation found"})
    }
    const table = await Table.findById(reservation.tableId)
    table.status = 'Available'
    await table.save()

    await Reservation.deleteOne({_id: reservationId})
    res.status(200).json({
      message: "Reservation deleted",
    });
  } catch (error) {
    res.status(500).json({message: error.message})
  }
})

module.exports = router;
