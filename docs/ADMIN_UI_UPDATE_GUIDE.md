# 관리자 병원/시술 관리 페이지 UI 업데이트 가이드

## 개요

신규 메타데이터 필드를 관리자 페이지에서 입력/수정할 수 있도록 UI를 확장합니다.

---

## 병원 관리 페이지 업데이트

**파일**: `app/admin/hospitals/_client/HospitalManager.jsx`

### 추가 필요 입력 필드

#### 1. 기본 정보 섹션
기존 필드 유지 + 추가:
- 사업자등록번호 (`business_registration_number`)
  - 타입: TEXT
  - UI: `<input type="text" placeholder="123-45-67890" />`
  
- 요양기관기호 (`medical_institution_code`)
  - 타입: TEXT  
  - UI: `<input type="text" placeholder="A1234567" />`

- 개원일 (`establishment_date`)
  - 타입: DATE
  - UI: `<input type="date" />`

#### 2. 인력 정보 섹션 (신규)
```jsx
<div className="mb-6">
  <h3 className="font-bold text-lg mb-4">인력 정보</h3>
  
  <label className="block mb-4">
    <span className="text-sm font-medium">총 직원 수</span>
    <input 
      type="number" 
      min="0"
      value={formData.total_staff_count || ''}
      onChange={(e) => setFormData({...formData, total_staff_count: parseInt(e.target.value)})}
      className="mt-1 block w-full rounded-md border-gray-300"
    />
  </label>

  <label className="block mb-4">
    <span className="text-sm font-medium">의사 수</span>
    <input 
      type="number" 
      min="0"
      value={formData.doctor_count || ''}
      onChange={(e) => setFormData({...formData, doctor_count: parseInt(e.target.value)})}
      className="mt-1 block w-full rounded-md border-gray-300"
    />
  </label>

  <label className="block mb-4">
    <span className="text-sm font-medium">연간 시술 건수</span>
    <input 
      type="number" 
      min="0"
      value={formData.annual_surgery_count || ''}
      onChange={(e) => setFormData({...formData, annual_surgery_count: parseInt(e.target.value)})}
      className="mt-1 block w-full rounded-md border-gray-300"
    />
  </label>
</div>
```

#### 3. 인증 정보 섹션 (신규)
```jsx
<div className="mb-6">
  <h3 className="font-bold text-lg mb-4">인증 정보</h3>
  <p className="text-sm text-gray-500 mb-3">병원이 보유한 인증 및 자격을 입력하세요.</p>
  
  <CertificationsInput 
    value={formData.certifications || []}
    onChange={(certs) => setFormData({...formData, certifications: certs})}
  />
</div>
```

**CertificationsInput 컴포넌트** (신규):
```jsx
function CertificationsInput({ value, onChange }) {
  const [certType, setCertType] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certDate, setCertDate] = useState('');
  const [certValidUntil, setCertValidUntil] = useState('');

  const addCertification = () => {
    if (!certType || !certIssuer) return;
    
    const newCert = {
      type: certType,
      issuer: certIssuer,
      date: certDate || undefined,
      valid_until: certValidUntil || undefined
    };
    
    onChange([...value, newCert]);
    
    // Reset
    setCertType('');
    setCertIssuer('');
    setCertDate('');
    setCertValidUntil('');
  };

  const removeCertification = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* 입력 폼 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input 
          type="text" 
          placeholder="인증 타입 (예: JCI_ACCREDITATION)"
          value={certType}
          onChange={(e) => setCertType(e.target.value)}
          className="px-3 py-2 border rounded"
        />
        <input 
          type="text" 
          placeholder="발급 기관"
          value={certIssuer}
          onChange={(e) => setCertIssuer(e.target.value)}
          className="px-3 py-2 border rounded"
        />
        <input 
          type="date" 
          placeholder="발급일"
          value={certDate}
          onChange={(e) => setCertDate(e.target.value)}
          className="px-3 py-2 border rounded"
        />
        <input 
          type="date" 
          placeholder="유효기간"
          value={certValidUntil}
          onChange={(e) => setCertValidUntil(e.target.value)}
          className="px-3 py-2 border rounded"
        />
      </div>
      <button 
        onClick={addCertification}
        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
      >
        인증 추가
      </button>

      {/* 추가된 인증 목록 */}
      <div className="mt-4 space-y-2">
        {value.map((cert, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div className="flex-1">
              <p className="font-medium">{cert.type}</p>
              <p className="text-sm text-gray-600">{cert.issuer}</p>
              {cert.date && <p className="text-xs text-gray-500">발급: {cert.date}</p>}
              {cert.valid_until && <p className="text-xs text-gray-500">유효: {cert.valid_until}</p>}
            </div>
            <button 
              onClick={() => removeCertification(idx)}
              className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 4. 의료 장비 섹션 (신규)
```jsx
<div className="mb-6">
  <h3 className="font-bold text-lg mb-4">의료 장비</h3>
  <DynamicListInput 
    label="보유 장비"
    value={formData.medical_equipment || []}
    onChange={(equipment) => setFormData({...formData, medical_equipment: equipment})}
    placeholder="예: 레이저 장비, CT, MRI"
  />
