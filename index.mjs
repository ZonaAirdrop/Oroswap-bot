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

// Enhanced configuration
dotenv.config({ path: '.env' });

// Improved logging system
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
  underscore: '\x1b[4m'
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

// Network configuration
const RPC_ENDPOINTS = [
  'https://rpc.zigscan.net/',
  'https://testnet-rpc.zigchain.com',
  'https://zig-rpc.polkachu.com'
];
let currentRpcIndex = 0;
const EXPLORER_URL = 'https://zigscan.org/tx/';
const GAS_PRICE = GasPrice.fromString('0.026uzig');

// Token configuration
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

// Utility functions
function clearConsole() {
  process.stdout.write('\x1B[2J\x1B[0f');
}

function getRandomInRange(min, max, decimals = 6) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals);
}

function toMicroUnits(amount, denom) {
  const decimals = TOKEN_CONFIG.decimals[denom] || 6;
  return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
}

function fromMicroUnits(amount, denom) {
  const decimals = TOKEN_CONFIG.decimals[denom] || 6;
  return parseFloat(amount) / Math.pow(10, decimals);
}

// Wallet management
async function initializeWallet(key) {
  try {
    if (key.split(' ').length >= 12) { // Mnemonic
      return await DirectSecp256k1HdWallet.fromMnemonic(key, { prefix: 'zig' });
    } else if (/^[0-9a-fA-F]{64}$/.test(key)) { // Private key
      return await DirectSecp256k1Wallet.fromKey(Buffer.from(key, 'hex'), 'zig');
    }
    throw new Error('Invalid wallet key format');
  } catch (error) {
    logger.error(`Wallet initialization failed: ${error.message}`);
    throw error;
  }
}

// RPC Client management
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
    logger.error(`RPC connection failed: ${error.message}`);
    currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    throw error;
  }
}

