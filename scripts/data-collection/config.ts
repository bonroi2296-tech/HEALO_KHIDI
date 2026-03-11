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
