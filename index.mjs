import dotenv from 'dotenv';
import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import pkg_stargate from '@cosmjs/stargate';
const { GasPrice, coins } = pkg_stargate;
import pkg_proto_signing from '@cosmjs/proto-signing';
const { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } = pkg_proto_signing;
import { HttpBatchClient, Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { SocksProxyAgent } from 'socks-proxy-agent';

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
};
const clear_console = () => {
  process.stdout.write('\x1B[2J\x1B[0f');
};

const log_message = (msg) => {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`${colors.brightBlack}[${timestamp}]${colors.reset} ${msg}`);
};

const logger = {
  info: (msg) => log_message(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => log_message(`${colors.yellow}[!] ${msg}${colors.reset}`),
  error: (msg) => log_message(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => log_message(`${colors.green}[+] ${msg}${colors.reset}`),
  loading: (msg) => log_message(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => log_message(`${colors.white}[➤] ${msg}${colors.reset}`),
  swap: (msg) => log_message(`${colors.cyan}[↪️] ${msg}${colors.reset}`),
  swapSuccess: (msg) => log_message(`${colors.green}[✅] ${msg}${colors.reset}`),
  liquidity: (msg) => log_message(`${colors.cyan}[↪️] ${msg}${colors.reset}`),
  liquiditySuccess: (msg) => log_message(`${colors.green}[✅] ${msg}${colors.reset}`),
};
const display_welcome_screen = async () => {
    clear_console();
    const now = new Date();
    const date_str = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.');
    const time_str = now.toLocaleTimeString('en-US', { hour12: false });

    console.log(`${colors.brightGreen}${colors.bold}`);
    console.log("  ┌─────────────────────────────────┐");
    console.log("  │     [ O R O S W A P ]           │");
    console.log(`  │                                 │`);
    console.log(`  │     ${colors.yellow}${time_str} ${date_str}${colors.brightGreen}       │`);
    console.log("  │                                 │");
    console.log("  │   Automated Protocol Utility    │");
    console.log(`  │ ${colors.brightWhite}   by ZonaAirdrop ${colors.brightGreen}(@ZonaAirdr0p)${colors.reset} │`);
    console.log("  └─────────────────────────────────┘\n");
    await new Promise(resolve => setTimeout(resolve, 1000));
};
const RPC_URL = 'https://rpc.zigscan.net/';
const API_URL = 'https://testnet-api.oroswap.org/api/';
const EXPLORER_URL = 'https://zigscan.org/tx/';
const GAS_PRICE = GasPrice.fromString('0.03uzig');
const TOKEN_SYMBOLS = {
  'uzig': 'ZIG',
  'coin.zig1zpnw5dtzzttmgtdjgtywt08wnlyyskpuupy3cfw8mytlslx54j9sgz6w4n.zmzig': 'ZMZIG',
  'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa': 'NFA',
  'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin': 'CULTCOIN',
  'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uor': 'ORO',
};
const TOKEN_PAIRS = {
  'ZMZIG/ZIG': {
    contract: 'zig15meu4rk66v0wlp59tuewng4rpfvepagpfd8uq9w59rd77ce56dnqftmxn2',
    token1: 'coin.zig1zpnw5dtzzttmgtdjgtywt08wnlyyskpuupy3cfw8mytlslx54j9sgz6w4n.zmzig',
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
  },
  'ORO/ZIG': {
    contract: 'zig15jqg0hmp9n06q0as7uk3x9xkwr9k3r7yh4ww2uc0hek8zlryrgmsamk4qg',
    token1: 'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uor',
    token2: 'uzig'
  }
};
const TOKEN_DECIMALS = {
  'uzig': 6,
  'coin.zig1zpnw5dtzzttmgtdjgtywt08wnlyyskpuupy3cfw8mytlslx54j9sgz6w4n.zmzig': 6,
  'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa': 6,
  'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin': 6,
  'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uor': 6,
};
const SWAP_SEQUENCE = [
  [cite_start]// ZIG -> NFA [cite: 20]
  { from: 'uzig', to: 'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa', pair: 'NFA/ZIG' },
  [cite_start]// ZIG -> CULTCOIN [cite: 20]
  { from: 'uzig', to: 'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin', pair: 'CULTCOIN/ZIG' },
  // ZIG -> ORO (Added new swap sequence)
  { from: 'uzig', to: 'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uor', pair: 'ORO/ZIG' },
];
const LIQUIDITY_PAIRS = [
  'ZMZIG/ZIG',
  'NFA/ZIG',
  'CULTCOIN/ZIG',
  [cite_start]'ORO/ZIG' [cite: 21]
];

function getRandomMaxSpread() {
  const min = 0.01;
  [cite_start]const max = 0.02; [cite: 22]
  [cite_start]return (Math.random() * (max - min) + min).toFixed(3); [cite: 23]
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.blue}${question}${colors.reset}`, (answer) => {
      resolve(answer.trim());
    });
  [cite_start]}); [cite: 24, 25]
}

function isValidNumber(input) {
  const num = parseInt(input);
  [cite_start]return !isNaN(num) && num > 0; [cite: 26]
}

function toMicroUnits(amount, denom) {
  const decimals = TOKEN_DECIMALS[denom] || [cite_start]6; [cite: 26]
  [cite_start]return Math.floor(parseFloat(amount) * Math.pow(10, decimals)); [cite: 27]
}

function isMnemonic(input) {
  [cite_start]const words = input.trim().split(/\s+/); [cite: 27]
  [cite_start]return words.length >= 12 && words.length <= 24 && words.every(word => /^[a-z]+$/.test(word)); [cite: 27]
}

async function getWallet(key) {
  if (isMnemonic(key)) {
    [cite_start]return await DirectSecp256k1HdWallet.fromMnemonic(key, { prefix: 'zig' }); [cite: 28]
  } else if (/^[0-9a-fA-F]{64}$/.test(key.trim())) {
    return await DirectSecp256k1Wallet.fromKey(Buffer.from(key.trim(), 'hex'), 'zig');
  }
  [cite_start]throw new Error('Invalid mnemonic/private key'); [cite: 29, 30]
}

async function getAccountAddress(wallet) {
  const [account] = await wallet.getAccounts();
  return account.address;
}

function getRandomSwapAmount() {
  [cite_start]const min = 0.01; [cite: 31]
  [cite_start]const max = 0.012; [cite: 31]
  [cite_start]return Math.random() * (max - min) + min; [cite: 32]
}

function getRandomDelay(min, max) {
  [cite_start]return Math.floor(Math.random() * (max - min + 1)) + min; [cite: 33]
}

async function getPoolInfo(contractAddress, rpcClient) {
  try {
    [cite_start]const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, rpcClient); [cite: 34]
    [cite_start]const poolInfo = await client.queryContractSmart(contractAddress, { pool: {} }); [cite: 34]
    [cite_start]return poolInfo; [cite: 35]
  } catch (error) {
    [cite_start]logger.error(`Failed to get pool info: ${error.message}`); [cite: 35]
    [cite_start]return null; [cite: 36]
  }
}

async function canSwap(pairName, fromDenom, amount, rpcClient) {
  const pair = TOKEN_PAIRS[pairName];
  [cite_start]const poolInfo = await getPoolInfo(pair.contract, rpcClient); [cite: 37]
  if (!poolInfo) {
    [cite_start]logger.warn(`[!] Tidak bisa cek pool info untuk ${pairName}, swap di-skip.`); [cite: 37]
    [cite_start]return false; [cite: 38]
  }
  [cite_start]const asset = poolInfo.assets.find(a => a.info.native_token?.denom === fromDenom); [cite: 38]
  const poolBalance = asset ?
  [cite_start]parseFloat(asset.amount) / Math.pow(10, TOKEN_DECIMALS[fromDenom]) : 0; [cite: 39]
  if (poolBalance <= 10 * amount) {
    [cite_start]logger.warn(`[!] Pool ${pairName} terlalu kecil (${poolBalance} ${fromDenom}), skip swap.`); [cite: 39]
    [cite_start]return false; [cite: 40]
  }
  return true;
}

async function getBalance(address, denom, rpcClient) {
  try {
    [cite_start]const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, rpcClient); [cite: 41]
    [cite_start]const bal = await client.getBalance(address, denom); [cite: 41]
    [cite_start]return bal && bal.amount ? parseFloat(bal.amount) / Math.pow(10, TOKEN_DECIMALS[denom] || 6) : 0; [cite: 41, 42]
  } catch (e) {
    [cite_start]logger.error("Gagal getBalance: " + e.message); [cite: 42]
    [cite_start]return 0; [cite: 43]
  }
}

async function getUserPoints(address) {
  try {
    [cite_start]const response = await fetch(`${API_URL}/user/${address}`); [cite: 43]
    [cite_start]if (!response.ok) return 0; [cite: 43]
    [cite_start]const data = await response.json(); [cite: 44]
    [cite_start]if (data && typeof data.point !== 'undefined') return data.point; [cite: 44]
    [cite_start]if (data && data.data && typeof data.data.point !== 'undefined') return data.data.point; [cite: 45]
    [cite_start]return 0; [cite: 45]
  } catch (e) {
    [cite_start]return 0; [cite: 46]
  }
}

async function getAllBalances(address, rpcClient) {
  [cite_start]const denoms = Object.keys(TOKEN_SYMBOLS); [cite: 47]
  [cite_start]const balances = {}; [cite: 47]
  for (const denom of denoms) {
    [cite_start]balances[denom] = await getBalance(address, denom, rpcClient); [cite: 47]
  }
  [cite_start]return balances; [cite: 48]
}

async function printWalletInfo(address, rpcClient) {
  [cite_start]const points = await getUserPoints(address); [cite: 48]
  [cite_start]logger.info(`Wallet: ${address}`); [cite: 48]
  [cite_start]logger.info(`Points: ${points}`); [cite: 48]
  [cite_start]const balances = await getAllBalances(address, rpcClient); [cite: 49]
  [cite_start]let balanceStr = '[✓] Balance: '; [cite: 49]
  for (const denom of Object.keys(TOKEN_SYMBOLS)) {
    [cite_start]const symbol = TOKEN_SYMBOLS[denom]; [cite: 50]
    [cite_start]const val = balances[denom]; [cite: 50]
    balanceStr += `${symbol} ${val.toFixed(6)} | [cite_start]`; [cite: 51]
  }
  [cite_start]balanceStr = balanceStr.replace(/\s\|\s$/, ''); [cite: 51]
  [cite_start]logger.info(balanceStr); [cite: 51]
  [cite_start]return { points, balances }; [cite: 52]
}

function calculateBeliefPrice(poolInfo, pairName, fromDenom) {
  try {
    if (!poolInfo || !poolInfo.assets || poolInfo.assets.length !== 2) {
      [cite_start]logger.warn(`Belief price fallback to 1 for ${pairName}`); [cite: 52]
      [cite_start]return "1"; [cite: 53]
    }
    [cite_start]const pair = TOKEN_PAIRS[pairName]; [cite: 53]
    [cite_start]let amountToken1 = 0, amountToken2 = 0; [cite: 54]
    poolInfo.assets.forEach(asset => {
      if (asset.info.native_token && asset.info.native_token.denom === pair.token1) {
        amountToken1 = parseFloat(asset.amount) / Math.pow(10, TOKEN_DECIMALS[pair.token1]);
      }
      if (asset.info.native_token && asset.info.native_token.denom === pair.token2) {
        amountToken2 = parseFloat(asset.amount) / Math.pow(10, TOKEN_DECIMALS[pair.token2]);
      }
    [cite_start]}); [cite: 54]
    [cite_start]let price; [cite: 55]
    // Determine the price based on which token is being swapped from
    if (fromDenom === pair.token1) {
      [cite_start]price = amountToken2 / amountToken1; [cite: 56]
    } else if (fromDenom === pair.token2) {
      [cite_start]price = amountToken1 / amountToken2; [cite: 57]
    } else {
      [cite_start]logger.warn(`Belief price fallback to 1: Unknown 'from' denom ${fromDenom} for pair ${pairName}`); [cite: 57]
      [cite_start]return "1"; [cite: 58]
    }

    [cite_start]logger.info(`Belief price untuk ${pairName}: ${price.toFixed(18)}`); [cite: 58]
    [cite_start]return price.toFixed(18); [cite: 59]
  } catch (err) {
    [cite_start]logger.warn(`Belief price fallback to 1 for ${pairName}`); [cite: 59]
    [cite_start]return "1"; [cite: 60]
  }
}

async function performSwap(wallet, address, amount, pairName, swapNumber, fromDenom, toDenom, rpcClient) {
  try {
    [cite_start]const pair = TOKEN_PAIRS[pairName]; [cite: 61]
    if (!pair.contract) {
      [cite_start]logger.error(`Contract address not set for ${pairName}`); [cite: 61]
      [cite_start]return null; [cite: 62]
    }
    [cite_start]const balance = await getBalance(address, fromDenom, rpcClient); [cite: 62]
    if (balance < amount) {
      [cite_start]logger.warn(`[!] Skip swap ${swapNumber}: saldo ${TOKEN_SYMBOLS[fromDenom] || fromDenom} (${balance.toFixed(6)}) kurang dari swap (${amount.toFixed(6)})`); [cite: 63]
      [cite_start]return null; [cite: 64]
    }
    if (!(await canSwap(pairName, fromDenom, amount, rpcClient))) {
      [cite_start]logger.warn(`[!] Skip swap ${swapNumber}: pool terlalu kecil untuk swap.`); [cite: 64]
      [cite_start]return null; [cite: 65]
    }
    [cite_start]const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet, { gasPrice: GAS_PRICE }); [cite: 65]
    [cite_start]const microAmount = toMicroUnits(amount, fromDenom); [cite: 66]
    [cite_start]const poolInfo = await getPoolInfo(pair.contract, rpcClient); [cite: 66]
    [cite_start]const beliefPrice = calculateBeliefPrice(poolInfo, pairName, fromDenom); [cite: 66]
    [cite_start]const maxSpread = "0.5"; [cite: 67]
    const msg = {
      swap: {
        belief_price: beliefPrice,
        max_spread: maxSpread,
        offer_asset: {
          amount: microAmount.toString(),
          info: { native_token: { denom: fromDenom } },
        },
      },
    [cite_start]}; [cite: 67]
    [cite_start]const funds = coins(microAmount, fromDenom); [cite: 68]
    [cite_start]const fromSymbol = TOKEN_SYMBOLS[fromDenom] || fromDenom; [cite: 68]
    [cite_start]const toSymbol = TOKEN_SYMBOLS[toDenom] || toDenom; [cite: 68]
    [cite_start]logger.swap(`Swap ${colors.magenta}${swapNumber}${colors.cyan}: ${amount.toFixed(5)} ${fromSymbol} -> ${toSymbol}`); [cite: 69]
    [cite_start]logger.info(`Max spread swap: ${colors.magenta}${maxSpread}${colors.reset}`); [cite: 69]
    [cite_start]const result = await client.execute(address, pair.contract, msg, 'auto', 'Swap', funds); [cite: 69]
    [cite_start]logger.swapSuccess(`Complete swap ${colors.magenta}${swapNumber}${colors.green}: ${fromSymbol} -> ${toSymbol} | Tx: ${EXPLORER_URL}${result.transactionHash}`); [cite: 70]
    [cite_start]return result; [cite: 70]
  } catch (error) {
    [cite_start]logger.error(`Swap ${swapNumber} failed: ${error.message}`); [cite: 71]
    [cite_start]return null; [cite: 72]
  }
}

async function addLiquidity(wallet, address, pairName, liquidityNumber, rpcClient) {
  try {
    [cite_start]const pair = TOKEN_PAIRS[pairName]; [cite: 72]
    if (!pair.contract) {
      [cite_start]logger.error(`Contract address not set for ${pairName}`); [cite: 73]
      [cite_start]return null; [cite: 74]
    }
    [cite_start]const saldoToken1 = await getBalance(address, pair.token1, rpcClient); [cite: 74]
    [cite_start]const saldoZIG = await getBalance(address, 'uzig', rpcClient); [cite: 74]
    if (saldoToken1 === 0 || saldoZIG === 0) {
      [cite_start]logger.warn(`Skip add liquidity ${pairName}: saldo kurang`); [cite: 75]
      [cite_start]return null; [cite: 76]
    }

    [cite_start]const LIQUIDITY_PERCENTAGE = 0.003; [cite: 76, 77]
    [cite_start]const token1Amount = saldoToken1 * LIQUIDITY_PERCENTAGE; [cite: 77]
    [cite_start]const zigAmount = saldoZIG * LIQUIDITY_PERCENTAGE; [cite: 77]
    [cite_start]const poolInfo = await getPoolInfo(pair.contract, rpcClient); [cite: 78]
    if (!poolInfo) {
      [cite_start]logger.warn(`Skip add liquidity ${pairName}: pool info tidak didapat`); [cite: 78]
      [cite_start]return null; [cite: 79]
    }

    [cite_start]const poolAsset1 = poolInfo.assets.find(asset => asset.info.native_token.denom === pair.token1); [cite: 79]
    [cite_start]const poolAsset2 = poolInfo.assets.find(asset => asset.info.native_token.denom === pair.token2); [cite: 80]

    if (!poolAsset1 || !poolAsset2) {
      [cite_start]logger.warn(`Skip add liquidity ${pairName}: one of the pool assets not found`); [cite: 80]
      [cite_start]return null; [cite: 81]
    }

    [cite_start]const poolToken1 = parseFloat(poolAsset1.amount) / Math.pow(10, TOKEN_DECIMALS[pair.token1]); [cite: 81]
    [cite_start]const poolZIG = parseFloat(poolAsset2.amount) / Math.pow(10, TOKEN_DECIMALS['uzig']); [cite: 82]
    [cite_start]const ratio = poolToken1 / poolZIG; [cite: 82]
    [cite_start]let adjustedToken1 = token1Amount; [cite: 82]
    [cite_start]let adjustedZIG = zigAmount; [cite: 82]
    if (token1Amount / zigAmount > ratio) {
      [cite_start]adjustedToken1 = zigAmount * ratio; [cite: 83]
    } else {
      [cite_start]adjustedZIG = token1Amount / ratio; [cite: 84]
    }

    [cite_start]const microAmountToken1 = toMicroUnits(adjustedToken1, pair.token1); [cite: 85]
    [cite_start]const microAmountZIG = toMicroUnits(adjustedZIG, 'uzig'); [cite: 85]
    if (microAmountToken1 <= 0 || microAmountZIG <= 0) {
      [cite_start]logger.warn(`Skip add liquidity ${pairName}: calculated liquidity amounts are too small.`); [cite: 86]
      [cite_start]return null; [cite: 87]
    }

    [cite_start]logger.liquidity(`Liquidity ${colors.magenta}${liquidityNumber}${colors.cyan}: Adding (${(LIQUIDITY_PERCENTAGE * 100).toFixed(1)}%) ${adjustedToken1.toFixed(6)} ${TOKEN_SYMBOLS[pair.token1]} + ${adjustedZIG.toFixed(6)} ZIG`); [cite: 87]
    const msg = {
      provide_liquidity: {
        assets: [
          { amount: microAmountToken1.toString(), info: { native_token: { denom: pair.token1 } } },
          { amount: microAmountZIG.toString(), info: { native_token: { denom: 'uzig' } } },
        ],
        slippage_tolerance: "0.5",
      },
    [cite_start]}; [cite: 88]
    const funds = [
      { denom: pair.token1, amount: microAmountToken1.toString() },
      { denom: 'uzig', amount: microAmountZIG.toString() }
    [cite_start]]; [cite: 89]
    [cite_start]const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet, { gasPrice: GAS_PRICE }); [cite: 90]
    [cite_start]const result = await client.execute(address, pair.contract, msg, 'auto', `Adding ${pairName} Liquidity`, funds); [cite: 91]
    [cite_start]logger.success(`Liquidity added for ${pairName}! Tx: ${EXPLORER_URL}${result.transactionHash}`); [cite: 91]
    [cite_start]logger.liquiditySuccess(`Add Liquidity ${colors.magenta}${liquidityNumber}${colors.green} Completed for ${pairName}`); [cite: 92]
    return result;
  } catch (error) {
    [cite_start]logger.error(`Add liquidity failed for ${pairName}: ${error.message}`); [cite: 92]
    [cite_start]return null; [cite: 93]
  }
}

async function displayCountdown(hours, minutes, seconds) {
  [cite_start]const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`; [cite: 94]
  [cite_start]process.stdout.write(`\r${colors.cyan}[🧭] Next execution in: ${timeStr}${colors.reset}`); [cite: 94]
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
  liquidityMaxDelay,
  rpcClient
) {
  [cite_start]logger.step(`--- Transaction For Wallet ${walletNumber} ---`); [cite: 95]
  [cite_start]await printWalletInfo(address, rpcClient); [cite: 95]

  let swapNo = 1;
  for (let i = 0; i < numSwaps; i++) {
    [cite_start]const idx = i % SWAP_SEQUENCE.length; [cite: 96]
    [cite_start]const { from, to, pair } = SWAP_SEQUENCE[idx]; [cite: 96]
    [cite_start]const swapAmount = getRandomSwapAmount(); [cite: 97]
    [cite_start]await performSwap(wallet, address, swapAmount, pair, swapNo++, from, to, rpcClient); [cite: 97]
    [cite_start]const delay = getRandomDelay(swapMinDelay, swapMaxDelay); [cite: 97]
    [cite_start]await new Promise(resolve => setTimeout(resolve, delay * 1000)); [cite: 98]
  }
  [cite_start]let liquidityNo = 1; [cite: 98]
  for (let i = 0; i < numAddLiquidity; i++) {
    [cite_start]const pairName = LIQUIDITY_PAIRS[i % LIQUIDITY_PAIRS.length]; [cite: 99]
    [cite_start]await addLiquidity(wallet, address, pairName, liquidityNo++, rpcClient); [cite: 100]
    [cite_start]const liquidityDelay = getRandomDelay(liquidityMinDelay, liquidityMaxDelay); [cite: 100]
    [cite_start]await new Promise(resolve => setTimeout(resolve, liquidityDelay * 1000)); [cite: 101]
  }
  [cite_start]logger.info(`Transaction cycle finished for wallet ${walletNumber}`); [cite: 101]
  console.log();
}

async function executeAllWallets(
  keys,
  numSwaps,
  numAddLiquidity,
  swapMinDelay,
  swapMaxDelay,
  liquidityMinDelay,
  liquidityMaxDelay,
  proxies,
  useProxy
) {
  for (let walletIndex = 0; walletIndex < keys.length; walletIndex++) {
    [cite_start]const key = keys[walletIndex]; [cite: 102]
    [cite_start]let rpcClient = null; [cite: 102]
    
    try {
      if (useProxy && proxies.length > 0) {
        [cite_start]const proxy = proxies[walletIndex % proxies.length]; [cite: 103]
        [cite_start]const agent = new SocksProxyAgent(`socks5://${proxy}`); [cite: 103]
        [cite_start]rpcClient = await Tendermint34Client.createWithBatchClient(new HttpBatchClient(RPC_URL, { agent })); [cite: 103]
        [cite_start]logger.info(`Using proxy ${proxy} for wallet ${walletIndex + 1}`); [cite: 104]
      } else {
        [cite_start]rpcClient = await Tendermint34Client.connect(RPC_URL); [cite: 104, 105]
      }

      [cite_start]const wallet = await getWallet(key); [cite: 105]
      [cite_start]const address = await getAccountAddress(wallet); [cite: 105]
      [cite_start]logger.step(`Processing wallet: ${address} (wallet ${walletIndex + 1})`); [cite: 106]
      
      await executeTransactionCycle(
        wallet,
        address,
        walletIndex + 1,
        numSwaps,
        numAddLiquidity,
        swapMinDelay,
        swapMaxDelay,
        liquidityMinDelay,
        liquidityMaxDelay,
        rpcClient
      [cite_start]); [cite: 106]
      [cite_start]logger.success(`All transactions completed for wallet ${walletIndex + 1}!`); [cite: 107]
      if (walletIndex < keys.length - 1) {
        [cite_start]console.log(); [cite: 107, 108]
      }
    } catch (error) {
      [cite_start]logger.error(`Error processing wallet ${walletIndex + 1}: ${error.message}`); [cite: 108]
    } finally {
      if (rpcClient) {
        [cite_start]rpcClient.disconnect(); [cite: 109, 110]
      }
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
  liquidityMaxDelay,
  proxies,
  useProxy
) {
  [cite_start]const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; [cite: 111]
  while (true) {
    [cite_start]const startTime = Date.now(); [cite: 111]
    [cite_start]const endTime = startTime + TWENTY_FOUR_HOURS; [cite: 112]
    while (Date.now() < endTime) {
      [cite_start]const remaining = endTime - Date.now(); [cite: 112]
      [cite_start]const hours = Math.floor(remaining / (1000 * 60 * 60)); [cite: 113]
      [cite_start]const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)); [cite: 114]
      [cite_start]const seconds = Math.floor((remaining % (1000 * 60)) / 1000); [cite: 115]
      [cite_start]displayCountdown(hours, minutes, seconds); [cite: 115]
      [cite_start]await new Promise(resolve => setTimeout(resolve, 1000)); [cite: 116]
    }
    console.log('\n');
    [cite_start]logger.success('🧭 24 hours completed! Starting new transaction cycle...\n'); [cite: 116]
    await executeAllWallets(
      keys,
      numSwaps,
      numAddLiquidity,
      swapMinDelay,
      swapMaxDelay,
      liquidityMinDelay,
      liquidityMaxDelay,
      proxies,
      useProxy
    [cite_start]); [cite: 117]
  }
}

async function loadProxies() {
    try {
        [cite_start]const data = await readFile('proxy.txt', 'utf8'); [cite: 118]
        [cite_start]return data.split('\n').map(line => line.trim()).filter(line => line.length > 0); [cite: 119]
    } catch (error) {
        [cite_start]logger.warn("proxy.txt not found or could not be read. Proceeding without proxies (if chosen)."); [cite: 119]
        [cite_start]return []; [cite: 120]
    }
}

async function main() {
  await display_welcome_screen();
  const keys = Object.keys(process.env)
    .filter((key) => key.startsWith('PRIVATE_KEY_'))
    [cite_start].map((key) => process.env[key]); [cite: 121]
  if (keys.length === 0) {
    [cite_start]logger.error('No private keys or mnemonics found in .env file'); [cite: 121]
    [cite_start]rl.close(); [cite: 121]
    [cite_start]return; [cite: 122]
  }
  let numSwaps;
  while (true) {
    [cite_start]const input = await prompt('Number of swaps per wallet: '); [cite: 123]
    if (isValidNumber(input)) {
      [cite_start]numSwaps = parseInt(input); [cite: 123]
      [cite_start]break; [cite: 124]
    }
    [cite_start]logger.error('Invalid input. Please enter a positive number.'); [cite: 124]
  }
  [cite_start]let numAddLiquidity; [cite: 125]
  while (true) {
    [cite_start]const input = await prompt('Number of add liquidity per wallet: '); [cite: 126]
    if (isValidNumber(input)) {
      [cite_start]numAddLiquidity = parseInt(input); [cite: 126]
      [cite_start]break; [cite: 127]
    }
    [cite_start]logger.error('Invalid input. Please enter a positive number.'); [cite: 127]
  }
  [cite_start]let swapMinDelay, swapMaxDelay; [cite: 128]
  while (true) {
    [cite_start]const input = await prompt('Min delay between transactions (seconds): '); [cite: 129]
    if (isValidNumber(input)) {
      [cite_start]swapMinDelay = parseInt(input); [cite: 129]
      [cite_start]break; [cite: 130]
    }
    [cite_start]logger.error('Invalid input. Please enter a positive number.'); [cite: 130, 131]
  }
  while (true) {
    [cite_start]const input = await prompt('Max delay between transactions (seconds): '); [cite: 132]
    if (isValidNumber(input) && parseInt(input) >= swapMinDelay) {
      [cite_start]swapMaxDelay = parseInt(input); [cite: 132]
      [cite_start]break; [cite: 133]
    }
    [cite_start]logger.error(`Invalid input. Please enter a number greater than or equal to ${swapMinDelay}.`); [cite: 133, 134]
  }
  [cite_start]let liquidityMinDelay = swapMinDelay; [cite: 134]
  let liquidityMaxDelay = swapMaxDelay;

  let useProxy = false;
  [cite_start]let proxies = []; [cite: 135]
  while (true) {
    [cite_start]console.log(`${colors.blue}Choose proxy type:${colors.reset}`); [cite: 135]
    [cite_start]console.log(`${colors.blue}1. Private Proxy (from proxy.txt)${colors.reset}`); [cite: 135]
    [cite_start]console.log(`${colors.blue}2. No Proxy${colors.reset}`); [cite: 136]
    [cite_start]const choice = await prompt('Enter choice (1 or 2): '); [cite: 136]
    if (choice === '1') {
      [cite_start]proxies = await loadProxies(); [cite: 137]
      if (proxies.length === 0) {
        [cite_start]logger.warn('No proxies found in proxy.txt. Please add proxies or choose "No Proxy".'); [cite: 138]
        [cite_start]continue; [cite: 139]
      }
      useProxy = true;
      logger.info('Proceeding with private proxies.');
      [cite_start]break; [cite: 140]
    } else if (choice === '2') {
      useProxy = false;
      logger.info('Proceeding without proxies.');
      [cite_start]break; [cite: 141]
    } else {
      logger.error('Invalid choice. Please enter 1 or 2.');
    }
  }

  [cite_start]console.log(); [cite: 141]
  await executeAllWallets(
    keys,
    numSwaps,
    numAddLiquidity,
    swapMinDelay,
    swapMaxDelay,
    liquidityMinDelay,
    liquidityMaxDelay,
    proxies,
    useProxy
  [cite_start]); [cite: 142]
  await startDailyCountdown(
    keys,
    numSwaps,
    numAddLiquidity,
    swapMinDelay,
    swapMaxDelay,
    liquidityMinDelay,
    liquidityMaxDelay,
    proxies,
    useProxy
  [cite_start]); [cite: 143]
}

main().catch((error) => {
  logger.error(`Bot failed: ${error.message}`);
  rl.close();
});
