# Oroswap-bot

**Oroswap-bot** is an automation tool written in **JavaScript (Node.js)** for performing swap and add liquidity transactions on the Zigchain network (OroSwap DEX). The bot supports multiple wallets, randomized transaction amounts and delays, and can run with or without proxies (HTTP/HTTPS, with or without authentication).

---

## Features

- **Multi-wallet support:** Read any number of private keys or mnemonics from the `.env` file
- **Automated swaps:** Perform swap transactions with randomization and configurable amounts
- **Automated liquidity:** Add liquidity to supported pools with randomized parameters
- **Proxy support:** Use HTTP or HTTPS proxies, with or without authentication (from `proxy.txt`)
- **Randomized delays:** Customizable random delay between swaps and liquidity actions
- **Daily loop:** Automatically repeats transaction cycles every 24 hours
- **Colorful logging:** All bot activities are printed in color-coded log messages

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or newer (latest LTS recommended)
- Internet connection
- At least one private key or mnemonic for a ZIG wallet (added to `.env`)
- (Optional) Proxies listed in `proxy.txt`

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ZonaAirdrop/Oroswap-bot.git
cd Oroswap-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create the `.env` File

Create a `.env` file in the project directory. Add your wallet mnemonic(s) or private key(s):

**Example with mnemonics:**
```
PRIVATE_KEY_1="word1 word2 word3 ... word12"
PRIVATE_KEY_2="word1 ... word12"
```
**Example with hex private key:**
```
PRIVATE_KEY_1="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
```
You can add as many `PRIVATE_KEY_X` entries as you want.

### 4. (Optional) Setup Proxies

Create a `proxy.txt` file if you want to use proxies. Each line should contain one proxy in any of these formats:
```
http://user:pass@43.134.153.177:7777
https://user:pass@1.2.3.4:443
1.2.3.4:8080
```
Both HTTP and HTTPS, with or without authentication are supported.  
If you do not wish to use a proxy, you can skip this step.

### 5. Run the Bot

```bash
node bot.js
```

- You will be prompted to choose proxy mode.
- Enter the number of swaps and liquidity actions per wallet, and set the delay ranges.
- The bot will run all wallets, and then automatically repeat every 24 hours.

---

## How the Bot Works

1. **Reads wallets** from the `.env` file (multiple supported).
2. **Optionally reads proxies** from `proxy.txt` based on your selection.
3. **Shows wallet info and balances**.
4. **Executes swap and add liquidity transactions**:
   - Randomizes amounts and order.
   - Waits a random delay between actions.
5. **Loops every 24 hours**.

---

## Supported Tokens & Pairs

- Tokens: ZIG, ORO, NFA, CULTCOIN
- Pairs: ORO/ZIG, NFA/ZIG, CULTCOIN/ZIG

---

## Tips & FAQ

- **Never share your `.env` file with anyone!**  
- To add more wallets, just add more lines to `.env` (`PRIVATE_KEY_3`, etc).
- For proxy errors, double-check your `proxy.txt` formatting.
- If you encounter dependency errors, always run `npm install` first.
- Make sure your wallet(s) have enough balance for gas and swaps.

---

## Troubleshooting

- **`proxy.txt not found or all proxies invalid`**  
  Make sure `proxy.txt` exists and each line follows the required format.
- **Dependency errors**  
  Run `npm install` to install all dependencies.
- **Bot not running on Windows**  
  Use an updated terminal (CMD, PowerShell, or Windows Terminal) and the latest Node.js.
- **Token balances not updating**  
  Ensure your wallet has sufficient tokens and gas.

---

## Credits

Open-source project by [ZonaAirdrop](https://github.com/ZonaAirdrop).

Telegram: [ZonaAirdrop](https://t.me/ZonaAirdrop)
