# WebRTC Telemedicine Consultation System - Implementation Guide

## Overview

This document describes the WebRTC telemedicine consultation system implemented for the HEALO-KHIDI project. It enables remote consultations between Korean hospitals and Kazakhstan cancer patients with real-time translation support.

**Status**: Mock/Fallback implementation ready for LiveKit integration

## Architecture

### Core Components

#### 1. Database Layer
**Migration**: `migrations/20260403_add_consultation_sessions.sql`

Four main tables:

- **`consultation_sessions`** (core)
  - Stores consultation metadata
  - Tracks patient, doctor, coordinator, translator
  - Manages LiveKit room info and tokens
  - Supports 4 session types: `pre_consultation`, `follow_up`, `emergency`, `diagnostic`
  - 5 status states: `scheduled`, `active`, `completed`, `cancelled`, `no_show`

- **`consultation_translations`**
  - Real-time translation logs
  - Tracks source/target languages (ru, kz, ko, en)
  - Records speaker role and confidence score

- **`consultation_messages`**
  - Text chat messages during consultation
  - Supports editing and metadata

- **`consultation_participants`** (for future use)
  - Extended participant tracking with WebRTC stats

**Indexes**: Optimized for common queries (patient_id, doctor_id, status, scheduled_at)

**Views**:
- `v_upcoming_consultations` - Schedule view for admins
- `v_todays_consultations` - Daily operations dashboard

---

#### 2. API Layer

All endpoints under `/api/khidi/consultation/`

**POST /api/khidi/consultation** - Create/Schedule Consultation
```typescript
// Request
{
  patientId: number,              // Required: cancer_patient_intakes.id
  doctorId?: string,              // Optional: doctor email/ID
  coordinatorId?: string,         // Optional: agent user ID
  translatorId?: string,          // Optional: translator ID
  sessionType: string,            // pre_consultation | follow_up | emergency | diagnostic
  scheduledAt: ISO8601,           // UTC timestamp
  patientLanguage?: string,       // ru | kz | en (default: ru)
  doctorLanguage?: string,        // ko | en (default: ko)
  notes?: string
}

// Response
{
  ok: true,
  data: {
    id: number,
    patient_id: number,
    session_type: string,
    scheduled_at: ISO8601,
    status: "scheduled",
    livekit_room_name: string,    // UUID-based unique room name
    created_at: ISO8601
  }
}
```

**GET /api/khidi/consultation** - List Consultations
```typescript
// Query Parameters
{
  limit?: number,         // Max 200, default 50
  offset?: number,        // Pagination offset, default 0
  status?: string,        // Filter: scheduled | active | completed | cancelled
  patientId?: number,     // Filter by patient
  doctorId?: string       // Filter by doctor
}

// Response
{
  ok: true,
  data: [{
    id: number,
    patient_id: number,
    doctor_id: string | null,
    session_type: string,
    scheduled_at: ISO8601,
    status: string,
    patient_language: string,
    livekit_room_name: string,
    cancer_patient_intakes: [{
      id: number,
      cancer_type: string,
      cancer_stage: string,
      first_name: string
    }],
    created_at: ISO8601
  }],
  total: number,
  limit: number,
  offset: number
}
```

**GET /api/khidi/consultation/[id]** - Get Consultation Details
```typescript
// Response
{
  ok: true,
  data: {
    id: number,
    patient_id: number,
    doctor_id: string | null,
    session_type: string,
    scheduled_at: ISO8601,
    started_at: ISO8601 | null,
    ended_at: ISO8601 | null,
    duration_minutes: number | null,
    status: string,
    patient_language: string,
    doctor_language: string,
    livekit_room_name: string,
    notes: string | null,
    clinical_summary: string | null,
    recommendations: string | null,
    cancer_patient_intakes: [{ ... }],
    created_at: ISO8601,
    updated_at: ISO8601
  }
}
```

**PATCH /api/khidi/consultation/[id]** - Update Consultation
```typescript
// Request (partial update)
{
  status?: string,              // scheduled | active | completed | cancelled | no_show
  startedAt?: ISO8601,          // When consultation started
  endedAt?: ISO8601,            // When consultation ended
  durationMinutes?: number,     // Actual duration in minutes
  notes?: string,               // Admin notes
  clinicalSummary?: string,     // Doctor's clinical assessment
  recommendations?: string,     // Next steps / follow-up plan
  doctorId?: string,            // Assign/reassign doctor
  translatorId?: string         // Add/change translator
}

// Response
{
  ok: true,
  data: { ... }  // Updated session object
}
```

