import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'NodePilot AI - REST API Documentation',
    version: '1.0.0',
    description: 'Production-grade enterprise REST API for NodePilot AI SaaS Platform, supporting clean deployment of decentralized blockchain nodes, live metric streams, wallet SIWE login, SSH automation, and real-time Socket.io pushes.',
  },
  servers: [
    {
      url: '/api',
      description: 'Local Proxy Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          walletAddress: { type: 'string' },
          role: { type: 'string', enum: ['Admin', 'Operator', 'Customer', 'Support'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          userId: { type: 'string' },
        },
      },
      Server: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          name: { type: 'string' },
          ipAddress: { type: 'string' },
          sshPort: { type: 'integer' },
          sshUser: { type: 'string' },
          provider: { type: 'string' },
          region: { type: 'string' },
          size: { type: 'string' },
          status: { type: 'string' },
        },
      },
      Deployment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          serverId: { type: 'string' },
          projectId: { type: 'string' },
          blockchainId: { type: 'string' },
          nodeType: { type: 'string' },
          status: { type: 'string' },
          config: { type: 'object' },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new user with email and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string', enum: ['Admin', 'Operator', 'Customer', 'Support'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registration successful' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in using email and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
        },
      },
    },
    '/auth/wallet/nonce': {
      post: {
        summary: 'Generate a SIWE cryptographical nonce',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['address'],
                properties: {
                  address: { type: 'string', description: 'Hexadecimal EVM wallet address' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Nonce returned' },
        },
      },
    },
    '/auth/wallet/verify': {
      post: {
        summary: 'Verify SIWE wallet signature',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['address', 'signature', 'message'],
                properties: {
                  address: { type: 'string' },
                  signature: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Wallet verified and JWTs generated' },
        },
      },
    },
    '/projects': {
      post: {
        summary: 'Create a new project workspace',
        tags: ['Projects'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Project created' },
        },
      },
      get: {
        summary: 'List user projects',
        tags: ['Projects'],
        responses: {
          200: { description: 'List of projects' },
        },
      },
    },
    '/servers': {
      post: {
        summary: 'Register or provision a new server VM',
        tags: ['Servers'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectId', 'name', 'provider', 'region', 'size'],
                properties: {
                  projectId: { type: 'string' },
                  name: { type: 'string' },
                  provider: { type: 'string', enum: ['Hetzner', 'DigitalOcean', 'Contabo', 'AWS EC2'] },
                  region: { type: 'string' },
                  size: { type: 'string' },
                  customIp: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          211: { description: 'Server registered' },
        },
      },
      get: {
        summary: 'Query servers by project',
        tags: ['Servers'],
        parameters: [
          { name: 'projectId', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of servers' },
        },
      },
    },
    '/deployments': {
      post: {
        summary: 'Deploy a new blockchain node',
        tags: ['Deployments'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectId', 'serverId', 'blockchainId', 'nodeType'],
                properties: {
                  projectId: { type: 'string' },
                  serverId: { type: 'string' },
                  blockchainId: { type: 'string' },
                  nodeType: { type: 'string', enum: ['validator', 'full', 'rpc'] },
                  config: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Node scheduled for deployment' },
        },
      },
      get: {
        summary: 'Query nodes by project',
        tags: ['Deployments'],
        parameters: [
          { name: 'projectId', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of nodes' },
        },
      },
    },
    '/monitoring/{deploymentId}/latest': {
      get: {
        summary: 'Query current CPU, RAM, and sync status of node',
        tags: ['Monitoring'],
        parameters: [
          { name: 'deploymentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Telemetry object' },
        },
      },
    },
  },
};

export function setupSwagger(router: Router): void {
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
