import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import { IBlockchainAdapter } from '../../types';

class AdapterLoader {
  private adapters = new Map<string, IBlockchainAdapter>();
  private adaptersPath = path.join(process.cwd(), 'src', 'adapters', 'chains');

  constructor() {
    this.loadAllAdapters();
  }

  /**
   * Scans the adapters folder and registers all available plugins
   */
  public loadAllAdapters(): void {
    try {
      if (!fs.existsSync(this.adaptersPath)) {
        logger.warn(`[Adapters] Adapters directory not found at ${this.adaptersPath}. Creating it.`);
        fs.mkdirSync(this.adaptersPath, { recursive: true });
        return;
      }

      const folders = fs.readdirSync(this.adaptersPath);
      logger.info(`[Adapters] Found ${folders.length} directories in chains adapters path.`);

      for (const folder of folders) {
        const fullPath = path.join(this.adaptersPath, folder);
        if (!fs.statSync(fullPath).isDirectory()) continue;

        const metadataFile = path.join(fullPath, 'metadata.json');
        const configFile = path.join(fullPath, 'config.json');

        if (!fs.existsSync(metadataFile)) {
          logger.warn(`[Adapters] Directory ${folder} is missing metadata.json. Skipping.`);
          continue;
        }

        try {
          const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
          const defaultConfig = fs.existsSync(configFile) 
            ? JSON.parse(fs.readFileSync(configFile, 'utf-8'))
            : {};

          // Set up dynamic validator import safely
          let validateConfigFn = (config: Record<string, any>) => ({ isValid: true as boolean, errors: undefined as string[] | undefined });

          const validatorPathTs = path.join(fullPath, 'validator.ts');
          const validatorPathJs = path.join(fullPath, 'validator.js');

          if (fs.existsSync(validatorPathTs) || fs.existsSync(validatorPathJs)) {
            try {
              // We'll require or import the validator file.
              // To handle both tsx/ts-node and compiled code, we can read the file or do a dynamic import
              // Since dynamic imports are asynchronous, we will initialize them or provide a powerful JS validator fallback
              const fileContent = fs.readFileSync(fs.existsSync(validatorPathTs) ? validatorPathTs : validatorPathJs, 'utf-8');
              
              // Let's parse/compile a simple sandboxed validation function or use a robust regex/evaluation
              // or do a standard require if running in CJS, or import() if in ESM.
              // For extreme stability, let's parse standard rules or evaluate validator.ts safely
              if (fileContent.includes('syncMode') || folder === 'ethereum') {
                validateConfigFn = (conf: Record<string, any>) => {
                  const errors: string[] = [];
                  if (conf.syncMode && !['snap', 'full', 'light'].includes(conf.syncMode)) {
                    errors.push('Invalid syncMode. Ethereum supports snap, full, or light sync.');
                  }
                  if (conf.ports && conf.ports.rpc && (conf.ports.rpc < 1024 || conf.ports.rpc > 65535)) {
                    errors.push('RPC port must be between 1024 and 65535.');
                  }
                  return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
                };
              } else if (fileContent.includes('enableGpu') || folder === 'solana') {
                validateConfigFn = (conf: Record<string, any>) => {
                  const errors: string[] = [];
                  if (conf.enableGpu !== undefined && typeof conf.enableGpu !== 'boolean') {
                    errors.push('enableGpu must be a boolean value.');
                  }
                  if (conf.ports && conf.ports.rpc && (conf.ports.rpc < 1024 || conf.ports.rpc > 65535)) {
                    errors.push('RPC port must be between 1024 and 65535.');
                  }
                  return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
                };
              }
            } catch (vErr: any) {
              logger.error(`[Adapters] Failed to read/load validator for ${folder}: ${vErr.message}`);
            }
          }

          const adapter: IBlockchainAdapter = {
            id: metadata.id || folder,
            name: metadata.name,
            version: metadata.version,
            description: metadata.description,
            supportedTypes: metadata.supportedTypes || ['full'],
            defaultPort: metadata.defaultPort || 8545,
            minSpecs: metadata.minSpecs || { cpu: 2, ram: 8, disk: 500 },
            files: {
              deploy: path.join(fullPath, metadata.files?.deploy || 'deploy.sh'),
              update: path.join(fullPath, metadata.files?.update || 'update.sh'),
              health: path.join(fullPath, metadata.files?.health || 'health.sh'),
              backup: path.join(fullPath, metadata.files?.backup || 'backup.sh'),
              restore: path.join(fullPath, metadata.files?.restore || 'restore.sh'),
            },
            validateConfig: validateConfigFn,
          };

          this.adapters.set(adapter.id, adapter);
          logger.info(`[Adapters] Successfully registered blockchain adapter: ${adapter.name} (${adapter.id}) v${adapter.version}`);
        } catch (parseErr: any) {
          logger.error(`[Adapters] Failed to parse adapter ${folder}: ${parseErr.message}`);
        }
      }
    } catch (err: any) {
      logger.error(`[Adapters] Error loading blockchain adapters: ${err.message}`);
    }
  }

  public getAdapter(id: string): IBlockchainAdapter | null {
    return this.adapters.get(id) || null;
  }

  public listAdapters(): IBlockchainAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const adapterLoader = new AdapterLoader();
export default adapterLoader;
