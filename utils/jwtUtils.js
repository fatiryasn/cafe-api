const jwt = require("jsonwebtoken");

const createAccessToken = (_id, username, useremail, role) => {
  return jwt.sign( {_id, username, useremail, role } , process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "10m",
  });
};

const createRefreshToken = (_id, username, useremail, role) => {
  return jwt.sign( { _id, username, useremail, role } , process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

module.exports = {createAccessToken, createRefreshToken}
