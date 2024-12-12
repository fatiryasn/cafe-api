const jwt = require("jsonwebtoken");

const createAccessToken = (_id) => {
  return jwt.sign( {_id } , process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1m",
  });
};

const createRefreshToken = (_id) => {
  return jwt.sign( { _id } , process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

module.exports = {createAccessToken, createRefreshToken}
