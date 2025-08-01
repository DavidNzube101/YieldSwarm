import { Logger } from './utils/Logger';
import { RealDEXIntegrations } from './defi/RealDEXIntegrations';
import * as fs from 'fs';
import * as path from 'path';
import { globalConfig } from '../src/config/globalConfig';

const logger = new Logger('DEX-Test');

async function testDEXIntegrations() {
  try {
    logger.info('🧪 Testing DEX Integrations...');

    // Test different chains
    const chains = ['ethereum', 'bsc', 'polygon'];
    
    for (const chain of chains) {
      logger.info(`\n📊 Testing ${chain.toUpperCase()}...`);
      
      try {
        const dexIntegrations = new RealDEXIntegrations(chain, globalConfig);

        
        // Test getting opportunities
        const opportunities = await dexIntegrations.getYieldOpportunities();
        logger.success(`${chain.toUpperCase()}: Found ${opportunities.length} opportunities`);
        
        // Show sample opportunity
        if (opportunities.length > 0) {
          const sample = opportunities[0];
          if (sample) {
            logger.info(`  Sample: ${sample.token0Symbol}/${sample.token1Symbol} on ${sample.dex} - ${sample.apy.toFixed(2)}% APY`);
          }
        }
        
        // Test getting pools for each DEX
        const dexes = Object.keys(dexIntegrations['dexes']);
        for (const dexName of dexes) {
          try {
            const pools = await dexIntegrations.getPools(dexName);
            if (pools.length > 0) {
              const pool = pools[0];
              if (pool && pool.token0 && pool.token1) {
                logger.info(`  Sample pool: ${pool.token0.symbol}/${pool.token1.symbol} - TVL: $${parseFloat(pool.reserve0) + parseFloat(pool.reserve1)}`);
              }
            }
          } catch (error) {
            logger.debug(`  ${dexName}: Error getting pools`);
          }
        }
        
        await dexIntegrations.shutdown();
        
      } catch (error) {
        logger.error(`${chain.toUpperCase()}: Failed to test`);
      }
    }

  } catch (error) {
    logger.error('DEX test failed:', error);
  }
}

async function testSubgraphs() {
  try {
    logger.info('\n🔗 Testing Subgraph Queries...');
    
    // Load DEX configuration
    const dexesPath = path.join(__dirname, '../config/dexes.json');
    const dexesConfig = JSON.parse(fs.readFileSync(dexesPath, 'utf8'));
    
    for (const [chainName, chainConfig] of Object.entries(dexesConfig)) {
      logger.info(`\n📊 Testing ${chainName.toUpperCase()} subgraphs...`);
      
      for (const [dexName, dexConfig] of Object.entries(chainConfig as any)) {
        if (!(dexConfig as any).enabled || !(dexConfig as any).subgraph) continue;
        
        try {
          const subgraph = dexConfig as any;
          logger.info(`  Testing ${dexName}...`);
          
          const response = await fetch(subgraph.subgraph, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: subgraph.query || `{
                pairs(first: 5, orderBy: reserveUSD, orderDirection: desc) {
                  id
                  token0 { symbol }
                  token1 { symbol }
                  reserveUSD
                  volumeUSD
                }
              }`
            })
          });
          
          const data = await response.json() as any;
          if (data?.data?.pairs) {
            logger.success(`    ${dexName}: Query successful - ${data.data.pairs.length} pairs returned`);
            
            if (data.data.pairs.length > 0) {
              const topPair = data.data.pairs[0];
              logger.info(`    Top pair: ${topPair.token0?.symbol}/${topPair.token1?.symbol} - TVL: $${parseFloat(topPair.reserveUSD || 0).toFixed(2)}`);
            }
          } else {
            logger.error(`    ${dexName}: Query failed`);
          }
          
        } catch (error) {
          logger.error(`    ${dexName}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
  } catch (error) {
    logger.error('Subgraph test failed:', error);
  }
}

async function main() {
  await testDEXIntegrations();
  await testSubgraphs();
  logger.success('\n✅ All DEX tests completed!');
}

main(); 