**POST /api/khidi/consultation/schedule** - Auto-Generate Consultation Schedule
```typescript
// Request
{
  patientId: number,                // Optional: for auto-linking
  cancerType: string,               // stomach | liver | lung | breast | thyroid | other
  treatmentPhase: string,           // pre_treatment | during_treatment | post_treatment
  startDate?: ISO8601               // Default: today
}

// Response
{
  ok: true,
  data: {
    cancerType: string,
    treatmentPhase: string,
    startDate: ISO8601,
    schedule: [{
      date: ISO8601,
      type: string,                 // pre_consultation | follow_up
      description: string
    }],
    totalSessions: number
  }
}

// Example: Stomach cancer during treatment = 7 sessions over 6 weeks
```

**POST /api/khidi/consultation/[id]/messages** - Send Message
```typescript
// Request
{
  senderId: string,               // Required: user ID or email
  messageText: string,            // Required: message content
  senderRole?: string,            // patient | doctor | coordinator | translator
  senderName?: string             // Display name
}

// Response
{
  ok: true,
  data: { id, consultation_id, sender_id, message_text, created_at, ... }
}
```

**GET /api/khidi/consultation/[id]/messages** - Get Messages
```typescript
// Query Parameters
{
  limit?: number,     // Max 500, default 100
  offset?: number     // Pagination offset
}

// Response
{
  ok: true,
  data: [{ id, consultation_id, sender_id, sender_name, message_text, created_at, ... }],
  total: number,
  limit: number,
  offset: number
}
```

**POST /api/khidi/consultation/[id]/translate** - Log Translation
```typescript
// Request
{
  originalText: string,           // Required: source text
  sourceLanguage: string,         // Required: ru | kz | ko | en
  targetLanguage: string,         // Required: ru | kz | ko | en
  translatedText?: string,        // Translated text (for logging)
  speakerRole?: string,           // patient | doctor | coordinator
  confidence?: number             // 0.0 to 1.0 confidence score
}

// Response
{
  ok: true,
  data: { id, consultation_id, original_text, translated_text, ... }
}
```

**GET /api/khidi/consultation/[id]/translate** - Get Translations
```typescript
// Query Parameters
{
  limit?: number,           // Max 500, default 100
  offset?: number,          // Pagination offset
  sourceLanguage?: string,  // Filter by source language
  targetLanguage?: string   // Filter by target language
}

// Response
{
  ok: true,
  data: [{ id, original_text, translated_text, source_language, target_language, ... }],
  total: number
}
```

---

#### 3. Frontend Components

**Consultation Room Page**: `/app/consultation/[id]/page.jsx`

Full-featured WebRTC telemedicine interface:

- **Video Grid** (2 panels)
  - Doctor video (Korean hospital)
  - Patient video (Kazakhstan)
  - Mock placeholder UI with camera icons
  - Camera on/off toggle with visual feedback

- **Control Bar**
  - Mic toggle (mute/unmute)
  - Camera toggle (start/stop)
  - Screen share toggle
  - Translation panel toggle
  - Recording indicator
  - End call button

- **Right Sidebar** (Dual mode)
  - **Chat Tab**: Real-time text messaging
    - Auto-scroll to latest message
    - Message bubbles with sender info
    - Input field with Enter-to-send
  - **Translation Tab**: Real-time translation logs
    - Original text (source language)
    - Translated text (target language)
    - Speaker role (doctor/patient)
    - Confidence score (if available)

- **Header**
  - Patient name and cancer type
  - Cancer stage
  - Session type (pre-treatment, follow-up, etc.)
  - Room identifier

**Features**:
- Responsive design (mobile-friendly sidebar)
- Dark theme (suitable for video calls)
- Real-time message updates
- Translation display with confidence scores
- Mock data for demo/fallback mode

---

**Consultation Dashboard (Admin)**: `/app/admin/consultations/page.jsx`

Management interface for doctors and admins:

- **Filter Tabs**
  - Upcoming (scheduled)
  - Active (in progress)
  - Completed
  - All

- **Consultation Cards**
  - Quick summary (collapsed)
    - Patient name + cancer type
    - Session type and status
    - Scheduled date/time
    - Language pair (ru ↔ ko)
    - Cancer stage
  - Expanded details
    - Doctor assignment
    - Coordinator info
    - LiveKit room identifier
    - Notes and clinical summary
    - Action buttons

- **Action Buttons**
  - "상담 시작" (Start Consultation) → Links to consultation room
  - "일정 변경" (Reschedule) → Opens date picker (UI placeholder)
  - "취소" (Cancel) → Confirms and updates status

- **Status Indicators**
  - Color-coded badges
  - Waiting status (hours until session)
  - Quick visual scan

---

**AdminNav Update**: `/app/admin/_components/AdminNav.jsx`

Added "원격협진" (WebRTC Consultation) link under KHIDI section:
- Icon: Video (from lucide-react)
- Link: `/admin/consultations`
- Position: Second in KHIDI group (after Human Agent, before Intake)

