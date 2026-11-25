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
  StoreClassification?,
];

export type StoreClassification =
  | "SSS"
  | "NS"
  | "REMODELACIÓN"
  | "SIN CLASIFICAR";
