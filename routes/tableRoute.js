const router = require('express').Router()
const Table = require('../models/tableModel')

//create new table
router.post('/table', async (req, res) => {
    try {
        const {tableNumber, capacity} = req.body
        if(!tableNumber || !capacity){
            return res.status(400).json({message: "Request is incomplete"})
        }
        const duplicate = await Table.findOne({tableNumber: tableNumber})
        if(duplicate){
            return res.status(409).json({message: "Table number has already used"})
        }
        const newTable = {
            tableNumber,
            capacity
        }
        await Table.create(newTable)
        return res.status(201).json({message: "New table created"})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
})

//update table
router.patch('/table/:id', async (req, res) => {
    try {
        const tableId = req.params.id
        const {status} = req.body
        if(!status){
            return res.status(400).json({message: "Request is incomplete"})
        }
        const validStatus = ["Available", "Reserved", "Occupied"];
        if (!validStatus.includes(status)) {
          return res.status(400).json({ message: "Input invalid" });
        }

        const table = await Table.findById(tableId)
        if(!table){
            return res.status(404).json({message: "No table found"})
        }
        if(table.status === status){
            return res.status(409).json({message: "No changes found"})
        }

        table.status = status
        await table.save()
        res.status(200).json({
            message: "Table updated"
        })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})


module.exports = router