---

## Data Flow

### Creating a Consultation

```
1. Patient/Agent initiates consultation
   ↓
2. POST /api/khidi/consultation with session details
   ↓
3. API generates:
   - Unique room_name (UUID-based)
   - Mock LiveKit tokens
   - Consultation record in DB
   ↓
4. Response includes consultation ID
   ↓
5. Redirect to /consultation/[id] for patient
   OR admin can manage via /admin/consultations
```

### During Consultation

```
1. Patient/Doctor access /consultation/[id]
   ↓
2. Fetch consultation details + joined participants
   ↓
3. Send/receive messages
   - POST to /api/khidi/consultation/[id]/messages
   - Fetch updates: GET /api/khidi/consultation/[id]/messages
   ↓
4. Log translations
   - POST to /api/khidi/consultation/[id]/translate
   - Display real-time translation panel
   ↓
5. Record audio/video (mock for now)
   ↓
6. Click "End Call" → PATCH status to "completed"
```

### Post-Consultation

```
1. Doctor/Coordinator adds clinical summary
   - PATCH /api/khidi/consultation/[id]
   - Update: clinical_summary, recommendations
   ↓
2. System auto-generates follow-up schedule
   - POST /api/khidi/consultation/schedule
   - Based on cancer type and treatment phase
   ↓
3. Follow-up consultations created and scheduled
```

---

## Language Support

### Supported Languages

| Code | Language | Region |
|------|----------|--------|
| `ru` | Русский | Russia, Kazakhstan |
| `kz` | Қазақша | Kazakhstan |
| `ko` | 한국어 | Korea |
| `en` | English | International |

### Session Language Pairs

- Default: `patientLanguage: "ru"`, `doctorLanguage: "ko"`
- Can be customized per consultation
- Translations logged with language codes
- UI supports switching between languages in translation panel

---

## Cancer Type Schedule Templates

### Pre-Treatment Assessment
All cancer types: **1 session** (Day 0)

### During Treatment

| Cancer | Duration | Sessions | Frequency |
|--------|----------|----------|-----------|
| Stomach | 6 weeks | 7 sessions | Weekly |
| Liver | 5 weeks | 5 sessions | Weekly |
| Lung | 7 weeks | 8 sessions | Weekly |
| Breast | 4 weeks | 5 sessions | Weekly |
| Thyroid | 2 weeks | 3 sessions | Weekly |

### Post-Treatment Follow-ups
All types: Day 14, 30, 90, 180, 365 (5 sessions over 1 year)

---

## LiveKit Integration (Future)

Currently using **mock tokens**. To integrate with LiveKit:

1. **Get LiveKit API Credentials**
   - API Key
   - API Secret
   - URL endpoint

2. **Update `.env.local`**
   ```
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   LIVEKIT_URL=https://your-livekit-server.com
   ```

3. **Update API Route** (`app/api/khidi/consultation/route.ts`)
   ```typescript
   // Replace mock token generation
   const AccessToken = require("livekit-server-sdk").AccessToken;

   const at = new AccessToken(apiKey, apiSecret);
   at.addGrant({
     room: roomName,
     roomJoin: true,
     canPublish: true,
     canPublishData: true,
     canSubscribe: true,
   });

   const token = at.toJwt();
   ```

4. **Install LiveKit Client SDK** (browser)
   ```bash
   npm install livekit-client
   ```

5. **Update Consultation Room Page**
   ```jsx
   import { LiveKitRoom, VideoConference } from '@livekit/components-react';

   // Replace mock video divs with LiveKit component
   <LiveKitRoom
     url={serverUrl}
     token={token}
     connect={true}
   >
     <VideoConference />
   </LiveKitRoom>
   ```

---

## Testing

### Manual Testing Checklist

**1. API Routes**
```bash
# Create consultation
curl -X POST http://localhost:3000/api/khidi/consultation \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "sessionType": "pre_consultation",
    "scheduledAt": "2026-04-05T14:00:00Z"
  }'

# List consultations
curl http://localhost:3000/api/khidi/consultation?limit=10

# Get details
curl http://localhost:3000/api/khidi/consultation/1

# Generate schedule
curl -X POST http://localhost:3000/api/khidi/consultation/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "cancerType": "stomach",
    "treatmentPhase": "during_treatment"
  }'
```

**2. Consultation Room**
- Navigate to `/consultation/[id]` (where [id] is valid consultation ID)
- Verify:
  - Header displays patient info
  - Video grid shows mock participants
  - Controls toggle states
  - Chat panel displays mock messages
  - Translation panel shows mock translations
  - Message sending works (adds to chat)

