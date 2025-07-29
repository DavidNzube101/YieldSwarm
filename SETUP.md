# YieldSwarm Real-World Setup Guide

## 🚀 Getting Started with Real Integration

This guide will help you set up YieldSwarm with real API keys and wallet configuration for production use.

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **pnpm** package manager
3. **A wallet** with some test funds
4. **API keys** (see below)

## 🔑 Required API Keys

### 1. Etherscan API Key (Multi-Chain)
- **Get it from**: https://etherscan.io/apis
- **Cost**: Free tier available
- **Coverage**: Works for Ethereum, BSC, Polygon, Arbitrum, and 50+ other chains
- **Usage**: Single API key for all chains

### 2. RPC Provider Keys

#### Ethereum
- **Infura**: https://infura.io/ (Free tier available)
- **Alchemy**: https://alchemy.com/ (Free tier available)

#### BSC
- **NodeReal**: https://nodereal.io/ (Free tier available)
- **QuickNode**: https://quicknode.com/ (Free tier available)

#### Polygon
- **Alchemy**: https://alchemy.com/ (Free tier available)
- **Infura**: https://infura.io/ (Free tier available)

#### Arbitrum
- **Alchemy**: https://alchemy.com/ (Free tier available)
- **Infura**: https://infura.io/ (Free tier available)

## 💰 Wallet Setup

### Creating a Test Wallet

1. **Generate a new wallet** (for testing only):
   ```bash
   # Using ethers.js
   npx ethers-cli wallet create
   ```

2. **Get test funds**:
   - **Ethereum**: Use Sepolia testnet faucets
   - **BSC**: Use BSC testnet faucet
   - **Polygon**: Use Mumbai testnet faucet
   - **Arbitrum**: Use Arbitrum Goerli testnet faucet

### Security Best Practices

⚠️ **IMPORTANT**: Never use your main wallet for testing!

1. **Create a dedicated test wallet**
2. **Use environment variables** (never commit private keys)
3. **Start with small amounts**
4. **Use testnets first**

## 🔧 Environment Configuration

### 1. Copy Environment Template
```bash
cp env.example .env
```

### 2. Fill in Your API Keys

```bash
# RPC Endpoints
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
POLYGON_RPC_URL=https://polygon-rpc.com/
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# API Keys
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
INFURA_PROJECT_ID=YOUR_INFURA_PROJECT_ID

# Wallet Configuration
WALLET_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
WALLET_ADDRESS=YOUR_WALLET_ADDRESS_HERE
```

### 3. Example Configuration

```bash
# Example with real values (replace with your own)
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/abc123def456ghi789
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/xyz789abc123
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/def456ghi789

ETHERSCAN_API_KEY=ABC123DEF456GHI789JKL
ALCHEMY_API_KEY=xyz789abc123def456ghi
INFURA_PROJECT_ID=abc123def456ghi789

WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
WALLET_ADDRESS=0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
```

## 🧪 Testing Your Setup

### 1. Test API Connectivity
```bash
pnpm run test-apis
```

### 2. Test Wallet Connection
```bash
pnpm run test-wallet
```

### 3. Run Full System Test
```bash
pnpm run test-basic
```

## 📊 DEX Data Sources

### The Graph (No API Keys Needed)
- **Uniswap V2**: https://thegraph.com/explorer/subgraph/uniswap/uniswap-v2
- **Uniswap V3**: https://thegraph.com/explorer/subgraph/uniswap/uniswap-v3
- **SushiSwap**: https://thegraph.com/explorer/subgraph/sushiswap/exchange
- **PancakeSwap**: https://thegraph.com/explorer/subgraph/pancakeswap/exchange-v2

### PancakeSwap Subgraphs
- **BSC V2**: https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v2
- **BSC V3**: https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3
- **ETH V2**: https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v2-eth
- **ETH V3**: https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-eth

## 🔄 Bridge Protocols

### Cross-Chain Bridges (No API Keys Needed)
- **Multichain**: https://multichain.org/
- **Stargate**: https://stargateprotocol.gitbook.io/
- **Hop Protocol**: https://hop.exchange/
- **LayerZero**: https://layerzero.network/

## 🛡️ Security Checklist

- [ ] Use dedicated test wallet
- [ ] Never commit private keys
- [ ] Use environment variables
- [ ] Start with testnets
- [ ] Use small amounts for testing
- [ ] Monitor transactions carefully
- [ ] Keep API keys secure
- [ ] Regular security audits

## 🚨 Important Notes

### API Rate Limits
- **Etherscan**: 5 calls/sec (free tier)
- **Infura**: 100,000 requests/day (free tier)
- **Alchemy**: 300M compute units/month (free tier)
- **The Graph**: No rate limits for public subgraphs

### Gas Optimization
- Monitor gas prices across chains
- Use gas estimation before transactions
- Consider batch transactions
- Use appropriate gas limits

### Risk Management
- Set maximum slippage limits
- Monitor portfolio risk scores
- Use stop-loss mechanisms
- Diversify across chains and DEXes

## 🆘 Troubleshooting

### Common Issues

1. **"Invalid private key"**
   - Check private key format (64 hex characters)
   - Ensure no extra spaces or characters

2. **"RPC connection failed"**
   - Verify RPC URLs are correct
   - Check API key validity
   - Try backup RPC endpoints

3. **"Insufficient funds"**
   - Add test funds to your wallet
   - Check token balances
   - Verify gas fees

4. **"API rate limit exceeded"**
   - Upgrade to paid tier
   - Implement rate limiting
   - Use multiple API keys

### Support Resources
- **Discord**: [YieldSwarm Community](https://discord.gg/yieldswarm)
- **GitHub**: [Issue Tracker](https://github.com/yieldswarm/issues)
- **Documentation**: [Wiki](https://github.com/yieldswarm/wiki)

## 🎯 Next Steps

1. **Complete setup** with your API keys
2. **Test on testnets** first
3. **Start with small amounts**
4. **Monitor performance**
5. **Scale gradually**

---

**Remember**: Start small, test thoroughly, and always prioritize security! 🔒 