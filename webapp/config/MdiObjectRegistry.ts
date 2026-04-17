import type { MdiObjectConfig } from "./types";
import { CostCenterConfig } from "./CostCenterConfig";
import { CompanyCodeConfig } from "./CompanyCodeConfig";
import { BankConfig } from "./BankConfig";
import { WorkforcePersonConfig } from "./WorkforcePersonConfig";

/**
 * Registry of all MDI object type configurations.
 * To add a new object type:
 *   1. Create a new XxxConfig.ts file exporting an MdiObjectConfig.
 *   2. Import it here and add one registry.set(...) line.
 * @namespace com.sap.mdi.explorer.config
 */

const registry = new Map<string, MdiObjectConfig>();

registry.set(CostCenterConfig.key, CostCenterConfig);
registry.set(CompanyCodeConfig.key, CompanyCodeConfig);
registry.set(BankConfig.key, BankConfig);
registry.set(WorkforcePersonConfig.key, WorkforcePersonConfig);

export function getObjectConfig(key: string): MdiObjectConfig | undefined {
	return registry.get(key);
}

export function getAllObjectConfigs(): MdiObjectConfig[] {
	return Array.from(registry.values());
}
