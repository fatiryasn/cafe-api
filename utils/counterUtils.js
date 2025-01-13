const Counter = require("../models/counterModel")
const Order = require("../models/orderModel")

const getOrderNumber = async () => {
    let counter = await Counter.findOne({id: "order_number_seq"})

    if(!counter){
        counter = new Counter({id: "order_number_seq", seq: 0})
    }

    const orderCount = await Order.countDocuments()
    if(orderCount === 0){
        counter.seq = 0
    }

    counter.seq += 1;
    await counter.save();

    return `ORD-${counter.seq}`;
}

module.exports = {getOrderNumber}