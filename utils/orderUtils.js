const getOrderAggregationPipeline = (match, sort, skip, limit) => [
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
  { $skip: skip || 0 },
  { $limit: limit || 50 },
];


module.exports = {getOrderAggregationPipeline}