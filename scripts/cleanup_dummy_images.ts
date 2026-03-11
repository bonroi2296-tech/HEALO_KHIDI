/**
 * HEALO: 더미 이미지 데이터 정리 스크립트
 * "immune hospital"은 제외하고 나머지 placehold.co/placeholder 더미 이미지 제거
 * 
 * 실행 방법:
 * npx tsx scripts/cleanup_dummy_images.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('   .env.local 파일을 확인하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDummyImages() {
  console.log('🔍 더미 이미지 데이터 정리 시작...\n');

  // 1. 병원 데이터 확인
  console.log('📋 [1] 병원 데이터 확인 중...');
  const { data: hospitals, error: hospitalsError } = await supabase
    .from('hospitals')
    .select('id, slug, name, images')
    .neq('slug', 'immune-hospital')
    .order('created_at', { ascending: false });

  if (hospitalsError) {
    console.error('❌ 병원 데이터 조회 실패:', hospitalsError);
    return;
  }

  const hospitalsWithDummy = (hospitals || []).filter(h => {
    const imagesStr = JSON.stringify(h.images || []);
    return imagesStr.includes('placehold.co') || imagesStr.includes('placeholder');
  });

  console.log(`   발견: ${hospitalsWithDummy.length}개 병원에 더미 이미지 존재`);
  if (hospitalsWithDummy.length > 0) {
    hospitalsWithDummy.forEach(h => {
      console.log(`   - ${h.name} (${h.slug}): ${JSON.stringify(h.images)}`);
    });
  }

  // 2. 시술 데이터 확인
  console.log('\n📋 [2] 시술 데이터 확인 중...');
  const { data: treatments, error: treatmentsError } = await supabase
    .from('treatments')
    .select(`
      id, 
      slug, 
      name, 
      images,
      hospital_id,
      hospitals!inner(slug, name)
    `)
    .neq('hospitals.slug', 'immune-hospital')
    .order('created_at', { ascending: false });

  if (treatmentsError) {
    console.error('❌ 시술 데이터 조회 실패:', treatmentsError);
    return;
  }

  const treatmentsWithDummy = (treatments || []).filter(t => {
    const imagesStr = JSON.stringify(t.images || []);
    return imagesStr.includes('placehold.co') || imagesStr.includes('placeholder');
  });

  console.log(`   발견: ${treatmentsWithDummy.length}개 시술에 더미 이미지 존재`);
  if (treatmentsWithDummy.length > 0) {
    treatmentsWithDummy.forEach(t => {
      console.log(`   - ${t.name} (${t.slug}): ${JSON.stringify(t.images)}`);
    });
  }

  // 3. 업데이트 실행
  if (hospitalsWithDummy.length === 0 && treatmentsWithDummy.length === 0) {
    console.log('\n✅ 더미 이미지가 없습니다. 작업 완료!');
    return;
  }

  console.log('\n🔄 [3] 더미 이미지 제거 중...');

  // 병원 업데이트
  if (hospitalsWithDummy.length > 0) {
    const hospitalIds = hospitalsWithDummy.map(h => h.id);
    const { error: updateHospitalsError } = await supabase
      .from('hospitals')
      .update({ images: [] })
      .in('id', hospitalIds);

    if (updateHospitalsError) {
      console.error('❌ 병원 이미지 업데이트 실패:', updateHospitalsError);
    } else {
      console.log(`   ✅ ${hospitalsWithDummy.length}개 병원 이미지 정리 완료`);
    }
  }

  // 시술 업데이트
  if (treatmentsWithDummy.length > 0) {
    const treatmentIds = treatmentsWithDummy.map(t => t.id);
    const { error: updateTreatmentsError } = await supabase
      .from('treatments')
      .update({ images: [] })
      .in('id', treatmentIds);

    if (updateTreatmentsError) {
      console.error('❌ 시술 이미지 업데이트 실패:', updateTreatmentsError);
    } else {
      console.log(`   ✅ ${treatmentsWithDummy.length}개 시술 이미지 정리 완료`);
    }
  }

  console.log('\n✅ 더미 이미지 정리 완료!');
  console.log('\n📝 참고: Supabase Dashboard에서 직접 확인하세요.');
  console.log('   - hospitals 테이블: slug != "immune-hospital"');
  console.log('   - treatments 테이블: hospital_id의 slug != "immune-hospital"');
}

cleanupDummyImages().catch(console.error);
