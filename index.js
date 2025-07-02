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
    console.log(' Oroswap ZonaAirdrop Bot (Full Tokens Support)');
    console.log('-------------------------------------------------');
    console.log(`${colors.reset}\n`);
  },
};

// Konfigurasi Jaringan
const RPC_URL = 'https://rpc.zigscan.net/';
const API_URL = 'https://testnet-api.oroswap.org/api/';
const EXPLORER_URL = 'https://zigscan.org/tx/';
const GAS_PRICE = GasPrice.fromString('0.025uzig');

// Daftar Semua Token Pairs (Updated)
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

// Decimal untuk Setiap Token (Pastikan Sesuai)
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

// Harga Default untuk Setiap Pair
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

// Fungsi Utilitas
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

// Fungsi Wallet
async function getWallet(key) {
  try {
    if (isMnemonic(key)) {
      return await DirectSecp256k1HdWallet.fromMnemonic(key, { prefix: 'zig' });
    } else if (/^[0-9a-fA-F]{64}$/.test(key.trim())) {
      const privateKeyBytes = Buffer.from(key.trim(), 'hex');
      return await DirectSecp256k1Wallet.fromKey(privateKeyBytes, 'zig');
    }
    throw new Error('Invalid input: must be mnemonic or 64-char hex private key');
  } catch (error) {
    throw new Error(`Wallet error: ${error.message}`);
  }
}

async function getAccountAddress(wallet) {
  const [account] = await wallet.getAccounts();
  return account.address;
}

// Fungsi Swap
async function performSwap(wallet, address, amount, pairName, swapNumber) {
  try {
    const pair = TOKEN_PAIRS[pairName];
    if (!pair) throw new Error(`Pair ${pairName} not found`);

    const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet, { gasPrice: GAS_PRICE });
    const fromDenom = Math.random() > 0.5 ? pair.token1 : pair.token2;
    const toDenom = fromDenom === pair.token1 ? pair.token2 : pair.token1;

    // Cek Balance Sebelum Swap
    const balance = await client.getBalance(address, fromDenom);
    if (parseInt(balance.amount) < toMicroUnits(amount, fromDenom)) {
      throw new Error(`Insufficient ${fromDenom} balance`);
    }

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
          info: fromDenom === 'uzig' 
            ? { native_token: { denom: fromDenom } } 
            : { token: { contract_addr: fromDenom } },
        },
      },
    };

    const funds = fromDenom === 'uzig' ? coins(microAmount, fromDenom) : [];

    logger.loading(`Swap ${swapNumber}/10: ${amount} ${fromSymbol} → ${toSymbol}`);
    const result = await client.execute(address, pair.contract, msg, 'auto', `Swap ${pairName}`, funds);
    logger.success(`Swap success! Tx: ${EXPLORER_URL}${result.transactionHash}`);
    return result;

  } catch (error) {
    logger.error(`Swap failed (${pairName}): ${error.message}`);
    return null;
  }
}

// Fungsi Liquidity
async function addLiquidity(wallet, address, pairName) {
  try {
    const pair = TOKEN_PAIRS[pairName];
    if (!pair) throw new Error(`Pair ${pairName} not found`);

    const client = await SigningCosmWasmClient.connectWithSigner(RPC_URL, wallet, { gasPrice: GAS_PRICE });
    
    // Fixed Amounts: 1 Token1 + 0.5 ZIG
    const token1Amount = 1;
    const zigAmount = 0.5;
    const microToken1 = toMicroUnits(token1Amount, pair.token1);
    const microZig = toMicroUnits(zigAmount, pair.token2);

    const msg = {
      provide_liquidity: {
        assets: [
          { 
            amount: microToken1.toString(),
            info: pair.token1 === 'uzig' 
              ? { native_token: { denom: pair.token1 } } 
              : { token: { contract_addr: pair.token1 } }
          },
          { 
            amount: microZig.toString(),
            info: { native_token: { denom: pair.token2 } }
          }
        ],
        slippage_tolerance: "0.1"
      }
    };

    const funds = pair.token1 === 'uzig' 
      ? coins(microZig + microToken1, 'uzig') 
      : coins(microZig, 'uzig');

    logger.loading(`Adding liquidity: ${token1Amount} ${pairName.split('/')[0]} + ${zigAmount} ZIG`);
    const result = await client.execute(address, pair.contract, msg, 'auto', `Add ${pairName} Liquidity`, funds);
    logger.success(`Liquidity added! Tx: ${EXPLORER_URL}${result.transactionHash}`);
    return result;

  } catch (error) {
    logger.error(`Add liquidity failed (${pairName}): ${error.message}`);
    return null;
  }
}

// Eksekusi Transaksi
async function executeTransactionCycle(wallet, address, cycleNumber, walletNumber, swapMinDelay, swapMaxDelay) {
  const pairNames = Object.keys(TOKEN_PAIRS);
  const selectedPair = pairNames[cycleNumber % pairNames.length]; // Bergantian

  logger.step(`\n[ Wallet ${walletNumber} | Cycle ${cycleNumber} ] Pair: ${selectedPair}`);

  // 10x Swap
  for (let i = 1; i <= 10; i++) {
    const amount = Math.random() * 0.001 + 0.001; // 0.001-0.002
    await performSwap(wallet, address, amount, selectedPair, i);
    await new Promise(resolve => setTimeout(resolve, getRandomDelay(swapMinDelay, swapMaxDelay) * 1000));
  }

  // Add & Remove Liquidity
  await addLiquidity(wallet, address, selectedPair);
  await new Promise(resolve => setTimeout(resolve, 10_000)); // Delay 10 detik
  await withdrawLiquidity(wallet, address, selectedPair);

  // Cek Points
  const points = await getPoints(address);
  if (points) {
    logger.info(`Points: ${points.points} (Swaps: ${points.swaps_count})`);
  }
}

// Main Function
async function main() {
  logger.banner();

  const keys = Object.keys(process.env)
    .filter(key => key.startsWith('PRIVATE_KEY_'))
    .map(key => process.env[key]);

  if (keys.length === 0) {
    logger.error('No keys found in .env (format: PRIVATE_KEY_1="mnemonic_or_hex")');
    process.exit(1);
  }

  const numTransactions = parseInt(await prompt('Number of transactions per wallet: ')) || 1;
  const swapMinDelay = parseInt(await prompt('Min delay between swaps (seconds): ')) || 5;
  const swapMaxDelay = parseInt(await prompt('Max delay between swaps (seconds): ')) || 15;

  logger.info(`\nStarting with ${keys.length} wallets...`);

  for (let i = 0; i < keys.length; i++) {
    try {
      const wallet = await getWallet(keys[i]);
      const address = await getAccountAddress(wallet);
      logger.wallet(`Wallet ${i+1}: ${address}`);

      for (let cycle = 1; cycle <= numTransactions; cycle++) {
        await executeTransactionCycle(wallet, address, cycle, i+1, swapMinDelay, swapMaxDelay);
      }
    } catch (error) {
      logger.error(`Wallet ${i+1} error: ${error.message}`);
    }
  }

  logger.success('\nAll transactions completed!');
  process.exit(0);
}

main().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
