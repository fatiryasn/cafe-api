const midtransClient = require("midtrans-client");
const crypto = require("crypto");
const Reservation = require("../models/reservationModel");
const axios = require("axios");
const Order = require("../models/orderModel");

//snap
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

//func update status (reservation)
const updateResPaymentStatus = async (reservationId, data) => {
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

  const realResId = reservationId.split("-")[1]

  if (transactionStatus == "capture") {
    if (fraudStatus == "accept") {
      const transaction = await Reservation.findByIdAndUpdate(realResId, {
        paymentStatus: "Paid",
        paymentMethod: data.payment_type,
      });
      responseData = transaction;
    }
  } else if (transactionStatus == "settlement") {
    const transaction = await Reservation.findByIdAndUpdate(realResId, {
      paymentStatus: "Paid",
      paymentMethod: data.payment_type,
    });
    responseData = transaction;
  } else if (
    transactionStatus == "cancel" ||
    transactionStatus == "deny" ||
    transactionStatus == "expire"
  ) {
    const transaction = await Reservation.findByIdAndUpdate(realResId, {
      paymentStatus: "Cancelled", reservationStatus: "Cancelled"
    });
    responseData = transaction;
  } else if (transactionStatus == "pending") {
    const transaction = await Reservation.findByIdAndUpdate(realResId, {
      paymentStatus: "Pending",
    });
    responseData = transaction;
  } else if (transactionStatus === "refunded") {
    const transaction = await Reservation.findByIdAndUpdate(realResId, {
      paymentStatus: "Refunded", reservationStatus: "Cancelled"
    });
    responseData = transaction;
  }

  return {
    status: "success",
    data: responseData
  }
};

//func update status (order)
const updateOrdPaymentStatus = async (orderId, data) => {
  const hash = crypto
    .createHash("sha512")
    .update(
      `${orderId}${data.status_code}${data.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`
    )
    .digest("hex");
  if (data.signature_key !== hash) {
    return {
      status: "error",
      message: "Invalid signature key",
    };
  } 

  let responseData = null;
  let transactionStatus = data.transaction_status;
  let fraudStatus = data.fraud_status;

  const realOrdId = orderId.split("-")[1];

  if (transactionStatus == "capture") {
    if (fraudStatus == "accept") {
      const transaction = await Order.findByIdAndUpdate(realOrdId, {
        paymentStatus: "Paid",
        paymentMethod: data.payment_type,
      });
      responseData = transaction;
    }
  } else if (transactionStatus == "settlement") {
    const transaction = await Order.findByIdAndUpdate(realOrdId, {
      paymentStatus: "Paid",
      paymentMethod: data.payment_type,
    });
    responseData = transaction;
  } else if (
    transactionStatus == "cancel" ||
    transactionStatus == "deny" ||
    transactionStatus == "expire"
  ) {
    const transaction = await Order.findByIdAndUpdate(realOrdId, {
      paymentStatus: "Cancelled",
    });
    responseData = transaction;
  } else if (transactionStatus == "pending") {
    const transaction = await Order.findByIdAndUpdate(realOrdId, {
      paymentStatus: "Pending",
    });
    responseData = transaction;
  } else if (transactionStatus === "refunded") {
    const transaction = await Order.findByIdAndUpdate(orderId, {
      paymentStatus: "Refunded",
    });
    responseData = transaction;
  }

  return {
    status: "success",
    data: responseData,
  };
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

module.exports = { snap, updateResPaymentStatus, updateOrdPaymentStatus, cancelMidtransTransaction };
