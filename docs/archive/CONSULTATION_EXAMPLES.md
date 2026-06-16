# WebRTC Consultation System - Usage Examples

## Example 1: Patient Pre-Treatment Consultation

### Scenario
A Kazakhstan cancer patient (stomach cancer) needs a pre-treatment assessment from a Korean hospital.

### Flow

**Step 1: Create Consultation Session**
```bash
curl -X POST http://localhost:3000/api/khidi/consultation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "patientId": 42,
    "doctorId": "dr.kim@hospital.co.kr",
    "coordinatorId": "agent-5",
    "sessionType": "pre_consultation",
    "scheduledAt": "2026-04-10T14:00:00Z",
    "patientLanguage": "ru",
    "doctorLanguage": "ko",
    "notes": "Initial assessment - patient scheduled for surgery 2026-04-20"
  }'
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": 123,
    "patient_id": 42,
    "session_type": "pre_consultation",
    "scheduled_at": "2026-04-10T14:00:00Z",
    "status": "scheduled",
    "livekit_room_name": "khidi-f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "created_at": "2026-04-03T16:30:00Z"
  }
}
```

**Step 2: Patient Joins Consultation**
```
Browser: http://localhost:3000/consultation/123
```

**Step 3: During Consultation**

Patient sends a message in Russian:
```bash
curl -X POST http://localhost:3000/api/khidi/consultation/123/messages \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "patient-42",
    "messageText": "Здравствуйте, доктор. Я готов к операции.",
    "senderRole": "patient",
    "senderName": "Aidar K."
  }'
```

System logs translation:
```bash
curl -X POST http://localhost:3000/api/khidi/consultation/123/translate \
  -H "Content-Type: application/json" \
  -d '{
    "originalText": "Здравствуйте, доктор. Я готов к операции.",
    "sourceLanguage": "ru",
    "targetLanguage": "ko",
    "translatedText": "안녕하세요, 의사선생님. 저는 수술할 준비가 되어있습니다.",
    "speakerRole": "patient",
    "confidence": 0.92
  }'
```

Doctor responds in Korean:
```bash
curl -X POST http://localhost:3000/api/khidi/consultation/123/messages \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "dr.kim@hospital.co.kr",
    "messageText": "좋습니다. 수술 전 검사 결과를 검토했습니다. 모든 것이 정상입니다.",
    "senderRole": "doctor",
    "senderName": "Dr. Park Kim"
  }'
```

**Step 4: After Consultation**

Doctor adds clinical notes and schedules follow-ups:
```bash
# Update consultation with completion info
curl -X PATCH http://localhost:3000/api/khidi/consultation/123 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "endedAt": "2026-04-10T14:45:00Z",
    "durationMinutes": 45,
    "clinicalSummary": "Patient assessed and deemed fit for surgery. Pre-operative labs normal. Patient understands procedure.",
    "recommendations": "Proceed with gastrectomy. Follow-up consultation on Day 7 post-op."
  }'
```

Auto-generate follow-up schedule:
```bash
curl -X POST http://localhost:3000/api/khidi/consultation/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "cancerType": "stomach",
    "treatmentPhase": "post_treatment",
    "startDate": "2026-04-20"
  }'
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "cancerType": "stomach",
    "treatmentPhase": "post_treatment",
    "startDate": "2026-04-20",
    "schedule": [
      {
        "date": "2026-05-04",
        "type": "follow_up",
        "description": "Follow-up consultation (Day 14)"
      },
      {
        "date": "2026-05-20",
        "type": "follow_up",
        "description": "Follow-up consultation (Day 30)"
      },
      {
        "date": "2026-07-20",
        "type": "follow_up",
        "description": "Follow-up consultation (Day 90)"
      },
      {
        "date": "2026-10-18",
        "type": "follow_up",
        "description": "Follow-up consultation (Day 180)"
      },
      {
        "date": "2027-04-20",
        "type": "follow_up",
        "description": "Follow-up consultation (Day 365)"
      }
    ],
    "totalSessions": 5
  }
}
```

---

## Example 2: Admin Dashboard Usage

### Scenario
A hospital coordinator needs to manage upcoming consultations for the day.

