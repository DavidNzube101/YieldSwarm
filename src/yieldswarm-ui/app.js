class YieldSwarmDashboard {
  constructor() {
    this.socket = null
    this.apiBaseUrl = "http://localhost:3000"
    this.opportunities = []
    this.maxOpportunities = 20
    this.portfolioData = []

    this.init()
  }

  async init() {
    this.addLog("Dashboard initializing...", "system")

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.onDOMReady())
    } else {
      this.onDOMReady()
    }
  }

  async onDOMReady() {
    this.setupEventListeners()
    await this.loadInitialData()
    this.connectWebSocket()
    this.addLog("Dashboard ready", "system")
  }

  setupEventListeners() {
    // Refresh buttons
    document.getElementById("refresh-agents").addEventListener("click", () => this.loadAgents())
    document.getElementById("refresh-swarms").addEventListener("click", () => this.loadSwarms())
    document.getElementById("clear-logs").addEventListener("click", () => this.clearLogs())
  }

  async loadInitialData() {
    try {
      await Promise.all([this.loadAgents(), this.loadSwarms()])
    } catch (error) {
      this.addLog(`Failed to load initial data: ${error.message}`, "risk-alert")
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
      this.renderAgents(agents)
      this.addLog(`Loaded ${agents.length} agents`, "info")
    } catch (error) {
      this.addLog(`Failed to load agents: ${error.message}`, "risk-alert")
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
      this.addLog(`Failed to load swarms: ${error.message}`, "risk-alert")
      this.renderSwarmsError()
    }
  }

  renderAgents(agents) {
    const tbody = document.getElementById("agents-tbody")

    if (agents.length === 0) {
      tbody.innerHTML = '<tr class="no-data-row"><td colspan="5">No agents found</td></tr>'
      return
    }

    tbody.innerHTML = agents
      .map(
        (agent) => `
            <tr>
                <td>${agent.id}</td>
                <td>${agent.name}</td>
                <td>${agent.type}</td>
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
    tbody.innerHTML = '<tr class="no-data-row"><td colspan="5">Failed to load agents</td></tr>'
  }

  renderSwarms(swarms) {
    const tbody = document.getElementById("swarms-tbody")

    if (swarms.length === 0) {
      tbody.innerHTML = '<tr class="no-data-row"><td colspan="5">No swarms found</td></tr>'
      return
    }

    tbody.innerHTML = swarms
      .map(
        (swarm) => `
            <tr>
                <td>${swarm.id}</td>
                <td>${swarm.name}</td>
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
    tbody.innerHTML = '<tr class="no-data-row"><td colspan="5">Failed to load swarms</td></tr>'
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
      this.addLog(`Failed to start agent ${id}: ${error.message}`, "risk-alert")
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
      this.addLog(`Failed to stop agent ${id}: ${error.message}`, "risk-alert")
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
      this.loadAgents() // Refresh the list
    } catch (error) {
      this.addLog(`Failed to delete agent ${id}: ${error.message}`, "risk-alert")
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
      this.addLog(`Failed to start swarm ${id}: ${error.message}`, "risk-alert")
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
      this.addLog(`Failed to stop swarm ${id}: ${error.message}`, "risk-alert")
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
      this.loadSwarms() // Refresh the list
    } catch (error) {
      this.addLog(`Failed to delete swarm ${id}: ${error.message}`, "risk-alert")
    }
  }

  connectWebSocket() {
    try {
      const io = window.io // Declare the io variable
      this.socket = io("http://localhost:3000")

      this.socket.on("connect", () => {
        this.updateConnectionStatus(true)
        this.addLog("WebSocket connected", "system")
      })

      this.socket.on("disconnect", () => {
        this.updateConnectionStatus(false)
        this.addLog("WebSocket disconnected", "risk-alert")
      })

      this.socket.on("new_opportunity", (data) => {
        this.addOpportunity(data)
      })

      this.socket.on("portfolio_updated", (data) => {
        this.updatePortfolio(data)
      })

      this.socket.on("risk_alert", (data) => {
        this.addLog(data.message || JSON.stringify(data), "risk-alert")
      })

      this.socket.on("log_message", (data) => {
        const message = typeof data === "string" ? data : data.message || JSON.stringify(data)
        this.addLog(message, "info")
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
    } catch (error) {
      this.addLog(`WebSocket connection failed: ${error.message}`, "risk-alert")
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
    this.opportunities.unshift(opportunity)

    // Keep only the latest 20 opportunities
    if (this.opportunities.length > this.maxOpportunities) {
      this.opportunities = this.opportunities.slice(0, this.maxOpportunities)
    }

    this.renderOpportunities()
    this.addLog(`New opportunity: ${opportunity.chain} - ${opportunity.dex} - ${opportunity.apy}% APY`, "info")
  }

  renderOpportunities() {
    const tbody = document.getElementById("opportunities-tbody")
    const countElement = document.querySelector(".opportunity-count")

    countElement.textContent = `${this.opportunities.length} opportunities`

    if (this.opportunities.length === 0) {
      tbody.innerHTML = '<tr class="no-data-row"><td colspan="5">Waiting for opportunities...</td></tr>'
      return
    }

    tbody.innerHTML = this.opportunities
      .map((opp) => {
        const apyClass = opp.apy >= 20 ? "apy-high" : opp.apy >= 10 ? "apy-medium" : "apy-low"
        return `
                <tr>
                    <td>${opp.chain}</td>
                    <td>${opp.dex}</td>
                    <td>${opp.pool}</td>
                    <td class="${apyClass}">${opp.apy}%</td>
                    <td>$${this.formatNumber(opp.tvl)}</td>
                </tr>
            `
      })
      .join("")
  }

  updatePortfolio(data) {
    this.portfolioData = data.allocations || []
    this.renderPortfolioChart()
    this.renderPortfolioTable()
    this.addLog("Portfolio allocation updated", "info")
  }

  renderPortfolioChart() {
    const canvas = document.getElementById("portfolio-chart")
    const ctx = canvas.getContext("2d")
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 80

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (this.portfolioData.length === 0) {
      // Draw empty circle
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.strokeStyle = "#333"
      ctx.lineWidth = 2
      ctx.stroke()

      document.getElementById("total-allocation").textContent = "0%"
      return
    }

    const colors = ["#00d4ff", "#00ff88", "#ffaa00", "#ff6b6b", "#9c27b0", "#ff9800"]
    let currentAngle = -Math.PI / 2 // Start from top
    let totalAllocation = 0

    this.portfolioData.forEach((item, index) => {
      const percentage = item.allocation
      totalAllocation += percentage
      const sliceAngle = (percentage / 100) * 2 * Math.PI

      // Draw slice
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.closePath()
      ctx.fillStyle = colors[index % colors.length]
      ctx.fill()
      ctx.strokeStyle = "#1a1a1a"
      ctx.lineWidth = 2
      ctx.stroke()

      currentAngle += sliceAngle
    })

    document.getElementById("total-allocation").textContent = `${totalAllocation.toFixed(1)}%`
  }

  renderPortfolioTable() {
    const tbody = document.getElementById("allocation-tbody")

    if (this.portfolioData.length === 0) {
      tbody.innerHTML = '<tr class="no-data-row"><td colspan="3">No allocations</td></tr>'
      return
    }

    tbody.innerHTML = this.portfolioData
      .map(
        (item) => `
            <tr>
                <td>${item.opportunityId}</td>
                <td>${item.chain}</td>
                <td>${item.allocation}%</td>
            </tr>
        `,
      )
      .join("")
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

    // Keep only the latest 100 log entries
    while (container.children.length > 100) {
      container.removeChild(container.lastChild)
    }
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