</div>
```

#### 5. 보험 정보 섹션 (신규)
```jsx
<div className="mb-6">
  <h3 className="font-bold text-lg mb-4">보험 정보</h3>
  
  <label className="flex items-center mb-4">
    <input 
      type="checkbox"
      checked={formData.insurance_accepted || false}
      onChange={(e) => setFormData({...formData, insurance_accepted: e.target.checked})}
      className="mr-2"
    />
    <span className="text-sm font-medium">보험 적용 가능</span>
  </label>

  {formData.insurance_accepted && (
    <div>
      <label className="block mb-4">
        <span className="text-sm font-medium">적용 가능한 보험 종류</span>
        <textarea 
          value={JSON.stringify(formData.insurance_details || {types: []}, null, 2)}
          onChange={(e) => {
            try {
              setFormData({...formData, insurance_details: JSON.parse(e.target.value)});
            } catch {}
          }}
          className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm"
          rows="4"
          placeholder='{"types": ["건강보험", "의료급여"]}'
        />
      </label>
    </div>
  )}
</div>
```

#### 6. 외부 평점 섹션 (신규)
```jsx
<div className="mb-6">
  <h3 className="font-bold text-lg mb-4">외부 평점</h3>
  <p className="text-sm text-gray-500 mb-3">네이버, 카카오 등 외부 플랫폼의 평점 정보</p>
  
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block mb-2 text-sm font-medium">네이버 평점</label>
      <input 
        type="number" 
        step="0.1"
        min="0" 
        max="5"
        placeholder="4.5"
        value={formData.external_ratings?.naver?.rating || ''}
        onChange={(e) => setFormData({
          ...formData, 
          external_ratings: {
            ...formData.external_ratings,
            naver: {
              ...formData.external_ratings?.naver,
              rating: parseFloat(e.target.value)
            }
          }
        })}
        className="block w-full rounded-md border-gray-300"
      />
      <input 
        type="number" 
        min="0"
        placeholder="리뷰 수"
        value={formData.external_ratings?.naver?.count || ''}
        onChange={(e) => setFormData({
          ...formData, 
          external_ratings: {
            ...formData.external_ratings,
            naver: {
              ...formData.external_ratings?.naver,
              count: parseInt(e.target.value)
            }
          }
        })}
        className="mt-2 block w-full rounded-md border-gray-300"
      />
    </div>

    <div>
      <label className="block mb-2 text-sm font-medium">카카오 평점</label>
      <input 
        type="number" 
        step="0.1"
        min="0" 
        max="5"
        placeholder="4.3"
        value={formData.external_ratings?.kakao?.rating || ''}
        onChange={(e) => setFormData({
          ...formData, 
          external_ratings: {
            ...formData.external_ratings,
            kakao: {
              ...formData.external_ratings?.kakao,
              rating: parseFloat(e.target.value)
            }
          }
        })}
        className="block w-full rounded-md border-gray-300"
      />
      <input 
        type="number" 
        min="0"
        placeholder="리뷰 수"
        value={formData.external_ratings?.kakao?.count || ''}
        onChange={(e) => setFormData({
          ...formData, 
          external_ratings: {
            ...formData.external_ratings,
            kakao: {
              ...formData.external_ratings?.kakao,
              count: parseInt(e.target.value)
            }
          }
        })}
        className="mt-2 block w-full rounded-md border-gray-300"
      />
    </div>
  </div>
