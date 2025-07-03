# Oroswap-bot

**Oroswap-bot** is an automation tool written in **JavaScript (Node.js)** for performing swap and add liquidity transactions on the Zigchain network (OroSwap DEX). The bot supports multiple wallets, randomized transaction amounts and delays, and can run with or without proxies.(Coming soon waiting next update)

---

## Features

- Multi-wallet support: Read any number of private keys or mnemonics from the `.env` file
- Automated swaps and liquidity: Perform token swaps and add liquidity actions with randomized amounts, order, and delays
- Daily loop: Automatically repeats transaction cycles every 24 hours
- Colorful logging: All bot activities are printed in color-coded log messages

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or newer (latest LTS recommended)
- Internet connection
- At least one private key or mnemonic for a ZIG wallet (added to `.env`)

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
PRIVATE_KEY_1=word1 word2 word3 ... word12"
PRIVATE_KEY_2=word1 ... word12"
```
**Example with hex private key:**
```
PRIVATE_KEY_1=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
```
You can add as many `PRIVATE_KEY_X` entries as you want.

### 4. Run the Bot

```bash
node bot.js
```

- You will be prompted for configuration such as the number of swaps and liquidity actions per wallet, and delay settings.
- The bot will run all wallets based on your configuration, and then automatically repeat every 24 hours.

---

## How the Bot Works

1. **Reads wallets** from the `.env` file (multiple supported).
2. **Shows wallet info and balances**.
3. **Executes swap and add liquidity transactions**:
   - Randomizes amounts and order.
   - Waits a random delay between actions.
4. **Loops every 24 hours**.

---

## Supported Tokens & Pairs

- Tokens: ZIG, ORO, NFA, CULTCOIN
- Pairs: ORO/ZIG, NFA/ZIG, CULTCOIN/ZIG

---

## Tips & FAQ

- **Never share your `.env` file with anyone!**  
- To add more wallets, just add more lines to `.env` (`PRIVATE_KEY_3`, etc).
- If you encounter dependency errors, always run `npm install` first.
- Make sure your wallet(s) have enough balance for gas and swaps.

---

## Troubleshooting

- **Dependency errors**  
  Run `npm install` to install all dependencies.
- **Bot not running on Windows**  
  Use an updated terminal (CMD, PowerShell, or Windows Terminal) and the latest Node.js.
- **Token balances not updating**  
  Ensure your wallet has sufficient tokens and gas.

---

## Disclaimer

This tool is provided for educational and research purposes only.  
You are fully responsible for any risks, financial losses, or legal issues that may arise from using this software.  
Always secure your private keys and never share your `.env` file with anyone.  
Use at your own risk.

---

## Credits

Open-source project by [ZonaAirdrop](https://github.com/ZonaAirdrop).

Telegram: [ZonaAirdrop](https://t.me/ZonaAirdr0p)
