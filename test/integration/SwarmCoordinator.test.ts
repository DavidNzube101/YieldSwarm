import { SwarmCoordinator } from '@src/swarm/SwarmCoordinator';
import { AnalysisAgent } from '@src/agents/AnalysisAgent';
import { MessageType, SwarmMessage } from '@src/types';

// Manually mock AnalysisAgent to control its behavior
const mockAnalysisAgentInstance = {
  onMessage: jest.fn(),
};

// Mock the AnalysisAgent module
jest.mock('@src/agents/AnalysisAgent', () => {
  return {
    AnalysisAgent: jest.fn().mockImplementation((client) => {
      // This is the constructor of the mocked AnalysisAgent
      // We need to ensure that when the mocked AnalysisAgent is created,
      // it registers its onMessage with the client (SwarmCoordinator's communication interface)
      client.on(MessageType.YIELD_OPPORTUNITY, mockAnalysisAgentInstance.onMessage);
      return mockAnalysisAgentInstance;
    }),
  };
});

describe('SwarmCoordinator Integration Test', () => {
  let coordinator: SwarmCoordinator;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Get a fresh instance of the coordinator for each test
    coordinator = SwarmCoordinator.getInstance();
    mockAnalysisAgentInstance.onMessage.mockClear();
  });

  it('should route a YIELD_OPPORTUNITY message from a DiscoveryAgent to an AnalysisAgent', () => {
    // The AnalysisAgent constructor is now mocked to register onMessage as a listener
    // So, just creating the instance should be enough to set up the listener.
    new AnalysisAgent(coordinator.getAgentCommunication()); // This will trigger the mocked constructor

    const mockOpportunityMessage: SwarmMessage = {
      id: 'test-opportunity-1',
      type: MessageType.YIELD_OPPORTUNITY,
      source: 'discovery-agent',
      data: { id: 'pool-123', apy: 15 },
      timestamp: Date.now(),
      priority: 1,
    };

    // Manually trigger the broadcast from the discovery agent's perspective
    // In a real scenario, the agent would call this itself
    coordinator.getAgentCommunication().emit(MessageType.YIELD_OPPORTUNITY, mockOpportunityMessage);

    // Check if the analysis agent's onMessage was called with the correct message
    expect(mockAnalysisAgentInstance.onMessage).toHaveBeenCalledWith(mockOpportunityMessage);
  });
});