</div>
```

---

## 시술 관리 페이지 업데이트

**파일**: `app/admin/treatments/_client/TreatmentManager.jsx`

### 추가 필요 입력 필드

#### 1. 가격 정보 섹션 확장
기존: `price_min`만 있음
추가: `price_max`

```jsx
<div className="grid grid-cols-2 gap-4 mb-4">
  <label className="block">
    <span className="text-sm font-medium">최소 가격 ($)</span>
    <input 
      type="number" 
      min="0"
      value={formData.price_min || ''}
      onChange={(e) => setFormData({...formData, price_min: parseInt(e.target.value)})}
      className="mt-1 block w-full rounded-md border-gray-300"
    />
  </label>

  <label className="block">
    <span className="text-sm font-medium">최대 가격 ($)</span>
    <input 
      type="number" 
      min="0"
      value={formData.price_max || ''}
      onChange={(e) => setFormData({...formData, price_max: parseInt(e.target.value)})}
      className="mt-1 block w-full rounded-md border-gray-300"
    />
  </label>
</div>
```

#### 2. 회복 정보 섹션 (신규)
```jsx
<div className="mb-6">
  <h3 className="font-bold text-lg mb-4">회복 정보</h3>
  
  <div className="grid grid-cols-2 gap-4 mb-4">
    <label className="block">
      <span className="text-sm font-medium">최소 회복 기간 (일)</span>
      <input 
        type="number" 
        min="0"
        value={formData.recovery_time_min || ''}
        onChange={(e) => setFormData({...formData, recovery_time_min: parseInt(e.target.value)})}
        className="mt-1 block w-full rounded-md border-gray-300"
      />
    </label>

    <label className="block">
      <span className="text-sm font-medium">최대 회복 기간 (일)</span>
      <input 
        type="number" 
        min="0"
        value={formData.recovery_time_max || ''}
        onChange={(e) => setFormData({...formData, recovery_time_max: parseInt(e.target.value)})}
        className="mt-1 block w-full rounded-md border-gray-300"
      />
    </label>
  </div>

  <label className="block mb-4">
    <span className="text-sm font-medium">회복 과정 (JSON)</span>
    <textarea 
      value={JSON.stringify(formData.recovery_process || {}, null, 2)}
      onChange={(e) => {
        try {
          setFormData({...formData, recovery_process: JSON.parse(e.target.value)});
        } catch {}
      }}
      className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm"
      rows="6"
      placeholder='{"day1": "당일 귀가 가능", "week1": "붓기 감소", "month1": "일상 복귀"}'
    />
  </label>
</div>
```

#### 3. 부작용 및 주의사항 섹션 (신규)
```jsx
<div className="mb-6">
  <h3 className="font-bold text-lg mb-4">부작용 및 주의사항</h3>
  
  <DynamicListInput 
    label="부작용 리스트"
    value={formData.side_effects || []}
    onChange={(effects) => setFormData({...formData, side_effects: effects})}
    placeholder="예: 일시적 부기, 멍"
  />

  <label className="block mt-4 mb-4">
    <span className="text-sm font-medium">부작용 상세 설명</span>
    <textarea 
      value={formData.side_effects_detail || ''}
      onChange={(e) => setFormData({...formData, side_effects_detail: e.target.value})}
      className="mt-1 block w-full rounded-md border-gray-300"
      rows="3"
    />
  </label>

  <DynamicListInput 
    label="주의사항"
    value={formData.precautions || []}
    onChange={(precautions) => setFormData({...formData, precautions: precautions})}
    placeholder="예: 시술 전 금식, 시술 후 안정"
  />
</div>
```

#### 4. 시술 정보 섹션 (신규)
```jsx
<div className="mb-6">
  <h3 className="font-bold text-lg mb-4">시술 정보</h3>
  
  <div className="grid grid-cols-2 gap-4 mb-4">
    <label className="block">
      <span className="text-sm font-medium">최소 시술 시간 (분)</span>
      <input 
        type="number" 
        min="0"
        value={formData.surgery_duration_min || ''}
        onChange={(e) => setFormData({...formData, surgery_duration_min: parseInt(e.target.value)})}
        className="mt-1 block w-full rounded-md border-gray-300"
      />
    </label>

    <label className="block">
      <span className="text-sm font-medium">최대 시술 시간 (분)</span>
      <input 
        type="number" 
        min="0"
        value={formData.surgery_duration_max || ''}
        onChange={(e) => setFormData({...formData, surgery_duration_max: parseInt(e.target.value)})}
        className="mt-1 block w-full rounded-md border-gray-300"
      />
    </label>
  </div>

  <label className="block mb-4">
    <span className="text-sm font-medium">마취 방법</span>
    <input 
      type="text" 
      value={formData.anesthesia_type || ''}
      onChange={(e) => setFormData({...formData, anesthesia_type: e.target.value})}
      className="mt-1 block w-full rounded-md border-gray-300"
      placeholder="예: 수면마취, 국소마취"
    />
  </label>

  <DynamicListInput 
    label="필요 의료장비"
    value={formData.required_equipment || []}
    onChange={(equipment) => setFormData({...formData, required_equipment: equipment})}
    placeholder="예: 레이저 장비, 초음파"
  />
