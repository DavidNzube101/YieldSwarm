# YieldSwarm CLI Guide

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Build the CLI
pnpm run build

# Run CLI directly
pnpm run cli

# Or build and run
pnpm run cli:build
```

## 📋 Available Commands

### 🎯 Quick Commands

```bash
# Quick start with default settings
yieldswarm start

# Interactive setup wizard
yieldswarm setup

# Show system status
yieldswarm status

# Run all tests
yieldswarm test --all
```

### 👛 Wallet Management

```bash
# Create a new wallet
yieldswarm wallet create --show-private

# Import existing wallet
yieldswarm wallet import 0x1234567890abcdef...

# List configured wallets
yieldswarm wallet list

# Check balances across chains
yieldswarm wallet balance

# Check balance on specific chain
yieldswarm wallet balance --chain ethereum

# Backup wallet configuration
yieldswarm wallet backup --output wallet-backup.json

# Restore wallet from backup
yieldswarm wallet restore wallet-backup.json
```

### 🔗 Chain Management

```bash
# List all supported chains
yieldswarm chain list

# List only enabled chains
yieldswarm chain list --enabled

# Enable a specific chain
yieldswarm chain enable ethereum

# Enable testnet
yieldswarm chain enable ethereum --testnet

# Disable a chain
yieldswarm chain disable solana

# Configure chain settings
yieldswarm chain config ethereum --rpc-url https://mainnet.infura.io/v3/YOUR_KEY

# Test chain connectivity
yieldswarm chain test ethereum

# Reset all chains to defaults
yieldswarm chain reset --all

# Reset specific chain
yieldswarm chain reset ethereum
```

### 🐝 YieldSwarm Operations

```bash
# Start yield optimization
yieldswarm swarm optimize

# Start with specific chains
yieldswarm swarm optimize --chains ethereum,bsc,polygon

# Start with custom wallet
yieldswarm swarm optimize --wallet 0x1234... --private-key 0xabcd...

# Use testnet
yieldswarm swarm optimize --testnet

# Dry run (simulate without executing)
yieldswarm swarm optimize --dry-run

# Stop optimization
yieldswarm swarm stop

# Show optimization status
yieldswarm swarm status

# Show recent logs
yieldswarm swarm logs

# Show logs with custom line count
yieldswarm swarm logs --lines 100

# Follow logs in real-time
yieldswarm swarm logs --follow

# Show current portfolio
yieldswarm swarm portfolio

# Show portfolio for specific chain
yieldswarm swarm portfolio --chain ethereum

# Show yield opportunities
yieldswarm swarm opportunities

# Show opportunities with minimum APY filter
yieldswarm swarm opportunities --min-apy 10

# Show opportunities on specific chain
yieldswarm swarm opportunities --chain ethereum
```

### 🧪 Testing

```bash
# Run all tests
yieldswarm test --all

# Test API connectivity
yieldswarm test --apis

# Test wallet configuration
yieldswarm test --wallet

# Test DEX integrations
yieldswarm test --dex
```

## 🔧 Configuration Examples

### Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit .env file with your keys
nano .env
```

Example `.env` file:
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

### Chain Configuration

```bash
# Configure Ethereum with custom RPC
yieldswarm chain config ethereum \
  --rpc-url https://mainnet.infura.io/v3/YOUR_KEY \
  --rpc-backup https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY \
  --gas-limit 500000 \
  --max-fee 50 \
  --max-priority-fee 2

# Configure BSC
yieldswarm chain config bsc \
  --rpc-url https://bsc-dataseed1.binance.org/ \
  --gas-limit 1000000 \
  --max-fee 10 \
  --max-priority-fee 1

# Configure Polygon
yieldswarm chain config polygon \
  --rpc-url https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY \
  --gas-limit 500000 \
  --max-fee 100 \
  --max-priority-fee 30
```

## 🎯 Use Cases

### 1. First-Time Setup

```bash
# 1. Run setup wizard
yieldswarm setup

# 2. Create a test wallet
yieldswarm wallet create --show-private

# 3. Configure chains
yieldswarm chain enable ethereum
yieldswarm chain enable bsc
yieldswarm chain enable polygon

# 4. Test everything
yieldswarm test --all

# 5. Start optimization (dry run first)
yieldswarm swarm optimize --dry-run
```

### 2. Production Deployment

```bash
# 1. Import production wallet
yieldswarm wallet import YOUR_PRIVATE_KEY

# 2. Configure all chains
yieldswarm chain enable ethereum
yieldswarm chain enable bsc
yieldswarm chain enable polygon
yieldswarm chain enable arbitrum
yieldswarm chain enable solana

# 3. Set custom RPC URLs
yieldswarm chain config ethereum --rpc-url YOUR_ETH_RPC
yieldswarm chain config bsc --rpc-url YOUR_BSC_RPC
# ... configure other chains

# 4. Test connectivity
yieldswarm chain test ethereum
yieldswarm chain test bsc
# ... test other chains

# 5. Start optimization
yieldswarm swarm optimize
```

