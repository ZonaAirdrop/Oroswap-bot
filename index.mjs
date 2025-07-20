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

// ======================
// KONFIGURASI DASAR
// ======================
dotenv.config();

const colors = {
  reset: '\x1b[0m',
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
  hidden: '\x1b[8m'
};

const logger = {
  error: (msg) => console.error(`${colors.brightRed}[✗] ${msg}${colors.reset}`),
  warn: (msg) => console.warn(`${colors.yellow}[!] ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.brightGreen}[+] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  debug: (msg) => console.log(`${colors.brightBlack}[DEBUG] ${msg}${colors.reset}`),
  swap: (msg) => console.log(`${colors.cyan}[↪️] ${msg}${colors.reset}`),
  swapSuccess: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  liquidity: (msg) => console.log(`${colors.cyan}[⇄] ${msg}${colors.reset}`),
  liquiditySuccess: (msg) => console.log(`${colors.green}[💧] ${msg}${colors.reset}`)
};

// ======================
// KONFIGURASI JARINGAN
// ======================
const RPC_ENDPOINTS = [
  'https://rpc.zigscan.net/',
  'https://testnet-rpc.zigchain.com',
  'https://zig-rpc.polkachu.com'
];
let currentRpcIndex = 0;
const EXPLORER_URL = 'https://zigscan.org/tx/';
const GAS_PRICE = GasPrice.fromString('0.026uzig');

// ======================
// KONFIGURASI TOKEN
// ======================
const TOKEN_CONFIG = {
  symbols: {
    'uzig': 'ZIG',
    'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro': 'ORO',
    'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa': 'NFA',
    'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin': 'CULTCOIN'
  },
  decimals: {
    'uzig': 6,
    'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro': 6,
    'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa': 6,
    'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin': 6
  },
  pairs: {
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
  },
  swapSequence: [
    { from: 'uzig', to: 'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro', pair: 'ORO/ZIG' },
    { from: 'uzig', to: 'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa', pair: 'NFA/ZIG' },
    { from: 'uzig', to: 'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin', pair: 'CULTCOIN/ZIG' }
  ],
  liquidityPairs: ['ORO/ZIG', 'NFA/ZIG', 'CULTCOIN/ZIG']
};

// ======================
// FUNGSI UTAMA
// ======================

// Fungsi untuk mendapatkan client RPC
async function getRpcClient(useProxy = false, proxy = null) {
  try {
    const rpcUrl = RPC_ENDPOINTS[currentRpcIndex];
    
    if (useProxy && proxy) {
      const agent = new SocksProxyAgent(`socks5://${proxy}`);
      return await Tendermint34Client.createWithBatchClient(
        new HttpBatchClient(rpcUrl, { agent })
      );
    }
    return await Tendermint34Client.connect(rpcUrl);
  } catch (error) {
    logger.error(`Gagal terhubung ke RPC: ${error.message}`);
    currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    throw error;
  }
}

