const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const Discount = require("../models/discountModel");

//get all discounts
router.get("/discount", async (req, res) => {
  try {
    const search = req.query.search || "";
    const discountType = req.query.discountType || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    let sort = req.query.sort || "newest";

    //limit handling
    const skip = (page - 1) * limit;
    const limitOptions = [30, 50, 80];
    const selectedLimit = limitOptions.includes(limit) ? limit : 30;

    const match = {};

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      valueAsc: { discountValue: 1 },
      valueDsc: { discountValue: -1 },
    };
    const selectedSort = sortOptions[sort] || sortOptions.newest;

    if (discountType) {
      const validDiscountType = ["percentage", "fixed"];
      const selectedDiscountType = validDiscountType.includes(discountType)
        ? discountType
        : null;
      match.discountType = selectedDiscountType;
    }

    if (search) {
      match.discountCode = { $regex: search, $options: "i" };
    }
    const dataCount = await Discount.countDocuments(match);

    const discounts = await Discount.find(match)
      .sort(selectedSort)
      .limit(selectedLimit)
      .skip(skip)
      .exec();

    return res.status(200).json({
      data: discounts,
      dataCount: dataCount,
      currentPage: page,
      totalPages: Math.ceil(dataCount / selectedLimit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//get disc stats
router.get("/discount-stats", async (req, res) => {
  try {
    //stat count
    const stats = await Discount.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    //type count
    const type = await Discount.aggregate([
      {
        $group: {
          _id: "$discountType",
          count: { $sum: 1 },
        },
      },
    ]);

    //nearest expiry
    const currentDate = new Date();
    const nearestExpiry = await Discount.findOne({
      expiryDate: { $gt: currentDate }, status: "Available"
    })
      .sort({ expiryDate: 1 })
      .select("expiryDate")
      .exec();

    let nearestExpiryData = [];
    if (nearestExpiry) {
      nearestExpiryData = await Discount.find({
        expiryDate: nearestExpiry.expiryDate, status: "Available",
      }).exec();
    }

    res.status(200).json({
      statCount: stats,
      typeCount: type,
      nearestExpiryData: nearestExpiryData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//check discount validity
router.get("/discount/:code", async (req, res) => {
  const discountCode = req.params.code;

  try {
    const discount = await Discount.findOne({ discountCode: discountCode });
    if (!discount) {
      return res.status(204).json({ message: "Discount not found" });
    }

    const now = new Date();
    if (discount.expiryDate < now) {
      return res.status(400).json({ message: "Discount has expired" });
    }

    if (["Used", "Expired"].includes(discount.status)) {
      return res.status(400).json({ message: "Discount code is deprecated" });
    }

    return res.status(200).json({
      _id: discount._id,
      discountCode: discount.discountCode,
      discountValue: discount.discountValue,
      discountType: discount.discountType,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create discount code
router.post("/discount", verifyToken("admin"), async (req, res) => {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const {
      discountCode,
      expiryDate,
      discountValue,
      discountType,
      costInCoins,
    } = req.body;

    if (
      !discountCode ||
      !expiryDate ||
      !discountValue ||
      !discountType ||
      !costInCoins
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (
      typeof discountCode !== "string" ||
      !/^[a-zA-Z0-9]+$/.test(discountCode)
    ) {
      return res.status(400).json({ message: "Invalid discount code" });
    }
    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({ message: "Invalid discount type" });
    }
    if (
      typeof discountValue !== "number" ||
      discountValue <= 0 ||
      (discountType === "percentage" && discountValue > 100)
    ) {
      return res.status(400).json({ message: "Invalid discount value" });
    }
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime()) || expiry <= currentDate) {
      return res.status(400).json({ message: "Invalid expiry date" });
    }
    if (typeof costInCoins !== "number" || costInCoins < 0) {
      return res.status(400).json({ message: "Invalid cost in coins" });
    }
    const existingDiscount = await Discount.findOne({ discountCode });
    if (existingDiscount) {
      return res.status(409).json({ message: "Discount code already exists" });
    }

    // Create new discount
    const newDiscount = new Discount({
      discountCode,
      discountValue,
      discountType,
      expiryDate: expiry,
      costInCoins,
    });

    await newDiscount.save();

    res.status(201).json({ message: "Discount created successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while creating the discount" });
  }
});

//update disc
router.put('/discount/:id', verifyToken("admin"), async (req, res) => {
  try {
    const discountId = req.params.id
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const discount = await Discount.findById(discountId)
    if(!discount){
      return res.status(404).json({message: "Discount not found"})
    }
    const {
      discountCode,
      expiryDate,
      discountValue,
      discountType,
      costInCoins,
    } = req.body;

    if (
      !discountCode ||
      !expiryDate ||
      !discountValue ||
      !discountType ||
      !costInCoins
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (
      typeof discountCode !== "string" ||
      !/^[a-zA-Z0-9]+$/.test(discountCode)
    ) {
      return res.status(400).json({ message: "Invalid discount code" });
    }
    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({ message: "Invalid discount type" });
    }
    if (
      typeof discountValue !== "number" ||
      discountValue <= 0 ||
      (discountType === "percentage" && discountValue > 100)
    ) {
      return res.status(400).json({ message: "Invalid discount value" });
    }
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime()) || expiry <= currentDate) {
      return res.status(400).json({ message: "Invalid expiry date" });
    }
    if (typeof costInCoins !== "number" || costInCoins < 0) {
      return res.status(400).json({ message: "Invalid cost in coins" });
    }

    await Discount.findByIdAndUpdate(discountId, {
      discountCode,
      expiryDate,
      discountValue,
      discountType, 
      costInCoins,
    });
    res.status(201).json({ message: "Discount updated successfully" });
  } catch (error) {
    res.status(500).json({message: error.message})
  }
})

//delete disc
router.delete('/discount/:id', verifyToken("admin"), async (req, res) => {
  const discountId = req.params.id

  const discount = await Discount.findByIdAndDelete(discountId)
  if (!discount) {
    return res.status(404).json({ message: "Discount not found" });
  }

  return res.status(200).json({
    message: "Discount deleted",
  });
})

module.exports = router;
