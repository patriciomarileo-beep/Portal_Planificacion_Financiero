export type BaseRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number | null,
];

export type StoreM2Row = {
  code: string;
  name: string;
  squareMeters: number;
};

export type CatM2SnapshotStore = {
  name: string;
  squareMeters: number;
  sales: number;
  salesPerM2: number;
  operatingResult: number;
  operatingResultPerM2: number;
  productMix: [number, number, number] | null;
};

export type CatM2SnapshotTotals = {
  sales: number;
  operatingResult: number;
  squareMeters: number;
};

export type StoreContractEnd =
  Record<string, string>;

export type ProfitabilityBlData = {
  baseConsolidada: BaseRow[];
  baseSnapshotAt: string;
  catM2SnapshotStores: CatM2SnapshotStore[];
  catM2SnapshotTotals: CatM2SnapshotTotals;
  storeM2: StoreM2Row[];
  storeContractEnd: StoreContractEnd;
};