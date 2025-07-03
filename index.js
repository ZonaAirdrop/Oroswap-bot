import dotenv from 'dotenv';
import { createInterface } from 'node:readline';

import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import pkg from '@cosmjs/stargate';
const { GasPrice, coins } = pkg;
import pkg2 from '@cosmjs/proto-signing';
const { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } = pkg2;

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[!] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[+] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  swap: (msg) => console.log(`${colors.cyan}[↪️] ${msg}${colors.reset}`),
  swapSuccess: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  liquidity: (msg) => console.log(`${colors.cyan}[↪️] ${msg}${colors.reset}`), // Untuk proses liquidity
  liquiditySuccess: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`), // Untuk selesai liquidity
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('-------------------------------------------------');
    console.log(' Oroswap zonaairdrop');
    console.log('-------------------------------------------------');
    console.log(`${colors.reset}\n`);
  },
};

const RPC_URL = 'https://rpc.zigscan.net/';
const API_URL = 'https://testnet-api.oroswap.org/api/';
const EXPLORER_URL = 'https://zigscan.org/tx/';
const GAS_PRICE = GasPrice.fromString('0.025uzig');

// Only token aktif: ZIG, ORO, NFA, CULTCOIN
const TOKEN_SYMBOLS = {
  'uzig': 'ZIG',
  'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro': 'ORO',
  'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa': 'NFA',
  'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin': 'CULTCOIN',
};

const TOKEN_PAIRS = {
  'ORO/ZIG': {
    contract: 'zig15jqg0hmp9n06q0as7uk3x9xkwr9k3r7yh4ww2uc0hek8zlryrgmsamk4qg',
    token1: 'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro',
    token2: 'uzig'
  },
  'NFA/ZIG': {
    contract: 'zig1dye3zfsn83jmnxqdplkfmelyszhkve9ae6jfxf5mzgqnuylr0sdq8ng9tv',
    token1: 'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa',
    token2: 'uzig'
  },
  'CULTCOIN/ZIG': {
    contract: 'zig1j55nw46crxkm03fjdf3cqx3py5cd32jny685x9c3gftfdt2xlvjs63znce',
    token1: 'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin',
    token2: 'uzig'
  }
};

// Token decimals
const TOKEN_DECIMALS = {
  'uzig': 6,
  'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro': 6,
  'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa': 6,
  'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin': 6,
};

// ONLY swap ke: ORO, NFA, CULTCOIN
const SWAP_SEQUENCE = [
  { from: 'uzig', to: 'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro', pair: 'ORO/ZIG' },
  { from: 'uzig', to: 'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa', pair: 'NFA/ZIG' },
  { from: 'uzig', to: 'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin', pair: 'CULTCOIN/ZIG' },
];

// ONLY liquidity ke: ORO/ZIG, NFA/ZIG, CULTCOIN/ZIG
const LIQUIDITY_PAIRS = [
  'ORO/ZIG',
  'NFA/ZIG',
  'CULTCOIN/ZIG'
];

function getRandomMaxSpread() {
  const min = 0.005;
  const max = 0.02;
  return (Math.random() * (max - min) + min).toFixed(3);
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function isValidNumber(input) {
  const num = parseInt(input);
  return !isNaN(num) && num > 0;
}

function toMicroUnits(amount, denom) {
  const decimals = TOKEN_DECIMALS[denom] || 6;
  return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
}

function isMnemonic(input) {
  const words = input.trim().split(/\s+/);
  return words.length >= 12 && words.length <= 24 && words.every(word => /^[a-z]+$/.test(word));
}

async function getWallet(key) {
  if (isMnemonic(key)) {
    return await DirectSecp256k1HdWallet.fromMnemonic(key, { prefix: 'zig' });
  } else if (/^[0-9a-fA-F]{64}$/.test(key.trim())) {
    return await DirectSecp256k1Wallet.fromKey(Buffer.from(key.trim(), 'hex'), 'zig');
  }
  throw new Error('Invalid mnemonic/private key');
}

async function getAccountAddress(wallet) {
  const [account] = await wallet.getAccounts();
  return account.address;
}

function getRandomSwapAmount() {
  const min = 0.0005;
  const max = 0.002;
  return Math.random() * (max - min) + min;
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getPoolInfo(contractAddress) {
  try {
    const client = await SigningCosmWasmClient.connect(RPC_URL);
    const poolInfo = await client.queryContractSmart(contractAddress, { pool: {} });
    return poolInfo;
  } catch (error) {
    logger.error(`Failed to get pool info: ${error.message}`);
    return null;
  }
}

async function canSwap(pairName, fromDenom, amount) {
  const pair = TOKEN_PAIRS[pairName];
  const poolInfo = await getPoolInfo(pair.contract);
  if (!poolInfo) {
    logger.warn(`[!] Tidak bisa cek pool info untuk ${pairName}, swap di-skip.`);
    return false;
  }
  const asset = poolInfo.assets.find(a => a.info.native_token?.denom === fromDenom);
  const poolBalance = asset ? parseFloat(asset.amount) / Math.pow(10, TOKEN_DECIMALS[fromDenom]) : 0;
  if (poolBalance <= 10 * amount) {
    logger.warn(`[!] Pool ${pairName} terlalu kecil (${poolBalance} ${fromDenom}), skip swap.`);
    return false;
  }
  return true;
}

async function getBalance(address, denom) {
  try {
    const client = await SigningCosmWasmClient.connect(RPC_URL);
    const bal = await client.getBalance(address, denom);
    return bal && bal.amount ? parseFloat(bal.amount) / Math.pow(10, TOKEN_DECIMALS[denom] || 6) : 0;
  } catch (e) {
    logger.error("Gagal getBalance: " + e.message);
    return 0;
  }
}

async function getUserPoints(address) {
  try {
    const response = await fetch(`${API_URL}user/${address}`);
    if (!response.ok) return 0;
    const data = await response.json();
    if (data && typeof data.point !== 'undefined') return data.point;
    if (data && data.data && typeof data.data.point !== 'undefined') return data.data.point;
    return 0;
  } catch (e) {
    return 0;
  }
}

async function getAllBalances(address) {
  const denoms = Object.keys(TOKEN_SYMBOLS);
  const balances = {};
  for (const denom of denoms) {
    balances[denom] = await getBalance(address, denom);
  }
  return balances;
}

async function printWalletInfo(address) {
  const points = await getUserPoints(address);
  logger.info(`Wallet: ${address}`);
  logger.info(`Points: ${points}`);
  const balances = await getAllBalances(address);
  let balanceStr = '[✓] Balance: ';
  for (const denom of Object.keys(TOKEN_SYMBOLS)) {
    const symbol = TOKEN_SYMBOLS[denom];
    const val = balances[denom];
    balanceStr += `${symbol} ${val} | `;
  }
  balanceStr = balanceStr.replace(/\s\|\s$/, '');
  logger.info(balanceStr);
  return { points, balances };
}

function calculateBeliefPrice(poolInfo, pairName, fromDenom) {
  try {
    if (!poolInfo || !poolInfo.assets || poolInfo.assets.length !== 2) {
      logger.warn(`Belief price fallback to 1 for ${pairName}`);
      return "1";
    }
    const pair = TOKEN_PAIRS[pairName];
    let amountToken1 = 0, amountToken2 = 0;
    poolInfo.assets.forEach(asset => {
      if (asset.info.native_token && asset.info.native_token.denom === pair.token1) {
        amountToken1 = parseFloat(asset.amount) / Math.pow(10, TOKEN_DECIMALS[pair.token1]);
      }
      if (asset.info.native_token && asset.info.native_token.denom === pair.token2) {
        amountToken2 = parseFloat(asset.amount) / Math.pow(10, TOKEN_DECIMALS[pair.token2]);
      }
    });
    let price;
    if (fromDenom === pair.token1) {
      price = amountToken2 / amountToken1;
    } else {
      price = amountToken1 / amountToken2;
    }
    logger.info(`Belief price untuk ${pairName}: ${price}`);
    return price.toFixed(18);
  } catch (err) {
    logger.warn(`Belief price fallback to 1 for ${pairName}`);
    return "1";
  }
}

async function performSwap(wallet, address, amount, pairName, swapNumber, fromDenom, toDenom) {
  try {
    const pair = TOKEN_PAIRS[pairName];
    if (!pair.contract) {
      logger.error(`Contract address not set for ${pairName}`);
      return null;
    }
    const balance = await getBalance(address, fromDenom);
    if (balance < amount) {
      logger.warn(`[!] Skip swap ${swapNumber}: saldo ${TOKEN_SYMBOLS[fromDenom] || fromDenom} (${balance}) kurang dari swap (${amount})`);
      return null;
    }
    if (!(await canSwap(pairName, fromDenom, amount))) {
      logger.warn(`[!] Skip swap ${swapNumber}: pool terlalu kecil untuk swap.`);
      return null;
    }
    const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet, { gasPrice: GAS_PRICE });
    const microAmount = toMicroUnits(amount, fromDenom);
    const poolInfo = await getPoolInfo(pair.contract);
    const beliefPrice = calculateBeliefPrice(poolInfo, pairName, fromDenom);
    // max_spread dihapus (default ke 0.01 jika diperlukan)
    const maxSpread = "0.01";
    const msg = {
      swap: {
        belief_price: beliefPrice,
        max_spread: maxSpread,
        offer_asset: {
          amount: microAmount.toString(),
          info: { native_token: { denom: fromDenom } },
        },
      },
    };
    const funds = coins(microAmount, fromDenom);
    const fromSymbol = TOKEN_SYMBOLS[fromDenom] || fromDenom;
    const toSymbol = TOKEN_SYMBOLS[toDenom] || toDenom;

    logger.swap(`Swap ${swapNumber}: ${amount.toFixed(5)} ${fromSymbol} -> ${toSymbol}`);
    logger.info(`Max spread swap: ${maxSpread}`);
    const result = await client.execute(address, pair.contract, msg, 'auto', 'Swap', funds);
    logger.swapSuccess(`Complete swap ${swapNumber}: ${fromSymbol} -> ${toSymbol} | Tx: ${EXPLORER_URL}${result.transactionHash}`);
    return result;
  } catch (error) {
    logger.error(`Swap ${swapNumber} failed: ${error.message}`);
    return null;
  }
}

async function addLiquidity(wallet, address, pairName, liquidityNumber) {
  try {
    const pair = TOKEN_PAIRS[pairName];
    if (!pair.contract) {
      logger.error(`Contract address not set for ${pairName}`);
      return null;
    }
    const saldoToken1 = await getBalance(address, pair.token1);
    const saldoZIG = await getBalance(address, 'uzig');
    if (saldoToken1 === 0 || saldoZIG === 0) {
      logger.warn(`Skip add liquidity ${pairName}: saldo kurang`);
      return null;
    }
    const token1Amount = saldoToken1 * 0.2;
    const zigAmount = saldoZIG * 0.2;
    const poolInfo = await getPoolInfo(pair.contract);
    if (!poolInfo) {
      logger.warn(`Skip add liquidity ${pairName}: pool info tidak didapat`);
      return null;
    }
    const poolToken1 = parseFloat(poolInfo.assets[0].amount) / Math.pow(10, TOKEN_DECIMALS[pair.token1]);
    const poolZIG = parseFloat(poolInfo.assets[1].amount) / Math.pow(10, TOKEN_DECIMALS['uzig']);
    const ratio = poolToken1 / poolZIG;
    let adjustedToken1 = token1Amount;
    let adjustedZIG = zigAmount;
    if (token1Amount / zigAmount > ratio) {
      adjustedToken1 = zigAmount * ratio;
    } else {
      adjustedZIG = token1Amount / ratio;
    }
    const microAmountToken1 = toMicroUnits(adjustedToken1, pair.token1);
    const microAmountZIG = toMicroUnits(adjustedZIG, 'uzig');
    logger.liquidity(`Liquidity ${liquidityNumber}: Adding (20%) ${adjustedToken1.toFixed(6)} ${TOKEN_SYMBOLS[pair.token1]} + ${adjustedZIG.toFixed(6)} ZIG`);
    const msg = {
      provide_liquidity: {
        assets: [
          { amount: microAmountToken1.toString(), info: { native_token: { denom: pair.token1 } } },
          { amount: microAmountZIG.toString(), info: { native_token: { denom: 'uzig' } } },
        ],
        slippage_tolerance: "0.5",
      },
    };
    const funds = [
      { denom: pair.token1, amount: microAmountToken1.toString() },
      { denom: 'uzig', amount: microAmountZIG.toString() }
    ];
    const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet, { gasPrice: GAS_PRICE });
    const result = await client.execute(address, pair.contract, msg, 'auto', `Adding ${pairName} Liquidity`, funds);
    logger.success(`Liquidity added for ${pairName}! Tx: ${EXPLORER_URL}${result.transactionHash}`);
    logger.liquiditySuccess(`Add Liquidity Completed for ${pairName}`);
    return result;
  } catch (error) {
    logger.error(`Add liquidity failed for ${pairName}: ${error.message}`);
    return null;
  }
}

function displayCountdown(hours, minutes, seconds) {
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  process.stdout.write(`\r${colors.cyan}[🧭] Next execution in: ${timeStr}${colors.reset}`);
}

async function executeTransactionCycle(
  wallet,
  address,
  walletNumber,
  numSwaps,
  numAddLiquidity,
  swapMinDelay,
  swapMaxDelay,
  liquidityMinDelay,
  liquidityMaxDelay
) {
  logger.step(`--- Transaction For Wallet ${walletNumber} ---`);
  await printWalletInfo(address);

  let swapNo = 1;
  for (let i = 0; i < numSwaps; i++) {
    const idx = i % SWAP_SEQUENCE.length;
    const { from, to, pair } = SWAP_SEQUENCE[idx];
    const swapAmount = getRandomSwapAmount();
    await performSwap(wallet, address, swapAmount, pair, swapNo++, from, to);
    const delay = getRandomDelay(swapMinDelay, swapMaxDelay);
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
  }
  let liquidityNo = 1;
  for (let i = 0; i < numAddLiquidity; i++) {
    const pairName = LIQUIDITY_PAIRS[i % LIQUIDITY_PAIRS.length];
    await addLiquidity(wallet, address, pairName, liquidityNo++);
    const liquidityDelay = getRandomDelay(liquidityMinDelay, liquidityMaxDelay);
    await new Promise(resolve => setTimeout(resolve, liquidityDelay * 1000));
  }
  logger.info(`Transaction cycle finished for wallet ${walletNumber}`);
  console.log();
}

async function executeAllWallets(
  keys,
  numSwaps,
  numAddLiquidity,
  swapMinDelay,
  swapMaxDelay,
  liquidityMinDelay,
  liquidityMaxDelay
) {
  for (let walletIndex = 0; walletIndex < keys.length; walletIndex++) {
    const key = keys[walletIndex];
    try {
      const wallet = await getWallet(key);
      const address = await getAccountAddress(wallet);
      logger.step(`Processing wallet: ${address} (wallet ${walletIndex + 1})`);
      await executeTransactionCycle(
        wallet,
        address,
        walletIndex + 1,
        numSwaps,
        numAddLiquidity,
        swapMinDelay,
        swapMaxDelay,
        liquidityMinDelay,
        liquidityMaxDelay
      );
      logger.success(`All transactions completed for wallet ${walletIndex + 1}!`);
      if (walletIndex < keys.length - 1) {
        console.log();
      }
    } catch (error) {
      logger.error(`Error processing wallet ${walletIndex + 1}: ${error.message}`);
    }
  }
}

async function startDailyCountdown(
  keys,
  numSwaps,
  numAddLiquidity,
  swapMinDelay,
  swapMaxDelay,
  liquidityMinDelay,
  liquidityMaxDelay
) {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  while (true) {
    const startTime = Date.now();
    const endTime = startTime + TWENTY_FOUR_HOURS;
    while (Date.now() < endTime) {
      const remaining = endTime - Date.now();
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      displayCountdown(hours, minutes, seconds);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n');
    logger.success('🧭 24 hours completed! Starting new transaction cycle...\n');
    await executeAllWallets(
      keys,
      numSwaps,
      numAddLiquidity,
      swapMinDelay,
      swapMaxDelay,
      liquidityMinDelay,
      liquidityMaxDelay
    );
  }
}

async function main() {
  logger.banner();
  const keys = Object.keys(process.env)
    .filter((key) => key.startsWith('PRIVATE_KEY_'))
    .map((key) => process.env[key]);
  if (keys.length === 0) {
    logger.error('No private keys or mnemonics found in .env file');
    rl.close();
    return;
  }
  let numSwaps;
  while (true) {
    const input = await prompt('Number of swaps per wallet: ');
    if (isValidNumber(input)) {
      numSwaps = parseInt(input);
      break;
    }
    logger.error('Invalid input. Please enter a positive number.');
  }
  let numAddLiquidity;
  while (true) {
    const input = await prompt('Number of add liquidity per wallet: ');
    if (isValidNumber(input)) {
      numAddLiquidity = parseInt(input);
      break;
    }
    logger.error('Invalid input. Please enter a positive number.');
  }
  let swapMinDelay, swapMaxDelay;
  while (true) {
    const input = await prompt('Min delay between swaps (seconds): ');
    if (isValidNumber(input)) {
      swapMinDelay = parseInt(input);
      break;
    }
    logger.error('Invalid input. Please enter a positive number.');
  }
  while (true) {
    const input = await prompt('Max delay between swaps (seconds): ');
    if (isValidNumber(input) && parseInt(input) >= swapMinDelay) {
      swapMaxDelay = parseInt(input);
      break;
    }
    logger.error(`Invalid input. Please enter a number greater than or equal to ${swapMinDelay}.`);
  }
  let liquidityMinDelay, liquidityMaxDelay;
  while (true) {
    const input = await prompt('Min delay between add liquidity (seconds): ');
    if (isValidNumber(input)) {
      liquidityMinDelay = parseInt(input);
      break;
    }
    logger.error('Invalid input. Please enter a positive number.');
  }
  while (true) {
    const input = await prompt('Max delay between add liquidity (seconds): ');
    if (isValidNumber(input) && parseInt(input) >= liquidityMinDelay) {
      liquidityMaxDelay = parseInt(input);
      break;
    }
    logger.error(`Invalid input. Please enter a number greater than or equal to ${liquidityMinDelay}.`);
  }
  console.log();
  await executeAllWallets(
    keys,
    numSwaps,
    numAddLiquidity,
    swapMinDelay,
    swapMaxDelay,
    liquidityMinDelay,
    liquidityMaxDelay
  );
  await startDailyCountdown(
    keys,
    numSwaps,
    numAddLiquidity,
    swapMinDelay,
    swapMaxDelay,
    liquidityMinDelay,
    liquidityMaxDelay
  );
}

main().catch((error) => {
  logger.error(`Bot failed: ${error.message}`);
  rl.close();
});
