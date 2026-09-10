declare module 'electron' {
  export interface IpcMainInvokeEvent {}

  export const ipcMain: {
    handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => any): void;
  };

  export const ipcRenderer: {
    invoke(channel: string, ...args: any[]): Promise<any>;
  };

  export const contextBridge: {
    exposeInMainWorld(apiKey: string, api: any): void;
  };

  export class BrowserWindow {
    constructor(options?: any);
    static getAllWindows(): BrowserWindow[];
    webContents: {
      setWindowOpenHandler(handler: (...args: any[]) => { action: 'allow' | 'deny' }): void;
      on(channel: string, listener: (event: { preventDefault(): void }, ...args: any[]) => void): void;
    };
    loadURL(url: string): void;
    loadFile(path: string): void;
    on(channel: string, listener: (...args: any[]) => void): void;
  }

  export const app: {
    getPath(name: string): string;
    whenReady(): Promise<void>;
    on(channel: string, listener: (...args: any[]) => void): void;
    quit(): void;
  };
}
