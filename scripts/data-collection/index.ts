/**
 * Data Collection CLI
 * 데이터 수집 스크립트 실행
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { HospitalCollector } from './collectors/hospital-collector.js';
import { MarketIntelCollector } from './collectors/market-intel-collector.js';
import { summarizeIntel } from './transformers/summarize-intel.js';
import { saveIntel } from './export/to-markdown.js';
import { hospitalsToCsv, saveCsv, generateHospitalTemplate } from './export/to-csv.js';
import { config, validateConfig } from './config.js';

// ESM 안전 __dirname (이 프로젝트는 ESM — __dirname 미정의로 collect CLI 전체가 깨지던 기존 버그).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 환경변수 로드
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function main() {
  console.log('='.repeat(60));
  console.log('HEALO 데이터 수집 시스템');
  console.log('='.repeat(60));
  console.log('');

  // CLI 인자 파싱
  const command = process.argv[2];

  // intel(시장 인텔리전스)은 공개 피드만 써서 병원 API 키가 필요 없음 → 키 검증 우회.
  if (command === 'intel') {
    await collectMarketIntel();
    return;
  }

  // 설정 검증 (병원 데이터 수집용 API 키)
  const validation = validateConfig();
  if (!validation.valid) {
    console.error('❌ 설정 오류:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    console.error('');
    console.error('.env.local 파일에 API 키를 설정하세요.');
    process.exit(1);
  }

  console.log('✅ 설정 검증 완료');
  console.log('');

  switch (command) {
    case 'collect':
      await collectHospitals();
      break;

    case 'template':
      generateTemplate();
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

/**
 * 시장 인텔리전스 수집 (마케팅·운영용 공개 신호)
 */
async function collectMarketIntel() {
  console.log('📡 시장 인텔리전스 수집 시작 (공개 뉴스·커뮤니티)...');
  console.log('');

  const collector = new MarketIntelCollector();
  const result = await collector.collect();

  console.log('');
  console.log(`✅ 수집 완료: ${result.items.length}건 (응답 소스 ${result.sourcesOk}/${result.sourcesTried})`);

  if (result.items.length === 0) {
    console.log('⚠️ 수집된 신호가 없습니다(네트워크 차단·검색어 무결과 가능). 검색어/네트워크를 확인하세요.');
    return;
  }

  // AI 마케팅 브리프(선택 — 키 있으면)
  console.log('🤖 AI 마케팅 브리프 생성 중...');
  const aiBrief = await summarizeIntel(result.items);

  // 저장: 마크다운 + JSON
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(__dirname, '../../data/collected/intel');
  const [mdPath, jsonPath] = saveIntel(result, aiBrief, outputDir, stamp);

  console.log('');
  console.log('✅ 리포트 저장 완료!');
  console.log(`  - 리포트: ${mdPath}`);
  console.log(`  - 원자료: ${jsonPath}`);
  if (!aiBrief) console.log('  - (AI 요약은 스킵됨 — GOOGLE_GENERATIVE_AI_API_KEY 설정 시 자동 생성)');
}

/**
 * 병원 데이터 수집
 */
async function collectHospitals() {
  console.log('📊 병원 데이터 수집 시작...');
  console.log('');

  const collector = new HospitalCollector();
  
  try {
    // 서울 지역 성형외과/피부과 병원 수집
    const hospitals = await collector.collectSeoulCosmeticHospitals();
    
    if (hospitals.length === 0) {
      console.log('⚠️ 수집된 데이터가 없습니다.');
      return;
    }

    // CSV로 변환
    const csv = hospitalsToCsv(hospitals);
    
    // 파일명: hospitals_YYYYMMDD_HHMMSS.csv
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').split('-').slice(0, 6).join('');
    const filename = `hospitals_${timestamp}.csv`;
    
    // 저장
    saveCsv(csv, filename, config.output.csvDir);
    
    console.log('');
    console.log('✅ 데이터 수집 완료!');
    console.log(`  - 총 ${hospitals.length}개 병원`);
    console.log(`  - 파일: ${path.join(config.output.csvDir, filename)}`);
  } catch (error) {
    console.error('❌ 데이터 수집 실패:', error);
    process.exit(1);
  }
}

/**
 * 템플릿 CSV 생성
 */
function generateTemplate() {
  console.log('📝 템플릿 CSV 생성...');
  console.log('');

  const template = generateHospitalTemplate();
  const filename = 'hospital-import-template.csv';
  
  // public/templates/ 디렉토리에 저장
  const outputDir = path.join(__dirname, '../../public/templates');
  saveCsv(template, filename, outputDir);
  
  console.log('');
  console.log('✅ 템플릿 생성 완료!');
  console.log(`  - 파일: ${path.join(outputDir, filename)}`);
}

/**
 * 도움말 표시
 */
function showHelp() {
  console.log('사용법:');
  console.log('');
  console.log('  npm run collect [command]');
  console.log('');
  console.log('명령어:');
  console.log('  collect      병원 데이터 수집 및 CSV 생성');
  console.log('  template     Import 템플릿 CSV 생성');
  console.log('  intel        시장 인텔리전스 수집(공개 뉴스·커뮤니티 → 마케팅 리포트)');
  console.log('  help         이 도움말 표시');
  console.log('');
  console.log('예시:');
  console.log('  npm run collect collect   # 병원 데이터 수집');
  console.log('  npm run collect template  # 템플릿 생성');
  console.log('  npm run collect:intel     # 시장 인텔리전스 리포트 생성');
  console.log('');
}

// 실행
main().catch(error => {
  console.error('실행 오류:', error);
  process.exit(1);
});
