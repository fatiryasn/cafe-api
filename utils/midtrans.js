const midtransClient = require("midtrans-client");
const crypto = require("crypto");
const Reservation = require("../models/reservationModel");

let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

const updateStatusBasedOnMidtransResponse = async (reservationId, data) => {
  const hash = crypto
    .createHash("sha512")
    .update(
      `${reservationId}${data.status_code}${data.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`
    )
    .digest('hex')
  if (data.signature_key !== hash) {
    return {
      status: "error",
      message: "Invalid signature key",
    };
  }

  let responseData = null;
  let transactionStatus = data.transaction_status;
  let fraudStatus = data.fraud_status;

  if (transactionStatus == "capture") {
    if (fraudStatus == "accept") {
      const transaction = await Reservation.findByIdAndUpdate(reservationId, {
        paymentStatus: "Paid",
        paymentMethod: data.payment_type,
      });
      responseData = transaction;
    }
  } else if (transactionStatus == "settlement") {
    const transaction = await Reservation.findByIdAndUpdate(reservationId, {
      paymentStatus: "Paid",
      paymentMethod: data.payment_type,
    });
    responseData = transaction;
  } else if (
    transactionStatus == "cancel" ||
    transactionStatus == "deny" ||
    transactionStatus == "expire"
  ) {
    const transaction = await Reservation.findByIdAndUpdate(reservationId, {paymentStatus: "Cancelled"})
    responseData = transaction
  } else if (transactionStatus == "pending") {
    const transaction = await Reservation.findByIdAndUpdate(reservationId, {
      paymentStatus: "Pending",
    });
    responseData = transaction;
  }

  return {
    status: "success",
    data: responseData
  }
};

module.exports = { snap, updateStatusBasedOnMidtransResponse };
