/**
 * TypeScript interfaces for the MDI Object configuration registry.
 * @namespace com.sap.mdi.explorer.config
 */

/**
 * Column definition for the list table.
 */
export interface ColumnConfig {
	/** Property path relative to the log entry (e.g. "instance/displayName") */
	path: string;
	/** Display label for the column header */
	label: string;
	/** Optional column width (e.g. "14em") */
	width?: string;
}

/**
 * Field definition for the object detail view.
 */
export interface DetailFieldConfig {
	/** Property path relative to the log entry */
	path: string;
	/** Display label */
	label: string;
	/** Rendering hint: how to display the value */
	type?: "text" | "boolean" | "date" | "array" | "json";
}

/**
 * Section grouping for the detail view.
 */
export interface DetailSectionConfig {
	/** Section title */
	title: string;
	/** Fields in this section */
	fields: DetailFieldConfig[];
}

/**
 * Complete configuration for one MDI object type.
 */
export interface MdiObjectConfig {
	/** Unique key, e.g. "CostCenter" */
	key: string;
	/** Human-readable display name */
	displayName: string;
	/** MDI log API path, e.g. "/v0/odm/3.7.0/log/sap.odm.finance.costobject.CostCenter" */
	apiPath: string;
	/** Columns for the list table */
	listColumns: ColumnConfig[];
	/** Sections for the object detail page */
	detailSections: DetailSectionConfig[];
	/** Extract a display title from a log record */
	titleExtractor: (record: Record<string, unknown>) => string;
}
