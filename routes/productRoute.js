const router = require("express").Router();
const fs = require('fs')
const Product = require("../models/productModel");
const cloudinary = require('../utils/cloudinary');
const upload = require('../utils/multer')

//get all products
router.get("/product", async (req, res) => {
  try {
    const search = req.query.search || ""
    const category = req.query.category || ""
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10 
    let sort = req.query.sort || 'default'

    //sort handling
    switch (sort) {
      case "asc":
        sort = { productName: 1 };
        break;
      case "dsc":
        sort = { productName: -1 };
        break;
      case "newest":
        sort = { createdAt: -1 };
        break;
      default:
        sort = "_id"
    }

    //limit handling
    const skip = (page - 1) * limit
    const limitOptions = [10, 20, 50]
    const selectedLimit = limitOptions.includes(limit) ? limit : 10

    //category handling
    const catOptions = ["drink", "food", "other"]
    const selectedCat = catOptions.includes(category) && search === "" ? {productCategory : category} : {}

    //search handling
    const searchVal = search ? {
      $or: [
        {productName: {$regex: search, $options: 'i'}}
      ]
    } : {}

    const query = {...selectedCat, ...searchVal}
    const collation = { locale: "en", strength: 2 };
    const dataCount = await Product.countDocuments(query)

    const products = await Product.find( query )
    .sort(sort)
    .limit(selectedLimit)
    .skip(skip)
    .collation(collation)
    .exec();
    if (!products || products.length <= 0) {
      return res.status(404).json({ message: "No data found" });
    }
    return res.status(200).json({
      data: products,
      dataCount: dataCount,
      currentPage: page,
      totalPages: await Math.ceil(dataCount / selectedLimit)
    });
  } catch (err) { 
    res.status(500).json({ message: err.message });
  }
});


//get one product
router.get("/product/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product || product.length <= 0) {
      return res.status(404).json({ message: "No product found" });
    }
    return res.status(200).json({
      data: product,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//create product
router.post("/product", upload.single("image"), async (req, res) => {
  try {
    const {productName, productDescription, productPrice, productCategory, productStock} = req.body;

    if ( !productName || !productDescription || !productPrice || !productCategory || !productStock ) {
      return res.status(400).json({ message: "Request is incomplete" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Image upload failed" });
    }
    if (productPrice < 0 || productStock < 0) {
      return res
        .status(400)
        .json({ message: "Price or Stock must not be negative" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "products",
    });
    fs.unlinkSync(req.file.path);

    const newProduct = {
      productName,
      productDescription,
      productPrice,
      productImagePath: result.secure_url,
      productCategory,
      productStock,
    };

    const product = await Product.create(newProduct);

    return res.status(201).json({
      message: "New product created",
      data: product,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//update one product
router.patch("/product/:id", upload.single("image"), async (req, res) => {
  try {
    const productId = req.params.id;
    const { productName, productDescription, productPrice, productCategory, productStock } = req.body;

    if ( !req.file && !productName && !productDescription && !productPrice && !productCategory && !productStock ) {
      return res.status(400).json({ message: "Request is incomplete" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "No product found" });
    }

    if (product.productImagePath) {
      const publicId = product.productImagePath
        .split("/")
        .pop()
        .split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "products",
    });
    fs.unlinkSync(req.file.path);
    req.body.productImagePath = result.secure_url;
    

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      req.body,
      { new: true }
    );
    return res.status(200).json({
      message: "Product updated",
      data: updatedProduct,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// delete one product
router.delete("/product/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: "No product found" });
    }
    if (product.productImagePath) {
      const publicId = product.productImagePath
        .split("/")
        .pop()
        .split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await Product.findByIdAndDelete(productId);

    return res.status(200).json({
      message: "Product deleted",
      data: product,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