**Step 1: View Upcoming Consultations**
```bash
curl http://localhost:3000/api/khidi/consultation?status=scheduled&limit=10 \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 123,
      "patient_id": 42,
      "doctor_id": "dr.kim@hospital.co.kr",
      "session_type": "pre_consultation",
      "scheduled_at": "2026-04-10T14:00:00Z",
      "status": "scheduled",
      "patient_language": "ru",
      "livekit_room_name": "khidi-f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "cancer_patient_intakes": [
        {
          "id": 42,
          "cancer_type": "stomach",
          "cancer_stage": "Stage IIB",
          "first_name": "Aidar"
        }
      ],
      "created_at": "2026-04-03T16:30:00Z"
    },
    {
      "id": 124,
      "patient_id": 51,
      "doctor_id": "dr.lee@hospital.co.kr",
      "session_type": "follow_up",
      "scheduled_at": "2026-04-10T15:30:00Z",
      "status": "scheduled",
      "patient_language": "kz",
      "livekit_room_name": "khidi-a3b8c9d0-e1f2-4g5h-i6j7-k8l9m0n1o2p3",
      "cancer_patient_intakes": [
        {
          "id": 51,
          "cancer_type": "liver",
          "cancer_stage": "Stage IIIA",
          "first_name": "Zhanina"
        }
      ],
      "created_at": "2026-04-02T10:15:00Z"
    }
  ],
  "total": 2,
  "limit": 10,
  "offset": 0
}
```

**Step 2: Open Admin Dashboard**
```
Browser: http://localhost:3000/admin/consultations
```

UI shows:
- Filter tabs (Upcoming, Active, Completed, All)
- Two consultation cards
- Each card shows:
  - Patient name + cancer type
  - Session type (Pre-Treatment Assessment)
  - Scheduled date/time (2026-04-10 14:00 KST)
  - Status (Scheduled - blue badge)
  - Language pair (RU ↔ KO)
  - Cancer stage

**Step 3: Click to Expand a Consultation**

Details shown:
```
담당 의사: dr.kim@hospital.co.kr
코디네이터: agent-5
방 정보: khidi-f47ac10b-58cc-4372-a567-0e02b2c3d479
비고: Initial assessment - patient scheduled for surgery 2026-04-20

Action buttons:
- 상담 시작 (Start Consultation) → Opens /consultation/123
- 일정 변경 (Reschedule)
- 취소 (Cancel)
```

**Step 4: Start Consultation**

Click "상담 시작" button → Coordinator/Doctor redirected to:
```
http://localhost:3000/consultation/123
```

---

## Example 3: Real-Time Translation During Consultation

### Scenario
During a consultation, a translator logs real-time translations.

**Initial State (Consultation Room Page)**
- Video grid shows doctor and patient
- Chat tab active (empty initially)
- Translation tab shows historical translations

**Doctor Sends Message (in Korean)**
```bash
curl -X POST http://localhost:3000/api/khidi/consultation/123/messages \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "dr.kim@hospital.co.kr",
    "messageText": "종양의 크기가 좋아졌습니다. 다음 검사는 한 달 후입니다.",
    "senderRole": "doctor",
    "senderName": "Dr. Kim"
  }'
```

**Translator Logs Translation**
```bash
curl -X POST http://localhost:3000/api/khidi/consultation/123/translate \
  -H "Content-Type: application/json" \
  -d '{
    "originalText": "종양의 크기가 좋아졌습니다. 다음 검사는 한 달 후입니다.",
    "sourceLanguage": "ko",
    "targetLanguage": "ru",
    "translatedText": "Размер опухоли улучшился. Следующее обследование будет через месяц.",
    "speakerRole": "doctor",
    "confidence": 0.95
  }'
```

**Patient Sees in Translation Tab**
```
Doctor (의사)

KO (Original)
종양의 크기가 좋아졌습니다. 다음 검사는 한 달 후입니다.

RU (Translation)
Размер опухоли улучшился. Следующее обследование будет через месяц.
```

**Patient Responds**
```bash
curl -X POST http://localhost:3000/api/khidi/consultation/123/messages \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "patient-42",
    "messageText": "Спасибо! Что я должен делать в течение этого месяца?",
    "senderRole": "patient",
    "senderName": "Aidar"
  }'
```

**Translator Logs Response Translation**
```bash
curl -X POST http://localhost:3000/api/khidi/consultation/123/translate \
  -H "Content-Type: application/json" \
  -d '{
    "originalText": "Спасибо! Что я должен делать в течение этого месяца?",
    "sourceLanguage": "ru",
    "targetLanguage": "ko",
    "translatedText": "감사합니다! 이 달 동안 무엇을 해야 하나요?",
    "speakerRole": "patient",
    "confidence": 0.93
  }'
```

---

## Example 4: Multiple Consultations in a Day

### Scenario
A doctor has 3 consultations scheduled for 2026-04-10.

**List Today's Consultations**
```bash
curl "http://localhost:3000/api/khidi/consultation?status=scheduled&limit=50" \
  -H "Authorization: Bearer <token>"
```

Returns 3 consultations scheduled for 2026-04-10:
- 14:00 - Stomach cancer (pre_consultation) - Patient: Aidar
- 15:30 - Liver cancer (follow_up) - Patient: Zhanina
- 17:00 - Lung cancer (follow_up) - Patient: Azamat

