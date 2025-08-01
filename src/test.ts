import { Logger } from './utils/Logger';
import { RealDEXIntegrations } from './defi/RealDEXIntegrations';
import { globalConfig } from '../src/config/globalConfig';

const logger = new Logger('Test');

async function testDEXIntegrations() {
  try {
    logger.info('🧪 Testing DEX Integrations...');

    const dexIntegrations = new RealDEXIntegrations('ethereum', globalConfig);
    
    // Test getting opportunities
    const opportunities = await dexIntegrations.getYieldOpportunities();
    logger.success(`Found ${opportunities.length} yield opportunities`);

    // Display top opportunities
    const topOpportunities = opportunities
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 5);

    logger.info('Top 5 opportunities:');
    topOpportunities.forEach((opp, index) => {
      logger.info(`${index + 1}. ${opp.token0Symbol}/${opp.token1Symbol} on ${opp.dex} - ${opp.apy.toFixed(2)}% APY`);
    });

  } catch (error) {
    logger.error('Test failed:', error);
  }
}

testDEXIntegrations(); 