const router = require("express").Router();
const Discount = require("../models/discountModel");

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

    if(discount.forUserId){
        return res.status(400).json({message: "Discount code is used"})
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


//create discount code
router.post("/discount", async (req, res) => {
  try {
    const {discountCode, expiryDate, discountValue, discountType, costInCoins} = req.body
    if (!discountCode || !expiryDate || !discountValue || !discountType || !costInCoins){
      return res.status(400).json({message: "Request is incomplete"})
    }
    const discount = await Discount.findOne({discountCode: discountCode})
    if(discount){
      return res.status(400).json({message: "Sorry! the code is already used"})
    }

    const newDiscountCode = new Discount({
      discountCode,
      discountValue,
      discountType,
      expiryDate,
      costInCoins
    })
    await newDiscountCode.save()
    res.status(201).json({
      message: "New discount created"
    })
  } catch (error) {
    res.status(500).json({message: error.message})
  }
})

module.exports = router;
