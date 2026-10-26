import { readFileSync } from "node:fs";

// Missing or incomplete evidence must fail rather than count as a clean scan.
const report = JSON.parse(readFileSync("gl-sast-report.json", "utf8"));
if (report.scan?.status !== "success" || !Array.isArray(report.vulnerabilities)) throw Error("No successful SAST report is available.");
const blocking = report.vulnerabilities.filter(item => ["high", "critical"].includes(String(item.severity).toLowerCase()));
if (blocking.length) throw Error(`SAST blocks promotion: ${blocking.length} HIGH/CRITICAL finding(s).`);
console.log(`SAST passed: ${report.vulnerabilities.length} finding(s), no HIGH/CRITICAL findings.`);
