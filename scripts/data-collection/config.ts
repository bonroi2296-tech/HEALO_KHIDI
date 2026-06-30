/**
 * Data Collection Configuration
 * 
 * API keys and settings for various data sources
 */

export const config = {
  // HIRA (건강보험심사평가원) API
  hira: {
    apiKey: process.env.HIRA_API_KEY || '',
    baseUrl: 'http://apis.data.go.kr/B551182',
    endpoints: {
      hospitals: '/hospInfoService1/getHospBasisList1',
      evaluation: '/hospInfoService1/getHospEvalInfo',
    },
    rateLimit: {
      requestsPerSecond: 10,
      requestsPerDay: 1000,
    },
  },

  // Public Data Portal (공공데이터포털)
  publicData: {
    apiKey: process.env.PUBLIC_DATA_API_KEY || '',
    baseUrl: 'http://apis.data.go.kr',
    endpoints: {
      hospitals: '/B552657/HospitalBasisInfoService/getHospBasisInfo',
      medicalDevices: '/B551182/MdcinGrnIdntfcInfoService',
    },
    rateLimit: {
      requestsPerSecond: 10,
      requestsPerDay: 1000,
    },
  },

  // MFDS (식품의약품안전처) API
  mfds: {
    apiKey: process.env.MFDS_API_KEY || '',
    baseUrl: 'http://apis.data.go.kr/1471000',
    endpoints: {
      medicalDevices: '/MdcinGrnIdntfcInfoService',
    },
    rateLimit: {
      requestsPerSecond: 5,
      requestsPerDay: 500,
    },
  },

  // Kakao Local API
  kakao: {
    apiKey: process.env.KAKAO_REST_API_KEY || '',
    baseUrl: 'https://dapi.kakao.com',
    endpoints: {
      search: '/v2/local/search/keyword.json',
      address: '/v2/local/search/address.json',
    },
    rateLimit: {
      requestsPerSecond: 30,
      requestsPerDay: 300000,
    },
  },

  // Naver Search API
  naver: {
    clientId: process.env.NAVER_CLIENT_ID || '',
    clientSecret: process.env.NAVER_CLIENT_SECRET || '',
    baseUrl: 'https://openapi.naver.com',
    endpoints: {
      local: '/v1/search/local.json',
    },
    rateLimit: {
      requestsPerSecond: 10,
      requestsPerDay: 25000,
    },
  },

  // ── 시장 인텔리전스 수집(intel) ─────────────────────────────────────────
  // 마케팅·운영용 "공개 시장 신호" 수집 설정. 환자 PII 수집 금지(MARKET_INTEL_PLAYBOOK 참고).
  // 주제별로 언어→검색어를 두면, Google News(다국어)·Reddit(영어)을 한 번에 긁는다.
  // 검색어는 마케팅 담당이 자유롭게 늘리면 됨(코드 수정 없이 여기만 손대도 됨).
  intel: {
    // 다국어 뉴스 수집 대상 언어(활성 6개 중 핵심 타겟). kz=카자흐(KZ), zh=중국, ru=러시아.
    newsLangs: ["ru", "kz", "zh", "en", "ko"] as string[],
    // 주제: key + 라벨 + 언어별 검색어. (없는 언어는 en 으로 폴백)
    topics: [
      {
        key: "korea_cancer_tourism",
        label: "한국 암치료 의료관광",
        queries: {
          ru: "лечение рака в Корее медицинский туризм",
          kz: "Кореяда обырды емдеу медициналық туризм",
          zh: "韩国 癌症 治疗 医疗 旅游",
          en: "Korea cancer treatment medical tourism international patient",
          ko: "외국인 암환자 유치 의료관광",
        } as Record<string, string>,
      },
      {
        key: "competitor_destinations",
        label: "경쟁 의료관광국 동향",
        queries: {
          ru: "медицинский туризм онкология Турция Корея Германия",
          en: "medical tourism oncology Turkey Korea Thailand comparison",
          zh: "肿瘤 海外 就医 韩国 日本 对比",
        } as Record<string, string>,
      },
      {
        key: "khidi_policy",
        label: "정부·KHIDI 의료해외진출 정책",
        queries: {
          ko: "보건산업진흥원 외국인환자 유치 정책 KHIDI",
          en: "Korea KHIDI international patient attraction policy",
        } as Record<string, string>,
      },
    ],
    // 영어권 환자·의료관광 커뮤니티(공개 검색). 마케팅 메시지·불만·기대 신호.
    subreddits: ["cancer", "medicaltourism", "AskDocs"] as string[],
    redditQuery: "Korea cancer treatment",
    // 추가 RSS/Atom 피드(경쟁사 블로그·유튜브 채널 feeds/videos.xml 등). 운영자가 추가.
    extraFeeds: [] as { source: string; url: string }[],
    // 평판/경쟁 태깅용 키워드(스니펫에 포함되면 표시). 우리 브랜드·핵심 경쟁어.
    watchKeywords: ["healwith", "KHIDI", "medical korea", "의료관광", "암환자 유치"] as string[],
    // 소스별 상한(과수집 방지)
    perSourceLimit: 12,
  },

  // Collection settings
  collection: {
    batchSize: 50,
    retryAttempts: 3,
    retryDelay: 1000, // ms
    timeout: 10000, // ms
  },

  // Output settings
  output: {
    csvDir: './data/collected/csv',
    jsonDir: './data/collected/json',
    logDir: './data/collected/logs',
  },
};

/**
 * Validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if at least one API key is configured
  const hasApiKey = 
    config.hira.apiKey ||
    config.publicData.apiKey ||
    config.mfds.apiKey ||
    config.kakao.apiKey ||
    (config.naver.clientId && config.naver.clientSecret);

  if (!hasApiKey) {
    errors.push('최소 하나의 API 키가 필요합니다. .env.local 파일을 확인하세요.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
