const getOrderAggregationPipeline = (match, sort, skip, limit, search = "") => [
  { $match: match || {} },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "userInfo",
    },
  },
  {
    $lookup: {
      from: "tables",
      localField: "tableId",
      foreignField: "_id",
      as: "tableInfo",
    },
  },
  {
    $lookup: {
      from: "discounts",
      localField: "discountId",
      foreignField: "_id",
      as: "discountInfo",
    },
  },
  {
    $lookup: {
      from: "products",
      localField: "products.productId",
      foreignField: "_id",
      as: "productInfo",
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "cashierId",
      foreignField: "_id",
      as: "cashierInfo",
    },
  },
  { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
  { $unwind: { path: "$tableInfo", preserveNullAndEmptyArrays: true } },
  { $unwind: { path: "$cashierInfo", preserveNullAndEmptyArrays: true } },
  { $unwind: { path: "$discountInfo", preserveNullAndEmptyArrays: true } },
  {
    $match: {
      $or: [
        { "userInfo.username": { $regex: search, $options: "i" } },
        { orderNumber: { $regex: search, $options: "i" } },
      ],
    },
  },
  {
    $addFields: {
      "productInfo.quantity": {
        $arrayElemAt: [
          "$products.quantity",
          { $indexOfArray: ["$products.productId", "$productInfo._id"] },
        ],
      },
    },
  },
  {
    $project: {
      _id: 1,
      orderNumber: 1,
      userInfo: { _id: 1, username: 1, useremail: 1 },
      tableInfo: { _id: 1, tableNumber: 1 },
      discountInfo: { _id: 1, discountValue: 1, discountType: 1 },
      orderType: 1,
      cashierInfo: { _id: 1, username: 1, useremail: 1 },
      productInfo: { _id: 1, productName: 1, productPrice: 1, quantity: 1 },
      fee: 1,
      paymentMethod: 1,
      cashAmount: 1,
      paymentStatus: 1,
      createdAt: 1,
    },
  },
  { $sort: sort || { createdAt: -1 } },
  ...(skip != null ? [{ $skip: skip }] : []),
  ...(limit != null ? [{ $limit: limit }] : []),
];

const getResAggregationPipeline = (match, sort, skip, limit, search="") => [
  { $match: match || {} },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "userInfo",
    },
  },
  {
    $lookup: {
      from: "tables",
      localField: "tableIds",
      foreignField: "_id",
      as: "tableInfo",
    },
  },
  {
    $unwind: {
      path: "$userInfo",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $match: {
      $or: [
        { "userInfo.username": { $regex: search, $options: "i" } },
        { "customerDetails.name": { $regex: search, $options: "i" } },
        { resNumber: { $regex: search, $options: "i" } },
      ],
    },
  },
  {
    $project: {
      _id: 1,
      resNumber: 1,
      userInfo: {
        _id: 1,
        username: 1,
        useremail: 1,
        phoneNumber: 1,
      },
      customerDetails: 1,
      tableInfo: {
        _id: 1,
        tableNumber: 1,
      },
      reservationDate: 1,
      reservationTime: 1,
      reservationStatus: 1,
      resType: 1,
      paymentMethod: 1,
      paymentStatus: 1,
      notes: 1,
      createdAt: 1,
    },
  },
  { $sort: sort || {createdAt: -1} },
  { $skip: skip || 0 },
  { $limit: limit || 50 },
];

module.exports = { getOrderAggregationPipeline, getResAggregationPipeline };
