declare module 'hellosign-embedded' {
  interface OpenOptions {
    clientId: string;
    skipDomainVerification?: boolean;
  }

  class HelloSign {
    open(url: string, options: OpenOptions): void;
    on(event: 'sign' | 'cancel' | 'error' | 'close', callback: (data?: any) => void): void;
    close(): void;
  }

  export default HelloSign;
}