// Fungsi untuk inisialisasi wallet
async function initializeWallet(key, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      if (key.split(' ').length >= 12) {
        return await DirectSecp256k1HdWallet.fromMnemonic(key, { prefix: 'zig' });
      } else if (/^[0-9a-fA-F]{64}$/.test(key)) {
        return await DirectSecp256k1Wallet.fromKey(Buffer.from(key, 'hex'), 'zig');
      }
      throw new Error('Format private key/mnemonic tidak valid');
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Manajer urutan transaksi
class SequenceManager {
  constructor() {
    this.sequences = new Map();
  }

  async getSequence(address, client) {
    if (!this.sequences.has(address)) {
      const account = await client.getAccount(address);
      this.sequences.set(address, account?.sequence || 0);
    }
    return this.sequences.get(address);
  }

  incrementSequence(address) {
    const current = this.sequences.get(address) || 0;
    this.sequences.set(address, current + 1);
  }

  async syncSequence(address, client) {
    const account = await client.getAccount(address);
    this.sequences.set(address, account?.sequence || 0);
    return this.sequences.get(address);
  }
}

const sequenceManager = new SequenceManager();

// Fungsi untuk eksekusi transaksi dengan retry
async function executeWithRetry(fn, wallet, address, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let client;
    try {
      client = await SigningCosmWasmClient.connectWithSigner(
        RPC_ENDPOINTS[currentRpcIndex], 
        wallet, 
        { 
          gasPrice: GAS_PRICE,
          sequence: await sequenceManager.getSequence(address, client)
        }
      );
      
      const result = await fn(client);
      sequenceManager.incrementSequence(address);
      return result;
    } catch (error) {
      lastError = error;
      
      if (error.message.includes('account sequence mismatch')) {
        logger.warn('Sequence tidak match. Menyesuaikan ulang...');
        await sequenceManager.syncSequence(address, client);
      } else if (error.message.includes('Timeout') || error.message.includes('connection')) {
        currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
        logger.warn(`Beralih ke RPC: ${RPC_ENDPOINTS[currentRpcIndex]}`);
      }
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.debug(`Mencoba lagi dalam ${delay/1000} detik... (Percobaan ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } finally {
      if (client) client.disconnect();
    }
  }
  
  throw lastError;
}

// Fungsi untuk melakukan swap
async function performSwap(wallet, address, amount, pairName, swapNumber) {
  const pair = TOKEN_CONFIG.pairs[pairName];
  if (!pair) throw new Error(`Pair ${pairName} tidak valid`);

  return executeWithRetry(async (client) => {
    // Cek balance
    const balance = await client.getBalance(address, pair.token2);
    const balanceAmount = parseFloat(balance.amount) / Math.pow(10, TOKEN_CONFIG.decimals[pair.token2]);
    
    if (balanceAmount < amount) {
      throw new Error(`Balance ${TOKEN_CONFIG.symbols[pair.token2]} tidak cukup: ${balanceAmount} < ${amount}`);
    }

    // Dapatkan info pool
    const poolInfo = await client.queryContractSmart(pair.contract, { pool: {} });
    if (!poolInfo?.assets) throw new Error('Gagal mendapatkan info pool');

    // Hitung harga
    const asset1 = poolInfo.assets.find(a => a.info.native_token?.denom === pair.token1);
    const asset2 = poolInfo.assets.find(a => a.info.native_token?.denom === pair.token2);
    if (!asset1 || !asset2) throw new Error('Asset pool tidak ditemukan');

    const price = parseFloat(asset2.amount) / parseFloat(asset1.amount);
    const beliefPrice = price.toFixed(18);

    // Persiapkan pesan swap
    const msg = {
      swap: {
        belief_price: beliefPrice,
        max_spread: "0.005", // 0.5%
        offer_asset: {
          amount: toMicroUnits(amount, pair.token2).toString(),
          info: { native_token: { denom: pair.token2 } }
        }
      }
    };

    const funds = coins(toMicroUnits(amount, pair.token2), pair.token2);

    logger.swap(`Swap ${swapNumber}: ${amount} ${TOKEN_CONFIG.symbols[pair.token2]} → ${TOKEN_CONFIG.symbols[pair.token1]}`);
    logger.debug(`Harga: 1 ${TOKEN_CONFIG.symbols[pair.token1]} = ${beliefPrice} ${TOKEN_CONFIG.symbols[pair.token2]}`);

    const result = await client.execute(address, pair.contract, msg, 'auto', 'Swap', funds);
    
    logger.swapSuccess(`Swap ${swapNumber} berhasil! Tx: ${EXPLORER_URL}${result.transactionHash}`);
    return result;
  }, wallet, address);
}

// Fungsi untuk menambah liquidity
async function addLiquidity(wallet, address, pairName, liquidityNumber) {
  const pair = TOKEN_CONFIG.pairs[pairName];
  if (!pair) throw new Error(`Pair ${pairName} tidak valid`);

  return executeWithRetry(async (client) => {
    // Dapatkan balance
    const [token1Balance, token2Balance] = await Promise.all([
      client.getBalance(address, pair.token1),
      client.getBalance(address, pair.token2)
    ]);

    const token1Amount = parseFloat(token1Balance.amount) / Math.pow(10, TOKEN_CONFIG.decimals[pair.token1]);
    const token2Amount = parseFloat(token2Balance.amount) / Math.pow(10, TOKEN_CONFIG.decimals[pair.token2]);

    if (token1Amount <= 0 || token2Amount <= 0) {
      throw new Error(`Balance tidak cukup: ${TOKEN_CONFIG.symbols[pair.token1]} ${token1Amount}, ${TOKEN_CONFIG.symbols[pair.token2]} ${token2Amount}`);
    }

    // Dapatkan rasio pool
    const poolInfo = await client.queryContractSmart(pair.contract, { pool: {} });
    if (!poolInfo?.assets) throw new Error('Gagal mendapatkan info pool');

    const poolAsset1 = poolInfo.assets.find(a => a.info.native_token?.denom === pair.token1);
    const poolAsset2 = poolInfo.assets.find(a => a.info.native_token?.denom === pair.token2);
    if (!poolAsset1 || !poolAsset2) throw new Error('Asset pool tidak ditemukan');

    const ratio = parseFloat(poolAsset1.amount) / parseFloat(poolAsset2.amount);
    
    // Hitung jumlah (0.5% dari balance, disesuaikan dengan rasio pool)
    const targetToken1 = token1Amount * 0.005;
    const targetToken2 = token2Amount * 0.005;
    
    let adjustedToken1, adjustedToken2;
    if (targetToken1 / targetToken2 > ratio) {
      adjustedToken1 = targetToken2 * ratio;
      adjustedToken2 = targetToken2;
    } else {
      adjustedToken1 = targetToken1;
      adjustedToken2 = targetToken1 / ratio;
    }

    // Persiapkan pesan liquidity
    const msg = {
      provide_liquidity: {
        assets: [
          {
            amount: toMicroUnits(adjustedToken1, pair.token1).toString(),
            info: { native_token: { denom: pair.token1 } }
          },
          {
            amount: toMicroUnits(adjustedToken2, pair.token2).toString(),
            info: { native_token: { denom: pair.token2 } }
          }
        ],
        slippage_tolerance: "0.005" // 0.5%
      }
    };

    const funds = [
      { denom: pair.token1, amount: toMicroUnits(adjustedToken1, pair.token1).toString() },
      { denom: pair.token2, amount: toMicroUnits(adjustedToken2, pair.token2).toString() }
    ];

    logger.liquidity(`Menambah liquidity ke ${pairName}: ${adjustedToken1.toFixed(6)} ${TOKEN_CONFIG.symbols[pair.token1]} + ${adjustedToken2.toFixed(6)} ${TOKEN_CONFIG.symbols[pair.token2]}`);
    
    const result = await client.execute(address, pair.contract, msg, 'auto', `Tambah liquidity ${pairName}`, funds);
    
    logger.liquiditySuccess(`Liquidity berhasil ditambahkan ke ${pairName}! Tx: ${EXPLORER_URL}${result.transactionHash}`);
    return result;
  }, wallet, address);
}

// Fungsi utama untuk eksekusi wallet
async function executeWalletCycle(
  wallet,
  address,
  walletNumber,
  numSwaps,
  numLiquidity,
  swapMinDelay = 5,
  swapMaxDelay = 15,
  liquidityMinDelay = 10,
  liquidityMaxDelay = 30
) {
  try {
    logger.info(`\n=== Wallet ${waltonNumber} (${address}) ===`);
    
    // Reset sequence di awal cycle
    sequenceManager.resetSequence(address);

    // Eksekusi swap
    for (let i = 0; i < numSwaps; i++) {
      const swapConfig = TOKEN_CONFIG.swapSequence[i % TOKEN_CONFIG.swapSequence.length];
      const swapAmount = getRandomInRange(0.005, 0.007);
      
      try {
        await performSwap(wallet, address, swapAmount, swapConfig.pair, i + 1);
      } catch (error) {
        logger.error(`Swap ${i + 1} gagal: ${error.message}`);
      }
      
      const delay = getRandomInRange(swapMinDelay, swapMaxDelay);
      logger.debug(`Menunggu ${delay} detik sebelum swap berikutnya...`);
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    // Eksekusi penambahan liquidity
    for (let i = 0; i < numLiquidity; i++) {
      const pairName = TOKEN_CONFIG.liquidityPairs[i % TOKEN_CONFIG.liquidityPairs.length];
      
      try {
        await addLiquidity(wallet, address, pairName, i + 1);
      } catch (error) {
        logger.error(`Penambahan liquidity ${i + 1} gagal: ${error.message}`);
      }
      
      const delay = getRandomInRange(liquidityMinDelay, liquidityMaxDelay);
      logger.debug(`Menunggu ${delay} detik sebelum liquidity berikutnya...`);
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    logger.success(`Selesai memproses wallet ${walletNumber}\n`);
  } catch (error) {
    logger.error(`Gagal memproses wallet: ${error.message}`);
    throw error;
  }
}

// Fungsi utama
async function main() {
  try {
    logger.info('🚀 Memulai ORO Swap Bot...');

    // Load private keys dari .env
    const keys = Object.keys(process.env)
      .filter(key => key.startsWith('PRIVATE_KEY_'))
      .map(key => process.env[key]);
    
    if (keys.length === 0) throw new Error('Tidak ada private key di .env');

    // Load proxies jika ada
    let proxies = [];
    try {
      const proxyData = await readFile('proxy.txt', 'utf8');
      proxies = proxyData.split('\n').filter(line => line.trim().length > 0);
      logger.info(`Memuat ${proxies.length} proxies`);
    } catch {
      logger.warn('File proxy.txt tidak ditemukan');
    }

    // Konfigurasi
    const config = {
      numSwaps: 3,
      numLiquidity: 2,
      swapMinDelay: 5,
      swapMaxDelay: 15,
      liquidityMinDelay: 10,
      liquidityMaxDelay: 30,
      useProxies: proxies.length > 0
    };

    // Proses setiap wallet
    for (let i = 0; i < keys.length; i++) {
      const wallet = await initializeWallet(keys[i]);
      const address = (await wallet.getAccounts())[0].address;
      
      const proxy = config.useProxies ? proxies[i % proxies.length] : null;
      const rpcClient = await getRpcClient(config.useProxies, proxy);
      
      try {
        await executeWalletCycle(
          wallet,
          address,
          i + 1,
          config.numSwaps,
          config.numLiquidity,
          config.swapMinDelay,
          config.swapMaxDelay,
          config.liquidityMinDelay,
          config.liquidityMaxDelay
        );
      } finally {
        rpcClient.disconnect();
      }
    }

    logger.success('✨ Semua wallet berhasil diproses!');
  } catch (error) {
    logger.error(`💥 Error fatal: ${error.message}`);
    process.exit(1);
  }
}

// Jalankan bot
main();