</div>
```

#### 5. 보험 및 통계 섹션 (신규)
```jsx
<div className="mb-6">
  <h3 className="font-bold text-lg mb-4">보험 및 통계</h3>
  
  <label className="flex items-center mb-4">
    <input 
      type="checkbox"
      checked={formData.insurance_coverage || false}
      onChange={(e) => setFormData({...formData, insurance_coverage: e.target.checked})}
      className="mr-2"
    />
    <span className="text-sm font-medium">보험 적용 가능</span>
  </label>

  {formData.insurance_coverage && (
    <label className="block mb-4">
      <span className="text-sm font-medium">보험 적용 상세</span>
      <textarea 
        value={formData.insurance_coverage_detail || ''}
        onChange={(e) => setFormData({...formData, insurance_coverage_detail: e.target.value})}
        className="mt-1 block w-full rounded-md border-gray-300"
        rows="2"
      />
    </label>
  )}

  <div className="grid grid-cols-2 gap-4">
    <label className="block">
      <span className="text-sm font-medium">연간 시술 건수</span>
      <input 
        type="number" 
        min="0"
        value={formData.annual_procedure_count || ''}
        onChange={(e) => setFormData({...formData, annual_procedure_count: parseInt(e.target.value)})}
        className="mt-1 block w-full rounded-md border-gray-300"
      />
    </label>

    <label className="block">
      <span className="text-sm font-medium">성공률 (%)</span>
      <input 
        type="number" 
        step="0.1"
        min="0" 
        max="100"
        value={formData.success_rate || ''}
        onChange={(e) => setFormData({...formData, success_rate: parseFloat(e.target.value)})}
        className="mt-1 block w-full rounded-md border-gray-300"
      />
    </label>
  </div>
</div>
```

---

## UI 개선 권장사항

### 아코디언 구조 적용
필드가 많으므로 섹션별로 접기/펼치기 기능 추가:

```jsx
const [openSections, setOpenSections] = useState({
  basic: true,
  staff: false,
  certifications: false,
  equipment: false,
  insurance: false,
  ratings: false
});

const toggleSection = (section) => {
  setOpenSections(prev => ({
    ...prev,
    [section]: !prev[section]
  }));
};
```

### 검증 및 에러 표시
- 필수 필드 표시 (`*`)
- 실시간 검증 (예: price_min <= price_max)
- 에러 메시지 표시

### 자동 저장
- 입력 중 Draft 자동 저장 (LocalStorage)
- "저장하지 않은 변경사항이 있습니다" 경고

---

## API 엔드포인트 업데이트

### 병원 관리 API
**파일**: `app/api/admin/hospitals/route.ts`

- 이미 Zod 스키마 검증이 적용되어 있음
- 신규 필드는 자동으로 검증됨
- 추가 작업 불필요

### 시술 관리 API
**파일**: `app/api/admin/treatments/route.ts`

- 이미 Zod 스키마 검증이 적용되어 있음
- 신규 필드는 자동으로 검증됨
- 추가 작업 불필요

---

## 구현 우선순위

### P0 (필수)
- [x] Zod 스키마 확장 (완료)
- [ ] 병원 관리: 인력 정보, 보험 정보
- [ ] 시술 관리: 회복 정보, 부작용/주의사항

### P1 (중요)
- [ ] 병원 관리: 인증 정보, 의료 장비
- [ ] 시술 관리: 시술 정보, 보험 및 통계

### P2 (선택)
- [ ] 외부 평점 입력
- [ ] 아코디언 UI
- [ ] 자동 저장 기능

---

## 테스트 시나리오

1. **신규 병원 추가**
   - 모든 신규 필드 입력
   - 저장 후 상세 페이지에서 확인

2. **기존 병원 수정**
   - 신규 필드만 추가
   - 기존 필드는 유지 확인

3. **Import 후 수정**
   - CSV로 대량 등록
   - 개별 수정 가능 확인

---

**작성일**: 2026-02-09  
**상태**: 구현 대기 (가이드 완료)
