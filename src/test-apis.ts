import { Logger } from './utils/Logger';
import axios from 'axios';

const logger = new Logger('APITest');

async function testEtherscanAPI(): Promise<boolean> {
  try {
    const apiKey = process.env['ETHERSCAN_API_KEY'];
    if (!apiKey) {
      logger.warn('No Etherscan API key configured');
      return false;
    }

    const response = await axios.get(
      `https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${apiKey}`
    );

    if (response.data?.result?.ethusd) {
      logger.success(`Etherscan API working - ETH price: $${response.data.result.ethusd}`);
      return true;
    } else {
      logger.error('Etherscan API response invalid');
      return false;
    }
  } catch (error) {
    logger.error('Etherscan API test failed:', error);
    return false;
  }
}

async function testTheGraphAPI(): Promise<boolean> {
  try {
    const query = `{ pairs(first: 1) { id token0Price token1Price } }`;
    const response = await axios.post(
      'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
      { query },
      { timeout: 10000 }
    );

    if (response.data?.data?.pairs) {
      logger.success('The Graph API working - Uniswap V2 subgraph accessible');
      return true;
    } else {
      logger.error('The Graph API response invalid');
      return false;
    }
  } catch (error) {
    logger.error('The Graph API test failed:', error);
    return false;
  }
}

async function testRPCConnections(): Promise<void> {
  const rpcTests = [
    { name: 'Ethereum', url: process.env['ETHEREUM_RPC_URL'] },
    { name: 'BSC', url: process.env['BSC_RPC_URL'] },
    { name: 'Polygon', url: process.env['POLYGON_RPC_URL'] },
    { name: 'Arbitrum', url: process.env['ARBITRUM_RPC_URL'] }
  ];

  for (const test of rpcTests) {
    if (!test.url) {
      logger.warn(`No RPC URL configured for ${test.name}`);
      continue;
    }

    try {
      const response = await axios.post(
        test.url,
        {
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        },
        { timeout: 10000 }
      );

      if (response.data?.result) {
        logger.success(`${test.name} RPC working - Block: ${parseInt(response.data.result, 16)}`);
      } else {
        logger.error(`${test.name} RPC response invalid`);
      }
    } catch (error) {
      logger.error(`${test.name} RPC test failed:`, error);
    }
  }
}

async function main(): Promise<void> {
  logger.info('🧪 Testing API connectivity...');

  const results = {
    etherscan: await testEtherscanAPI(),
    theGraph: await testTheGraphAPI()
  };

  await testRPCConnections();

  logger.info('📊 API Test Results:');
  logger.info(`- Etherscan: ${results.etherscan ? '✅' : '❌'}`);
  logger.info(`- The Graph: ${results.theGraph ? '✅' : '❌'}`);

  if (results.etherscan && results.theGraph) {
    logger.success('🎉 All API tests passed!');
  } else {
    logger.warn('⚠️ Some API tests failed. Check your configuration.');
  }
}

main().catch(console.error); 