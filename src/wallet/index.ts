import {
  createWalletClient,
  createPublicClient,
  http,
  formatEther,
  formatUnits,
  parseUnits,
  type Address,
  type Chain,
  type Hash,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon, mainnet, base, arbitrum, bsc } from 'viem/chains';

// ─── Chain registry ───────────────────────────────────────────────────────────

export const CHAINS: Record<string, Chain> = {
  polygon,
  eth: mainnet,
  ethereum: mainnet,
  base,
  arbitrum,
  bsc,
};

export const RPC_URLS: Record<string, string> = {
  polygon:   'https://polygon-bor-rpc.publicnode.com',
  ethereum:  'https://eth.llamarpc.com',
  base:      'https://mainnet.base.org',
  arbitrum:  'https://arb1.arbitrum.io/rpc',
  bsc:       'https://bsc-dataseed.binance.org',
};

// USDC address trên từng chain
export const USDC_ADDRESS: Record<string, Address> = {
  polygon:  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  base:     '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  bsc:      '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
};

// ERC-20 ABI tối giản
const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'decimals',  type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'symbol',    type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface WalletInfo {
  address: Address;
  chainId: number;
  chainName: string;
}

export class EVMWallet {
  readonly account: ReturnType<typeof privateKeyToAccount>;
  readonly chain: Chain;
  readonly chainName: string;

  private readonly publicClient: ReturnType<typeof createPublicClient>;
  private readonly walletClient: ReturnType<typeof createWalletClient>;

  constructor(privateKey: Hex, chainName: string = 'polygon') {
    const chain = CHAINS[chainName];
    if (!chain) throw new Error(`Unknown chain: ${chainName}. Supported: ${Object.keys(CHAINS).join(', ')}`);

    this.account = privateKeyToAccount(privateKey);
    this.chain = chain;
    this.chainName = chainName;

    const rpcUrl = RPC_URLS[chainName] ?? chain.rpcUrls.default.http[0]!;
    this.publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
    this.walletClient = createWalletClient({ account: this.account, chain, transport: http(rpcUrl) });
  }

  get address(): Address {
    return this.account.address;
  }

  /** Lấy balance native token (ETH/MATIC/BNB) */
  async getNativeBalance(): Promise<{ balance: string; symbol: string }> {
    const raw = await this.publicClient.getBalance({ address: this.address });
    return {
      balance: formatEther(raw),
      symbol: this.chain.nativeCurrency.symbol,
    };
  }

  /** Lấy balance của 1 ERC-20 token */
  async getTokenBalance(tokenAddress: Address): Promise<{ balance: string; symbol: string; decimals: number }> {
    const [rawBalance, decimals, symbol] = await Promise.all([
      this.publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [this.address] }),
      this.publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'decimals' }),
      this.publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'symbol' }),
    ]);
    return {
      balance: formatUnits(rawBalance as bigint, decimals as number),
      symbol: symbol as string,
      decimals: decimals as number,
    };
  }

  /** Lấy balance USDC trên chain hiện tại */
  async getUSDCBalance(): Promise<{ balance: string; symbol: string }> {
    const usdcAddr = USDC_ADDRESS[this.chainName];
    if (!usdcAddr) throw new Error(`USDC not configured for chain: ${this.chainName}`);
    const result = await this.getTokenBalance(usdcAddr);
    return { balance: result.balance, symbol: result.symbol };
  }

  /** Approve spender dùng ERC-20 token */
  async approveToken(tokenAddress: Address, spender: Address, amountHuman: string, decimals = 6): Promise<Hash> {
    const amount = parseUnits(amountHuman, decimals);
    const { request } = await this.publicClient.simulateContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
      account: this.account,
    });
    return this.walletClient.writeContract(request);
  }

  /** Check allowance */
  async getAllowance(tokenAddress: Address, spender: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [this.address, spender],
    }) as Promise<bigint>;
  }

  /** Sign arbitrary message (EIP-191) */
  async signMessage(message: string): Promise<Hex> {
    return this.account.signMessage({ message });
  }

  /** Sign typed data (EIP-712) */
  async signTypedData(params: Parameters<typeof this.account.signTypedData>[0]): Promise<Hex> {
    return this.account.signTypedData(params);
  }

  /** Wait for tx confirmation */
  async waitForTx(hash: Hash, confirmations = 1) {
    return this.publicClient.waitForTransactionReceipt({ hash, confirmations });
  }

  /** Expose publicClient cho các use case nâng cao */
  getPublicClient() {
    return this.publicClient;
  }

  /** Expose walletClient cho các use case nâng cao */
  getWalletClient() {
    return this.walletClient;
  }

  info(): WalletInfo {
    return {
      address: this.address,
      chainId: this.chain.id,
      chainName: this.chainName,
    };
  }
}

// ─── Factory: load từ env ─────────────────────────────────────────────────────

export function loadWallet(chainName = 'polygon'): EVMWallet {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY không được set trong .env');
  if (!pk.startsWith('0x')) throw new Error('PRIVATE_KEY phải bắt đầu bằng 0x');
  return new EVMWallet(pk as Hex, chainName);
}
