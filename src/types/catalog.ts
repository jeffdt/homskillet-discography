export interface DirectoryItem {
  name: string;
  type: 'directory' | 'file';
  href: string;
  size: number;
  mtime: string;
  numChildren?: number;
  isBackLink?: boolean;
}

export interface DirectoryListing extends Array<DirectoryItem> {}

export interface PlayContext extends Array<string> {}

export interface Directories {
  [path: string]: DirectoryListing;
}
