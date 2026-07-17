import { BaseVpsProvider } from './base.provider';
import { HetznerProvider } from './hetzner';
import { DigitalOceanProvider } from './digitalocean';
import { ContaboProvider } from './contabo';
import { AwsProvider } from './aws';

export class ProviderFactory {
  private static providers: Record<string, BaseVpsProvider> = {
    Hetzner: new HetznerProvider(),
    DigitalOcean: new DigitalOceanProvider(),
    Contabo: new ContaboProvider(),
    'AWS EC2': new AwsProvider(),
  };

  public static getProvider(name: string): BaseVpsProvider {
    const provider = this.providers[name];
    if (!provider) {
      throw new Error(`Unsupported VPS provider: ${name}`);
    }
    return provider;
  }

  public static listProviders(): string[] {
    return Object.keys(this.providers);
  }
}
