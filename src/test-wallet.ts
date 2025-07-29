import { Logger } from './utils/Logger';
import { WalletConfigManager } from './utils/WalletConfig';
import { ethers } from 'ethers';

const logger = new Logger('WalletTest');

async function testWalletConfiguration(): Promise<void> {
  logger.info('💰 Testing wallet configuration...');

  const privateKey = process.env['WALLET_PRIVATE_KEY'];
  const walletAddress = process.env['WALLET_ADDRESS'];

  if (!privateKey) {
    logger.error('No wallet private key configured');
    return;
  }

  if (!walletAddress) {
    logger.error('No wallet address configured');
    return;
  }

  // Test private key format
  try {
    const wallet = new ethers.Wallet(privateKey);
    logger.success(`Wallet created successfully: ${wallet.address}`);

    if (wallet.address.toLowerCase() !== walletAddress.toLowerCase()) {
      logger.error('Private key does not match wallet address');
      return;
    }

    logger.success('Private key matches wallet address');
  } catch (error) {
    logger.error('Invalid private key format:', error);
    return;
  }

  // Test wallet manager
  try {
    const walletManager = new WalletConfigManager();
    await walletManager.initialize();

    const chains = ['ethereum', 'bsc', 'polygon', 'arbitrum'];
    
    for (const chain of chains) {
      const config = walletManager.getWalletConfig(chain);
      if (config) {
        try {
          const balance = await walletManager.getBalance(chain);
          logger.success(`${chain} wallet connected - Balance: ${balance} ETH`);
        } catch (error) {
          logger.warn(`${chain} wallet connection failed:`, error);
        }
      } else {
        logger.warn(`No wallet configured for ${chain}`);
      }
    }

    walletManager.shutdown();
  } catch (error) {
    logger.error('Wallet manager test failed:', error);
  }
}

async function testTokenBalances(): Promise<void> {
  logger.info('🪙 Testing token balance queries...');

  const walletManager = new WalletConfigManager();
  await walletManager.initialize();

  // Test USDC balance on Ethereum
  const usdcAddress = '0xA0b86a33E6441b8c4C8B8C4C8C4C8C4C8C4C8C4C'; // USDC contract
  const config = walletManager.getWalletConfig('ethereum');
  
  if (config) {
    try {
      const balance = await walletManager.getTokenBalance('ethereum', usdcAddress);
      logger.success(`USDC balance on Ethereum: ${balance}`);
    } catch (error) {
      logger.warn('USDC balance query failed:', error);
    }
  }

  walletManager.shutdown();
}

async function testGasEstimation(): Promise<void> {
  logger.info('⛽ Testing gas estimation...');

  const walletManager = new WalletConfigManager();
  await walletManager.initialize();

  const config = walletManager.getWalletConfig('ethereum');
  
  if (config) {
    try {
      const gasPrice = await walletManager.getGasPrice('ethereum');
      logger.success(`Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);

      // Test gas estimation for a simple transfer
      const transaction = {
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: ethers.utils.parseEther('0.001')
      };

      const estimatedGas = await walletManager.estimateGas('ethereum', transaction);
      logger.success(`Estimated gas for transfer: ${estimatedGas.toString()}`);
    } catch (error) {
      logger.warn('Gas estimation failed:', error);
    }
  }

  walletManager.shutdown();
}

async function main(): Promise<void> {
  logger.info('🧪 Testing wallet functionality...');

  await testWalletConfiguration();
  await testTokenBalances();
  await testGasEstimation();

  logger.success('🎉 Wallet tests completed!');
}

main().catch(console.error); 