### 3. Monitoring and Management

```bash
# Check system status
yieldswarm status

# Monitor optimization
yieldswarm swarm status

# View recent logs
yieldswarm swarm logs --lines 100

# Check wallet balances
yieldswarm wallet balance

# View yield opportunities
yieldswarm swarm opportunities --min-apy 5

# Stop optimization
yieldswarm swarm stop
```

### 4. Testing and Development

```bash
# Use testnet
yieldswarm chain enable ethereum --testnet
yieldswarm chain enable bsc --testnet

# Create test wallet
yieldswarm wallet create --show-private

# Test with dry run
yieldswarm swarm optimize --testnet --dry-run

# Run all tests
yieldswarm test --all
```

## 🔒 Security Best Practices

### Wallet Security

```bash
# Never use --show-private in production
yieldswarm wallet create  # Private key hidden by default

# Use dedicated test wallet
yieldswarm wallet create --output test-wallet.json

# Backup wallet securely
yieldswarm wallet backup --output secure-backup.json

# Store backup in secure location
mv secure-backup.json ~/.secure/yieldswarm-backup.json
```

### Environment Security

```bash
# Use environment variables
export WALLET_PRIVATE_KEY="your_private_key"
export ETHERSCAN_API_KEY="your_api_key"

# Or use .env file (add to .gitignore)
echo ".env" >> .gitignore

# Never commit private keys
git add .gitignore
git commit -m "Add .env to gitignore"
```

### Network Security

```bash
# Use trusted RPC providers
yieldswarm chain config ethereum --rpc-url https://mainnet.infura.io/v3/YOUR_KEY

# Set up backup RPC URLs
yieldswarm chain config ethereum --rpc-backup https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Test connectivity before production
yieldswarm chain test ethereum
```

## 🚨 Troubleshooting

### Common Issues

1. **"Command not found"**
   ```bash
   # Build the CLI first
   pnpm run build
   
   # Or run directly with ts-node
   pnpm run cli
   ```

2. **"Invalid private key"**
   ```bash
   # Check private key format
   yieldswarm wallet import 0x1234567890abcdef...
   
   # Generate new wallet
   yieldswarm wallet create
   ```

3. **"RPC connection failed"**
   ```bash
   # Test chain connectivity
   yieldswarm chain test ethereum
   
   # Configure custom RPC
   yieldswarm chain config ethereum --rpc-url YOUR_RPC_URL
   ```

4. **"API rate limit exceeded"**
   ```bash
   # Check API keys
   yieldswarm test --apis
   
   # Upgrade API plan or use multiple keys
   ```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run with verbose output
yieldswarm swarm optimize --verbose

# Check logs for errors
yieldswarm swarm logs --lines 200
```

## 📊 Advanced Usage

### Custom Chain Configuration

```bash
# Create custom chain config
cat > custom-chains.json << EOF
{
  "custom_chain": {
    "name": "Custom Chain",
    "chainId": 9999,
    "rpcUrl": "https://custom-rpc.com",
    "explorer": "https://custom-explorer.com",
    "enabled": true,
    "testnet": false,
    "nativeCurrency": {
      "name": "Custom Token",
      "symbol": "CST",
      "decimals": 18
    },
    "blockTime": 5,
    "gasLimit": 300000,
    "maxPriorityFeePerGas": "1000000000",
    "maxFeePerGas": "50000000000"
  }
}
EOF

# Load custom configuration
yieldswarm chain load custom-chains.json
```

### Automation Scripts

```bash
#!/bin/bash
# start-yieldswarm.sh

echo "Starting YieldSwarm..."

# Check if wallet exists
if ! yieldswarm wallet list | grep -q "wallet"; then
    echo "Creating wallet..."
    yieldswarm wallet create --output wallet.json
fi

# Enable chains
yieldswarm chain enable ethereum
yieldswarm chain enable bsc
yieldswarm chain enable polygon

# Test connectivity
yieldswarm test --all

# Start optimization
yieldswarm swarm optimize

echo "YieldSwarm started successfully!"
```

### Monitoring Script

```bash
#!/bin/bash
# monitor-yieldswarm.sh

while true; do
    echo "=== $(date) ==="
    
    # Check status
    yieldswarm status
    
    # Check balances
    yieldswarm wallet balance
    
    # Show opportunities
    yieldswarm swarm opportunities --min-apy 5
    
    echo "Sleeping for 5 minutes..."
    sleep 300
done
```

## 🎉 Next Steps

1. **Complete the setup** using the wizard
2. **Test on testnets** first
3. **Start with small amounts** in production
4. **Monitor performance** regularly
5. **Scale gradually** as you gain confidence

For more information, visit the [YieldSwarm Documentation](https://github.com/yieldswarm/docs). 