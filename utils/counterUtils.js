const Counter = require("../models/counterModel")
const Order = require("../models/orderModel")
const Reservation = require("../models/reservationModel")

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

const getResNumber = async () => {
  let counter = await Counter.findOne({ id: "res_number_seq" });

  if (!counter) {
    counter = new Counter({ id: "res_number_seq", seq: 0 });
  }

  const resCount = await Reservation.countDocuments();
  if (resCount === 0) {
    counter.seq = 0;
  }

  counter.seq += 1;
  await counter.save();

  return `RES-${counter.seq}`;
};


module.exports = {getOrderNumber, getResNumber}