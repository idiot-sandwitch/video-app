const express = require("express");
const path = require("path");

const app = express();
const pathToPublic = path.join(__dirname, "../public");

const port = process.env.PORT || 3000;

app.use(express.static(pathToPublic));

app.listen(3000, () => {
  console.log(`Listening to ${port}`);
});
