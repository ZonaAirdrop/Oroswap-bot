import dotenv from 'dotenv';
import axios from 'axios';
import { createInterface } from 'node:readline';

import { CosmWasmClient, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import pkg from '@cosmjs/stargate';
const { GasPrice, coins } = pkg;
import pkg2 from '@cosmjs/proto-signing';
const { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } = pkg2;
import pkg3 from '@cosmjs/crypto';
const { Secp256k1 } = pkg3;

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
  wallet: (msg) => console.log(`${colors.yellow}[➤] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[!] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[+] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  user: (msg) => console.log(`\n${colors.white}[➤] ${msg}${colors.reset}`),
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

// Token contracts and pairs
const TOKEN_PAIRS = {
  'ORO/ZIG': {
    contract: 'zig15jqg0hmp9n06q0as7uk3x9xkwr9k3r7yh4ww2uc0hek8zlryrgmsamk4qg',
    token1: 'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro',
    token2: 'uzig'
  },
  'BEE/ZIG': {
    contract: 'zig1r50m5lafnmctat4xpvwdpzqndynlxt2skhr4fhzh76u0qar2y9hqu74u5h',
    token1: 'coin.zig1ptxpjgl3lsxrq99zl6ad2nmrx4lhnhne26m6ys.bee',
    token2: 'uzig'
  },
  'FOMOFEAST/ZIG': {
    contract: 'zig1unc0549k2f0d7mjjyfm94fuz2x53wrx3px0pr55va27grdgmspcqsp4692',
    token1: 'coin.zig1rl9wxfsuj5fx0tcuvxpcyn3qrw4cc8ahy3jxgp.ufomofeast',
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
  'DYOR/ZIG': {
    contract: 'zig1us8t6pklp2v2pjqnnedg9wnp3pv50kl448csv0lsuad599ef56jsyvakl9',
    token1: 'coin.zig1fepzhtkq2r5gc4prq94yukg6vaqjvkam27gwk3.dyor',
    token2: 'uzig'
  },
  'STZIG/ZIG': {
    contract: 'zig19zqxslng99gw98ku3dyqaqy0c809kwssw7nzhea9x40jwxjugqvs5xaghj',
    token1: 'coin.zig1f6dk5csplyvyqvk7uvtsf8yll82lxzmquzctw7wvwajn2a7emmeqzzgvly',
    token2: 'uzig'
  }
};

const TOKEN_DECIMALS = {
  'uzig': 6,
  'coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro': 6,
  'coin.zig1ptxpjgl3lsxrq99zl6ad2nmrx4lhnhne26m6ys.bee': 6,
  'coin.zig1rl9wxfsuj5fx0tcuvxpcyn3qrw4cc8ahy3jxgp.ufomofeast': 6,
  'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa': 6,
  'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin': 6,
  'coin.zig1fepzhtkq2r5gc4prq94yukg6vaqjvkam27gwk3.dyor': 6,
  'coin.zig1f6dk5csplyvyqvk7uvtsf8yll82lxzmquzctw7wvwajn2a7emmeqzzgvly': 6,
  };

const DEFAULT_BELIEF_PRICES = {
  'ORO/ZIG': "1.982160555004955471",
  'BEE/ZIG': "714.285714285714334437",
  'FOMOFEAST/ZIG': "1.415227851684121241",
  'NFA/ZIG': "0.001793684008123236",
  'CULTCOIN/ZIG': "0.000021729008731856",
  'DYOR/ZIG': "333.333333333333314386",
  'STZIG/ZIG': "0.771962328238381956",
};

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
  try {
    if (isMnemonic(key)) {
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(key, { prefix: 'zig' });
      return wallet;
    } else if (/^[0-9a-fA-F]{64}$/.test(key.trim())) {
      const privateKeyBytes = Buffer.from(key.trim(), 'hex');
      const wallet = await DirectSecp256k1Wallet.fromKey(privateKeyBytes, 'zig');
      return wallet;
    } else {
      throw new Error('Invalid input: neither a valid mnemonic nor a 64-character hex private key');
    }
  } catch (error) {
    throw new Error(`Failed to create wallet: ${error.message}`);
  }
}

async function getAccountAddress(wallet) {
  const [account] = await wallet.getAccounts();
  return account.address;
}

function getRandomSwapAmount() {
  const min = 0.001;
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

function calculateBeliefPrice(poolInfo, pairName, fromDenom) {
  try {
    if (!poolInfo || !poolInfo.assets || poolInfo.assets.length !== 2) {
      return fromDenom === TOKEN_PAIRS[pairName].token2 ? "0.5" : DEFAULT_BELIEF_PRICES[pairName];
    }

    const asset1 = poolInfo.assets[0];
    const asset2 = poolInfo.assets[1];

    const asset1Denom = asset1.info.native_token?.denom || asset1.info.token?.contract_addr;
    const asset2Denom = asset2.info.native_token?.denom || asset2.info.token?.contract_addr;

    let token1Amount, token2Amount;

    if (asset1Denom === TOKEN_PAIRS[pairName].token2) {
      token2Amount = parseFloat(asset1.amount) / Math.pow(10, TOKEN_DECIMALS[TOKEN_PAIRS[pairName].token2] || 6);
      token1Amount = parseFloat(asset2.amount) / Math.pow(10, TOKEN_DECIMALS[TOKEN_PAIRS[pairName].token1] || 6);
    } else if (asset2Denom === TOKEN_PAIRS[pairName].token2) {
      token2Amount = parseFloat(asset2.amount) / Math.pow(10, TOKEN_DECIMALS[TOKEN_PAIRS[pairName].token2] || 6);
      token1Amount = parseFloat(asset1.amount) / Math.pow(10, TOKEN_DECIMALS[TOKEN_PAIRS[pairName].token1] || 6);
    } else {
      if (asset1Denom === TOKEN_PAIRS[pairName].token1) {
        token1Amount = parseFloat(asset1.amount) / Math.pow(10, TOKEN_DECIMALS[TOKEN_PAIRS[pairName].token1] || 6);
        token2Amount = parseFloat(asset2.amount) / Math.pow(10, TOKEN_DECIMALS[TOKEN_PAIRS[pairName].token2] || 6);
      } else {
        token1Amount = parseFloat(asset2.amount) / Math.pow(10, TOKEN_DECIMALS[TOKEN_PAIRS[pairName].token1] || 6);
        token2Amount = parseFloat(asset1.amount) / Math.pow(10, TOKEN_DECIMALS[TOKEN_PAIRS[pairName].token2] || 6);
      }
    }

    if (token1Amount <= 0 || token2Amount <= 0) {
      logger.warn('Invalid pool amounts, using default belief price');
      return fromDenom === TOKEN_PAIRS[pairName].token2 ? "0.5" : DEFAULT_BELIEF_PRICES[pairName];
    }

    let beliefPrice;
    if (fromDenom === TOKEN_PAIRS[pairName].token2) {
      const rawPrice = token1Amount / token2Amount;
      beliefPrice = (rawPrice * 0.90).toFixed(18);
    } else {
      beliefPrice = DEFAULT_BELIEF_PRICES[pairName];
    }

    return beliefPrice;
  } catch (error) {
    logger.error(`Failed to calculate belief price: ${error.message}`);
    return fromDenom === TOKEN_PAIRS[pairName].token2 ? "0.5" : DEFAULT_BELIEF_PRICES[pairName];
  }
}

async function performSwap(wallet, address, amount, pairName, swapNumber) {
  try {
    const pair = TOKEN_PAIRS[pairName];
    if (!pair.contract) {
      logger.error(`Contract address not set for ${pairName}`);
      return null;
    }

    const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet, { gasPrice: GAS_PRICE });
    const fromDenom = Math.random() > 0.5 ? pair.token1 : pair.token2;
    const toDenom = fromDenom === pair.token1 ? pair.token2 : pair.token1;
    
    const microAmount = toMicroUnits(amount, fromDenom);
    const fromSymbol = pairName.split('/')[fromDenom === pair.token1 ? 0 : 1];
    const toSymbol = pairName.split('/')[fromDenom === pair.token1 ? 1 : 0];

    const poolInfo = await getPoolInfo(pair.contract);
    const beliefPrice = calculateBeliefPrice(poolInfo, pairName, fromDenom);

    const msg = {
      swap: {
        belief_price: beliefPrice,
        max_spread: "0.1",
        offer_asset: {
          amount: microAmount.toString(),
          info: { native_token: { denom: fromDenom } },
        },
      },
    };

    const funds = coins(microAmount, fromDenom);

    logger.loading(`Swap ${swapNumber}/10: ${amount.toFixed(5)} ${fromSymbol} -> ${toSymbol}`);
    const result = await client.execute(address, pair.contract, msg, 'auto', 'Swap', funds);
    logger.success(`Swap ${swapNumber} completed! Tx: ${EXPLORER_URL}${result.transactionHash}`);
    return result;
  } catch (error) {
    logger.error(`Swap ${swapNumber} failed: ${error.message}`);
    return null;
  }
}

async function addLiquidity(wallet, address, pairName) {
  try {
    const pair = TOKEN_PAIRS[pairName];
    if (!pair.contract) {
      logger.error(`Contract address not set for ${pairName}`);
      return null;
    }

    const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet, { gasPrice: GAS_PRICE });
    
    // Fixed amounts: 1 token1 and 0.5 ZIG
    const token1Amount = 1;
    const zigAmount = 0.1;
    
    const microAmountToken1 = toMicroUnits(token1Amount, pair.token1);
    const microAmountZIG = toMicroUnits(zigAmount, pair.token2);

    const msg = {
      provide_liquidity: {
        assets: [
          { amount: microAmountToken1.toString(), info: { native_token: { denom: pair.token1 } } },
          { amount: microAmountZIG.toString(), info: { native_token: { denom: pair.token2 } } },
        ],
        slippage_tolerance: "0.1",
      },
    };

    const funds = [
      { denom: pair.token1, amount: microAmountToken1.toString() },
      { denom: pair.token2, amount: microAmountZIG.toString() }
    ];

    logger.loading(`Adding liquidity: ${token1Amount} ${pairName.split('/')[0]} + ${zigAmount} ${pairName.split('/')[1]}`);
    const result = await client.execute(address, pair.contract, msg, 'auto', `Adding ${pairName} Liquidity`, funds);
    logger.success(`Liquidity added for ${pairName}! Tx: ${EXPLORER_URL}${result.transactionHash}`);
    return result;
  } catch (error) {
    logger.error(`Add liquidity failed for ${pairName}: ${error.message}`);
    return null;
  }
}

async function getPoolTokenBalance(address, pairName) {
  try {
    const response = await axios.get(`${API_URL}portfolio/${address}`, {
      headers: {
        accept: 'application/json',
        'accept-language': 'en-US,en;q=0.7',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        Referer: 'https://testnet.oroswap.org/',
      },
    });

    const poolTokens = response.data.pool_tokens;
    const targetPool = poolTokens.find(pool =>
      pool.pair_contract_address === TOKEN_PAIRS[pairName].contract ||
      pool.name === pairName
    );

    if (targetPool) {
      return {
        amount: targetPool.amount,
        denom: targetPool.denom
      };
    }

    return null;
  } catch (error) {
    logger.error(`Failed to get pool token balance for ${pairName}: ${error.message}`);
    return null;
  }
}

async function withdrawLiquidity(wallet, address, pairName) {
  try {
    const poolToken = await getPoolTokenBalance(address, pairName);
    if (!poolToken) {
      logger.warn(`No pool tokens found to withdraw for ${pairName}`);
      return null;
    }

    const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet, { gasPrice: GAS_PRICE });

    const msg = {
      withdraw_liquidity: {}
    };

    const funds = coins(poolToken.amount, poolToken.denom);

    logger.loading(`Withdrawing liquidity: ${poolToken.amount} LP tokens for ${pairName}`);
    const result = await client.execute(address, TOKEN_PAIRS[pairName].contract, msg, 'auto', `Removing ${pairName} Liquidity`, funds);
    logger.success(`Liquidity withdrawn for ${pairName}! Tx: ${EXPLORER_URL}${result.transactionHash}`);
    return result;
  } catch (error) {
    logger.error(`Withdraw liquidity failed for ${pairName}: ${error.message}`);
    return null;
  }
}

async function getPoints(address) {
  try {
    const response = await axios.get(`${API_URL}portfolio/${address}/points`, {
      headers: {
        accept: 'application/json',
        'accept-language': 'en-US,en;q=0.7',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        Referer: 'https://testnet.oroswap.org/',
      },
    });
    return response.data.points[0];
  } catch (error) {
    logger.error(`Failed to fetch points for ${address}: ${error.message}`);
    return null;
  }
}

function displayCountdown(hours, minutes, seconds) {
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  process.stdout.write(`\r${colors.cyan}[⏰] Next execution in: ${timeStr}${colors.reset}`);
}

async function startDailyCountdown(keys, numTransactions, swapMinDelay, swapMaxDelay, liquidityMinDelay, liquidityMaxDelay) {
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
    logger.success('⏰ 24 hours completed! Starting new transaction cycle...\n');

    await executeAllWallets(keys, numTransactions, swapMinDelay, swapMaxDelay, liquidityMinDelay, liquidityMaxDelay);
  }
}

async function executeAllWallets(keys, numTransactions, swapMinDelay, swapMaxDelay, liquidityMinDelay, liquidityMaxDelay) {
  for (let walletIndex = 0; walletIndex < keys.length; walletIndex++) {
    const key = keys[walletIndex];
    try {
      const wallet = await getWallet(key);
      const address = await getAccountAddress(wallet);
      logger.step(`Processing wallet: ${address} (wallet ${walletIndex + 1})`);

      for (let cycle = 1; cycle <= numTransactions; cycle++) {
        await executeTransactionCycle(wallet, address, cycle, walletIndex + 1, swapMinDelay, swapMaxDelay, liquidityMinDelay, liquidityMaxDelay);

        if (cycle < numTransactions) {
          const delay = getRandomDelay(swapMinDelay, swapMaxDelay);
          logger.info(`Waiting ${delay} seconds before next cycle...`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
      }

      logger.success(`All ${numTransactions} transaction cycles completed for wallet ${walletIndex + 1}!`);

      if (walletIndex < keys.length - 1) {
        console.log();
      }

    } catch (error) {
      logger.error(`Error processing wallet ${walletIndex + 1}: ${error.message}`);
    }
  }
}

async function executeTransactionCycle(wallet, address, cycleNumber, walletNumber, swapMinDelay, swapMaxDelay, liquidityMinDelay, liquidityMaxDelay) {
  logger.step(`--- Transaction For Wallet ${walletNumber} (Cycle ${cycleNumber}) ---`);

  // Get random pair for this cycle
  const pairNames = Object.keys(TOKEN_PAIRS);
  const randomPairIndex = Math.floor(Math.random() * pairNames.length);
  const selectedPair = pairNames[randomPairIndex];

  // Perform swaps
  for (let i = 1; i <= 10; i++) {
    const swapAmount = getRandomSwapAmount();
    await performSwap(wallet, address, swapAmount, selectedPair, i);

    const delay = getRandomDelay(swapMinDelay, swapMaxDelay);
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
  }

  // Add liquidity
  await addLiquidity(wallet, address, selectedPair);
  
  const liquidityDelay = getRandomDelay(liquidityMinDelay, liquidityMaxDelay);
  await new Promise(resolve => setTimeout(resolve, liquidityDelay * 1000));

  // Withdraw liquidity
  await withdrawLiquidity(wallet, address, selectedPair);

  // Check points
  const points = await getPoints(address);
  if (points) {
    logger.info(`Points: ${points.points} (Swaps: ${points.swaps_count}, Pools: ${points.join_pool_count})`);
  }

  console.log();
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

  let numTransactions;
  while (true) {
    const input = await prompt('Enter number of transactions to execute: ');
    if (isValidNumber(input)) {
      numTransactions = parseInt(input);
      break;
    }
    logger.error('Invalid input. Please enter a positive number.');
  }

  let swapMinDelay, swapMaxDelay;
  while (true) {
    const input = await prompt('Enter minimum delay between swaps (seconds): ');
    if (isValidNumber(input)) {
      swapMinDelay = parseInt(input);
      break;
    }
    logger.error('Invalid input. Please enter a positive number.');
  }

  while (true) {
    const input = await prompt('Enter maximum delay between swaps (seconds): ');
    if (isValidNumber(input) && parseInt(input) >= swapMinDelay) {
      swapMaxDelay = parseInt(input);
      break;
    }
    logger.error(`Invalid input. Please enter a number greater than or equal to ${swapMinDelay}.`);
  }

  let liquidityMinDelay, liquidityMaxDelay;
  while (true) {
    const input = await prompt('Enter minimum delay for liquidity operations (seconds): ');
    if (isValidNumber(input)) {
      liquidityMinDelay = parseInt(input);
      break;
    }
    logger.error('Invalid input. Please enter a positive number.');
  }

  while (true) {
    const input = await prompt('Enter maximum delay for liquidity operations (seconds): ');
    if (isValidNumber(input) && parseInt(input) >= liquidityMinDelay) {
      liquidityMaxDelay = parseInt(input);
      break;
    }
    logger.error(`Invalid input. Please enter a number greater than or equal to ${liquidityMinDelay}.`);
  }

  console.log();

  await executeAllWallets(keys, numTransactions, swapMinDelay, swapMaxDelay, liquidityMinDelay, liquidityMaxDelay);

  await startDailyCountdown(keys, numTransactions, swapMinDelay, swapMaxDelay, liquidityMinDelay, liquidityMaxDelay);
}

main().catch((error) => {
  logger.error(`Bot failed: ${error.message}`);
  rl.close();
});
