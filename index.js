require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dbConnect = require("./dbConnect");

const productRoute = require("./routes/productRoute");
const userRoute = require("./routes/userRoute");
const commentRoute = require("./routes/commentRoute");
const orderRoute = require("./routes/orderRoute");
const reservationRoute = require("./routes/reservationRoute");
const tableRoute = require("./routes/tableRoute");
const commonRoute = require("./routes/commonRoute");

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Origin",
      "Accept",
    ], 
  })
);


dbConnect();

app.use("/api", productRoute);
app.use("/api", userRoute);
app.use("/api", commentRoute);
app.use("/api", orderRoute);
app.use("/api", tableRoute);
app.use("/api", reservationRoute);
app.use("/api", commonRoute);

app.get("/", (req, res) => {
  res.send("Cafe API");
});

app.listen(port, () => {
  console.log(`Listening at ${port}`);
});
