import { YieldCalculator } from '../../src/defi/YieldCalculator';

describe('YieldCalculator', () => {
  let yieldCalculator: YieldCalculator;

  beforeEach(() => {
    yieldCalculator = new YieldCalculator();
  });

  it('should initialize successfully', async () => {
    await expect(yieldCalculator.initialize()).resolves.toBeUndefined();
    expect(yieldCalculator['isInitialized']).toBe(true);
  });

  it('should throw error if optimizePortfolio is called before initialization', async () => {
    const optimizationData = {
      opportunities: [],
      constraints: {},
    };
    await expect(yieldCalculator.optimizePortfolio(optimizationData)).rejects.toThrow('Yield Calculator not initialized');
  });

  it('should perform mock portfolio optimization', async () => {
    await yieldCalculator.initialize();
    const optimizationData = {
      opportunities: [
        { id: '1', expectedYield: 0.1, riskScore: 0.05, chain: 'Solana' },
        { id: '2', expectedYield: 0.12, riskScore: 0.07, chain: 'Ethereum' },
        { id: '3', expectedYield: 0.08, riskScore: 0.03, chain: 'Polygon' },
      ],
      constraints: {
        maxAllocationPerOpportunity: 0.5,
        minAllocationPerOpportunity: 0.1,
        totalAllocation: 1.0,
      },
    };

    const result = await yieldCalculator.optimizePortfolio(optimizationData);

    expect(result).toBeDefined();
    expect(result.allocations).toBeInstanceOf(Array);
    expect(result.allocations.length).toBeGreaterThan(0);
    expect(result.totalExpectedYield).toBeGreaterThan(0);
    expect(result.totalRisk).toBeGreaterThan(0);
    expect(result.sharpeRatio).toBeGreaterThan(0);
  });

  it('should calculate impermanent loss', async () => {
    const il = await yieldCalculator.calculateImpermanentLoss(100, 120, 1);
    expect(il).toBeCloseTo(-0.008);
  });

  it('should calculate optimal rebalancing threshold', async () => {
    const threshold = await yieldCalculator.calculateOptimalRebalancingThreshold([
      { allocation: 0.5, riskScore: 0.05 },
      { allocation: 0.5, riskScore: 0.07 },
    ]);
    expect(threshold).toBeGreaterThan(0);
  });

  it('should calculate cross-chain arbitrage opportunity', async () => {
    const opportunity1 = { apy: 0.1, chain: 'Solana' };
    const opportunity2 = { apy: 0.12, chain: 'Ethereum' };
    const bridgeCost = 0.001;

    const result = await yieldCalculator.calculateCrossChainArbitrageOpportunity(
      opportunity1, opportunity2, bridgeCost
    );

    expect(result.isProfitable).toBe(true);
    expect(result.netBenefit).toBeGreaterThan(0);
  });

  it('should calculate position sizing', async () => {
    const opportunity = { apy: 0.15, riskScore: 0.05 };
    const totalCapital = 10000;
    const riskTolerance = 0.1;

    const positionSize = await yieldCalculator.calculatePositionSizing(
      opportunity, totalCapital, riskTolerance
    );

    expect(positionSize).toBeGreaterThan(0);
    expect(positionSize).toBeLessThanOrEqual(totalCapital);
  });

  it('should shutdown successfully', async () => {
    await expect(yieldCalculator.shutdown()).resolves.toBeUndefined();
    expect(yieldCalculator['isInitialized']).toBe(false);
  });
});
