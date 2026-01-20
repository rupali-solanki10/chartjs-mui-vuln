// Centralized shared types for the app.
export type Vulnerability = {
    cve: string;
    severity?: string;
    cvss?: number;
    link?: string;
    description?: string;
    packageName?: string;
    packageVersion?: string;
    published?: string;
    fixDate?: string;
    status?: string;
    owner?: string;
    kaiStatus?: string;
    // riskFactors shape is variable across datasets; use unknown here
    riskFactors?: unknown;
    // optional exploitability indicator (number or short string)
    exploitability?: number | string;
    [k: string]: unknown;
};

export type Metadata = {
    totalVulns?: number;
    criticalVulns?: number;
    highVulns?: number;
    mediumVulns?: number;
    lowVulns?: number;
    systemVulns?: number;
    userVulns?: number;
    [k: string]: unknown;
};

export type PortSpec = { port: string; protocol?: string };

export type Image = {
    name: string;
    version?: string;
    baseImage?: string;
    createTime?: string;
    vulnerabilities?: Vulnerability[];
    exposed?: boolean;
    exposedPorts?: PortSpec[];
    metadata?: Metadata;
    [k: string]: unknown;
};

export type FilterState = {
    severity?: string;
    owner?: string;
    kaiStatus?: string;
    excludeKaiStatus?: string | string[];
    port?: string;
    text?: string;
    lastDays?: number;
    startDate?: string;
    endDate?: string;
};
