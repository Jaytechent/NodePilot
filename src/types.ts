export type UserRole = 'Admin' | 'Operator' | 'Customer' | 'Support';

export interface IUser {
  id: string;
  email?: string;
  passwordHash?: string;
  walletAddress?: string;
  role: UserRole;
  balance?: number; // Credit balance in USD
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IServer {
  id: string;
  projectId: string;
  name: string;
  ipAddress?: string;
  sshPort: number;
  sshUser: string;
  sshPrivateKey?: string; // Encrypted or plain text
  provider: 'Hetzner' | 'DigitalOcean' | 'Contabo' | 'AWS EC2';
  region: string;
  size: string;
  status: 'provisioning' | 'active' | 'failed' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeployment {
  id: string;
  serverId: string;
  projectId: string;
  blockchainId: string; // e.g., 'ethereum', 'solana'
  nodeType: 'validator' | 'full' | 'rpc';
  status: 'pending' | 'provisioning' | 'active' | 'failed' | 'updating' | 'restarting' | 'deleting';
  config: Record<string, any>;
  
  // Cost tracking and billing abstraction
  vpsCost: number;
  storageCost: number;
  bandwidthCost: number;
  profitMargin: number; // profit margin amount
  totalCost: number; // sum of vps, storage, bandwidth costs
  totalPrice: number; // totalCost + profitMargin
  billingStatus: 'unpaid' | 'paid' | 'overdue' | 'refunded';
  infrastructureStatus: 'unprovisioned' | 'provisioning' | 'active' | 'failed' | 'destroyed';

  createdAt: Date;
  updatedAt: Date;
}

export interface IDeploymentJob {
  id: string;
  deploymentId: string;
  action: 'deploy' | 'update' | 'restart' | 'delete' | 'backup' | 'restore';
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  logs: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMetric {
  id: string;
  deploymentId: string;
  cpu: number; // %
  ram: number; // %
  disk: number; // %
  bandwidth: number; // KB/s
  peerCount: number;
  validatorStatus: 'active' | 'inactive';
  rpcStatus: 'online' | 'offline';
  rewards: number; // accumulative token rewards
  blockHeight: number;
  missedBlocks: number;
  timestamp: Date;
}

// Interface for Blockchain Adapters dynamically loaded
export interface IBlockchainAdapter {
  id: string;
  name: string;
  version: string;
  description: string;
  supportedTypes: ('validator' | 'full' | 'rpc')[];
  defaultPort: number;
  minSpecs: {
    cpu: number; // cores
    ram: number; // GB
    disk: number; // GB
  };
  files: {
    deploy: string;
    update: string;
    health: string;
    backup: string;
    restore: string;
  };
  validateConfig: (config: Record<string, any>) => { isValid: boolean; errors?: string[] };
}

// Interface for VPS Providers
export interface IVpsProvider {
  createServer(name: string, region: string, size: string): Promise<{ ipAddress: string; externalId: string }>;
  deleteServer(externalId: string): Promise<boolean>;
  rebootServer(externalId: string): Promise<boolean>;
  resizeServer(externalId: string, newSize: string): Promise<boolean>;
}
