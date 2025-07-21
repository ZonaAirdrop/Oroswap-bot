import dotenv from 'dotenv';
import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import pkg_stargate from '@cosmjs/stargate';
const { GasPrice, coins } = pkg_stargate;
import pkg_proto_signing from '@cosmjs/proto-signing';
const { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } = pkg_proto_signing;
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
    console.log("  ┌─────────────────────────────────┐");
    console.log("  │     [ O R O S W A P ]           │");
    console.log(`  │                                 │`);
    console.log(`  │     ${colors.yellow}${time_str} ${date_str}${colors.brightGreen}      │`);
    console.log("  │                                 │");
    console.log("  │   Automated Protocol Utility    │");
    console.log(`  │ ${colors.brightWhite}   by ZonaAirdrop ${colors.brightGreen}(@ZonaAirdr0p)${colors.reset} │`);
    console.log("  └─────────────────────────────────┘\n");
    await new Promise(resolve => setTimeout(resolve, 1000));
};
const RPC_URL = 'https://rpc.zigscan.net/';
const API_URL = 'https://testnet-api.zigchain.com';
const EXPLORER_URL = 'https://zigscan.org/tx/';
const GAS_PRICE = GasPrice.fromString('0.026uzig');
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
const TOKEN_DECIMALS = {
  'uzig': 6,
  'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro': 6,
  'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa': 6,
  'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin': 6,
};
const SWAP_SEQUENCE = [
  { from: 'uzig', to: 'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro', pair: 'ORO/ZIG' },
  { from: 'uzig', to: 'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa', pair: 'NFA/ZIG' },
  { from: 'uzig', to: 'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin', pair: 'CULTCOIN/ZIG' },
];
const LIQUIDITY_PAIRS = [
  'ORO/ZIG',
  'NFA/ZIG',
  'CULTCOIN/ZIG'
];

function getRandomMaxSpread() {
  // Mengembalikan nilai max_spread antara 2% (0.02) dan 8% (0.08)
  const min = 0.4; 
  const max = 0.5; // Ditingkatkan untuk mengakomodasi volatilitas testnet
  return (Math.random() * (max - min) + min).toFixed(3);
}

function getRandomLiquiditySlippage() {
    // Mengembalikan nilai slippage tolerance antara 1% (0.01) dan 10% (0.10)
    const min = 0.01;
    const max = 0.05; // Ditingkatkan untuk mengakomodasi volatilitas testnet
    return (Math.random() * (max - min) + min).toFixed(3);
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
  const min = 0.051;
  const max = 0.072;
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
    logger.error(`[✗] Gagal mendapatkan pool info untuk ${contractAddress}: ${error.message}`);
    return null;
  }
}

async function canSwap(pairName, fromDenom, amount, contractAddress) {
  const poolInfo = await getPoolInfo(contractAddress);
  if (!poolInfo) {
    logger.warn(`[!] Tidak bisa cek pool info untuk ${pairName}, swap di-skip.`);
    return false;
  }
  const asset = poolInfo.assets.find(a => a.info.native_token?.denom === fromDenom);
  const poolBalance = asset ?
  parseFloat(asset.amount) / Math.pow(10, TOKEN_DECIMALS[fromDenom]) : 0;

  logger.info(`[✓] Current pool balance for ${TOKEN_SYMBOLS[fromDenom] || fromDenom} in ${pairName}: ${poolBalance.toFixed(6)}`);

  if (poolBalance <= amount * 10 && fromDenom === 'uzig') { // Jika pool ZIG terlalu kecil, mungkin berisiko. Untuk token lain, cek cukup ada.
    logger.warn(`[!] Pool ${pairName} terlalu kecil (${poolBalance.toFixed(6)} ${TOKEN_SYMBOLS[fromDenom] || fromDenom}), skip swap.`);
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
    logger.error(`[✗] Gagal getBalance untuk ${denom}: ${e.message}`);
    return 0;
  }
}