**Doctor's Schedule in Admin Dashboard**
Filter shows "Upcoming" with 3 cards.

**First Consultation (14:00)**
1. Doctor clicks "상담 시작"
2. Joins room → `/consultation/123`
3. Video, chat, translation active
4. Completes consultation (45 min)
5. Clicks "End Call"

**Status Updates to "completed"**
```bash
curl -X PATCH http://localhost:3000/api/khidi/consultation/123 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "endedAt": "2026-04-10T14:45:00Z",
    "durationMinutes": 45,
    "clinicalSummary": "Patient responding well to pre-op preparation."
  }'
```

**Second Consultation (15:30)**
Same flow for consultation ID 124.

**Third Consultation (17:00)**
Same flow for consultation ID 125.

**End of Day Report**
Filter by "Completed":
```
All 3 consultations shown with ✓ badges
Total time: 2h 15m
Messages exchanged: 24
Translations logged: 18
Clinical summaries recorded: 3
```

---

## Example 5: Emergency Consultation

### Scenario
Patient in Kazakhstan experiences complications and needs emergency consultation.

**Urgent Booking (No pre-scheduling)**
```bash
curl -X POST http://localhost:3000/api/khidi/consultation \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 42,
    "doctorId": "dr.kim@hospital.co.kr",
    "coordinatorId": "agent-5",
    "sessionType": "emergency",
    "scheduledAt": "2026-04-10T16:00:00Z",
    "patientLanguage": "ru",
    "notes": "URGENT - Post-op complications. Patient reports pain and fever."
  }'
```

**Admin Dashboard**
Emergency consultation shows with:
- Red/orange alert badge
- Session type: "긴급 상담" (Emergency)
- Elevated priority in listing

**Immediate Join**
Doctor gets notification and clicks "상담 시작" to join immediately.

**Urgent Communication**
Doctor and patient communicate quickly via chat + translation.

**Clinical Decision**
```bash
# Doctor decides patient needs hospital admission
curl -X PATCH http://localhost:3000/api/khidi/consultation/126 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "durationMinutes": 15,
    "clinicalSummary": "Patient presents with post-op fever and abdominal pain. Advised immediate admission to local hospital. Coordinating with Kazakhstan clinic for admission.",
    "recommendations": "Emergency admission. IV antibiotics. Imaging studies. Follow-up call in 2 hours."
  }'
```

---

## Example 6: Auto-Scheduling After Treatment

### Scenario
After surgery, automatically create follow-up consultations based on cancer type.

**Trigger (After Surgery Recorded)**
```bash
curl -X POST http://localhost:3000/api/khidi/consultation/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 42,
    "cancerType": "stomach",
    "treatmentPhase": "post_treatment",
    "startDate": "2026-04-20"
  }'
```

**System Generates 5 Follow-ups**
```
Day 14 (2026-05-04) → Follow-up consultation #127
Day 30 (2026-05-20) → Follow-up consultation #128
Day 90 (2026-07-20) → Follow-up consultation #129
Day 180 (2026-10-18) → Follow-up consultation #130
Day 365 (2027-04-20) → Follow-up consultation #131
```

**Application Creates Consultations**
```javascript
// Pseudo-code for batch creation
for (const scheduledDate of schedule) {
  const consultation = await createConsultation({
    patientId: 42,
    doctorId: "dr.kim@hospital.co.kr",
    sessionType: "follow_up",
    scheduledAt: scheduledDate.date
  });
}
```

**Patient Calendar**
Shows 5 upcoming follow-ups spaced out over 1 year.

---

## Database State After Examples

### Consultations Table
```
id | patient_id | doctor_id | session_type | status
123 | 42 | dr.kim | pre_consultation | completed
124 | 51 | dr.lee | follow_up | completed
125 | 60 | dr.park | follow_up | scheduled
126 | 42 | dr.kim | emergency | completed
127 | 42 | dr.kim | follow_up | scheduled
128 | 42 | dr.kim | follow_up | scheduled
129 | 42 | dr.kim | follow_up | scheduled
130 | 42 | dr.kim | follow_up | scheduled
131 | 42 | dr.kim | follow_up | scheduled
```

### Messages Table
```
consultation_id | sender_role | message_text | created_at
123 | patient | Здравствуйте, доктор... | 2026-04-10 14:05
123 | doctor | 좋습니다. 수술 전 검사... | 2026-04-10 14:06
123 | patient | 감사합니다! | 2026-04-10 14:07
...
```

### Translations Table
```
consultation_id | source_lang | target_lang | speaker_role | confidence
123 | ru | ko | patient | 0.94
123 | ko | ru | doctor | 0.91
124 | kz | ko | patient | 0.89
...
```

---

**Status**: These examples are fully functional with the implemented system.
**Next**: Replace mock tokens with LiveKit tokens when ready.
