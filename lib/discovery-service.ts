/**
 * Discovery Service: Production On-Demand discovery engine for MRTG (Cacti) & PRTG Network Monitor.
 * Connects directly to live monitoring servers configured in AppConfig, extracts real devices,
 * interfaces, and graph IDs, and stores them in local SQLite for instant search and mapping.
 */

import axios from 'axios';
import https from 'https';
import { MrtgAuthConfig, getCactiSessionCookie } from './mrtg-service';
import { PrtgAuthConfig } from './prtg-service';

// ============================================================
// Types
// ============================================================

export interface DiscoveredItemInput {
  engine: 'MRTG' | 'PRTG';
  groupName?: string;
  subGroupName?: string;
  deviceName: string;
  deviceIp?: string;
  interfaceName: string;
  fullTitle: string;
  targetId: string;
  detectedSid?: string;
  detectedCid?: string;
  status?: string;
}

export interface DiscoverySummary {
  success: boolean;
  engine: 'MRTG' | 'PRTG';
  totalDevices: number;
  totalInterfaces: number;
  isFallback: boolean;
  error?: string;
  items: DiscoveredItemInput[];
}

// ============================================================
// Helpers
// ============================================================

/** Ensure URL has valid protocol (default https://) and no trailing slash */
export function normalizeBaseUrl(url: string, defaultProtocol = 'https://'): string {
  let trimmed = (url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = defaultProtocol + trimmed;
  }
  return trimmed;
}

/** Decode common HTML entities */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .trim();
}

/** Extract Service ID pattern like "01.2180.1" from text */
export function extractServiceId(text: string): string | undefined {
  const match = text.match(/\b(01\.\d{3,4}\.\d+)\b/);
  return match ? match[1] : undefined;
}

/** Extract Customer ID pattern like "01.2180.1124" */
export function extractCustomerId(text: string): string | undefined {
  const match = text.match(/\b(01\.\d{3,4}\.\d{4})\b/);
  return match ? match[1] : undefined;
}

/** Extract device and interface name from Cacti title */
function parseCactiGraphTitle(rawTitle: string): { deviceName: string; interfaceName: string; groupName: string } {
  const title = decodeHtmlEntities(rawTitle);

  // Determine group category
  let groupName = 'Customers';
  if (/\[MAINLINK\]/i.test(title)) groupName = 'Mainlink / Core';
  else if (/\[BACKBONE\]/i.test(title)) groupName = 'Backbone';
  else if (/\[ISOLIR\]/i.test(title)) groupName = 'Isolated';
  else if (/\[NEXA\]|shelter|router|switch|olt|server/i.test(title)) groupName = 'Infrastructure / NOC';

  // Pattern 1: "01.0007.1 Folkafe Coffee & Stories.ether1"
  const dotSplit = title.match(/^(01\.\d{3,4}\.\d+[^.]*)\.([^.]+)$/);
  if (dotSplit) {
    return {
      deviceName: dotSplit[1].trim(),
      interfaceName: dotSplit[2].trim(),
      groupName,
    };
  }

  // Pattern 2: "01.2285.1 PT. Anugrah Terpercaya Kerja - Traffic - ether1"
  const dashParts = title.split(/\s+-\s+/);
  if (dashParts.length >= 2) {
    const dev = dashParts[0].trim();
    const iface = dashParts.slice(1).join(' - ').trim();
    return {
      deviceName: dev,
      interfaceName: iface,
      groupName,
    };
  }

  return {
    deviceName: title,
    interfaceName: title,
    groupName,
  };
}

function createSecureClient(timeout = 25000) {
  return axios.create({
    timeout,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NexaReportGenerator/1.0 Discovery',
    },
  });
}

// ============================================================
// PRTG Live Discovery Engine
// ============================================================

export async function discoverPrtg(config: PrtgAuthConfig): Promise<DiscoverySummary> {
  const cleanBase = normalizeBaseUrl(config.baseUrl, 'https://');
  if (!cleanBase) {
    throw new Error('PRTG Base URL is not configured in Server Settings.');
  }

  const authParams: Record<string, string> = {};
  if (config.username) authParams['username'] = config.username;
  if (config.password) {
    authParams[config.authType === 'PASSHASH' ? 'passhash' : 'password'] = config.password;
  }

  const client = createSecureClient(30000);

  const qs = new URLSearchParams({
    ...authParams,
    content: 'sensors',
    columns: 'objid,sensor,device,group,probe,status,lastvalue',
    filter_type: 'snmptraffic',
    count: '5000',
  }).toString();

  const url = `${cleanBase}/api/table.json?${qs}`;
  const resp = await client.get(url);
  const data = resp.data;

  if (!data || !Array.isArray(data.sensors)) {
    throw new Error(`Response PRTG tidak valid (status ${resp.status}): ${JSON.stringify(data).substring(0, 200)}`);
  }

  const items: DiscoveredItemInput[] = data.sensors.map((s: Record<string, unknown>) => {
    const sensorName = String(s.sensor || 'Sensor');
    const deviceName = String(s.device || 'Device');
    const groupName = String(s.group || 'Customer Nexa');
    const probeName = s.probe ? String(s.probe) : undefined;
    const fullTitle = `${deviceName} - ${sensorName}`;

    return {
      engine: 'MRTG' as const, // will be overwritten below
      groupName,
      subGroupName: probeName,
      deviceName,
      interfaceName: sensorName,
      fullTitle,
      targetId: String(s.objid),
      detectedSid: extractServiceId(fullTitle),
      detectedCid: extractCustomerId(fullTitle),
      status: String(s.status || 'Up'),
    };
  }).map((i: DiscoveredItemInput) => ({ ...i, engine: 'PRTG' as const }));

  const deviceSet = new Set(items.map((i) => i.deviceName));

  return {
    success: true,
    engine: 'PRTG',
    totalDevices: deviceSet.size,
    totalInterfaces: items.length,
    isFallback: false,
    items,
  };
}

