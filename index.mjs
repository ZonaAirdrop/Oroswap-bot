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

// ... (keep your existing color and logger definitions)

// Improved RPC Configuration with fallback
const RPC_ENDPOINTS = [
  'https://rpc.zigscan.net/',
  'https://testnet-rpc.zigchain.com',
  'https://zig-rpc.polkachu.com'
];
let currentRpcIndex = 0;

const getRpcClient = async (useProxy = false, proxy = null) => {
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
    logger.error(`Failed to connect to RPC ${RPC_ENDPOINTS[currentRpcIndex]}: ${error.message}`);
    // Rotate to next RPC endpoint
    currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    throw error;
  }
};

// Enhanced wallet initialization with retry logic
async function getWallet(key, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      if (isMnemonic(key)) {
        return await DirectSecp256k1HdWallet.fromMnemonic(key, { prefix: 'zig' });
      } else if (/^[0-9a-fA-F]{64}$/.test(key.trim())) {
        return await DirectSecp256k1Wallet.fromKey(Buffer.from(key.trim(), 'hex'), 'zig');
      }
      throw new Error('Invalid mnemonic/private key');
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Improved sequence management
class SequenceManager {
  constructor() {
    this.sequences = new Map();
  }

  async getCurrentSequence(address, client) {
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

  resetSequence(address) {
    this.sequences.delete(address);
  }

  async syncSequence(address, client) {
    const account = await client.getAccount(address);
    this.sequences.set(address, account?.sequence || 0);
  }
}

const sequenceManager = new SequenceManager();

// Enhanced transaction execution with sequence management
async function executeWithRetry(fn, wallet, address, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await SigningCosmWasmClient.connectWithSigner(
        RPC_ENDPOINTS[currentRpcIndex], 
        wallet, 
        { 
          gasPrice: GAS_PRICE,
          sequence: await sequenceManager.getCurrentSequence(address, client)
        }
      );
      
      const result = await fn(client);
      sequenceManager.incrementSequence(address);
      return result;
    } catch (error) {
      lastError = error;
      
      if (error.message.includes('account sequence mismatch') || 
          error.message.includes('incorrect account sequence')) {
        logger.warn(`Sequence mismatch detected. Resyncing sequence for ${address}...`);
        await sequenceManager.syncSequence(address, client);
      } else if (error.message.includes('Timeout') || 
                 error.message.includes('connection')) {
        // Rotate RPC endpoint on connection issues
        currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
        logger.warn(`Switched to RPC endpoint: ${RPC_ENDPOINTS[currentRpcIndex]}`);
      }
      
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Improved swap function with enhanced error handling
async function performSwap(wallet, address, amount, pairName, swapNumber, fromDenom, toDenom) {
  return executeWithRetry(async (client) => {
    const pair = TOKEN_PAIRS[pairName];
    if (!pair.contract) {
      throw new Error(`Contract address not set for ${pairName}`);
    }

    const balance = await getBalance(address, fromDenom, client);
    if (balance < amount) {
      throw new Error(`Insufficient balance for swap: ${balance.toFixed(6)} ${TOKEN_SYMBOLS[fromDenom]} < ${amount.toFixed(6)}`);
    }

    const microAmount = toMicroUnits(amount, fromDenom);
    const poolInfo = await getPoolInfo(pair.contract, client);
    const beliefPrice = calculateBeliefPrice(poolInfo, pairName, fromDenom);
    const maxSpread = "0.5";

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
    const fromSymbol = TOKEN_SYMBOLS[fromDenom];
    const toSymbol = TOKEN_SYMBOLS[toDenom];

    logger.swap(`Swap ${swapNumber}: ${amount.toFixed(5)} ${fromSymbol} -> ${toSymbol}`);
    logger.info(`Max spread: ${maxSpread}, Belief price: ${beliefPrice}`);

    const result = await client.execute(address, pair.contract, msg, 'auto', 'Swap', funds);
    
    logger.swapSuccess(`Swap ${swapNumber} successful: ${EXPLORER_URL}${result.transactionHash}`);
    return result;
  }, wallet, address);
}

// Improved liquidity addition function
async function addLiquidity(wallet, address, pairName, liquidityNumber) {
  return executeWithRetry(async (client) => {
    const pair = TOKEN_PAIRS[pairName];
    if (!pair.contract) {
      throw new Error(`Contract address not set for ${pairName}`);
    }

    const [saldoToken1, saldoZIG] = await Promise.all([
      getBalance(address, pair.token1, client),
      getBalance(address, 'uzig', client)
    ]);

    if (saldoToken1 === 0 || saldoZIG === 0) {
      throw new Error(`Insufficient balance for liquidity: ${saldoToken1} ${TOKEN_SYMBOLS[pair.token1]} / ${saldoZIG} ZIG`);
    }

    // Calculate amounts with better precision
    const token1Amount = saldoToken1 * 0.005; // Reduced from 5% to 0.5% to avoid large liquidity additions
    const zigAmount = saldoZIG * 0.005;

    const poolInfo = await getPoolInfo(pair.contract, client);
    if (!poolInfo) {
      throw new Error('Failed to get pool info');
    }

    // Improved ratio calculation
    const poolAsset1 = poolInfo.assets.find(a => a.info.native_token?.denom === pair.token1);
    const poolAsset2 = poolInfo.assets.find(a => a.info.native_token?.denom === pair.token2);
    
    if (!poolAsset1 || !poolAsset2) {
      throw new Error('Pool assets not found');
    }

    const ratio = parseFloat(poolAsset1.amount) / parseFloat(poolAsset2.amount);
    const adjustedToken1 = Math.min(token1Amount, zigAmount * ratio);
    const adjustedZIG = adjustedToken1 / ratio;

    const microAmountToken1 = toMicroUnits(adjustedToken1, pair.token1);
    const microAmountZIG = toMicroUnits(adjustedZIG, 'uzig');

    if (microAmountToken1 <= 0 || microAmountZIG <= 0) {
      throw new Error('Calculated liquidity amounts too small');
    }

    logger.liquidity(`Adding liquidity: ${adjustedToken1.toFixed(6)} ${TOKEN_SYMBOLS[pair.token1]} + ${adjustedZIG.toFixed(6)} ZIG`);

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

    const result = await client.execute(address, pair.contract, msg, 'auto', `Add ${pairName} Liquidity`, funds);
    logger.liquiditySuccess(`Liquidity added: ${EXPLORER_URL}${result.transactionHash}`);
    return result;
  }, wallet, address);
}

// Enhanced transaction cycle with better error handling
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
  try {
    logger.step(`Starting transactions for wallet ${walletNumber} (${address})`);
    await printWalletInfo(address);

    // Reset sequence at start of each cycle
    sequenceManager.resetSequence(address);

    // Execute swaps
    for (let i = 0; i < numSwaps; i++) {
      const idx = i % SWAP_SEQUENCE.length;
      const { from, to, pair } = SWAP_SEQUENCE[idx];
      const swapAmount = getRandomSwapAmount();
      
      try {
        await performSwap(wallet, address, swapAmount, pair, i+1, from, to);
      } catch (error) {
        logger.error(`Swap ${i+1} failed: ${error.message}`);
      }
      
      const delay = getRandomDelay(swapMinDelay, swapMaxDelay);
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    // Execute liquidity additions
    for (let i = 0; i < numAddLiquidity; i++) {
      const pairName = LIQUIDITY_PAIRS[i % LIQUIDITY_PAIRS.length];
      
      try {
        await addLiquidity(wallet, address, pairName, i+1);
      } catch (error) {
        logger.error(`Liquidity addition ${i+1} failed: ${error.message}`);
      }
      
      const delay = getRandomDelay(liquidityMinDelay, liquidityMaxDelay);
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    logger.success(`Completed transaction cycle for wallet ${walletNumber}`);
  } catch (error) {
    logger.error(`Transaction cycle failed for wallet ${walletNumber}: ${error.message}`);
  }
}

// ... (rest of your existing functions like main(), display_welcome_screen(), etc.)

// Modified main function to use the improved components
async function main() {
  await display_welcome_screen();
  
  // Load configuration
  const keys = Object.keys(process.env)
    .filter(key => key.startsWith('PRIVATE_KEY_'))
    .map(key => process.env[key]);
    
  if (keys.length === 0) {
    logger.error('No private keys found in .env');
    process.exit(1);
  }

  // Get user input for parameters
  const numSwaps = await getNumberInput('Number of swaps per wallet: ');
  const numAddLiquidity = await getNumberInput('Number of liquidity additions per wallet: ');
  const swapMinDelay = await getNumberInput('Min delay between swaps (seconds): ');
  const swapMaxDelay = await getNumberInput('Max delay between swaps (seconds): ', swapMinDelay);
  const liquidityMinDelay = await getNumberInput('Min delay between liquidity additions (seconds): ');
  const liquidityMaxDelay = await getNumberInput('Max delay between liquidity additions (seconds): ', liquidityMinDelay);

  // Proxy configuration
  const { useProxy, proxies } = await configureProxy();

  // Execute initial cycle
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

  // Start daily cycle
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

// Helper function for number input
async function getNumberInput(promptText, minValue = 0) {
  while (true) {
    const input = await prompt(promptText);
    const num = parseInt(input);
    if (!isNaN(num) && num >= minValue) return num;
    logger.error(`Invalid input. Please enter a number ${minValue > 0 ? `>= ${minValue}` : '> 0'}.`);
  }
}

// Helper function for proxy configuration
async function configureProxy() {
  while (true) {
    console.log(`${colors.blue}Proxy configuration:`);
    console.log('1. Use proxies from proxy.txt');
    console.log('2. No proxies');
    const choice = await prompt('Select option (1-2): ');
    
    if (choice === '1') {
      const proxies = await loadProxies();
      if (proxies.length > 0) return { useProxy: true, proxies };
      logger.warn('No proxies found in proxy.txt');
    } else if (choice === '2') {
      return { useProxy: false, proxies: [] };
    }
    logger.error('Invalid choice');
  }
}

main().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