**3. Admin Dashboard**
- Navigate to `/admin/consultations`
- Verify:
  - Filter tabs work
  - Consultation cards display correctly
  - Expand/collapse works
  - Join/reschedule/cancel buttons appear
  - Status badges show correct colors

**4. Admin Nav**
- Check sidebar navigation
- "원격협진" link appears under KHIDI section
- Click navigates to `/admin/consultations`

---

## Performance Considerations

### Database
- **Indexes**: All major queries have indexes
  - Patient lookups: `idx_consultation_sessions_patient`
  - Doctor assignments: `idx_consultation_sessions_doctor`
  - Status filtering: `idx_consultation_sessions_status`
  - Room lookups: `idx_consultation_sessions_livekit_room`
- **Pagination**: Default 50 results, max 200
- **Cleanup**: Consider archiving completed sessions after 1 year

### API
- **Rate limiting**: Not yet implemented (recommend: 100 req/min per user)
- **Caching**: Consider caching consultation list (5 min TTL)
- **Real-time**: Use polling for now (10-second intervals)
  - Future: Implement WebSocket for live updates

### Frontend
- **Message rendering**: Virtualize long message lists (1000+)
- **Translation logs**: Paginate with infinite scroll
- **Video stream**: Mock divs are lightweight
  - LiveKit will require proper resource management

---

## Security & Privacy

### Current
- ✅ Database RLS (row-level security) not yet applied
- ✅ Message encryption not implemented
- ✅ Recording is mock (no actual storage)

### Recommendations
1. **Enable RLS**: Patient can only see own sessions
   ```sql
   ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;
   ```

2. **Encrypt Messages**: Use pgcrypto or application-level encryption

3. **Recording Consent**: Add checkbox before recording starts

4. **Data Retention**: Delete/archive after compliance period

5. **Access Logs**: Track who accessed what consultation and when

---

## Future Enhancements

### Phase 2 (Q2 2026)
- [ ] LiveKit integration (real video/audio)
- [ ] Real-time translation API (Google Cloud Translation or similar)
- [ ] Screen sharing with annotation tools
- [ ] Session recording with consent
- [ ] Automated follow-up scheduling

### Phase 3 (Q3 2026)
- [ ] AI-powered clinical summary generation
- [ ] Prescription/treatment plan generation
- [ ] Integration with hospital EHR systems
- [ ] Mobile app (React Native)
- [ ] Push notifications

### Phase 4+ (Q4 2026)
- [ ] Multi-language UI (currently Korean/Russian)
- [ ] Advanced analytics (consultation duration, satisfaction)
- [ ] Telemedicine billing integration
- [ ] Insurance claim generation

---

## File Structure

```
/HEALO_KHIDI
├── migrations/
│   └── 20260403_add_consultation_sessions.sql    # Database schema
├── app/
│   ├── api/khidi/consultation/
│   │   ├── route.ts                               # POST/GET consultations
│   │   ├── [id]/
│   │   │   ├── route.ts                          # GET/PATCH single
│   │   │   ├── messages/
│   │   │   │   └── route.ts                      # Messages API
│   │   │   └── translate/
│   │   │       └── route.ts                      # Translations API
│   │   └── schedule/
│   │       └── route.ts                          # Auto-schedule API
│   ├── consultation/
│   │   └── [id]/
│   │       └── page.jsx                          # WebRTC room UI
│   └── admin/
│       ├── consultations/
│       │   └── page.jsx                          # Admin dashboard
│       └── _components/
│           └── AdminNav.jsx                      # Updated with consultation link
└── CONSULTATION_IMPLEMENTATION.md                 # This file
```

---

## Support & Debugging

### Common Issues

**1. Consultation Not Found**
```
Error: Consultation not found
→ Verify consultation ID exists in DB
→ Check patient_id is valid
```

**2. LiveKit Tokens Not Valid** (when integrating)
```
Error: Invalid token
→ Check API key/secret in .env
→ Verify room name matches token grant
→ Confirm token not expired
```

**3. Messages Not Loading**
```
→ Check API response status
→ Verify consultation_id in URL matches
→ Check Supabase connection
```

**4. UI Not Responsive**
```
→ Check viewport/window size
→ Verify Tailwind CSS loaded
→ Check console for JavaScript errors
```

### Logging

All endpoints log to console:
```
[api/khidi/consultation] New session: 123 (pre_consultation)
[api/khidi/consultation/123/messages] New message from user-456
[api/khidi/consultation/123/translate] New translation: ru → en
```

---

## Contact & Questions

For questions about this implementation:
1. Check the database schema in the migration file
2. Review API response examples above
3. Test endpoints with curl/Postman
4. Check browser console for client-side errors
5. Review Supabase logs for server-side errors

---

**Last Updated**: 2026-04-03
**Version**: 1.0 (Mock/Fallback Ready)
**Status**: Ready for LiveKit Integration
