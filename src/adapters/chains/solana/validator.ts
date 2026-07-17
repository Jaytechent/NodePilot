export function validateConfig(config: Record<string, any>): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (config.enableGpu !== undefined && typeof config.enableGpu !== 'boolean') {
    errors.push('enableGpu must be a boolean value.');
  }

  if (config.ports) {
    if (config.ports.rpc && (config.ports.rpc < 1024 || config.ports.rpc > 65535)) {
      errors.push('RPC port must be between 1024 and 65535.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
