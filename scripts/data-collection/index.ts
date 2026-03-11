/**
 * Data Collection CLI
 * 데이터 수집 스크립트 실행
 */

import dotenv from 'dotenv';
import path from 'path';
import { HospitalCollector } from './collectors/hospital-collector.js';
import { hospitalsToCsv, saveCsv, generateHospitalTemplate } from './export/to-csv.js';
import { config, validateConfig } from './config.js';

// 환경변수 로드
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function main() {
  console.log('='.repeat(60));
  console.log('HEALO 데이터 수집 시스템');
  console.log('='.repeat(60));
  console.log('');

  // 설정 검증
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

  // CLI 인자 파싱
  const command = process.argv[2];

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
  console.log('  help         이 도움말 표시');
  console.log('');
  console.log('예시:');
  console.log('  npm run collect collect   # 데이터 수집');
  console.log('  npm run collect template  # 템플릿 생성');
  console.log('');
}

// 실행
main().catch(error => {
  console.error('실행 오류:', error);
  process.exit(1);
});
