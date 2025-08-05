const { CustomJuliaBridge } = require('./backend/CustomJuliaBridge');

async function testLLM() {
  console.log('Testing LLM integration...');
  
  const bridge = new CustomJuliaBridge();
  
  try {
    // Connect to Julia server
    await bridge.connect();
    console.log('✅ Connected to Julia server');
    
    // Test basic LLM chat
    console.log('\n🧪 Testing llm.chat...');
    const chatResult = await bridge.runCommand('llm.chat', {
      provider: 'echo',
      prompt: 'Hello, this is a test of LLM integration',
      config: { model: 'gpt-4' }
    });
    console.log('✅ LLM Chat Result:', chatResult);
    
    // Test LLM opportunity analysis
    console.log('\n🧪 Testing llm.analyze_opportunity...');
    const analysisResult = await bridge.runCommand('llm.analyze_opportunity', {
      opportunity: {
        id: 'test-opportunity',
        apy: 15.5,
        riskScore: 0.3,
        chain: 'ethereum',
        tvl: 1000000,
        volume24h: 500000,
        dex: 'uniswap',
        pool: 'USDC-ETH'
      },
      market_context: {
        timestamp: Date.now(),
        marketConditions: 'stable',
        riskFreeRate: 0.05
      },
      provider: 'echo',
      config: { model: 'gpt-4', temperature: 0.7 }
    });
    console.log('✅ LLM Analysis Result:', analysisResult);
    
    // Test LLM portfolio optimization
    console.log('\n🧪 Testing llm.optimize_allocation...');
    const optimizationResult = await bridge.runCommand('llm.optimize_allocation', {
      opportunities: [
        {
          id: 'opp1',
          apy: 15.5,
          riskScore: 0.3,
          chain: 'ethereum',
          tvl: 1000000,
          volume24h: 500000
        },
        {
          id: 'opp2', 
          apy: 8.2,
          riskScore: 0.2,
          chain: 'polygon',
          tvl: 500000,
          volume24h: 200000
        }
      ],
      constraints: {
        riskTolerance: 0.7,
        maxAllocationPerOpportunity: 0.2,
        minAllocationPerOpportunity: 0.05,
        totalAllocation: 1.0
      },
      provider: 'echo',
      config: { model: 'gpt-4', temperature: 0.7 }
    });
    console.log('✅ LLM Optimization Result:', optimizationResult);
    
  } catch (error) {
    console.error('❌ Error testing LLM:', error);
  } finally {
    await bridge.disconnect();
    console.log('\n🔌 Disconnected from Julia server');
  }
}

testLLM(); 