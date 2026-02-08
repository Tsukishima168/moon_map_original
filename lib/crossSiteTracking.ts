export const SITE_ID = 'moon_map' as const;
export const DEFAULT_UTM_SOURCE = 'moon-map';

export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

const TARGET_SITE_BY_HOST: Record<string, string> = {
  'kiwimu-mbti.vercel.app': 'mbti_lab',
  'moonmoon-dessert-passport.vercel.app': 'passport',
  'dessert-booking.vercel.app': 'dessert_booking',
};

function compactUtmParams(params: UtmParams): Record<string, string> {
  const cleaned: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value) cleaned[key] = value;
  });
  return cleaned;
}

export function getUtmParamsFromUrl(input?: string): UtmParams {
  if (typeof window === 'undefined') return {};

  try {
    if (!input) {
      const params = new URLSearchParams(window.location.search);
      return {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
      };
    }

    if (input.startsWith('?')) {
      const params = new URLSearchParams(input);
      return {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
      };
    }

    const params = new URL(input).searchParams;
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
    };
  } catch {
    return {};
  }
}

export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window === 'undefined' || typeof (window as any).gtag === 'undefined') {
    return;
  }

  (window as any).gtag('event', eventName, {
    site_id: SITE_ID,
    ...params,
  });
}

export function trackUtmLanding() {
  const utmParams = getUtmParamsFromUrl();
  if (!Object.values(utmParams).some(Boolean)) return;

  trackEvent('utm_landing', compactUtmParams(utmParams));
}

export function buildUtmUrl(
  baseUrl: string,
  options: {
    source?: string;
    medium: string;
    campaign?: string;
    content?: string;
    term?: string;
    additionalParams?: Record<string, string>;
  }
) {
  const url = new URL(baseUrl);
  const utmSource = options.source || DEFAULT_UTM_SOURCE;

  url.searchParams.set('utm_source', utmSource);
  url.searchParams.set('utm_medium', options.medium);
  if (options.campaign) url.searchParams.set('utm_campaign', options.campaign);
  if (options.content) url.searchParams.set('utm_content', options.content);
  if (options.term) url.searchParams.set('utm_term', options.term);

  if (options.additionalParams) {
    Object.entries(options.additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

export function trackOutboundClick(url: string, label: string, extra?: Record<string, any>) {
  let targetSite = 'external';
  try {
    const host = new URL(url).hostname;
    targetSite = TARGET_SITE_BY_HOST[host] || 'external';
  } catch {
    targetSite = 'external';
  }

  const utmParams = compactUtmParams(getUtmParamsFromUrl(url));

  trackEvent('outbound_click', {
    source_site: SITE_ID,
    target_site: targetSite,
    label,
    url,
    ...utmParams,
    ...(extra || {}),
  });
}