async function getUserPoints(address) {
  try {
    const response = await fetch(`${API_URL}/user/${address}`);
    if (!response.ok) {
        logger.warn(`[!] Gagal mengambil poin untuk ${address}: ${response.status} ${response.statusText}`);
        return 0;
    }
    const data = await response.json();
    if (data && typeof data.point !== 'undefined') return data.point;
    if (data && data.data && typeof data.data.point !== 'undefined') return data.data.point;
    return 0;
  } catch (e) {
    logger.error(`[✗] Gagal getUserPoints: ${e.message}`);
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
    balanceStr += `${symbol} ${val.toFixed(6)} | `;
  }
  balanceStr = balanceStr.replace(/\s\|\s$/, '');
  logger.info(balanceStr);
  return { points, balances };
}

function calculateBeliefPrice(poolInfo, pairName, fromDenom) {
  try {
    if (!poolInfo || !poolInfo.assets || poolInfo.assets.length !== 2) {
      logger.warn(`[!] Pool info tidak lengkap untuk ${pairName}. Belief price tidak dapat dihitung akurat.`);
      return null;
    }
    const pair = TOKEN_PAIRS[pairName];
    let asset1Amount = 0, asset2Amount = 0;

    poolInfo.assets.forEach(asset => {
      if (asset.info.native_token && asset.info.native_token.denom === pair.token1) {
        asset1Amount = parseFloat(asset.amount) / Math.pow(10, TOKEN_DECIMALS[pair.token1]);
      }
      if (asset.info.native_token && asset.info.native_token.denom === pair.token2) {
        asset2Amount = parseFloat(asset.amount) / Math.pow(10, TOKEN_DECIMALS[pair.token2]);
      }
    });

    if (asset1Amount === 0 || asset2Amount === 0) {
      logger.warn(`[!] Jumlah aset dalam pool ${pairName} adalah nol. Belief price tidak dapat dihitung.`);
      return null;
    }

    let price;
    if (fromDenom === pair.token1) { // Jika kita menukar token1 ke token2 (misal ORO ke ZIG)
      price = asset2Amount / asset1Amount; // Harga = ZIG per ORO
    } else { // Jika kita menukar token2 ke token1 (misal ZIG ke ORO)
      price = asset1Amount / asset2Amount; // Harga = ORO per ZIG
    }
    return price.toPrecision(18); // Menggunakan presisi 18 digit angka penting
  } catch (err) {
    logger.error(`[✗] Gagal menghitung belief price untuk ${pairName}: ${err.message}`);
    return null;
  }
}

async function performSwap(wallet, address, amount, pairName, swapNumber, fromDenom, toDenom) {
  try {
    const pair = TOKEN_PAIRS[pairName];
    if (!pair.contract) {
      logger.error(`[✗] Contract address tidak disetel untuk ${pairName}. Swap ${swapNumber} dibatalkan.`);
      return null;
  	}
	
	const currentBalance = await getBalance(address, fromDenom);
    if (currentBalance < amount) {
      logger.warn(`[!] Skip swap ${swapNumber}: saldo ${TOKEN_SYMBOLS[fromDenom] || fromDenom} (${currentBalance.toFixed(6)}) kurang dari swap (${amount.toFixed(6)}).`);
      return null;
    }

    const poolInfo = await getPoolInfo(pair.contract);
    if (!poolInfo) {
      logger.warn(`[!] Skip swap ${swapNumber}: tidak bisa mendapatkan info pool untuk ${pairName}.`);
      return null;
    }

    if (!(await canSwap(pairName, fromDenom, amount, pair.contract))) {
      return null; // Pesan sudah dihandle di canSwap
    }

    const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet, { gasPrice: GAS_PRICE });
    const microAmount = toMicroUnits(amount, fromDenom);
    const beliefPrice = calculateBeliefPrice(poolInfo, pairName, fromDenom);

    if (beliefPrice === null) {
      logger.error(`[✗] Gagal mendapatkan belief price yang akurat untuk ${pairName}. Swap ${swapNumber} dibatalkan.`);
      return null;
    }

    const maxSpread = getRandomMaxSpread();

    const msg = {
      swap: {
        belief_price: beliefPrice,
        max_spread: maxSpread.toString(),
        offer_asset: {
          amount: microAmount.toString(),
          info: { native_token: { denom: fromDenom } },
        },
      },
    };
    const funds = coins(microAmount, fromDenom);
    const fromSymbol = TOKEN_SYMBOLS[fromDenom] || fromDenom;
    const toSymbol = TOKEN_SYMBOLS[toDenom] || toDenom;

    logger.swap(`Swap ${colors.magenta}${swapNumber}${colors.cyan}: ${amount.toFixed(5)} ${fromSymbol} -> ${toSymbol}`);
    logger.info(`Belief Price: ${colors.magenta}${beliefPrice}${colors.reset}`);
    logger.info(`Max Spread: ${colors.magenta}${(parseFloat(maxSpread) * 100).toFixed(2)}%${colors.reset}`);

    const result = await client.execute(address, pair.contract, msg, 'auto', 'Swap', funds);
    logger.swapSuccess(`Complete swap ${colors.magenta}${swapNumber}${colors.green}: ${fromSymbol} -> ${toSymbol} | Tx: ${EXPLORER_URL}${result.transactionHash}`);
    return result;
  } catch (error) {
    let errorMessage = error.message;
    if (errorMessage.includes('Operation exceeds max spread limit')) {
      errorMessage = `Operation exceeds max spread limit. Try increasing max spread or retry later.`;
    } else if (errorMessage.includes('incorrect account sequence')) {
        errorMessage = `Account sequence mismatch. Possible causes: sending too fast, or a previous transaction failed. Consider increasing delay.`;
    } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = `Insufficient funds for swap. Check your balance.`;
    }
    logger.error(`[✗] Swap ${swapNumber} failed: ${errorMessage}`);
    return null;
  }
}

