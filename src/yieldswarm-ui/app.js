class YieldSwarmDashboard {
  constructor() {
    this.socket = null
    this.apiBaseUrl = "http://localhost:3000"
    this.opportunities = []
    this.maxOpportunities = 20
    this.portfolioData = []
    this.riskAlerts = []
    this.availableAgents = []
    this.currentTheme = "dark"
    this.config = {
      dataMode: "mock",
      activeChains: ["ethereum", "solana"],
    }

    this.init()
  }

  async init() {
    this.addLog("Dashboard initializing...", "system")

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.onDOMReady())
    } else {
      this.onDOMReady()
    }
  }

  async onDOMReady() {
    this.setupEventListeners()
    this.setupModals()
    this.loadTheme()
    await this.loadInitialData()
    this.connectWebSocket()
    this.addLog("Dashboard ready", "system")
  }

  setupEventListeners() {
    // Theme toggle
    document.getElementById("theme-toggle").addEventListener("click", () => this.toggleTheme())

    // Configuration
    document.getElementById("apply-config").addEventListener("click", () => this.applyConfiguration())
    document.getElementById("data-mode-toggle").addEventListener("change", (e) => {
      this.config.dataMode = e.target.checked ? "real" : "mock"
    })

    // Chain selection
    document.querySelectorAll(".chain-option input").forEach((checkbox) => {
      checkbox.addEventListener("change", () => this.updateActiveChains())
    })

    // Refresh buttons
    document.getElementById("refresh-agents").addEventListener("click", () => this.loadAgents())
    document.getElementById("refresh-swarms").addEventListener("click", () => this.loadSwarms())
    document.getElementById("clear-logs").addEventListener("click", () => this.clearLogs())

    // Create buttons
    document.getElementById("create-agent-btn").addEventListener("click", () => this.showCreateAgentModal())
    document.getElementById("create-swarm-btn").addEventListener("click", () => this.showCreateSwarmModal())

    // Filters
    document.getElementById("chain-filter").addEventListener("change", () => this.filterOpportunities())
    document.getElementById("apy-filter").addEventListener("change", () => this.filterOpportunities())
    document.getElementById("log-filter").addEventListener("change", () => this.filterLogs())
  }

  setupModals() {
    // Agent modal
    const agentModal = document.getElementById("create-agent-modal");
    const agentForm = document.getElementById("create-agent-form");
    const agentTypeSelect = document.getElementById("agent-type");
    const agentChainSelect = document.getElementById("agent-chain-container");

    

    agentModal.querySelector(".modal-close").addEventListener("click", () => this.hideModal(agentModal))
    agentModal.querySelector(".cancel-btn").addEventListener("click", () => this.hideModal(agentModal))
    agentForm.addEventListener("submit", (e) => this.handleCreateAgent(e))

    // Swarm modal
    const swarmModal = document.getElementById("create-swarm-modal")
    const swarmForm = document.getElementById("create-swarm-form")

    swarmModal.querySelector(".modal-close").addEventListener("click", () => this.hideModal(swarmModal))
    swarmModal.querySelector(".cancel-btn").addEventListener("click", () => this.hideModal(swarmModal))
    swarmForm.addEventListener("submit", (e) => this.handleCreateSwarm(e))

    // Close modals on backdrop click
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        this.hideModal(e.target)
      }
    })
  }

  loadTheme() {
    const savedTheme = localStorage.getItem("yieldswarm-theme") || "dark"
    this.setTheme(savedTheme)
  }

  toggleTheme() {
    const newTheme = this.currentTheme === "dark" ? "light" : "dark"
    this.setTheme(newTheme)
  }

  setTheme(theme) {
    this.currentTheme = theme
    document.documentElement.setAttribute("data-theme", theme)
    document.getElementById("theme-toggle").textContent = theme === "dark" ? "☀️" : "🌙"
    localStorage.setItem("yieldswarm-theme", theme)
  }

  updateActiveChains() {
    const checkedChains = Array.from(document.querySelectorAll(".chain-option input:checked")).map((cb) => cb.value)
    this.config.activeChains = checkedChains
  }

  async applyConfiguration() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.config),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      this.addLog(
        `Configuration applied: ${this.config.dataMode} mode, chains: ${this.config.activeChains.join(", ")}`,
        "system",
      )
    } catch (error) {
      this.addLog(`Failed to apply configuration: ${error.message}`, "error")
    }
  }

  async loadInitialData() {
    try {
      await Promise.all([this.loadAgents(), this.loadSwarms(), this.loadRiskAlerts(), this.loadAlgorithms()])
    } catch (error) {
      this.addLog(`Failed to load initial data: ${error.message}`, "error")
    }
  }

  async loadAgents() {
    try {
      this.addLog("Loading agents...", "info")
      const response = await fetch(`${this.apiBaseUrl}/agents`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const agents = await response.json()
      this.availableAgents = agents
      this.renderAgents(agents)
      this.updateAvailableAgentsInModal()
      this.addLog(`Loaded ${agents.length} agents`, "info")
    } catch (error) {
      this.addLog(`Failed to load agents: ${error.message}`, "error")
      this.renderAgentsError()
    }
  }

  async loadSwarms() {
    try {
      this.addLog("Loading swarms...", "info")
      const response = await fetch(`${this.apiBaseUrl}/swarms`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const swarms = await response.json()
      this.renderSwarms(swarms)
      this.addLog(`Loaded ${swarms.length} swarms`, "info")
    } catch (error) {
      this.addLog(`Failed to load swarms: ${error.message}`, "error")
      this.renderSwarmsError()
    }
  }

  async loadAlgorithms() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/algorithms`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const algorithms = await response.json();
      const select = document.getElementById('swarm-algorithm');
      select.innerHTML = algorithms.map(algo => `<option value="${algo.id}">${algo.name} - ${algo.description}</option>`).join('');
    } catch (error) {
      this.addLog(`Failed to load algorithms: ${error.message}`, "error");
    }
  }

  async loadRiskAlerts() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/risk-alerts`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const alerts = await response.json()
      this.riskAlerts = alerts
      this.renderRiskAlerts()
    } catch (error) {
      this.addLog(`Failed to load risk alerts: ${error.message}`, "error")
    }
  }

  renderAgents(agents) {
    const tbody = document.getElementById("agents-tbody")

    if (agents.length === 0) {
      tbody.innerHTML = '<tr class="no-data-row"><td colspan="6">No agents found</td></tr>'
      return
    }

    tbody.innerHTML = agents
      .map(
        (agent) => `
        <tr>
          <td>${agent.id}</td>
          <td>${agent.name}</td>
          <td>
            <span class="badge ${agent.type}">${agent.type}</span>
          </td>
          <td>${agent.chain || "N/A"}</td>
          <td>
            <span class="status-dot ${agent.status}"></span>
            ${agent.status}
          </td>
          <td>
            <button class="action-btn start-btn" onclick="dashboard.startAgent('${agent.id}')" 
                    ${agent.status === "running" ? "disabled" : ""}>Start</button>
            <button class="action-btn stop-btn" onclick="dashboard.stopAgent('${agent.id}')"
                    ${agent.status === "stopped" ? "disabled" : ""}>Stop</button>
            <button class="action-btn delete-btn" onclick="dashboard.deleteAgent('${agent.id}')">Delete</button>
          </td>
        </tr>
      `,
      )
      .join("")
  }

  renderAgentsError() {
    const tbody = document.getElementById("agents-tbody")
    tbody.innerHTML = '<tr class="no-data-row"><td colspan="6">Failed to load agents</td></tr>'
  }

  renderSwarms(swarms) {
    const tbody = document.getElementById("swarms-tbody")

    if (swarms.length === 0) {
      tbody.innerHTML = '<tr class="no-data-row"><td colspan="6">No swarms found</td></tr>'
      return
    }

    tbody.innerHTML = swarms
      .map(
        (swarm) => `
        <tr>
          <td>${swarm.id}</td>
          <td>${swarm.name}</td>
          <td>${swarm.algorithm || "N/A"}</td>
          <td>
            <span class="status-dot ${swarm.status}"></span>
            ${swarm.status}
          </td>
          <td>${swarm.agents || 0}</td>
          <td>
            <button class="action-btn start-btn" onclick="dashboard.startSwarm('${swarm.id}')"
                    ${swarm.status === "running" ? "disabled" : ""}>Start</button>
            <button class="action-btn stop-btn" onclick="dashboard.stopSwarm('${swarm.id}')"
                    ${swarm.status === "stopped" ? "disabled" : ""}>Stop</button>
            <button class="action-btn delete-btn" onclick="dashboard.deleteSwarm('${swarm.id}')">Delete</button>
          </td>
        </tr>
      `,
      )
      .join("")
  }

  renderSwarmsError() {
    const tbody = document.getElementById("swarms-tbody")
    tbody.innerHTML = '<tr class="no-data-row"><td colspan="6">Failed to load swarms</td></tr>'
  }

  renderRiskAlerts() {
    const container = document.getElementById("alerts-container")
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }

    if (this.riskAlerts.length === 0) {
      container.innerHTML = '<div class="no-alerts">No active risk alerts</div>'
    } else {
      container.innerHTML = this.riskAlerts
        .map((alert) => {
          counts[alert.severity]++
          return `
            <div class="alert-item ${alert.severity}">
              <div class="alert-header">
                <span class="alert-type">${alert.type}</span>
                <span class="alert-severity ${alert.severity}">${alert.severity}</span>
              </div>
              <div class="alert-message">${alert.message}</div>
              ${alert.recommendations ? `<div class="alert-recommendations">Recommendation: ${alert.recommendations}</div>` : ""}
            </div>
          `
        })
        .join("")
    }

    // Update alert counts
    Object.keys(counts).forEach((severity) => {
      document.getElementById(`${severity}-count`).textContent = counts[severity]
    })
  }

  showCreateAgentModal() {
    const modal = document.getElementById("create-agent-modal")
    modal.classList.add("active")
  }

  showCreateSwarmModal() {
    const modal = document.getElementById("create-swarm-modal")
    this.updateAvailableAgentsInModal()
    modal.classList.add("active")
  }

  hideModal(modal) {
    modal.classList.remove("active")
    // Reset forms
    modal.querySelectorAll("form").forEach((form) => form.reset())
  }

  updateAvailableAgentsInModal() {
    const container = document.getElementById("available-agents")

    if (this.availableAgents.length === 0) {
      container.innerHTML = '<div class="no-agents">No agents available</div>'
      return
    }

    container.innerHTML = this.availableAgents
      .map(
        (agent) => `
        <div class="agent-checkbox">
          <input type="checkbox" id="agent-${agent.id}" value="${agent.id}">
          <label for="agent-${agent.id}">${agent.name} (${agent.type})</label>
        </div>
      `,
      )
      .join("")
  }

  async handleCreateAgent(e) {
    e.preventDefault()

    const formData = new FormData(e.target)
    const agentType = document.getElementById("agent-type").value;
    if (!agentType) {
      this.addLog("Please select an agent type.", "error");
      return;
    }

    const agentData = {
      name: document.getElementById("agent-name").value,
      type: agentType,
      chain: document.getElementById("agent-chain").value,
      config: this.parseJSON(document.getElementById("agent-config").value),
    };

    try {
      const response = await fetch(`${this.apiBaseUrl}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentData),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const newAgent = await response.json()
      this.addLog(`Agent "${newAgent.name}" created successfully`, "info")
      this.hideModal(document.getElementById("create-agent-modal"))
      this.loadAgents()
    } catch (error) {
      this.addLog(`Failed to create agent: ${error.message}`, "error")
    }
  }

  async handleCreateSwarm(e) {
    e.preventDefault()

    const selectedAgents = Array.from(document.querySelectorAll("#available-agents input:checked")).map(
      (cb) => cb.value,
    )

    const swarmData = {
      name: document.getElementById("swarm-name").value,
      algorithm: { type: document.getElementById("swarm-algorithm").value, params: {} },
      agents: selectedAgents,
      config: this.parseJSON(document.getElementById("swarm-config").value),
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/swarms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(swarmData),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const newSwarm = await response.json()
      this.addLog(`Swarm "${newSwarm.name}" created successfully`, "info")
      this.hideModal(document.getElementById("create-swarm-modal"))
      this.loadSwarms()
    } catch (error) {
      this.addLog(`Failed to create swarm: ${error.message}`, "error")
    }
  }

  parseJSON(jsonString) {
    if (!jsonString.trim()) return {}

    try {
      return JSON.parse(jsonString)
    } catch (error) {
      this.addLog(`Invalid JSON configuration: ${error.message}`, "warning")
      return {}
    }
  }

  async startAgent(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/agents/${id}/start`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      this.addLog(`Agent ${id} start command sent`, "info")
    } catch (error) {
      this.addLog(`Failed to start agent ${id}: ${error.message}`, "error")
    }
  }

  async stopAgent(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/agents/${id}/stop`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      this.addLog(`Agent ${id} stop command sent`, "info")
    } catch (error) {
      this.addLog(`Failed to stop agent ${id}: ${error.message}`, "error")
    }
  }

  async deleteAgent(id) {
    if (!confirm(`Are you sure you want to delete agent ${id}?`)) {
      return
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/agents/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      this.addLog(`Agent ${id} deleted`, "info")
      this.loadAgents()
    } catch (error) {
      this.addLog(`Failed to delete agent ${id}: ${error.message}`, "error")
    }
  }

  async startSwarm(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/swarms/${id}/start`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      this.addLog(`Swarm ${id} start command sent`, "info")
    } catch (error) {
      this.addLog(`Failed to start swarm ${id}: ${error.message}`, "error")
    }
  }

  async stopSwarm(id) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/swarms/${id}/stop`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      this.addLog(`Swarm ${id} stop command sent`, "info")
    } catch (error) {
      this.addLog(`Failed to stop swarm ${id}: ${error.message}`, "error")
    }
  }

  async deleteSwarm(id) {
    if (!confirm(`Are you sure you want to delete swarm ${id}?`)) {
      return
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/swarms/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      this.addLog(`Swarm ${id} deleted`, "info")
      this.loadSwarms()
    } catch (error) {
      this.addLog(`Failed to delete swarm ${id}: ${error.message}`, "error")
    }
  }

  connectWebSocket() {
    try {
      const io = window.io
      this.socket = io("http://localhost:3000")

      this.socket.on("connect", () => {
        this.updateConnectionStatus(true)
        this.addLog("WebSocket connected", "system")
      })

      this.socket.on("disconnect", () => {
        this.updateConnectionStatus(false)
        this.addLog("WebSocket disconnected", "error")
      })

      this.socket.on("yield_opportunity", (data) => {
        console.log("WebSocket: Received yield_opportunity event!", data);
        this.addLog(`WebSocket: Received yield_opportunity - ${data.id || 'unknown'}`, "info");
        this.addOpportunity(data)
      })

      this.socket.on("portfolio_update", (data) => {
        console.log("WebSocket: Received portfolio_update event!", data);
        console.log("portfolio_update data structure:", JSON.stringify(data, null, 2));
        this.addLog(`WebSocket: Received portfolio_update - ${data.allocations?.length || 0} allocations`, "info");
        console.log("About to call updatePortfolio with data:", data);
        try {
          this.updatePortfolio(data);
          console.log("updatePortfolio called successfully");
        } catch (error) {
          console.error("Error in updatePortfolio:", error);
        }
      })

      this.socket.on("risk_alert", (data) => {
        console.log("WebSocket: Received risk_alert event!", data);
        this.addLog(`WebSocket: Received risk_alert - ${data.type || 'unknown'}`, "info");
        console.log("About to call addRiskAlert with data:", data);
        try {
          this.addRiskAlert(data);
          console.log("addRiskAlert called successfully");
        } catch (error) {
          console.error("Error in addRiskAlert:", error);
        }
      })

      this.socket.on("log_message", (data) => {
        const message = typeof data === "string" ? data : data.message || JSON.stringify(data)
        this.addLog(message, data.level || "info")
      })

      // Agent events
      this.socket.on("agent_created", () => {
        this.loadAgents()
        this.addLog("Agent created", "info")
      })

      this.socket.on("agent_started", () => {
        this.loadAgents()
        this.addLog("Agent started", "info")
      })

      this.socket.on("agent_stopped", () => {
        this.loadAgents()
        this.addLog("Agent stopped", "info")
      })

      // Swarm events
      this.socket.on("swarm_created", () => {
        this.loadSwarms()
        this.addLog("Swarm created", "info")
      })

      this.socket.on("swarm_started", () => {
        this.loadSwarms()
        this.addLog("Swarm started", "info")
      })

      this.socket.on("swarm_stopped", () => {
        this.loadSwarms()
        this.addLog("Swarm stopped", "info")
      })

      // Catch-all event listener to debug what events are actually being received
      this.socket.onAny((eventName, ...args) => {
        console.log(`WebSocket: Received event '${eventName}' with args:`, args);
        if (eventName === 'portfolio_update') {
          console.log('portfolio_update caught by onAny:', args[0]);
        }
      })
    } catch (error) {
      this.addLog(`WebSocket connection failed: ${error.message}`, "error")
      this.updateConnectionStatus(false)
    }
  }

  updateConnectionStatus(connected) {
    const indicator = document.getElementById("connection-indicator")
    const text = document.getElementById("connection-text")

    if (connected) {
      indicator.className = "status-dot connected"
      text.textContent = "Connected"
    } else {
      indicator.className = "status-dot disconnected"
      text.textContent = "Disconnected"
    }
  }

  addOpportunity(opportunity) {
    console.log("addOpportunity called with:", opportunity);
    this.addLog(`DEBUG: Opportunity data - chain: ${opportunity.chain}, dex: ${opportunity.dex}, apy: ${opportunity.apy}`, "info");
    
    this.opportunities.unshift({
      ...opportunity,
      timestamp: Date.now(),
      risk: opportunity.risk || this.calculateRisk(opportunity),
    })

    if (this.opportunities.length > this.maxOpportunities) {
      this.opportunities = this.opportunities.slice(0, this.maxOpportunities)
    }

    this.renderOpportunities()
    this.updateOpportunityStats()
    this.addLog(`New opportunity: ${opportunity.chain} - ${opportunity.dex} - ${opportunity.apy}% APY`, "info")
  }

  calculateRisk(opportunity) {
    // Simple risk calculation based on APY and TVL
    if (opportunity.apy > 50 || opportunity.tvl < 100000) return "high"
    if (opportunity.apy > 20 || opportunity.tvl < 1000000) return "medium"
    return "low"
  }

  renderOpportunities() {
    const tbody = document.getElementById("opportunities-tbody")
    const filteredOpportunities = this.getFilteredOpportunities()

    if (filteredOpportunities.length === 0) {
      tbody.innerHTML = '<tr class="no-data-row"><td colspan="6">No opportunities match current filters</td></tr>'
      return
    }

    tbody.innerHTML = filteredOpportunities
      .map((opp) => {
        const apyClass = opp.apy >= 20 ? "apy-high" : opp.apy >= 10 ? "apy-medium" : "apy-low"
        return `
          <tr>
            <td>${opp.chain}</td>
            <td>${opp.dex}</td>
            <td>${opp.pool}</td>
            <td class="${apyClass}">${opp.apy}%</td>
            <td>$${this.formatNumber(opp.tvl)}</td>
            <td><span class="risk-badge ${opp.risk}">${opp.risk}</span></td>
          </tr>
        `
      })
      .join("")
  }

  getFilteredOpportunities() {
    const chainFilter = document.getElementById("chain-filter").value
    const apyFilter = document.getElementById("apy-filter").value

    return this.opportunities.filter((opp) => {
      if (chainFilter && opp.chain !== chainFilter) return false

      if (apyFilter) {
        if (apyFilter === "high" && opp.apy < 20) return false
        if (apyFilter === "medium" && (opp.apy < 10 || opp.apy >= 20)) return false
        if (apyFilter === "low" && opp.apy >= 10) return false
      }

      return true
    })
  }

  updateOpportunityStats() {
    const countElement = document.querySelector(".opportunity-count")
    const timeElement = document.querySelector(".update-time")

    countElement.textContent = `${this.opportunities.length} opportunities`
    timeElement.textContent = `Last update: ${new Date().toLocaleTimeString()}`
  }

  filterOpportunities() {
    this.renderOpportunities()
  }

  updatePortfolio(data) {
    this.portfolioData = data.allocations || []
    this.renderPortfolioChart()
    this.renderPortfolioTable()
    this.updatePortfolioMetrics(data)
    this.addLog("Portfolio allocation updated", "info")
  }

  updatePortfolioMetrics(data) {
    const expectedYield = data.totalExpectedYield || this.calculateExpectedYield()
    const totalRisk = data.totalRisk || this.calculateTotalRisk()

    document.getElementById("expected-yield").textContent = `${expectedYield.toFixed(2)}%`

    const riskElement = document.getElementById("total-risk")
    
    // Convert numeric risk to string for display
    let riskText = totalRisk
    if (typeof totalRisk === 'number') {
      if (totalRisk >= 0.7) riskText = "High"
      else if (totalRisk >= 0.4) riskText = "Medium"
      else riskText = "Low"
    }
    
    // Ensure riskText is a string before calling toLowerCase()
    const riskTextString = String(riskText)
    
    riskElement.textContent = riskTextString
    riskElement.className = `metric-value risk-${riskTextString.toLowerCase()}`
  }

  calculateExpectedYield() {
    if (this.portfolioData.length === 0) return 0

    return this.portfolioData.reduce((total, item) => {
      return total + (item.allocation * (item.expectedYield || 0))
    }, 0)
  }

  calculateTotalRisk() {
    if (this.portfolioData.length === 0) return "Low"

    const avgRisk = this.portfolioData.reduce((total, item) => {
      const riskScore = item.risk === "high" ? 3 : item.risk === "medium" ? 2 : 1
      return total + (item.allocation * riskScore) / 100
    }, 0)

    if (avgRisk > 2.5) return "High"
    if (avgRisk > 1.5) return "Medium"
    return "Low"
  }

  renderPortfolioChart() {
    const canvas = document.getElementById("portfolio-chart")
    const ctx = canvas.getContext("2d")
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 90

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (this.portfolioData.length === 0) {
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.strokeStyle = "var(--border-color)"
      ctx.lineWidth = 2
      ctx.stroke()

      document.getElementById("total-allocation").textContent = "0%"
      this.renderChartLegend([])
      return
    }

    const colors = ["#00d4ff", "#00ff88", "#ffaa00", "#ff6b6b", "#9c27b0", "#ff9800", "#4caf50", "#e91e63"]
    let currentAngle = -Math.PI / 2
    let totalAllocation = 0

    this.portfolioData.forEach((item, index) => {
      const percentage = item.allocation * 100 // Convert decimal to percentage
      totalAllocation += percentage
      const sliceAngle = (percentage / 100) * 2 * Math.PI

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.closePath()
      ctx.fillStyle = colors[index % colors.length]
      ctx.fill()
      ctx.strokeStyle = "var(--primary-bg)"
      ctx.lineWidth = 2
      ctx.stroke()

      currentAngle += sliceAngle
    })

    document.getElementById("total-allocation").textContent = `${totalAllocation.toFixed(1)}%`
    this.renderChartLegend(colors)
  }

  renderChartLegend(colors) {
    const legend = document.getElementById("chart-legend")

    if (this.portfolioData.length === 0) {
      legend.innerHTML = ""
      return
    }

    legend.innerHTML = this.portfolioData
      .map(
        (item, index) => `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${colors[index % colors.length]}"></div>
          <span>${item.opportunityId} (${item.allocation}%)</span>
        </div>
      `,
      )
      .join("")
  }

  renderPortfolioTable() {
    const tbody = document.getElementById("allocation-tbody")

    if (this.portfolioData.length === 0) {
      tbody.innerHTML = '<tr class="no-data-row"><td colspan="4">No allocations</td></tr>'
      return
    }

    tbody.innerHTML = this.portfolioData
      .map(
        (item) => `
        <tr>
          <td>${item.opportunityId}</td>
          <td>${item.chain}</td>
          <td>${(item.allocation * 100).toFixed(1)}%</td>
          <td class="apy-${item.expectedYield >= 20 ? "high" : item.expectedYield >= 10 ? "medium" : "low"}">
            ${item.expectedYield ? (item.expectedYield * 100).toFixed(2) + "%" : "N/A"}
          </td>
        </tr>
      `,
      )
      .join("")
  }

  addRiskAlert(alertData) {
    const alert = {
      ...alertData,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    }

    this.riskAlerts.unshift(alert)

    // Keep only the latest 50 alerts
    if (this.riskAlerts.length > 50) {
      this.riskAlerts = this.riskAlerts.slice(0, 50)
    }

    this.renderRiskAlerts()
    this.addLog(`Risk Alert: ${alert.type} - ${alert.message}`, "warning")
  }

  addLog(message, type = "info") {
    const container = document.getElementById("logs-container")
    const timestamp = new Date().toLocaleTimeString()

    const logEntry = document.createElement("div")
    logEntry.className = `log-entry ${type}`
    logEntry.innerHTML = `
      <span class="timestamp">[${timestamp}]</span>
      <span class="message">${message}</span>
    `

    container.insertBefore(logEntry, container.firstChild)

    while (container.children.length > 100) {
      container.removeChild(container.lastChild)
    }

    this.filterLogs()
  }

  filterLogs() {
    const filter = document.getElementById("log-filter").value
    const entries = document.querySelectorAll(".log-entry")

    entries.forEach((entry) => {
      if (!filter || entry.classList.contains(filter)) {
        entry.style.display = "block"
      } else {
        entry.style.display = "none"
      }
    })
  }

  clearLogs() {
    const container = document.getElementById("logs-container")
    container.innerHTML = ""
    this.addLog("Logs cleared", "system")
  }

  formatNumber(num) {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(1) + "B"
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(1) + "M"
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(1) + "K"
    }
    return num.toString()
  }
}

// Initialize dashboard
const dashboard = new YieldSwarmDashboard()
