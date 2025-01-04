const midtransClient = require("midtrans-client");
const crypto = require("crypto");
const Reservation = require("../models/reservationModel");
const axios = require("axios")

//snap
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

//func update status
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
    const transaction = await Reservation.findByIdAndUpdate(reservationId, {
      paymentStatus: "Cancelled", reservationStatus: "Cancelled"
    });
    responseData = transaction;
  } else if (transactionStatus == "pending") {
    const transaction = await Reservation.findByIdAndUpdate(reservationId, {
      paymentStatus: "Pending",
    });
    responseData = transaction;
  } else if (transactionStatus === "refunded") {
    const transaction = await Reservation.findByIdAndUpdate(reservationId, {
      paymentStatus: "Refunded", reservationStatus: "Cancelled"
    });
    responseData = transaction;
  }

  return {
    status: "success",
    data: responseData
  }
};

//func cancel res
const cancelMidtransTransaction = async (order_id) => {
  const url = `https://api.sandbox.midtrans.com/v2/${order_id}/cancel`;
  const auth = "Basic " + Buffer.from(process.env.MIDTRANS_SERVER_KEY).toString("base64");

  try {
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          Authorization: auth,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to cancel Midtrans transaction:", error);
    throw new Error("Midtrans cancellation failed");
  }
};

module.exports = { snap, updateStatusBasedOnMidtransResponse, cancelMidtransTransaction };