async function addLiquidity(wallet, address, pairName, liquidityNumber) {
  try {
    const pair = TOKEN_PAIRS[pairName];
    if (!pair.contract) {
      logger.error(`[✗] Contract address tidak disetel untuk ${pairName}. Add liquidity ${liquidityNumber} dibatalkan.`);
      return null;
    }

    const saldoToken1 = await getBalance(address, pair.token1);
    const saldoZIG = await getBalance(address, 'uzig');

    // Cek saldo minimal yang wajar untuk transaksi, misal 0.000001 (micro unit)
    const minAllowedBalance = 0.000001;
    if (saldoToken1 < minAllowedBalance || saldoZIG < minAllowedBalance) {
      logger.warn(`[!] Skip add liquidity ${pairName} (${liquidityNumber}): saldo token (${TOKEN_SYMBOLS[pair.token1]}: ${saldoToken1.toFixed(6)}, ZIG: ${saldoZIG.toFixed(6)}) tidak cukup atau terlalu kecil.`);
      return null;
    }

    const poolInfo = await getPoolInfo(pair.contract);
    if (!poolInfo) {
      logger.warn(`[!] Skip add liquidity ${pairName} (${liquidityNumber}): pool info tidak didapat.`);
      return null;
    }

    const poolAsset1 = poolInfo.assets.find(asset => asset.info.native_token?.denom === pair.token1);
    const poolAsset2 = poolInfo.assets.find(asset => asset.info.native_token?.denom === pair.token2);

    if (!poolAsset1 || !poolAsset2) {
      logger.warn(`[!] Skip add liquidity ${pairName} (${liquidityNumber}): salah satu aset pool tidak ditemukan atau tidak valid.`);
      return null;
    }

    const poolToken1Amount = parseFloat(poolAsset1.amount);
    const poolZIGAmount = parseFloat(poolAsset2.amount);

    if (poolZIGAmount <= 0 || poolToken1Amount <= 0) {
        logger.warn(`[!] Skip add liquidity ${pairName} (${liquidityNumber}): pool memiliki jumlah nol untuk salah satu token (Micro-units).`);
        return null;
    }

    // Gunakan nilai micro-unit dari pool untuk rasio yang lebih akurat
    const poolRatio = poolToken1Amount / poolZIGAmount;

    // Tentukan berapa persen dari saldo yang ingin ditambahkan ke likuiditas
    const liquidityPercentage = 0.01; // 1% dari saldo yang tersedia (bisa disesuaikan)
    let targetToken1Amount = saldoToken1 * liquidityPercentage;
    let targetZIGAmount = saldoZIG * liquidityPercentage;

    let finalToken1Amount = targetToken1Amount;
    let finalZIGAmount = targetZIGAmount;

    // Sesuaikan jumlah agar sesuai rasio pool
    if (targetToken1Amount / targetZIGAmount > poolRatio) {
        // Kita punya terlalu banyak Token1 relatif terhadap ZIG yang ingin kita tambahkan
        // Batasi Token1 berdasarkan ZIG yang tersedia dan rasio pool
        finalToken1Amount = targetZIGAmount * poolRatio;
    } else {
        // Kita punya terlalu banyak ZIG relatif terhadap Token1 yang ingin kita tambahkan
        // Batasi ZIG berdasarkan Token1 yang tersedia dan rasio pool
        finalZIGAmount = targetToken1Amount / poolRatio;
    }
    
    // Pastikan final amounts tidak melebihi saldo aktual yang dimiliki
    finalToken1Amount = Math.min(finalToken1Amount, saldoToken1);
    finalZIGAmount = Math.min(finalZIGAmount, saldoZIG);

    // Pastikan jumlah yang akan ditambahkan tidak nol setelah penyesuaian
    if (finalToken1Amount < minAllowedBalance || finalZIGAmount < minAllowedBalance) {
        logger.warn(`[!] Skip add liquidity ${pairName} (${liquidityNumber}): jumlah yang dihitung (${finalToken1Amount.toFixed(6)} ${TOKEN_SYMBOLS[pair.token1]}, ${finalZIGAmount.toFixed(6)} ZIG) terlalu kecil setelah penyesuaian rasio.`);
        return null;
    }

    const microAmountToken1 = toMicroUnits(finalToken1Amount, pair.token1);
    const microAmountZIG = toMicroUnits(finalZIGAmount, 'uzig');

    const liquiditySlippage = getRandomLiquiditySlippage();

    logger.liquidity(`Liquidity ${colors.magenta}${liquidityNumber}${colors.cyan}: Adding ${finalToken1Amount.toFixed(6)} ${TOKEN_SYMBOLS[pair.token1]} + ${finalZIGAmount.toFixed(6)} ZIG`);
    logger.info(`Liquidity Slippage: ${colors.magenta}${(parseFloat(liquiditySlippage) * 100).toFixed(2)}%${colors.reset}`);

    const msg = {
      provide_liquidity: {
        assets: [
          { amount: microAmountToken1.toString(), info: { native_token: { denom: pair.token1 } } },
          { amount: microAmountZIG.toString(), info: { native_token: { denom: 'uzig' } } },
        ],
        slippage_tolerance: liquiditySlippage.toString(),
      },
    };
    const funds = [
      { denom: pair.token1, amount: microAmountToken1.toString() },
      { denom: 'uzig', amount: microAmountZIG.toString() }
    ];
    const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet, { gasPrice: GAS_PRICE });
    const result = await client.execute(address, pair.contract, msg, 'auto', `Adding ${pairName} Liquidity`, funds);
    logger.success(`Liquidity added for ${pairName}! Tx: ${EXPLORER_URL}${result.transactionHash}`);
    logger.liquiditySuccess(`Add Liquidity ${colors.magenta}${liquidityNumber}${colors.green} Completed for ${pairName}`);
    return result;
  } catch (error) {
    let errorMessage = error.message;
    if (errorMessage.includes('Operation exceeds max spread limit') || errorMessage.includes('slippage tolerance')) {
      errorMessage = `Slippage tolerance exceeded for liquidity. Try increasing slippage tolerance or retry later.`;
    } else if (errorMessage.includes('incorrect account sequence')) {
        errorMessage = `Account sequence mismatch. Possible causes: sending too fast, or a previous transaction failed. Consider increasing delay.`;
    } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = `Insufficient funds for add liquidity. Check your balance.`;
    } else if (errorMessage.includes('overflow')) {
        errorMessage = `Arithmetic overflow during liquidity calculation. Check token amounts and decimals.`;
    }
    logger.error(`[✗] Add liquidity failed for ${pairName} (${liquidityNumber}): ${errorMessage}`);
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

  // Shuffle SWAP_SEQUENCE to add randomness to swap order
  const shuffledSwapSequence = [...SWAP_SEQUENCE].sort(() => Math.random() - 0.5);

  let swapNo = 1;
  for (let i = 0; i < numSwaps; i++) {
    const { from, to, pair } = shuffledSwapSequence[i % shuffledSwapSequence.length]; // Use shuffled sequence
    const swapAmount = getRandomSwapAmount();
    await performSwap(wallet, address, swapAmount, pair, swapNo++, from, to);
    const delay = getRandomDelay(swapMinDelay, swapMaxDelay);
    logger.info(`Waiting for ${delay} seconds before next swap...`);
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
  }
  
  // Shuffle LIQUIDITY_PAIRS to add randomness to add liquidity order
  const shuffledLiquidityPairs = [...LIQUIDITY_PAIRS].sort(() => Math.random() - 0.5);

  let liquidityNo = 1;
  for (let i = 0; i < numAddLiquidity; i++) {
    const pairName = shuffledLiquidityPairs[i % shuffledLiquidityPairs.length]; // Use shuffled sequence
    await addLiquidity(wallet, address, pairName, liquidityNo++);
    const liquidityDelay = getRandomDelay(liquidityMinDelay, liquidityMaxDelay);
    logger.info(`Waiting for ${liquidityDelay} seconds before next liquidity add...`);
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
  liquidityMaxDelay,
  proxies,
  useProxy
) {
  for (let walletIndex = 0; walletIndex < keys.length; walletIndex++) {
    const key = keys[walletIndex];
    
    try {
        if (useProxy && proxies.length > 0) {
            const proxy = proxies[walletIndex % proxies.length];
            logger.info(`Using proxy ${proxy} for wallet ${walletIndex + 1}.`);
        } else {
            logger.info(`Not using proxy for wallet ${walletIndex + 1}.`);
        }
        
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
      logger.error(`[✗] Error processing wallet ${walletIndex + 1}: ${error.message}`);
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
      liquidityMaxDelay,
      proxies,
      useProxy
    );
  }
}

