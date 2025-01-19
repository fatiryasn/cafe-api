const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    resNumber: {
      type: String,
      required: true,
      unique: true
    },
    resType: {
      type: String,
      required: true,
      enum: ["cashier", "online"]
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "User",
    },
    customerDetails: {
      name: {
        type: String,
        maxLength: 20
      },
      phoneNumber: {
        type: Number,
        maxLength: 14
      }
    },
    tableIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Table",
      },
    ],
    reservationDate: {
      type: Date,
      required: true,
    },
    reservationTime: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      maxLength: 150,
    },
    reservationStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Pending",
    },
    snapToken: {
      type: String,
      default: ""
    },
    paymentMethod: {
      type: String,
      default: ""
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Cancelled", "Refunded"],
      default: "Pending"
    }
  },
  {
    timestamps: true,
  }
);

const Reservation = mongoose.model(
  "Reservation",
  reservationSchema,
  "reservations"
);
module.exports = Reservation;
