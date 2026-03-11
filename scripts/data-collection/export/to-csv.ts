/**
 * CSV Exporter
 * 수집한 데이터를 CSV 파일로 변환
 */

import * as fs from 'fs';
import * as path from 'path';
import { CollectedHospitalData } from '../collectors/hospital-collector';

/**
 * 병원 데이터를 CSV로 변환
 */
export function hospitalsToCsv(hospitals: CollectedHospitalData[]): string {
  const headers = [
    'name',
    'location_kr',
    'location_en',
    'address_detail',
    'description',
    'latitude',
    'longitude',
    'tags',
    'images',
    'supported_languages',
    'amenities',
    'specialties',
    'operating_hours',
    'doctor_profile',
    'business_registration_number',
    'medical_institution_code',
    'certifications',
    'medical_equipment',
    'insurance_accepted',
    'insurance_details',
    'annual_surgery_count',
    'establishment_date',
    'total_staff_count',
    'doctor_count',
    'external_ratings',
    'display_order',
    'is_published',
  ];

  const rows = hospitals.map(hospital => {
    return headers.map(header => {
      const value = hospital[header as keyof CollectedHospitalData];
      
      // Array나 Object는 JSON 문자열로 변환
      if (Array.isArray(value)) {
        return JSON.stringify(value);
      }
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      if (value === null || value === undefined) {
        return '';
      }
      
      // CSV 이스케이프 (쉼표, 따옴표 포함)
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    });
  });

  // CSV 생성
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ];

  return csvLines.join('\n');
}

/**
 * CSV 파일로 저장
 */
export function saveCsv(csvContent: string, filename: string, outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, '\uFEFF' + csvContent, 'utf-8'); // BOM 추가 (Excel 호환)
  console.log(`CSV 파일 저장 완료: ${filepath}`);
}

/**
 * 템플릿 CSV 생성
 */
export function generateHospitalTemplate(): string {
  const sampleData: CollectedHospitalData = {
    name: '샘플 병원',
    location_kr: '서울 강남구',
    location_en: 'Gangnam-gu, Seoul',
    address_detail: '테헤란로 123',
    description: '병원 소개 내용',
    latitude: 37.5012,
    longitude: 127.0396,
    tags: ['성형', '피부'],
    images: ['https://example.com/image1.jpg'],
    supported_languages: ['한국어', '영어'],
    amenities: ['주차장', 'WiFi'],
    specialties: ['성형외과', '피부과'],
    operating_hours: { mon_fri: '09:00-18:00', sat: '09:00-13:00' },
    doctor_profile: {
      name: '홍길동',
      title: '원장',
      specialties: ['성형외과'],
    },
    business_registration_number: '123-45-67890',
    medical_institution_code: 'A1234567',
    certifications: [
      {
        type: 'JCI_ACCREDITATION',
        issuer: '국제의료기관인증위원회',
        date: '2025-01-01',
      },
    ],
    medical_equipment: ['레이저 장비', 'CT'],
    insurance_accepted: true,
    insurance_details: { types: ['건강보험'] },
    annual_surgery_count: 1000,
    establishment_date: '2020-01-01',
    total_staff_count: 20,
    doctor_count: 5,
    external_ratings: {
      naver: { rating: 4.5, count: 120 },
    },
    display_order: 1,
    is_published: true,
  };

  return hospitalsToCsv([sampleData]);
}
