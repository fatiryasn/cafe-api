require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const dbConnect = require('./dbConnect')

const productRoute = require('./routes/productRoute')
const userRoute = require('./routes/userRoute')
const commentRoute = require('./routes/commentRoute')

const app = express()
const port = process.env.PORT || 8080
app.use(express.json())
app.use(cookieParser())
app.use(cors({ credentials: true}))
app.use('/api', productRoute)
app.use('/api', userRoute)
app.use("/api", commentRoute);
dbConnect()

app.get('/', (req, res) => {
    res.send("Cafe Api")
})

app.listen(port, () => {
    console.log(`Listening at ${port}`)
})