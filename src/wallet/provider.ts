/** The slice of EIP-1193 the game uses, wherever the wallet came from. */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isMiniPay?: boolean;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

/** What a wallet announces about itself under EIP-6963. */
export interface AnnouncedProvider {
  info: { uuid: string; name: string; rdns: string };
  provider: Eip1193Provider;
}
