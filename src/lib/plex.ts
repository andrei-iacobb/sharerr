const PLEX_URL = process.env.PLEX_URL || "http://plex.media.svc.cluster.local:32400";
const PLEX_TOKEN = process.env.PLEX_TOKEN || "";
const PLEX_EXTERNAL_URL = process.env.PLEX_EXTERNAL_URL || "";

interface PlexResponse {
  MediaContainer: {
    size?: number;
    totalSize?: number;
    Metadata?: PlexItem[];
    Directory?: PlexSection[];
  };
}

export interface PlexSection {
  key: string;
  title: string;
  type: string;
}

export interface PlexItem {
  ratingKey: string;
  title: string;
  year?: number;
  summary?: string;
  thumb?: string;
  art?: string;
  type: string;
  contentRating?: string;
  rating?: number;
  audienceRating?: number;
  duration?: number;
  Genre?: { tag: string }[];
  Role?: { tag: string; thumb?: string }[];
  Media?: PlexMedia[];
  leafCount?: number;
  viewedLeafCount?: number;
  childCount?: number;
  parentTitle?: string;
  grandparentTitle?: string;
  index?: number;
  parentIndex?: number;
}

export interface PlexMedia {
  Part?: {
    key: string;
    file: string;
    duration?: number;
    Stream?: {
      streamType: number;
      codec: string;
      displayTitle: string;
    }[];
  }[];
}

async function plexFetch(path: string): Promise<PlexResponse> {
  const url = new URL(path, PLEX_URL);
  url.searchParams.set("X-Plex-Token", PLEX_TOKEN);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Plex API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function getSections(): Promise<PlexSection[]> {
  const data = await plexFetch("/library/sections");
  return data.MediaContainer.Directory || [];
}

export async function browseSection(
  sectionId: string,
  start = 0,
  size = 50,
  sort = "titleSort:asc"
): Promise<{ items: PlexItem[]; totalSize: number }> {
  const data = await plexFetch(
    `/library/sections/${sectionId}/all?X-Plex-Container-Start=${start}&X-Plex-Container-Size=${size}&sort=${sort}`
  );
  return {
    items: data.MediaContainer.Metadata || [],
    totalSize: data.MediaContainer.totalSize || 0,
  };
}

export async function getMetadata(ratingKey: string): Promise<PlexItem | null> {
  const data = await plexFetch(`/library/metadata/${ratingKey}`);
  return data.MediaContainer.Metadata?.[0] || null;
}

export async function getChildren(ratingKey: string): Promise<PlexItem[]> {
  const data = await plexFetch(`/library/metadata/${ratingKey}/children`);
  return data.MediaContainer.Metadata || [];
}

export async function searchPlex(
  query: string,
  sectionIds?: string[]
): Promise<PlexItem[]> {
  let path = `/search?query=${encodeURIComponent(query)}&type=1,2`;
  if (sectionIds?.length) {
    path += `&sectionId=${sectionIds.join(",")}`;
  }
  const data = await plexFetch(path);
  return data.MediaContainer.Metadata || [];
}

export async function getTransientToken(): Promise<string> {
  const data = await plexFetch("/security/token?type=delegation");
  // The token is in the response
  const token = (data as unknown as { MediaContainer: { token: string } }).MediaContainer.token;
  if (!token) throw new Error("Failed to get transient token from Plex");
  return token;
}

export function getStreamUrl(partKey: string, token: string): string {
  const base = PLEX_EXTERNAL_URL || PLEX_URL;
  return `${base}/video/:/transcode/universal/start.m3u8?path=${encodeURIComponent(partKey)}&mediaIndex=0&partIndex=0&protocol=hls&directPlay=1&directStream=1&X-Plex-Token=${token}`;
}

export function getDirectStreamUrl(partKey: string, token: string): string {
  const base = PLEX_EXTERNAL_URL || PLEX_URL;
  return `${base}${partKey}?X-Plex-Token=${token}`;
}

export function getImageUrl(thumb: string): string {
  return `/api/image?path=${encodeURIComponent(thumb)}`;
}

export function getInternalImageUrl(thumb: string, width = 300, height = 450): string {
  return `${PLEX_URL}/photo/:/transcode?width=${width}&height=${height}&minSize=1&upscale=1&url=${encodeURIComponent(thumb)}&X-Plex-Token=${PLEX_TOKEN}`;
}
