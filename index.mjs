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
    console.log("  │      [ O R O S W A P ]          │");
    console.log(`  │                                 │`);
    console.log(`  │      ${colors.yellow}${time_str} ${date_str}${colors.brightGreen}        │`);
    console.log("  │                                 │");
    console.log("  │    Automated Protocol Utility   │");
    console.log(`  │ ${colors.brightWhite}    by ZonaAirdrop ${colors.brightGreen}(@ZonaAirdr0p)${colors.reset} │`);
    console.log("  └─────────────────────────────────┘\n");
    await new Promise(resolve => setTimeout(resolve, 1000));
};

// ======================= Konfigurasi Jaringan & Token =======================
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
    // ZIG -> NFA
    { from: 'uzig', to: 'coin.zig1qaf4dvjt5f8naam2mzpmysjm5e8sp2yhrzex8d.nfa', pair: 'NFA/ZIG' },
    // ZIG -> CULTCOIN
    { from: 'uzig', to: 'coin.zig12jgpgq5ec88nwzkkjx7jyrzrljpph5pnags8sn.ucultcoin', pair: 'CULTCOIN/ZIG' },
];

const LIQUIDITY_PAIRS = [
    'ZMZIG/ZIG',
    'NFA/ZIG',
    'CULTCOIN/ZIG',
    'ORO/ZIG'
];
// ===========================================================================


function getRandomMaxSpread() {
    // Diatur ke rentang yang lebih luas untuk meningkatkan kemungkinan sukses,
    // karena 0.01-0.02 terlalu ketat untuk beberapa kondisi pool.
    // Anda bisa menyesuaikan ini berdasarkan pengalaman di testnet.
    const min = 0.05; // 5%
    const max = 0.1;  // 10%
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
    const min = 0.01;
    const max = 0.012;
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
        logger.error(`Failed to get pool info for ${contractAddress}: ${error.message}`);
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
    const poolBalance = asset ?
        parseFloat(asset.amount) / Math.pow(10, TOKEN_DECIMALS[fromDenom]) : 0;
    if (poolBalance <= 10 * amount) { // Menjaga agar tidak swap jika pool terlalu kecil
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
        logger.error(`Gagal getBalance untuk ${address} (${denom}): ${e.message}`);
        return 0;
    }
}

async function getUserPoints(address) {
    try {
        const response = await fetch(`${API_URL}/user/${address}`);
        if (!response.ok) {
            logger.warn(`Failed to fetch user points for ${address}: HTTP status ${response.status}`);
            return 0;
        }
        const data = await response.json();
        if (data && typeof data.point !== 'undefined') return data.point;
        if (data && data.data && typeof data.data.point !== 'undefined') return data.data.point;
        logger.warn(`Unexpected response structure for user points of ${address}. Data: ${JSON.stringify(data)}`);
        return 0;
    } catch (e) {
        logger.error(`Failed to get user points for ${address}: ${e.message}`);
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
            logger.warn(`Belief price fallback to 1 for ${pairName}: Invalid pool info.`);
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
        } else if (fromDenom === pair.token2) {
            price = amountToken1 / amountToken2;
        } else {
            logger.warn(`Belief price fallback to 1: Unknown 'from' denom ${fromDenom} for pair ${pairName}`);
            return "1";
        }
        return price.toFixed(18);
    } catch (err) {
        logger.warn(`Belief price fallback to 1 for ${pairName}: ${err.message}`);
        return "1";
    }
}

