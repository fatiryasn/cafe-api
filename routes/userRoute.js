const router = require("express").Router();
const User = require("../models/userModel");
const Reservation = require("../models/reservationModel")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/verifyToken");
const { createAccessToken, createRefreshToken } = require("../utils/jwtUtils");
const TableStat = require("../models/tableStatModel");

//get all users
router.get("/user", verifyToken("admin"), async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const role = req.query.role || ""
    let sort = req.query.sort || "default";

    //sort handling
    switch (sort) {
      case "asc":
        sort = { username: 1 };
        break;
      case "dsc":
        sort = { username: -1 };
        break;
      case "newest":
        sort = { createdAt: -1 };
        break;
      default:
        sort = "_id";
    }

    //limit handling
    const skip = (page - 1) * limit;
    const limitOptions = [10, 20, 50];
    const selectedLimit = limitOptions.includes(limit) ? limit : 10;

    const searchVal = search
      ? {
          $or: [
            { username: { $regex: search, $options: "i" } },
            { useremail: { $regex: search, $options: "i" } },
          ],
        }
      : {};
    const roleOptions = ["admin", "customer"]
    const selectedRole = roleOptions.includes(role) && search === "" ? {role : role} : {}

    const query = {...searchVal, ...selectedRole}
    const collation = { locale: "en", strength: 2 };

    const users = await User.find(query)
      .sort(sort)
      .limit(selectedLimit)
      .skip(skip)
      .collation(collation)
      .exec();
    if (!users || users.length <= 0) {
      return res.status(404).json({ message: "No data found" });
    }
    return res.status(200).json({
      data: users,
      dataCount: await User.countDocuments(query),
      currentPage: page,
      totalPages: await Math.ceil(
        (await User.countDocuments(query)) / selectedLimit
      ),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//register
router.post("/user", async (req, res) => {
  try {
    const { username, useremail, password } = req.body;

    if (!username || !useremail || !password) {
      return res.status(400).json({ message: "Request is incomplete" });
    }
    const checkEmail = await User.findOne({ useremail: useremail });
    if (checkEmail) {
      return res.status(409).json({ message: "Email is used" });
    }

    const salt = await bcrypt.genSalt(Number(10));
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      username,
      useremail,
      password: hashedPassword,
      role: "customer",
      refreshToken: null,
    };
    await User.create(newUser);
    return res.status(201).json({
      message: "User created",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//login
router.post("/login", async (req, res) => {
  try {
    const { useremail, password } = req.body;

    if (!useremail || !password) {
      return res.status(400).json({ message: "Request is incomplete" });
    }
    const user = await User.findOne({ useremail: useremail });
    if (!user) {
      return res.status(404).json({ message: "No email found" });
    }

    const matchPassword = await bcrypt.compare(password, user.password);
    if (!matchPassword) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    const accessToken = createAccessToken(user._id, user.username, user.useremail, user.role);
    const refreshToken = createRefreshToken(user._id, user.username, user.useremail, user.role);
    await User.updateOne({ _id: user._id }, { refreshToken: refreshToken });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: true,
      sameSite: "none"
    });
    res.json({ accessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
 
//delete one user
router.delete("/user/:id", verifyToken("admin"), async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "No user found" });
    }

    const usersReservations = await Reservation.find({ userId: userId });
    const tableIds = usersReservations.flatMap((res) => res.tableId);

    await Reservation.deleteMany({ userId: userId });
    await TableStat.deleteMany({ tableId: {$in: tableIds} });

    return res.status(200).json({
      message: "User deleted",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



//refresh token
router.get("/token", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(401);

    const user = await User.findOne({refreshToken: refreshToken})
    if(!user) return res.status(403)

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403);
      const newAccessToken = createAccessToken(user._id, user.username, user.useremail, user.role);
      res.json({ accessToken: newAccessToken });
    }); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//logout route
router.delete('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401); 

  try {
    const user = await User.findOneAndUpdate({ refreshToken: refreshToken }, { refreshToken: null });
    if (!user) {
      return res.status(404).json({ message: "User not found or already logged out" });
    }
    res.clearCookie('refreshToken'); 
    return res.status(200).json({ message: "Logout success" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
