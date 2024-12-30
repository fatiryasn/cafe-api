const router = require("express").Router();
const Table = require("../models/tableModel");
const TableStat = require("../models/tableStatModel");
const verifyToken = require("../middleware/verifyToken");

//get all tables
router.get("/table", async (req, res) => {
  try {
    const date = req.query.date;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    if (isNaN(queryDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }
    const startOfDay = new Date(queryDate);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const tables = await Table.find().sort({tableNumber: 1});
    if (!tables || tables.length <= 0) {
      return res.status(404).json({ message: "No table found" });
    }

    const tableStats = await TableStat.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    const result = tables.map((table) => {
      const status = tableStats.find(
        (tableStat) => tableStat.tableId.toString() == table._id.toString()
      );

      return {
        _id: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        status: status ? status.status : "Available",
      };
    });

    return res.status(200).json({
      data: result,
      dataCount: tables.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//create new table
router.post("/table", verifyToken("admin"), async (req, res) => {
  try {
    const { tableNumber, capacity } = req.body;
    if (!tableNumber || !capacity) {
      return res.status(400).json({ message: "Request is incomplete" });
    }
    const duplicate = await Table.findOne({ tableNumber: tableNumber });
    if (duplicate) {
      return res.status(409).json({ message: "Table number has already used" });
    }
    const newTable = {
      tableNumber,
      capacity,
    };
    await Table.create(newTable);
    return res.status(201).json({ message: "New table created" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//update table
router.put("/table/:id", verifyToken("admin"), async (req, res) => {
  try {
    const tableId = req.params.id;
    const { tableNumber, capacity, status, date } = req.body;
    if (!status || !tableNumber || !capacity || !date) {
      return res.status(400).json({ message: "Request is incomplete" });
    }
    const validStatus = ["Available", "Reserved", "Occupied"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: "Input invalid" });
    }

    const table = await Table.findByIdAndUpdate(tableId, {
      tableNumber,
      capacity,
    });
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const tableStat = await TableStat.findOne({
      tableId: tableId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (status !== "Available" && !tableStat) {
      const newTableStat = {
        tableId,
        status,
        date,
      };
      await TableStat.create(newTableStat);
    } else if (status === "Available") {
      await TableStat.findOneAndDelete({
        tableId: tableId,
        date: { $gte: startOfDay, $lte: endOfDay },
      });
    } else {
      await TableStat.findOneAndUpdate(
        {
          tableId: tableId,
          date: { $gte: startOfDay, $lte: endOfDay },
        },
        { status: status }
      );
    }

    res.status(200).json({
      message: "Table updated",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//delete table
router.delete('/table/:id', verifyToken("admin"), async (req, res) => {
    try {
        const tableId = req.params.id
        const table = await Table.findByIdAndDelete(tableId)
        if (!table){
            return res.status(404).json({message: "No table found"})
        }

        await TableStat.deleteMany({tableId: tableId})

        return res.status(200).json({
          message: "Table deleted",
        });
    } catch (error) {
       res.status(500).json({message: error.message}) 
    }
})

module.exports = router;
