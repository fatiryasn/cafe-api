const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table'
    },
    orderType: {
      type: String,
      required: true,
      enum: ["cashier", "online"],
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
          validate: {
            validator: Number.isInteger,
            message: "Quantity must be an integer",
          },
        },
      },
    ],
    fee: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => value >= 0,
        message: "Fee must be a positive number",
      },
    },
    snapToken: {
      type: String,
      default: "",
    },
    paymentMethod: {
      type: String,
      default: "",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Cancelled"],
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema, "orders");
module.exports = Order;
