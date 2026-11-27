import Image from "next/image";

const localLogos: Record<string, string> = {
  CENCOSUD: "/company-logos/cencosud.png",
  FALABELLA: "/company-logos/falabella.png",
  HITES: "/company-logos/hites.png",
  RIPLEY: "/company-logos/ripley.png",
  "RIPLEY CORP": "/company-logos/ripley.png",
  TRICOT: "/company-logos/tricot.png",
};

const domains: Record<string, string> = {
  "GRENDENE (BRASIL)": "grendene.com.br", DECKERS: "deckers.com", VULCABRAS: "vulcabras.com", "FAST RETAILING (UNIQLO)": "uniqlo.com", "ON HOLDING": "on.com", COLUMBIA: "columbia.com", NIKE: "nike.com", LULULEMON: "lululemon.com", "E-BAY": "ebay.com", "PARQUE ARAUCO": "parquearauco.cl", "CENCOSUD SHOPPING": "cencosudshopping.com", "NEXT PLC": "next.co.uk", ABC: "abc.cl", "ROSS STORES": "rossstores.com", "INDITEX (ZARA)": "zara.com", GENESCO: "genesco.com", GAP: "gap.com", NATURA: "natura.com.br", "AMERICAN EAGLE": "ae.com", "VESTE (RESTOQUE BRASIL)": "veste.com", "AREZZO (BRASIL)": "arezzo.com.br", PUMA: "puma.com", ABERCROMBIE: "abercrombie.com", "BATH & BODY WORKS": "bathandbodyworks.com", "WILLIAMS-SONOMA": "williams-sonoma.com", "MACY'S": "macys.com", LVMH: "lvmh.com", "ESTEE LAUDER": "esteelauder.com", URBN: "urbn.com", "WOLVERINE WW INC.": "wolverineworldwide.com", "PVH CORP.": "pvh.com", ADIDAS: "adidas.com", "THE TJX COMPANIES": "tjx.com", CROCS: "crocs.com", "H&M": "hm.com", "L'ORÉAL": "loreal.com", "KERING (PPR)": "kering.com", "CALERES (Brown Shoe Co.)": "caleres.com", AMAZON: "amazon.com", "PLAZA S.A. (MALL PLAZA)": "mallplaza.com", "IN RETAIL (PERÚ)": "inretail.pe", RICHEMONT: "richemont.com", "UNDER ARMOUR": "underarmour.com", "POLO RALPH LAUREN": "ralphlauren.com", "VF CORPORATION": "vfc.com",
};
export function companyLogoUrl(name: string) { const key=name.trim().toUpperCase(); if(key==="FORUS") return "/forus.png"; if(localLogos[key]) return localLogos[key]; const domain=domains[key]; return domain?`https://www.google.com/s2/favicons?domain=${domain}&sz=64`:""; }
export function CompanyLogo({name}:{name:string}) { const source=companyLogoUrl(name); return <span className="company-logo"><span>{name.slice(0,2)}</span>{source?<Image src={source} width={28} height={28} unoptimized alt="" loading="lazy" referrerPolicy="no-referrer"/>:null}</span>; }
