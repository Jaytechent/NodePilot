import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Terminal,
  Activity,
  Layers,
  Cpu,
  Database,
  Cloud,
  Play,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Shield,
  Key,
  FolderOpen,
  Server as ServerIcon,
  HelpCircle,
  Check,
  Send,
  Zap,
  DollarSign,
  Bell,
  Code
} from 'lucide-react';

// Theme: High-contrast Dark Slate (Enterprise Technical Developer Theme)
export default function App() {
  const [activeTab, setActiveTab] = useState<'playground' | 'terminal' | 'monitoring' | 'plugins' | 'billing'>('playground');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [dbState, setDbState] = useState<{ connected: boolean; type: string }>({ connected: false, type: 'In-Memory State' });
  const [authToken, setAuthToken] = useState<string>('');
  const [refreshToken, setRefreshToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // States for Billing & Deposits
  const [billingData, setBillingData] = useState<any>(null);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [depositAmount, setDepositAmount] = useState('100');
  const [depositTxHash, setDepositTxHash] = useState('');

  // States for Playground
  const [regEmail, setRegEmail] = useState('developer@nodepilot.ai');
  const [regPass, setRegPass] = useState('securePass123');
  const [regRole, setRegRole] = useState('Admin');
  const [walletAddress, setWalletAddress] = useState('0x71C7656EC7ab88b098defB751B7401B5f6d1476B');
  const [siweNonce, setSiweNonce] = useState('');
  const [siweSignature, setSiweSignature] = useState('0x62957b88ec7abfd82173ea6198be192809...mock_sig');
  
  const [projects, setProjects] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [blockchainAdapters, setBlockchainAdapters] = useState<any[]>([]);
  
  // Create Form States
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedServerId, setSelectedServerId] = useState('');
  const [selectedBlockchainId, setSelectedBlockchainId] = useState('ethereum');
  const [selectedNodeType, setSelectedNodeType] = useState<'validator' | 'full' | 'rpc'>('full');
  const [nodeConfig, setNodeConfig] = useState('{\n  "syncMode": "snap",\n  "ports": {\n    "rpc": 8545\n  }\n}');

  const [newPrjName, setNewPrjName] = useState('Ethereum Mainnet Infrastructure');
  const [newPrjDesc, setNewPrjDesc] = useState('Core high-availability validators for Ethereum staking nodes.');

  const [newSrvName, setNewSrvName] = useState('geth-vps-primary-01');
  const [newSrvProvider, setNewSrvProvider] = useState<'Hetzner' | 'DigitalOcean' | 'Contabo' | 'AWS EC2'>('Hetzner');
  const [newSrvRegion, setNewSrvRegion] = useState('fsn1-dc14');
  const [newSrvSize, setNewSrvSize] = useState('cx31');

  // Terminal Logs
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [activeJobId, setActiveJobId] = useState<string>('');
  const [activeDeployId, setActiveDeployId] = useState<string>('');
  
  // Real-time Metrics
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);

  // Response console
  const [apiResponse, setApiResponse] = useState<any>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Initialize Connection and Sockets
  useEffect(() => {
    // 1. Fetch system metadata (DB state and dynamic adapters)
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(() => setDbState({ connected: true, type: 'MongoDB (Mongoose)' }))
      .catch(() => setDbState({ connected: false, type: 'In-Memory Sandbox' }));

    // 2. Initialize Socket.io connection on port 3000
    const socketInstance = io();
    socketInstance.on('connect', () => {
      setSocketConnected(true);
      setSocket(socketInstance);
      logToTerminal(`[Socket.io] WebSocket connected. Client session ID: ${socketInstance.id}`);
    });

    socketInstance.on('disconnect', () => {
      setSocketConnected(false);
      logToTerminal('[Socket.io] WebSocket disconnected.');
    });

    socketInstance.on('job:progress', (data: any) => {
      setActiveJobId(data.jobId);
      setJobProgress(data.progress);
      if (data.logLine) {
        logToTerminal(`[JOB PROGRESS ${data.progress}%]: ${data.logLine}`);
      }
    });

    socketInstance.on('metrics:updated', (data: any) => {
      setLiveMetrics(data.metrics);
      setMetricsHistory(prev => {
        const next = [...prev, data.metrics];
        if (next.length > 20) next.shift();
        return next;
      });
    });

    socketInstance.on('alert:new', (data: any) => {
      setLiveAlerts(prev => [data.alert, ...prev].slice(0, 5));
      logToTerminal(`⚠️ [SYSTEM ALERT - ${data.alert.severity.toUpperCase()}]: ${data.alert.message}`);
    });

    // Seed initial terminal help line
    setTerminalLogs([
      `NodePilot AI Backend Terminal Console v1.0.0`,
      `Initializing telemetry feed listeners...`,
      `Dynamic adapters mapped. Ready to deploy nodes.`
    ]);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  const logToTerminal = (message: string) => {
    setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Helper HTTP request wrapper
  const requestAPI = async (path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: any) => {
    setApiResponse({ loading: true, path, method });
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const res = await fetch(path, {
        method,
        headers,
        ...(body && { body: JSON.stringify(body) }),
      });
      
      const json = await res.json();
      setApiResponse(json);
      
      if (json.success && json.data) {
        // Handle login updates automatically
        if (path.includes('/auth/register') || path.includes('/auth/login') || path.includes('/auth/wallet/verify')) {
          setAuthToken(json.data.accessToken);
          setRefreshToken(json.data.refreshToken);
          setCurrentUser(json.data.user);
          logToTerminal(`Authenticated as ${json.data.user.role} (${json.data.user.email || json.data.user.walletAddress})`);
          
          // Auto load projects
          fetchData(json.data.accessToken);
        }
      }
      return json;
    } catch (err: any) {
      setApiResponse({ success: false, error: err.message });
      logToTerminal(`[API Error] ${method} ${path} failed: ${err.message}`);
    }
  };

  const fetchData = async (token = authToken) => {
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // Load projects
    const pRes = await fetch('/api/projects', { headers }).then(r => r.json());
    if (pRes.success) {
      setProjects(pRes.data);
      if (pRes.data.length > 0) setSelectedProjectId(pRes.data[0].id);
    }

    // Load adapters
    const aRes = await fetch('/api/adapters', { headers }).then(r => r.json());
    if (aRes.success) setBlockchainAdapters(aRes.data);

    // Load user billing details
    const bRes = await fetch('/api/billing/balance', { headers }).then(r => r.json());
    if (bRes.success) {
      setBillingData(bRes.data);
    }

    // Load invoices
    const iRes = await fetch('/api/billing/invoices', { headers }).then(r => r.json());
    if (iRes.success) {
      setInvoicesList(iRes.data);
    }

    // Load current user details to keep balance in-sync
    const meRes = await fetch('/api/auth/me', { headers }).then(r => r.json());
    if (meRes.success && meRes.data?.user) {
      setCurrentUser(meRes.data.user);
    }
  };

  const handlePayDeployment = async (deployId: string) => {
    logToTerminal(`Initiating payment authorization for Node: ${deployId}...`);
    const res = await requestAPI(`/api/deployments/${deployId}/pay`, 'POST');
    if (res?.success) {
      logToTerminal(`🎉 Payment processed successfully for Node: ${deployId}. Dynamic provisioning initialized!`);
      const jobId = res.data.job.id;
      setActiveDeployId(deployId);
      setActiveJobId(jobId);
      setJobProgress(5);
      setActiveTab('terminal');
      
      // Join WebSocket channel for real-time tracking
      if (socket) {
        socket.emit('join:deployment', deployId);
      }

      await fetchData();
      if (selectedProjectId) {
        triggerFetchProjectDeployments(selectedProjectId);
      }
    } else {
      logToTerminal(`❌ [Payment Failed] ${res?.error || 'Unable to authorize credit payment.'}`);
    }
  };

  const handleDepositFunds = async () => {
    if (!depositTxHash) {
      logToTerminal('Error: Please specify or generate an on-chain Transaction Hash (TxHash).');
      return;
    }
    logToTerminal(`Submitting TxHash: ${depositTxHash} for validation...`);
    const res = await requestAPI('/api/billing/deposit', 'POST', {
      txHash: depositTxHash,
      amount: parseFloat(depositAmount)
    });
    if (res?.success) {
      logToTerminal(`🎉 Deposit verified successfully on-chain! Credited $${res.data.depositedAmount} to your account balance.`);
      setDepositTxHash('');
      await fetchData();
    } else {
      logToTerminal(`❌ [Deposit Failed] ${res?.error || 'Unable to verify on-chain transaction.'}`);
    }
  };

  const generateMockTxHash = () => {
    const hex = '0123456789abcdef';
    let mockHash = '0x';
    for (let i = 0; i < 64; i++) {
      mockHash += hex[Math.floor(Math.random() * 16)];
    }
    setDepositTxHash(mockHash);
    logToTerminal(`Generated mock treasury deposit TxHash: ${mockHash}`);
  };

  const triggerFetchProjectServers = async (projId: string) => {
    const headers = { 'Authorization': `Bearer ${authToken}` };
    const res = await fetch(`/api/servers?projectId=${projId}`, { headers }).then(r => r.json());
    if (res.success) {
      setServers(res.data);
      if (res.data.length > 0) setSelectedServerId(res.data[0].id);
    }
  };

  const triggerFetchProjectDeployments = async (projId: string) => {
    const headers = { 'Authorization': `Bearer ${authToken}` };
    const res = await fetch(`/api/deployments?projectId=${projId}`, { headers }).then(r => r.json());
    if (res.success) {
      setDeployments(res.data);
    }
  };

  // SIWE Flow: Step 1 Get Nonce
  const handleSiweGetNonce = async () => {
    const res = await requestAPI('/api/auth/wallet/nonce', 'POST', { address: walletAddress });
    if (res?.success) {
      setSiweNonce(res.data.nonce);
      logToTerminal(`[SIWE] Cryptographic Nonce issued: ${res.data.nonce}`);
    }
  };

  // SIWE Flow: Step 2 Verify Signature
  const handleSiweVerify = async () => {
    const message = `Sign in to NodePilot AI with nonce: ${siweNonce}`;
    await requestAPI('/api/auth/wallet/verify', 'POST', {
      address: walletAddress,
      signature: siweSignature,
      message,
    });
  };

  // Create Project
  const handleCreateProject = async () => {
    const res = await requestAPI('/api/projects', 'POST', { name: newPrjName, description: newPrjDesc });
    if (res?.success) {
      logToTerminal(`Project "${newPrjName}" created successfully.`);
      fetchData();
    }
  };

  // Create VPS Server
  const handleCreateServer = async () => {
    const res = await requestAPI('/api/servers', 'POST', {
      projectId: selectedProjectId,
      name: newSrvName,
      provider: newSrvProvider,
      region: newSrvRegion,
      size: newSrvSize,
    });
    if (res?.success) {
      logToTerminal(`Server registration scheduled. Physical host ID: ${res.data.id}`);
      triggerFetchProjectServers(selectedProjectId);
    }
  };

  // Trigger Node Deployment
  const handleDeployNode = async () => {
    let parsedConf = {};
    try {
      parsedConf = JSON.parse(nodeConfig);
    } catch {
      logToTerminal('Error: nodeType config must be standard JSON formatting.');
      return;
    }

    const res = await requestAPI('/api/deployments', 'POST', {
      projectId: selectedProjectId,
      serverId: selectedServerId,
      blockchainId: selectedBlockchainId,
      nodeType: selectedNodeType,
      config: parsedConf,
    });

    if (res?.success) {
      const deployId = res.data.deployment.id;
      const jobId = res.data.job.id;
      setActiveDeployId(deployId);
      setActiveJobId(jobId);
      setJobProgress(5);
      
      logToTerminal(`Deployment dispatched successfully. Node ID: ${deployId}. Job ID: ${jobId}`);
      
      // Join WebSocket channels
      if (socket) {
        socket.emit('join:deployment', deployId);
        socket.emit('join:project', selectedProjectId);
        logToTerminal(`[Socket.io] Joined real-time monitoring channels for Node: ${deployId}`);
      }

      setActiveTab('terminal');
      triggerFetchProjectDeployments(selectedProjectId);
    }
  };

  const triggerNodeAction = async (deployId: string, actionName: 'update' | 'restart' | 'backup' | 'restore' | 'delete') => {
    const res = await requestAPI(`/api/deployments/${deployId}/action`, 'POST', {
      action: actionName,
      config: actionName === 'update' ? { image: 'ethereum/client-go:v1.14.2-stable' } : {}
    });

    if (res?.success) {
      const jobId = res.data.job.id;
      setActiveDeployId(deployId);
      setActiveJobId(jobId);
      setJobProgress(5);
      logToTerminal(`Dispatched action: ${actionName.toUpperCase()} on Node: ${deployId}`);
      setActiveTab('terminal');
    }
  };

  // Seed standard dev sandbox template instantly
  const handleQuickSeedDevEnv = async () => {
    logToTerminal('⏳ Seeding quick-start sandbox developer configurations...');
    
    // Register
    const regRes = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@nodepilot.ai', password: 'password123', role: 'Operator' })
    }).then(r => r.json());

    if (!regRes.success) {
      // If already exists, login
      const logRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'operator@nodepilot.ai', password: 'password123' })
      }).then(r => r.json());
      
      if (logRes.success) {
        setAuthToken(logRes.data.accessToken);
        setRefreshToken(logRes.data.refreshToken);
        setCurrentUser(logRes.data.user);
        await fetchData(logRes.data.accessToken);
        logToTerminal('🔑 Logged in successfully as operator@nodepilot.ai.');
      }
    } else {
      setAuthToken(regRes.data.accessToken);
      setRefreshToken(regRes.data.refreshToken);
      setCurrentUser(regRes.data.user);
      await fetchData(regRes.data.accessToken);
      logToTerminal('🔑 Registered and logged in as operator@nodepilot.ai.');
    }

    const t = authToken || regRes.data?.accessToken;
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` };

    // Create a seed project
    const prjRes = await fetch('/api/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Ethereum Validator Farm', description: 'Enterprise Proof-of-Stake cluster.' })
    }).then(r => r.json());

    if (prjRes.success) {
      const prjId = prjRes.data.id;
      setSelectedProjectId(prjId);
      
      // Create server
      const srvRes = await fetch('/api/servers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId: prjId,
          name: 'geth-vps-primary-01',
          provider: 'Hetzner',
          region: 'fsn1-dc14',
          size: 'cx31',
          customIp: '95.217.108.44' // auto active
        })
      }).then(r => r.json());

      if (srvRes.success) {
        await triggerFetchProjectServers(prjId);
        await triggerFetchProjectDeployments(prjId);
        logToTerminal('✅ Seeded Project (Ethereum Validator Farm) and Server (95.217.108.44) successfully.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Upper Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-600 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-cyan-500/10">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-300 bg-clip-text text-transparent">NodePilot AI</h1>
            <p className="text-xs text-slate-500 font-mono">Backend Architecture Console</p>
          </div>
        </div>

        {/* Live Network & Database Badges */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
            <Database className="h-3 w-3 text-cyan-400" />
            <span className="text-slate-400">Database:</span>
            <span className="text-cyan-400 font-semibold">{dbState.type}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
            <Clock className="h-3 w-3 text-emerald-400" />
            <span className="text-slate-400">Port Ingress:</span>
            <span className="text-emerald-400 font-semibold">3000 (Active)</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
            <span className={`h-2 w-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-400">Sockets:</span>
            <span className={socketConnected ? 'text-emerald-400' : 'text-rose-400'}>
              {socketConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar Status and Quick Actions */}
        <aside className="lg:col-span-1 flex flex-col gap-5">
          
          {/* Developer Credentials Card */}
          <section className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Auth Status</h2>
            </div>
            
            {currentUser ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Identity:</span>
                    <span className="text-slate-200 truncate max-w-[140px]" title={currentUser.email || currentUser.walletAddress}>
                      {currentUser.walletAddress 
                        ? `${currentUser.walletAddress.substring(0, 6)}...${currentUser.walletAddress.substring(currentUser.walletAddress.length - 4)}` 
                        : currentUser.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">System Role:</span>
                    <span className="text-cyan-400 font-bold">{currentUser.role}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900/60 pt-1.5 mt-1.5">
                    <span className="text-slate-500">Credit Balance:</span>
                    <span className="text-emerald-400 font-bold">${(currentUser.balance ?? 500.0).toFixed(2)} USD</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAuthToken('');
                    setCurrentUser(null);
                    setProjects([]);
                    setServers([]);
                    setDeployments([]);
                    setBillingData(null);
                    setInvoicesList([]);
                    logToTerminal('Logged out. Token flushed.');
                  }}
                  className="w-full py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition text-xs font-semibold rounded-lg"
                >
                  Flush Credentials
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">No active JWT credentials detected. Use the registration form or seed demo environment below.</p>
                <button
                  onClick={handleQuickSeedDevEnv}
                  className="w-full py-2 bg-gradient-to-r from-cyan-600/90 to-indigo-600/90 hover:from-cyan-600 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/5 flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                >
                  <Zap className="h-3.5 w-3.5 animate-bounce" />
                  Seed Dev Environment
                </button>
              </div>
            )}
          </section>

          {/* Real-time System Alerts Logs */}
          <section className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 flex-1 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-rose-400" />
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Real-time Alerts</h2>
              </div>
              <span className="font-mono text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">Active Daemon</span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {liveAlerts.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-900 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-slate-800 mx-auto mb-2" />
                  <p className="text-[11px] text-slate-500">System operating normally.</p>
                </div>
              ) : (
                liveAlerts.map((alt) => (
                  <div key={alt.id} className="p-2.5 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-rose-400 font-bold uppercase">{alt.severity}</span>
                      <span className="text-slate-500 text-[9px]">{alt.metricType}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-xs">{alt.message}</p>
                  </div>
                ))
              )}
            </div>
          </section>

        </aside>

        {/* Center Panel (Playground, Terminal Logs, Live Telemetry) */}
        <section className="lg:col-span-3 flex flex-col gap-5">
          
          {/* Navigation Subtabs */}
          <nav className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-900">
            <button
              onClick={() => setActiveTab('playground')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs md:text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'playground'
                  ? 'bg-slate-950 text-cyan-400 shadow-md border border-slate-800/80'
                  : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Code className="h-4 w-4" />
              API Playground
            </button>
            
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs md:text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'terminal'
                  ? 'bg-slate-950 text-cyan-400 shadow-md border border-slate-800/80'
                  : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Terminal className="h-4 w-4" />
              SSH Job Terminal
              {jobProgress > 0 && jobProgress < 100 && (
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('monitoring')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs md:text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'monitoring'
                  ? 'bg-slate-950 text-cyan-400 shadow-md border border-slate-800/80'
                  : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Activity className="h-4 w-4" />
              Live Telemetry
            </button>
            
            <button
              onClick={() => setActiveTab('plugins')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs md:text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'plugins'
                  ? 'bg-slate-950 text-cyan-400 shadow-md border border-slate-800/80'
                  : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Layers className="h-4 w-4" />
              Chain Plugins
            </button>

            <button
              onClick={() => {
                setActiveTab('billing');
                fetchData();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs md:text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'billing'
                  ? 'bg-slate-950 text-cyan-400 shadow-md border border-slate-800/80'
                  : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              Billing & Wallet
            </button>
          </nav>

          {/* TAB 1: API PLAYGROUND */}
          {activeTab === 'playground' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* REST Clients */}
              <div className="space-y-6 max-h-[580px] overflow-y-auto pr-1">
                
                {/* Auth REST Block */}
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                    <Key className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">1. Normal / SIWE Wallet Login</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500">Register Operator</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="px-3 py-1.5 bg-slate-950 text-xs border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={() => requestAPI('/api/auth/register', 'POST', { email: regEmail, password: regPass, role: regRole })}
                          className="py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-300 font-semibold text-xs rounded-lg transition"
                        >
                          Register
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900/60">
                      <label className="text-[10px] uppercase font-mono text-slate-500">SIWE EVM Address</label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-950 text-xs font-mono border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={handleSiweGetNonce}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 font-semibold text-xs rounded-lg transition"
                        >
                          Get Nonce
                        </button>
                      </div>
                    </div>

                    {siweNonce && (
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-indigo-900/20 space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>SIGNABLE MESSAGE:</span>
                          <span className="text-indigo-400">Nonce: {siweNonce}</span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-900">
                          Sign in to NodePilot with nonce: {siweNonce}
                        </p>
                        <button
                          onClick={handleSiweVerify}
                          className="w-full py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-semibold text-xs rounded-lg shadow-md transition hover:opacity-90"
                        >
                          Verify & Login Wallet
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Projects & Servers Block */}
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-cyan-400" />
                      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">2. Project Workspaces</h3>
                    </div>
                    <button onClick={() => fetchData()} className="text-cyan-400 hover:text-cyan-300 transition text-xs flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Refresh
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="Project Name"
                        value={newPrjName}
                        onChange={(e) => setNewPrjName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 text-xs border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                      />
                      <button
                        onClick={handleCreateProject}
                        className="w-full py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-xs rounded-lg transition"
                      >
                        Create Project Workspace
                      </button>
                    </div>

                    {projects.length > 0 && (
                      <div className="pt-2 border-t border-slate-900/60 space-y-3">
                        <div>
                          <label className="text-[10px] uppercase font-mono text-slate-500">Active Workspace</label>
                          <select
                            value={selectedProjectId}
                            onChange={(e) => {
                              setSelectedProjectId(e.target.value);
                              triggerFetchProjectServers(e.target.value);
                              triggerFetchProjectDeployments(e.target.value);
                            }}
                            className="w-full mt-1 px-3 py-1.5 bg-slate-950 text-xs border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                          >
                            <option value="">-- Choose Workspace --</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                            ))}
                          </select>
                        </div>

                        {selectedProjectId && (
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 space-y-2">
                            <span className="text-[10px] font-mono text-slate-500 uppercase">Deploy Server under Project</span>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Server Name"
                                value={newSrvName}
                                onChange={(e) => setNewSrvName(e.target.value)}
                                className="px-3 py-1.5 bg-slate-950 text-xs border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                              />
                              <select
                                value={newSrvProvider}
                                onChange={(e: any) => setNewSrvProvider(e.target.value)}
                                className="px-3 py-1.5 bg-slate-950 text-xs border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                              >
                                <option value="Hetzner">Hetzner</option>
                                <option value="DigitalOcean">DigitalOcean</option>
                                <option value="Contabo">Contabo</option>
                                <option value="AWS EC2">AWS EC2</option>
                              </select>
                            </div>
                            <button
                              onClick={handleCreateServer}
                              className="w-full py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-300 font-semibold text-xs rounded-lg transition"
                            >
                              Provision Virtual Server VM
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Node Deployments Block */}
                {selectedProjectId && servers.length > 0 && (
                  <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                      <Cloud className="h-4 w-4 text-cyan-400" />
                      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">3. Deploy Blockchain Node</h3>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase font-mono text-slate-500">Target Host VM</label>
                        <select
                          value={selectedServerId}
                          onChange={(e) => setSelectedServerId(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-slate-950 text-xs border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                        >
                          {servers.map((s) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.ipAddress || 'pending provisioning'})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] uppercase font-mono text-slate-500">Protocol</label>
                          <select
                            value={selectedBlockchainId}
                            onChange={(e) => setSelectedBlockchainId(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 bg-slate-950 text-xs border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                          >
                            <option value="ethereum">Ethereum (Geth/Prysm)</option>
                            <option value="solana">Solana (Official)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-mono text-slate-500">Node Type</label>
                          <select
                            value={selectedNodeType}
                            onChange={(e: any) => setSelectedNodeType(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 bg-slate-950 text-xs border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                          >
                            <option value="full">Full RPC Node</option>
                            <option value="validator">Consensus Validator</option>
                            <option value="rpc">Dedicated RPC Node</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-mono text-slate-500">Node Configurations (JSON)</label>
                        <textarea
                          rows={4}
                          value={nodeConfig}
                          onChange={(e) => setNodeConfig(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-slate-950 text-xs font-mono border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={handleDeployNode}
                        className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Trigger SSH Ansible Deploy Job
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* REST Response Inspector Console */}
              <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 flex flex-col justify-between h-[580px]">
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">REST Response Inspector</h3>
                    </div>
                    {apiResponse && (
                      <span className="text-[10px] font-mono bg-slate-950 text-emerald-400 px-2 py-0.5 rounded border border-slate-800">
                        {apiResponse.method || 'GET'} {apiResponse.path || '/'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-900/60 overflow-y-auto max-h-[460px] font-mono text-xs">
                    {apiResponse ? (
                      apiResponse.loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
                          <span>Dispatching JSON RPC Call...</span>
                        </div>
                      ) : (
                        <pre className="text-emerald-400 whitespace-pre-wrap">{JSON.stringify(apiResponse, null, 2)}</pre>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2 text-center py-20">
                        <Code className="h-8 w-8 opacity-25" />
                        <span>Console Idle.<br />Trigger any REST client on the left.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-900 text-[11px] font-mono text-slate-500 flex justify-between">
                  <span>Standard Response Code Mapping</span>
                  <span className="text-slate-400">201 Created / 200 OK</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SSH JOB TERMINAL */}
          {activeTab === 'terminal' && (
            <div className="space-y-5">
              
              {/* Progress bar container */}
              {activeJobId && (
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 space-y-3 shadow-lg">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-cyan-400" />
                      <span>Active Background Job: <strong className="text-cyan-400">{activeJobId}</strong></span>
                    </div>
                    <span className="text-cyan-400 font-bold">{jobProgress}%</span>
                  </div>
                  
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${jobProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Active Deployment action trigger row */}
              {deployments.length > 0 && (
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 shadow-xl space-y-3">
                  <span className="text-xs font-mono text-slate-500 uppercase tracking-wider block">Modify Active Node Deployments</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {deployments.map((d) => (
                      <div key={d.id} className="p-3 bg-slate-950 rounded-xl border border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="font-mono text-xs space-y-1">
                          <span className="text-cyan-400 font-bold block">{d.blockchainId.toUpperCase()} ({d.nodeType.toUpperCase()})</span>
                          <span className="text-slate-500 text-[10px] block">ID: {d.id} | Status: <strong className="text-slate-300">{d.status}</strong></span>
                          <div className="flex items-center gap-1.5 mt-1">
                            {d.billingStatus === 'paid' ? (
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold">● PAID & ACTIVE</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[9px] font-bold animate-pulse">⚠️ OVERDUE PAYMENT (${d.totalPrice || 150} USD)</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5 w-full sm:w-auto justify-end">
                          {d.billingStatus === 'unpaid' ? (
                            <button
                              onClick={() => handlePayDeployment(d.id)}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-[11px] text-white font-bold rounded shadow-lg shadow-emerald-500/10 transition active:scale-95"
                            >
                              Pay Node (${d.totalPrice || 150})
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => triggerNodeAction(d.id, 'restart')}
                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-semibold rounded transition"
                              >
                                Restart
                              </button>
                              <button
                                onClick={() => triggerNodeAction(d.id, 'backup')}
                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-semibold rounded transition"
                              >
                                Backup
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => triggerNodeAction(d.id, 'delete')}
                            className="px-2 py-1 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-[10px] text-rose-400 font-semibold rounded transition"
                          >
                            Wipe
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Terminal Logs View */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 flex flex-col h-[400px]">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    </span>
                    <span className="text-xs font-mono text-slate-500">root@nodepilot: /var/log/jobs</span>
                  </div>
                  <button
                    onClick={() => setTerminalLogs([])}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition"
                  >
                    Clear Screen
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 pr-2 max-h-[310px]">
                  {terminalLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed whitespace-pre-wrap">{log}</div>
                  ))}
                  <div ref={terminalBottomRef} />
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: LIVE TELEMETRY */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              
              {/* Telemetry overview banner */}
              {liveMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 space-y-2 text-center relative overflow-hidden">
                    <Cpu className="h-5 w-5 text-cyan-400 absolute right-3 top-3 opacity-25" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">CPU Utilization</span>
                    <strong className="text-2xl font-bold text-slate-200">{liveMetrics.cpu}%</strong>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${liveMetrics.cpu}%` }} />
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 space-y-2 text-center relative overflow-hidden">
                    <Activity className="h-5 w-5 text-indigo-400 absolute right-3 top-3 opacity-25" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Memory Buffer</span>
                    <strong className="text-2xl font-bold text-slate-200">{liveMetrics.ram}%</strong>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${liveMetrics.ram}%` }} />
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 space-y-2 text-center relative overflow-hidden">
                    <CheckCircle className="h-5 w-5 text-emerald-400 absolute right-3 top-3 opacity-25" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Peer Connection</span>
                    <strong className="text-2xl font-bold text-slate-200">{liveMetrics.peerCount} peers</strong>
                    <span className="text-[9px] font-mono text-emerald-400 block mt-2">● Network Online</span>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 space-y-2 text-center relative overflow-hidden">
                    <DollarSign className="h-5 w-5 text-amber-400 absolute right-3 top-3 opacity-25" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Accumulated Staking Rewards</span>
                    <strong className="text-2xl font-bold text-slate-200">+{liveMetrics.rewards.toFixed(5)} tokens</strong>
                    <span className="text-[9px] font-mono text-slate-500 block mt-2">Real-time reward yield</span>
                  </div>

                </div>
              ) : (
                <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-12 text-center space-y-3">
                  <Activity className="h-10 w-10 text-slate-700 mx-auto animate-pulse" />
                  <p className="text-sm text-slate-400">Telemetry feed idle. Deploy a node first and wait 15 seconds to receive the background daemon metric stream.</p>
                  <button
                    onClick={() => {
                      // Fake trigger a metric to demonstrate immediately
                      setLiveMetrics({
                        cpu: 22,
                        ram: 64,
                        disk: 42,
                        bandwidth: 120,
                        peerCount: 26,
                        rewards: 12.35512,
                        blockHeight: 19827382,
                        missedBlocks: 0,
                      });
                    }}
                    className="py-1.5 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 rounded-lg font-semibold transition"
                  >
                    Simulate Live Stream Metrics
                  </button>
                </div>
              )}

              {/* Historical Telemetry Stream Grid */}
              {liveMetrics && (
                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
                  <span className="text-xs font-mono text-slate-500 uppercase tracking-wider block">Incremental Block Telemetry (Real-time DB query: `/api/monitoring/:id/history`)</span>
                  
                  <div className="space-y-2 font-mono text-xs text-slate-300">
                    <div className="grid grid-cols-5 p-2 bg-slate-900/60 rounded-lg text-slate-500 text-[10px] uppercase font-semibold">
                      <span>Timestamp</span>
                      <span>Block Height</span>
                      <span>CPU/RAM</span>
                      <span>Staking rewards</span>
                      <span>Consensus Status</span>
                    </div>

                    {[liveMetrics, ...metricsHistory].slice(0, 8).map((m, idx) => (
                      <div key={idx} className="grid grid-cols-5 p-2 bg-slate-950 border-b border-slate-900 hover:bg-slate-900/20 rounded transition">
                        <span className="text-slate-500">{new Date().toLocaleTimeString()}</span>
                        <span className="text-cyan-400 font-bold">#{m.blockHeight}</span>
                        <span>{m.cpu}% / {m.ram}%</span>
                        <span className="text-amber-400">+{m.rewards.toFixed(5)} tokens</span>
                        <span className={m.missedBlocks > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                          {m.missedBlocks > 0 ? `Missed ${m.missedBlocks}` : '● Proposed successfully'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: BLOCKCHAIN PLUGINS */}
          {activeTab === 'plugins' && (
            <div className="space-y-6">
              
              <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-slate-200">Dynamic Blockchain Adapter Plugins</h3>
                </div>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                  NodePilot automatically scans the <code className="bg-slate-950 p-1 rounded text-cyan-400">src/adapters/chains/</code> folder at startup to discover, load, and dynamically register blockchains. No code changes are required to support a new protocol.
                </p>
              </div>

              {/* Active Plugin Directory View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Ethereum Plugin */}
                <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="bg-cyan-500/10 text-cyan-400 px-3 py-1 border border-cyan-500/20 text-xs rounded-full absolute right-4 top-4">
                    Active Plugin
                  </div>
                  <strong className="text-slate-200 text-sm block">Ethereum Mainnet (Geth/Prysm)</strong>
                  <p className="text-xs text-slate-500">Proof-of-Stake node stack. Contains customized validators and execution image handlers.</p>
                  
                  <div className="pt-2 border-t border-slate-900/60 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
                    <div>
                      <span>DISCOVERY PATH:</span>
                      <code className="text-slate-300 block">/chains/ethereum</code>
                    </div>
                    <div>
                      <span>COMPATIBLE ROLES:</span>
                      <code className="text-slate-300 block">validator, full, rpc</code>
                    </div>
                  </div>
                </div>

                {/* Solana Plugin */}
                <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="bg-cyan-500/10 text-cyan-400 px-3 py-1 border border-cyan-500/20 text-xs rounded-full absolute right-4 top-4">
                    Active Plugin
                  </div>
                  <strong className="text-slate-200 text-sm block">Solana Validator & RPC</strong>
                  <p className="text-xs text-slate-500">Official Solana Labs cluster validator docker configurations.</p>
                  
                  <div className="pt-2 border-t border-slate-900/60 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
                    <div>
                      <span>DISCOVERY PATH:</span>
                      <code className="text-slate-300 block">/chains/solana</code>
                    </div>
                    <div>
                      <span>COMPATIBLE ROLES:</span>
                      <code className="text-slate-300 block">validator, rpc</code>
                    </div>
                  </div>
                </div>

              </div>

              {/* Plugin directory blueprint details */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-3 font-mono text-xs text-slate-400">
                <span className="text-slate-500 font-bold block uppercase mb-1">Blockchain Plugin File Blueprint Layout</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div>📁 <strong className="text-slate-300">metadata.json</strong>: Define version and min spec specs requirements.</div>
                    <div>📁 <strong className="text-slate-300">config.json</strong>: Port mapping and baseline container values.</div>
                    <div>📁 <strong className="text-slate-300">validator.ts</strong>: Dynamic configuration schema checkers.</div>
                  </div>
                  <div className="space-y-1.5">
                    <div>📁 <strong className="text-slate-300">deploy.sh</strong>: Docker download and cluster spinning instructions.</div>
                    <div>📁 <strong className="text-slate-300">health.sh</strong>: JSON-RPC port curls and status queries.</div>
                    <div>📁 <strong className="text-slate-300">backup.sh / restore.sh</strong>: DB volume compression and recovery.</div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: BILLING & WALLET PORTAL */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              
              {/* Billing Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 space-y-2 text-center relative overflow-hidden">
                  <DollarSign className="h-5 w-5 text-emerald-400 absolute right-3 top-3 opacity-25" />
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Available Balance</span>
                  <strong className="text-3xl font-bold text-emerald-400">
                    ${billingData ? billingData.balanceCredits.toFixed(2) : (currentUser?.balance ?? 500.0).toFixed(2)} USD
                  </strong>
                  <span className="text-[9px] font-mono text-slate-500 block mt-2">Ready for deployment</span>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 space-y-2 text-center relative overflow-hidden">
                  <Activity className="h-5 w-5 text-cyan-400 absolute right-3 top-3 opacity-25" />
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Daily Burn Rate</span>
                  <strong className="text-3xl font-bold text-slate-200">
                    ${billingData ? billingData.estimatedDailyBurnRate.toFixed(2) : '0.00'} USD
                  </strong>
                  <span className="text-[9px] font-mono text-slate-500 block mt-2">Based on paid nodes</span>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 space-y-2 text-center relative overflow-hidden">
                  <Clock className="h-5 w-5 text-indigo-400 absolute right-3 top-3 opacity-25" />
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Days Remaining</span>
                  <strong className="text-3xl font-bold text-slate-200">
                    {billingData ? (billingData.daysRemaining === 999 ? '∞' : `${billingData.daysRemaining} days`) : '∞'}
                  </strong>
                  <span className="text-[9px] font-mono text-slate-500 block mt-2">Until balance depletion</span>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 space-y-2 text-center relative overflow-hidden">
                  <Shield className="h-5 w-5 text-amber-400 absolute right-3 top-3 opacity-25" />
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Account Tier</span>
                  <strong className="text-xl font-bold text-amber-400 block pt-1">
                    {billingData ? billingData.tier.replace('_', ' ') : 'Operator Developer'}
                  </strong>
                  <span className="text-[9px] font-mono text-slate-500 block mt-3">High-capacity node spec</span>
                </div>

              </div>

              {/* Deposit On-Chain Portal Block */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Platform Treasury Port Info */}
                <div className="lg:col-span-7 bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-cyan-400" />
                    <h3 className="text-base font-bold text-slate-200">Platform Treasury Wallet Destination</h3>
                  </div>
                  
                  <p className="text-xs text-slate-400 leading-relaxed">
                    To maintain decentralized ledger transparency, all payments, node operating fees, and bandwidth deposits are routed directly to NodePilot's platform multisig treasury wallet. Send funds on Ethereum, Arbitrum, or Polygon mainnet:
                  </p>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-3 font-mono text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 block">MULTISIG TREASURY WALLET ADDRESS:</span>
                      <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-cyan-400 select-all font-bold block truncate max-w-[320px] sm:max-w-none">0x89205A3A3b2A6adF7d0cAdFF010e9803A03BdB20</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText('0x89205A3A3b2A6adF7d0cAdFF010e9803A03BdB20');
                            logToTerminal('Copied Platform Treasury Address to Clipboard!');
                          }}
                          className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-semibold rounded active:scale-95 transition"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 pt-1">
                      <div>
                        <span className="text-slate-300 block">Native ETH</span>
                        Gas & base staking
                      </div>
                      <div>
                        <span className="text-slate-300 block">USDT (ERC20)</span>
                        Storage stable rate
                      </div>
                      <div>
                        <span className="text-slate-300 block">USDC (ERC20)</span>
                        Compute stable rate
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 flex items-start gap-2 bg-indigo-950/10 p-3 rounded-xl border border-indigo-900/10">
                    <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p>
                      <strong>How did we handle this?</strong> NodePilot uses dynamic on-chain ledger parsing. When you send funds to our multisig and submit the receipt TxHash, the backend verifies the transaction and settles equivalent credits immediately.
                    </p>
                  </div>
                </div>

                {/* Settle Deposit Verification Form */}
                <div className="lg:col-span-5 bg-slate-900/30 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-base font-bold text-slate-200">Submit On-Chain Settlement</h3>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase block mb-1">Verify Deposit Amount ($ USD equivalent)</label>
                        <select 
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="50">Deposit $50.00 USD (Starter Grant)</option>
                          <option value="100">Deposit $100.00 USD (Developer Core)</option>
                          <option value="250">Deposit $250.00 USD (Node Operator Pro)</option>
                          <option value="500">Deposit $500.00 USD (Enterprise Cluster)</option>
                          <option value="1000">Deposit $1,000.00 USD (Validator Elite)</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] text-slate-500 uppercase">Ethereum Transaction Hash (TxHash)</label>
                          <button 
                            onClick={generateMockTxHash}
                            className="text-[9px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
                          >
                            Generate Test TxHash
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="0x..."
                          value={depositTxHash}
                          onChange={(e) => setDepositTxHash(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleDepositFunds}
                    className="w-full mt-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Verify On-Chain Settlement
                  </button>
                </div>

              </div>

              {/* Invoices Ledger Table */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Invoice History & Ledger Receipts</h3>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-900 text-slate-500 px-2 py-0.5 rounded border border-slate-800">
                    {invoicesList.length} Active Records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500 text-[10px] uppercase">
                        <th className="py-2.5 px-3">Invoice ID</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Issued At</th>
                        <th className="py-2.5 px-3">Payment Method</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoicesList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-600">
                            No billing receipts present. Populate data by deploying active nodes.
                          </td>
                        </tr>
                      ) : (
                        invoicesList.map((inv) => (
                          <tr key={inv.id} className="border-b border-slate-900/60 hover:bg-slate-900/15 text-slate-300">
                            <td className="py-3 px-3 text-cyan-400 font-bold">{inv.id}</td>
                            <td className="py-3 px-3">{inv.description}</td>
                            <td className="py-3 px-3">
                              {inv.status === 'paid' ? (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold">PAID</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[9px] font-bold animate-pulse">AWAITING</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-500">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                            <td className="py-3 px-3 text-slate-400">{inv.paymentMethod}</td>
                            <td className="py-3 px-3 text-right text-emerald-400 font-bold">${inv.amount.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </section>

      </main>

      {/* Interactive Footer */}
      <footer className="border-t border-slate-900/60 bg-slate-950 py-4 px-6 mt-10">
        <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row justify-between items-center text-xs font-mono text-slate-600 gap-4">
          <span>NodePilot AI Backend © 2026. Certified Clean Architecture.</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 transition cursor-pointer">OpenAPI /docs JSON spec</span>
            <span className="hover:text-slate-400 transition cursor-pointer">Clean Modules Pattern</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