async function performSwap(wallet, address, amount, pairName, swapNumber, fromDenom, toDenom) {
    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            const pair = TOKEN_PAIRS[pairName];
            if (!pair.contract) {
                logger.error(`Contract address not set for ${pairName}`);
                return null;
            }

            const balance = await getBalance(address, fromDenom);
            if (balance < amount) {
                logger.warn(`[!] Skip swap ${swapNumber}: saldo ${TOKEN_SYMBOLS[fromDenom] || fromDenom} (${balance.toFixed(6)}) kurang dari swap (${amount.toFixed(6)})`);
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
            
            // --- INI PERUBAHAN UTAMA UNTUK MAX_SPREAD ---
            const maxSpread = getRandomMaxSpread(); // Menggunakan nilai acak yang lebih realistis
            // --- END PERUBAHAN UTAMA ---

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
            logger.swap(`Swap ${colors.magenta}${swapNumber}${colors.cyan}: ${amount.toFixed(5)} ${fromSymbol} -> ${toSymbol}`);
            logger.info(`Belief price: ${beliefPrice} | Max spread: ${colors.magenta}${maxSpread}${colors.reset}`);

            const result = await client.execute(address, pair.contract, msg, 'auto', 'Swap', funds);
            logger.swapSuccess(`Complete swap ${colors.magenta}${swapNumber}${colors.green}: ${fromSymbol} -> ${toSymbol} | Tx: ${EXPLORER_URL}${result.transactionHash}`);
            return result;
        } catch (error) {
            logger.error(`Swap ${swapNumber} failed: ${error.message}`);
            if (error.message.includes('account sequence mismatch') || error.message.includes('transaction already in mempool') || error.message.includes('max_spread assertion failed')) {
                retries++;
                if (retries < MAX_RETRIES) {
                    logger.warn(`Retrying swap ${swapNumber} due to ${error.message.includes('account sequence mismatch') ? 'account sequence mismatch' : error.message.includes('transaction already in mempool') ? 'mempool issue' : 'max_spread assertion failed'} (attempt ${retries}/${MAX_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, 5000 + retries * 2000));
                    continue;
                }
            }
            return null;
        }
    }
    logger.error(`Swap ${swapNumber} failed after ${MAX_RETRIES} retries.`);
    return null;
}

async function addLiquidity(wallet, address, pairName, liquidityNumber) {
    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            const pair = TOKEN_PAIRS[pairName];
            if (!pair.contract) {
                logger.error(`Contract address not set for ${pairName}`);
                return null;
            }

            const saldoToken1 = await getBalance(address, pair.token1);
            const saldoZIG = await getBalance(address, 'uzig');
            if (saldoToken1 === 0 || saldoZIG === 0) {
                logger.warn(`Skip add liquidity ${pairName}: saldo kurang (Token1: ${saldoToken1.toFixed(6)}, ZIG: ${saldoZIG.toFixed(6)})`);
                return null;
            }

            const LIQUIDITY_PERCENTAGE = 0.003;
            const token1Amount = saldoToken1 * LIQUIDITY_PERCENTAGE;
            const zigAmount = saldoZIG * LIQUIDITY_PERCENTAGE;

            const poolInfo = await getPoolInfo(pair.contract);
            if (!poolInfo) {
                logger.warn(`Skip add liquidity ${pairName}: pool info tidak didapat`);
                return null;
            }

            const poolAsset1 = poolInfo.assets.find(asset => asset.info.native_token.denom === pair.token1);
            const poolAsset2 = poolInfo.assets.find(asset => asset.info.native_token.denom === pair.token2);

            if (!poolAsset1 || !poolAsset2) {
                logger.warn(`Skip add liquidity ${pairName}: one of the pool assets not found.`);
                return null;
            }

            const poolToken1 = parseFloat(poolAsset1.amount) / Math.pow(10, TOKEN_DECIMALS[pair.token1]);
            const poolZIG = parseFloat(poolAsset2.amount) / Math.pow(10, TOKEN_DECIMALS['uzig']);
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
            if (microAmountToken1 <= 0 || microAmountZIG <= 0) {
                logger.warn(`Skip add liquidity ${pairName}: calculated liquidity amounts are too small.`);
                return null;
            }

            logger.liquidity(`Liquidity ${colors.magenta}${liquidityNumber}${colors.cyan}: Adding (${(LIQUIDITY_PERCENTAGE * 100).toFixed(1)}%) ${adjustedToken1.toFixed(6)} ${TOKEN_SYMBOLS[pair.token1]} + ${adjustedZIG.toFixed(6)} ZIG`);

            const msg = {
                provide_liquidity: {
                    assets: [
                        { amount: microAmountToken1.toString(), info: { native_token: { denom: pair.token1 } } },
                        { amount: microAmountZIG.toString(), info: { native_token: { denom: 'uzig' } } },
                    ],
                    slippage_tolerance: "0.5", // Slippage tolerance untuk liquidity add, bisa disesuaikan
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
            logger.error(`Add liquidity failed for ${pairName}: ${error.message}`);
            if (error.message.includes('account sequence mismatch') || error.message.includes('transaction already in mempool')) {
                retries++;
                if (retries < MAX_RETRIES) {
                    logger.warn(`Retrying add liquidity for ${pairName} due to ${error.message.includes('account sequence mismatch') ? 'account sequence mismatch' : 'mempool issue'} (attempt ${retries}/${MAX_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, 5000 + retries * 2000));
                    continue;
                }
            }
            return null;
        }
    }
    logger.error(`Add liquidity for ${pairName} failed after ${MAX_RETRIES} retries.`);
    return null;
}

async function displayCountdown(hours, minutes, seconds) {
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
        logger.info(`Waiting for ${delay} seconds before next swap...`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    let liquidityNo = 1;
    for (let i = 0; i < numAddLiquidity; i++) {
        const pairName = LIQUIDITY_PAIRS[i % LIQUIDITY_PAIRS.length];
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
        let rpcClientInstance = null;

        try {
            if (useProxy && proxies.length > 0) {
                const proxy = proxies[walletIndex % proxies.length];
                const agent = new SocksProxyAgent(`socks5://${proxy}`);
                rpcClientInstance = await Tendermint34Client.createWithBatchClient(new HttpBatchClient(RPC_URL, { agent }));
                logger.info(`Using proxy ${proxy} for wallet ${walletIndex + 1}`);
            } else {
                rpcClientInstance = await Tendermint34Client.connect(RPC_URL);
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
            logger.error(`Error processing wallet ${walletIndex + 1}: ${error.message}`);
        } finally {
            if (rpcClientInstance) {
                rpcClientInstance.disconnect();
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
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    while (true) {
        const startTime = Date.now();
        const endTime = startTime + TWENTY_FOUR_HOURS;
        while (Date.now() < endTime) {
            const remaining = endTime - Date.now();
            if (remaining <= 0) break;
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
        logger.error('No private keys or mnemonics found in .env file. Please add PRIVATE_KEY_1=your_key_here, etc.');
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
    logger.step('Starting initial transaction cycle...');
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

    logger.step('Starting 24-hour daily countdown...');
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
