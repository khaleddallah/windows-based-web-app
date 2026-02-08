export interface ServiceClientConfig {
  baseUrl: string;
  prefix: string;
}

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
}