// Account management
class AccountManager {
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

const accountManager = new AccountManager();

// Transaction execution with retry logic
async function executeTransaction(wallet, address, executeFn, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let client;
    try {
      client = await SigningCosmWasmClient.connectWithSigner(
        RPC_ENDPOINTS[currentRpcIndex], 
        wallet, 
        { 
          gasPrice: GAS_PRICE,
          sequence: await accountManager.getSequence(address, client)
        }
      );
      
      const result = await executeFn(client);
      accountManager.incrementSequence(address);
      return result;
    } catch (error) {
      lastError = error;
      
      if (error.message.includes('account sequence mismatch')) {
        logger.warn('Sequence mismatch detected. Resyncing...');
        await accountManager.syncSequence(address, client);
      } else if (error.message.includes('Timeout') || error.message.includes('connection')) {
        currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
        logger.warn(`Switched to RPC endpoint: ${RPC_ENDPOINTS[currentRpcIndex]}`);
      }
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.debug(`Retrying in ${delay/1000}s... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } finally {
      if (client) {
        client.disconnect();
      }
    }
  }
  
  throw lastError;
}

// Swap functionality
async function performSwap(wallet, address, amount, pairName, swapNumber) {
  const pair = TOKEN_CONFIG.pairs[pairName];
  if (!pair) {
    throw new Error(`Invalid pair: ${pairName}`);
  }

  const fromSymbol = TOKEN_CONFIG.symbols[pair.token2];
  const toSymbol = TOKEN_CONFIG.symbols[pair.token1];

  return executeTransaction(wallet, address, async (client) => {
    // Check balances
    const balance = await client.getBalance(address, pair.token2);
    const balanceAmount = fromMicroUnits(balance.amount, pair.token2);
    
    if (balanceAmount < amount) {
      throw new Error(`Insufficient ${fromSymbol} balance: ${balanceAmount.toFixed(6)} < ${amount}`);
    }

    // Get pool info
    const poolInfo = await client.queryContractSmart(pair.contract, { pool: {} });
    if (!poolInfo?.assets) {
      throw new Error('Failed to get pool info');
    }

    // Calculate belief price
    const asset1 = poolInfo.assets.find(a => a.info.native_token?.denom === pair.token1);
    const asset2 = poolInfo.assets.find(a => a.info.native_token?.denom === pair.token2);
    
    if (!asset1 || !asset2) {
      throw new Error('Pool assets not found');
    }

    const price = parseFloat(asset2.amount) / parseFloat(asset1.amount);
    const beliefPrice = price.toFixed(18);

    // Prepare swap message
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

    logger.swap(`Swap ${swapNumber}: ${amount} ${fromSymbol} → ${toSymbol}`);
    logger.debug(`Belief price: 1 ${toSymbol} = ${beliefPrice} ${fromSymbol}`);

    const result = await client.execute(address, pair.contract, msg, 'auto', 'Swap', funds);
    
    logger.swapSuccess(`Swap ${swapNumber} successful! Tx: ${EXPLORER_URL}${result.transactionHash}`);
    return result;
  });
}

// Liquidity functionality
async function addLiquidity(wallet, address, pairName, liquidityNumber) {
  const pair = TOKEN_CONFIG.pairs[pairName];
  if (!pair) {
    throw new Error(`Invalid pair: ${pairName}`);
  }

  return executeTransaction(wallet, address, async (client) => {
    // Get balances
    const [token1Balance, token2Balance] = await Promise.all([
      client.getBalance(address, pair.token1),
      client.getBalance(address, pair.token2)
    ]);

    const token1Amount = fromMicroUnits(token1Balance.amount, pair.token1);
    const token2Amount = fromMicroUnits(token2Balance.amount, pair.token2);

    if (token1Amount <= 0 || token2Amount <= 0) {
      throw new Error(`Insufficient balances: ${TOKEN_CONFIG.symbols[pair.token1]} ${token1Amount}, ${TOKEN_CONFIG.symbols[pair.token2]} ${token2Amount}`);
    }

    // Get pool ratio
    const poolInfo = await client.queryContractSmart(pair.contract, { pool: {} });
    if (!poolInfo?.assets) {
      throw new Error('Failed to get pool info');
    }

    const poolAsset1 = poolInfo.assets.find(a => a.info.native_token?.denom === pair.token1);
    const poolAsset2 = poolInfo.assets.find(a => a.info.native_token?.denom === pair.token2);
    
    if (!poolAsset1 || !poolAsset2) {
      throw new Error('Pool assets not found');
    }

    const ratio = parseFloat(poolAsset1.amount) / parseFloat(poolAsset2.amount);
    
    // Calculate amounts (0.5% of current balance, adjusted to pool ratio)
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

    // Prepare liquidity message
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

    logger.liquidity(`Adding liquidity to ${pairName}: ${adjustedToken1.toFixed(6)} ${TOKEN_CONFIG.symbols[pair.token1]} + ${adjustedToken2.toFixed(6)} ${TOKEN_CONFIG.symbols[pair.token2]}`);
    
    const result = await client.execute(address, pair.contract, msg, 'auto', `Add ${pairName} liquidity`, funds);
    
    logger.liquiditySuccess(`Liquidity added to ${pairName}! Tx: ${EXPLORER_URL}${result.transactionHash}`);
    return result;
  });
}

// Wallet operations
async function getWalletBalances(address, client) {
  const balances = {};
  for (const denom of Object.keys(TOKEN_CONFIG.symbols)) {
    const balance = await client.getBalance(address, denom);
    balances[denom] = fromMicroUnits(balance.amount, denom);
  }
  return balances;
}

async function printWalletStatus(address, client) {
  try {
    const balances = await getWalletBalances(address, client);
    
    let balanceStr = `${colors.bold}Wallet Balances:${colors.reset}\n`;
    for (const [denom, amount] of Object.entries(balances)) {
      balanceStr += `  ${TOKEN_CONFIG.symbols[denom]}: ${amount.toFixed(6)}\n`;
    }
    
    logger.info(balanceStr);
    return balances;
  } catch (error) {
    logger.error(`Failed to get wallet status: ${error.message}`);
    throw error;
  }
}

// Transaction cycle
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
    logger.info(`\n${colors.bold}=== Wallet ${walletNumber} (${address}) ===${colors.reset}`);
    
    // Initialize client for status check
    const client = await getRpcClient();
    await printWalletStatus(address, client);
    client.disconnect();

    // Reset sequence at start of cycle
    accountManager.sequences.delete(address);

    // Execute swaps
    for (let i = 0; i < numSwaps; i++) {
      const swapConfig = TOKEN_CONFIG.swapSequence[i % TOKEN_CONFIG.swapSequence.length];
      const swapAmount = getRandomInRange(0.005, 0.007);
      
      try {
        await performSwap(wallet, address, swapAmount, swapConfig.pair, i + 1);
      } catch (error) {
        logger.error(`Swap ${i + 1} failed: ${error.message}`);
      }
      
      const delay = getRandomInRange(swapMinDelay, swapMaxDelay);
      logger.debug(`Waiting ${delay}s before next swap...`);
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    // Execute liquidity additions
    for (let i = 0; i < numLiquidity; i++) {
      const pairName = TOKEN_CONFIG.liquidityPairs[i % TOKEN_CONFIG.liquidityPairs.length];
      
      try {
        await addLiquidity(wallet, address, pairName, i + 1);
      } catch (error) {
        logger.error(`Liquidity addition ${i + 1} failed: ${error.message}`);
      }
      
      const delay = getRandomInRange(liquidityMinDelay, liquidityMaxDelay);
      logger.debug(`Waiting ${delay}s before next liquidity addition...`);
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    logger.success(`Completed transaction cycle for wallet ${walletNumber}\n`);
  } catch (error) {
    logger.error(`Wallet cycle failed: ${error.message}`);
    throw error;
  }
}

// Main execution flow
async function main() {
  try {
    clearConsole();
    logger.info(`${colors.bold}🚀 ORO Swap Bot - Initializing...${colors.reset}`);

    // Load environment variables
    const keys = Object.keys(process.env)
      .filter(key => key.startsWith('PRIVATE_KEY_'))
      .map(key => process.env[key]);
    
    if (keys.length === 0) {
      throw new Error('No private keys found in .env file');
    }

    // Load proxies if available
    let proxies = [];
    try {
      const proxyData = await readFile('proxy.txt', 'utf8');
      proxies = proxyData.split('\n').filter(line => line.trim().length > 0);
      logger.info(`Loaded ${proxies.length} proxies`);
    } catch {
      logger.warn('No proxy.txt file found or error reading proxies');
    }

    // Configuration
    const config = {
      numSwaps: 3,
      numLiquidity: 2,
      swapMinDelay: 5,
      swapMaxDelay: 15,
      liquidityMinDelay: 10,
      liquidityMaxDelay: 30,
      useProxies: proxies.length > 0
    };

    logger.info(`${colors.bold}⚙️ Configuration:${colors.reset}
  Wallets: ${keys.length}
  Swaps per wallet: ${config.numSwaps}
  Liquidity additions per wallet: ${config.numLiquidity}
  Using proxies: ${config.useProxies ? 'Yes' : 'No'}`);

    // Process each wallet
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

    logger.success(`${colors.bold}✨ All wallets processed successfully!${colors.reset}`);
  } catch (error) {
    logger.error(`${colors.brightRed}💥 Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Start the bot
main();
