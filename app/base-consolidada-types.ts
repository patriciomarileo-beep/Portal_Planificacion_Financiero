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
  string?,
  string?,
];

export type StoreClassification =
  | "SSS"
  | "NS"
  | "REMODELACIÓN"
  | "SIN CLASIFICAR";