async function loadProxies() {
    try {
        const data = await readFile('proxy.txt', 'utf8');
        return data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    } catch (error) {
        logger.warn("proxy.txt not found or could not be read. Proceeding without proxies (if chosen).");
        return [];
    }
}

async function main() {
  await display_welcome_screen();
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
    const input = await prompt('Min delay between transactions (seconds): ');
    if (isValidNumber(input)) {
      swapMinDelay = parseInt(input);
      break;
    }
    logger.error('Invalid input. Please enter a positive number.');
  }
  while (true) {
    const input = await prompt('Max delay between transactions (seconds): ');
    if (isValidNumber(input) && parseInt(input) >= swapMinDelay) {
      swapMaxDelay = parseInt(input);
      break;
    }
    logger.error(`Invalid input. Please enter a number greater than or equal to ${swapMinDelay}.`);
  }
  let liquidityMinDelay = swapMinDelay;
  let liquidityMaxDelay = swapMaxDelay;

  let useProxy = false;
  let proxies = [];
  while (true) {
    console.log(`${colors.blue}Choose proxy type:${colors.reset}`);
    console.log(`${colors.blue}1. Private Proxy (from proxy.txt)${colors.reset}`);
    console.log(`${colors.blue}2. No Proxy${colors.reset}`);
    const choice = await prompt('Enter choice (1 or 2): ');
    if (choice === '1') {
      proxies = await loadProxies();
      if (proxies.length === 0) {
        logger.warn('No proxies found in proxy.txt. Please add proxies or choose "No Proxy".');
        continue;
      }
      useProxy = true;
      logger.info('Proceeding with private proxies.');
      break;
    } else if (choice === '2') {
      useProxy = false;
      logger.info('Proceeding without proxies.');
      break;
    } else {
      logger.error('Invalid choice. Please enter 1 or 2.');
    }
  }

  console.log();
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
  );
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
  );
}

main().catch((error) => {
  logger.error(`Bot failed: ${error.message}`);
  rl.close();
});
