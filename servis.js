const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

function loadWallets() {
  const wallets = [];
  Object.keys(process.env)
    .filter((k) => k.startsWith("PRIVATE_KEY_"))
    .forEach((k) => {
      if (process.env[k]) wallets.push(process.env[k].replace(/"/g, ""));
    });
  return wallets;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(color, msg) {
  const colors = {
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    blue: "\x1b[34m",
    reset: "\x1b[0m",
  };
  console.log(`${colors[color] || ""}%s${colors.reset}`, msg);
}

function loadConfig(filename = "config.json") {
  if (!fs.existsSync(filename)) return {};
  try {
    return JSON.parse(fs.readFileSync(filename));
  } catch (e) {
    return {};
  }
}

function saveConfig(obj, filename = "config.json") {
  fs.writeFileSync(filename, JSON.stringify(obj, null, 2));
}

module.exports = {
  loadWallets,
  randomBetween,
  delay,
  log,
  loadConfig,
  saveConfig,
};
