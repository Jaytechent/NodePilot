export function validateConfig(config: Record<string, any>): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (config.syncMode && !['snap', 'full', 'light'].includes(config.syncMode)) {
    errors.push('Invalid syncMode. Ethereum supports snap, full, or light sync.');
  }

  if (config.ports) {
    if (config.ports.rpc && (config.ports.rpc < 1024 || config.ports.rpc > 65535)) {
      errors.push('RPC port must be between 1024 and 65535.');
    }
    if (config.ports.ws && (config.ports.ws < 1024 || config.ports.ws > 65535)) {
      errors.push('WS port must be between 1024 and 65535.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