// ============================================================
// MRTG (Cacti) Live Discovery Engine
// ============================================================

export async function discoverMrtg(
  config: MrtgAuthConfig,
  maxPages = 20
): Promise<DiscoverySummary> {
  const cleanBase = normalizeBaseUrl(config.baseUrl, 'https://');
  if (!cleanBase) {
    throw new Error('MRTG/Cacti Base URL is not configured in Server Settings.');
  }

  // 1. Authenticate with Cacti session
  const cookie = await getCactiSessionCookie({
    ...config,
    baseUrl: cleanBase,
  }, true); // force fresh cookie

  if (!cookie) {
    throw new Error(
      `Failed to authenticate with Cacti at ${cleanBase}. Please check credentials in Server Settings.`
    );
  }

  const client = createSecureClient(20000);
  const headers = {
    Cookie: cookie,
    Referer: `${cleanBase}/graph_view.php`,
  };

  // 2. Fetch first page to verify access and check for total pages
  const firstUrl = `${cleanBase}/graph_view.php?action=list&header=false&rows=500&page=1`;
  const firstResp = await client.get(firstUrl, { headers });
  const firstHtml = String(firstResp.data);

  if (firstHtml.includes('Login to Cacti') || firstHtml.includes('name="login_username"')) {
    throw new Error('Session Cacti ditolak atau habis. Periksa kredensial Cacti.');
  }

  const firstMatches = parseCactiListHtml(firstHtml);
  if (firstMatches.length === 0) {
    throw new Error('Tidak ada grafik yang ditemukan di Cacti graph_view.php.');
  }

  const graphMap = new Map<string, DiscoveredItemInput>();
  firstMatches.forEach((item) => graphMap.set(item.targetId, item));

  // 3. Concurrently fetch subsequent pages up to maxPages
  // Check if page 1 has "Next"
  const hasNext = /gotopage\(2\)/i.test(firstHtml) || firstMatches.length === 500;
  if (hasNext && maxPages > 1) {
    const pagesToFetch: number[] = [];
    for (let p = 2; p <= maxPages; p++) {
      pagesToFetch.push(p);
    }

    // Process in batches of 4 parallel requests to avoid overwhelming the Cacti server
    const batchSize = 4;
    for (let i = 0; i < pagesToFetch.length; i += batchSize) {
      const batch = pagesToFetch.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (page) => {
          const pageUrl = `${cleanBase}/graph_view.php?action=list&header=false&rows=500&page=${page}`;
          const res = await client.get(pageUrl, { headers });
          return parseCactiListHtml(String(res.data));
        })
      );

      let foundAnyInBatch = false;
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value.length > 0) {
          foundAnyInBatch = true;
          for (const item of res.value) {
            graphMap.set(item.targetId, item);
          }
        }
      }

      // If a full batch returned nothing or empty, stop early
      if (!foundAnyInBatch) {
        break;
      }
    }
  }

  const items = Array.from(graphMap.values());
  const deviceSet = new Set(items.map((i) => i.deviceName));

  return {
    success: true,
    engine: 'MRTG',
    totalDevices: deviceSet.size,
    totalInterfaces: items.length,
    isFallback: false,
    items,
  };
}

/** Parse local_graph_id and titles from Cacti list HTML */
function parseCactiListHtml(html: string): DiscoveredItemInput[] {
  const items: DiscoveredItemInput[] = [];
  // Matches: <a class="linkEditMain" href="graph.php?local_graph_id=54619&amp;rra_id=0"> 01.0470.25 Shelter...</a>
  const regex = /href=['"][^'"]*local_graph_id=(\d+)[^'"]*['"][^>]*>\s*([^<]+)\s*<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const targetId = match[1];
    const rawTitle = match[2];
    const { deviceName, interfaceName, groupName } = parseCactiGraphTitle(rawTitle);
    const fullTitle = decodeHtmlEntities(rawTitle);

    items.push({
      engine: 'MRTG',
      groupName,
      deviceName,
      interfaceName,
      fullTitle,
      targetId,
      detectedSid: extractServiceId(fullTitle),
      detectedCid: extractCustomerId(fullTitle),
      status: 'Up',
    });
  }

  return items;
}
