# -*- coding: utf-8 -*-
"""대표 작업본(260820 16:53 판)을 원본으로 삼아 «비어 있는 칸만» 대표 문체로 채운다.

대표가 이미 쓴 칸은 절대 건드리지 않는다. 채우는 곳만 채운다.

대표 문체 (작업본에서 뽑은 규칙)
  1. 개조식·명사형 종결 — 「~함」 「~구축」 「~운영」. 「~한다/~이다」 서술형 지양
  2. 「o (분류) 내용」 라벨 달기 — (서비스) (에이전시) (의료기관) (사전상담)
  3. 한 줄에 한 사실. 부연·수식은 뺀다
  4. 기술 용어는 그대로 쓴다 — i18n, RAG, AES-256, /ru‧/kz, WebRTC
  5. 참여기관 역할은 「- 」 목록
  6. 가운뎃점은 ‧ (U+2027)

쓰는 법:  python scripts/hwp/fill_po_0820.py <대표작업본.hwpx> <결과.hwpx>

⚠️ 그림은 «절대» 건드리지 않는다. 대표가 인스타그램 게시물·영상 가편집본·SWOT·비즈니스모델
   다섯 장을 직접 넣었다. image1.bmp 를 갈아끼우면 인스타그램 사진이 날아간다.
"""
import sys, copy, zipfile
from lxml import etree

HP = '{http://www.hancom.co.kr/hwpml/2011/paragraph}'
HH = '{http://www.hancom.co.kr/hwpml/2011/head}'

SRC, DST = sys.argv[1], sys.argv[2]

CELLS = {}


def put(t, rows):
    for (r, c), v in rows.items():
        CELLS[(t, r, c)] = v


# 참여인력 9명을 넣으려면 표 24 의 줄이 2줄 모자란다
ROW_CLONES = [(25, 12, 2)]
SPAN_FIX = [(25, 5, 0, 2)]

# ═══════════════════ 수행기관 정보: 대표 확인으로 바로잡은 것
#   신촌면력한방병원 영문은 Sinchon 이 맞다 (대표: 「신촌 영문은 내가 잘못 입력한거야」 2026-08-19)
put(3, {(18, 0): '영문) Sinchon Immune Hospital'})

# ═══════════════════ 성과목표 표: 서비스명 정정
#   대표가 사업계획서(2026-04 제출본)에서 옮겨 적은 칸에 옛 이름이 남아 있다.
#   서비스명은 healwith 하나뿐이고 병기도 하지 않는다(상표권 출원 이슈로 바꾼 이름이라
#   버린 이름을 같이 적는 것 자체가 위험하다). 2026-08-20 대표 확정.
put(13, {(4, 2): 'healwith 플랫폼 고도화'})

# ═══════════════════ 1부 ① 사업개요(요약): 대표가 미완으로 둔 두 칸만 이어 쓴다
#   앞부분은 대표가 쓴 문장 그대로 두고 뒤에 이어 붙인다
put(5, {
    (8, 1): 'o 카자흐스탄 UMIT International Oncological Center와 업무협약을 체결하여 '
            '귀국 후 사후관리에 필요한 현지 거점 확보\n'
            'o 2026년 7월 플랫폼 개발 완료·실서비스 운영 진입(healwith.co.kr), 8월 모바일 앱 정식 출시\n'
            'o 이대서울병원 회신 소견 수령(08.14): 현지 환자 자료 → 국내 대학병원 검토 → '
            '러시아어 회신의 협진 왕복 실증\n'
            'o 제2의료소견 6건 확보(이대서울‧이대목동‧면력한방), 5건 환자 전달 완료',
    (10, 1): 'o 장기 이식, 말기 암 환자의 문의가 대다수였으나 공여자가 없거나, 직접 검사 전에는 '
             '치료 스케쥴이나 비용을 안내하기 어렵다는 답변을 받아 실제 환자 유치로 연결되지 않았음\n'
             'o 종합 검진, 타겟 국가 확대 등 가능성을 열어두고 치료 가능 군 중심으로 유입 채널을 조정 중이며, '
             '현지 에이전시 경유 외에 검색광고 직접 유입 경로를 병행 추진\n'
             'o (건의) 현지 에이전시가 대면 병원 실사 후 송출을 요구하여 초기 송출이 지연됨. '
             '진흥원 주관 현지 홍보·바이어 초청 사업과의 연계 지원을 건의',
})

# ═══════════════════ 1부 ② 계획 대비 추진실적 (4월은 대표가 쓴 것: 건드리지 않음)
put(6, {
    (2, 0): '5월',
    (2, 1): 'o 플랫폼 배포\no AI Agent 초기 학습 데이터셋 구축\no 현지 마케팅 실행',
    (2, 2): 'o healwith 플랫폼 배포\no 성과지표 자동집계 대시보드 구축\n'
            'o AI 품질관리 3종 적용(자기검증‧환각 차단‧회귀 시험)\n'
            'o 통합 문의 퍼널 오픈(4개 폼 → 1개)\no 화상상담 실시간 자막 적용\n'
            'o MedVoyage(영국) MOU 체결(05.08)',
    (2, 3): '',
    (3, 0): '6월',
    (3, 1): 'o WebRTC 화상상담 시스템 구축\no 현지어 UI 완성\no 원격상담 기능 완성',
    (3, 2): 'o 6개 언어 UI 완성(ko‧en‧ru‧kz‧zh‧ja)\no 원격협진(WebRTC) 구축\n'
            'o AI 사전상담 3단계 RAG 적용\no 해외 의료기관 경과 업로드 기능 구현(06.22)\n'
            'o 해외 파트너 협의 4회',
    (3, 3): '',
    (4, 0): '7월',
    (4, 1): 'o 사전상담‧매칭‧예약 운영\no 내원 환자 치료(면역치료+대학병원 협진)\no 원격 경과관찰 개시',
    (4, 2): 'o 개발 완료, 실서비스 운영 진입(healwith.co.kr)\no 텔레그램 상담 채널 오픈(07.23)\n'
            'o 사후관리 자동 안내 구현(07.24)\no 해외 파트너 협의 11회\n'
            'o MedicaTour 에이전시 계약(07.14), UMIT 3자 MOU(07.20)\n'
            'o 이화여자대학교 의료원 의료서비스 협약서 작성(07.16)\no 제2의료소견서 2건 발급‧전달',
    (4, 3): '실환자 유치 미발생',
    (5, 0): '8월',
    (5, 1): 'o 상담‧치료‧사후관리 운영\no 중간평가 준비(08.27)',
    (5, 2): 'o 영상 사전상담 1건(08.03), 러시아어 소견서 발급(08.04)\n'
            'o 대학병원 의뢰서 2건 발송(08.10) → 이대서울병원 회신 소견 수령(08.14)\n'
            'o 모바일 앱 정식 출시(08.13, Google Play)\n'
            'o 문의 접수 2단계 개편, 병원 CD 업로드‧서류 자동 판독\n'
            'o 현지 검색광고‧파트너 방한 실사 진행',
    (5, 3): '유치 전환 진행 중',
})

# ═══════════════════ 2부 사업추진경과 (월별)
#   ⚠️ 대표가 2026-08-20 에 4~8월을 직접 다 채웠다. 손대지 않는다.
#      (칸 병합도 바뀌어서 짝수 줄은 칸이 둘뿐이다. 옛 좌표로 쓰면 엉뚱한 자리에 들어간다.)

# ═══════════════════ 3부 정산 총괄표 (예시값 → 실측)
put(22, {
    (2, 1): '87,500,000', (2, 2): '7,117,273', (2, 3): '8.1', (2, 4): '80,382,727',
    (2, 5): '확인 필요', (2, 6): '2026.08.19 기준',
    (3, 1): '70,000,000', (3, 2): '7,117,273', (3, 3): '10.2', (3, 4): '62,882,727',
    (3, 5): '확인 필요', (3, 6): '해외결제 US$55.86 별도',
    (4, 1): '17,500,000', (4, 2): '0', (4, 3): '0.0', (4, 4): '17,500,000',
    (4, 5): '-', (4, 6): '현물 투입 진행 중',
})

# ═══════════════════ 3부 세부사업별 집행현황
put(23, {
    (2, 1): '', (2, 2): '', (2, 3): '10,904,000', (2, 4): '', (2, 5): '7,117,273 + US$55.86', (2, 6): '-',
    (3, 0): '운영비‧일반수용비\n(홍보비)', (3, 1): '07.16', (3, 2): '계', (3, 3): '10,000,000',
    (3, 4): '', (3, 5): '7,000,000', (3, 6): '3,000,000',
    (4, 0): '온라인 마케팅 위탁\n(홍보영상 2편‧SNS 소재)', (4, 1): '10,000,000',
    (4, 2): '2,000,000 × 5개월', (4, 3): '7,000,000\n(공급가액)', (4, 4): '3,000,000',
    (5, 0): '', (5, 1): '', (5, 2): '', (5, 3): '', (5, 4): '',
    (6, 0): '', (6, 1): '', (6, 2): '', (6, 3): '', (6, 4): '',
    (7, 0): '운영비‧일반수용비\n(플랫폼 운영)', (7, 1): '07.23~07.28', (7, 2): '계', (7, 3): '904,000',
    (7, 4): '', (7, 5): '117,273 + US$55.86', (7, 6): '-',
    (8, 0): 'Apple Developer 연간 등록', (8, 1): '129,000', (8, 2): '129,000 × 1식',
    (8, 3): '117,273\n(공급가액)', (8, 4): '11,727',
    (9, 0): 'Vercel PRO(웹 호스팅)', (9, 1): '175,000', (9, 2): '35,000($20) × 5개월',
    (9, 3): 'US$22.00', (9, 4): '확인 필요',
    (10, 0): 'Supabase PRO(DB‧인증)', (10, 1): '200,000', (10, 2): '40,000($25) × 5개월',
    (10, 3): 'US$27.50', (10, 4): '확인 필요',
    (11, 0): 'LiveKit(원격협진 영상)', (11, 1): '400,000', (11, 2): '80,000($50) × 5개월',
    (11, 3): 'US$6.36', (11, 4): '확인 필요',
})

# ═══════════════════ 4부 참여기업 개요
put(25, {
    (0, 2): '본로이 (BONROI)', (0, 4): '강주영',
    (1, 1): '우편번호 : 07803    서울시 강서구 강서로 385, 우성에스비타워 613호',
    (1, 2): '전화 : 070-7500-7795\n팩스 : 02-6455-7049',
    (2, 1): '부  서 : 전략기획        직  위 : 대표이사        성  명 : 강주영',
    (3, 1): '전  화 : 070-7500-7795    핸드폰 : 010-7323-2296    E-mail : roiimmunelab@immunelab.co.kr',
    (4, 2): '47,000 천원', (4, 4): '10,500 천원',
    (6, 0): '강주영', (6, 1): 'PM‧사업 총괄', (6, 2): '확인 필요', (6, 3): '확인 필요', (6, 4): '본로이‧참여율 100%',
    (7, 0): '문석민', (7, 1): '플랫폼 개발‧운영', (7, 2): '확인 필요', (7, 3): '확인 필요', (7, 4): '본로이‧참여율 30%',
    (8, 0): '강주열', (8, 1): '의료서비스 기획', (8, 2): '확인 필요', (8, 3): '확인 필요', (8, 4): '본로이‧06.01~07.31',
    (9, 0): '황이준', (9, 1): '진료 총괄‧협진', (9, 2): '확인 필요', (9, 3): '확인 필요', (9, 4): '면력한방병원‧100%',
    (10, 0): '황선미', (10, 1): '원격상담 운영', (10, 2): '확인 필요', (10, 3): '확인 필요', (10, 4): '면력한방병원‧4%',
    (11, 0): '김효진', (11, 1): '상담‧사후관리', (11, 2): '확인 필요', (11, 3): '확인 필요', (11, 4): '면력한방병원‧4%',
    (12, 0): '아셀 알무카노바', (12, 1): '러시아어 환자 상담', (12, 2): '확인 필요', (12, 3): '확인 필요',
    (12, 4): '면력‧06.01~10.31',
    (13, 0): '유형진', (13, 1): '원격 협진', (13, 2): '확인 필요', (13, 3): '확인 필요', (13, 4): '신촌면력한방병원‧100%',
    (14, 0): '원해진', (14, 1): '상담‧사후관리', (14, 2): '확인 필요', (14, 3): '확인 필요', (14, 4): '신촌면력한방병원‧7%',
})

# ═══════════════════ 4부 항목별 추진현황
put(27, {
    (2, 0): '분석',
    (2, 1): '현황분석: 카자흐스탄 암 진료 실태‧해외이송 사유 조사, 현지 에이전시 관행 분석',
    (2, 2): '4월', (2, 3): '4월 완료', (2, 4): '0',
    (3, 0): '패키지시연: 기존 데모 플랫폼 시연 후 사업 재설계 결정(04.06)', (3, 1): '4월', (3, 2): '4월 완료', (3, 3): '0',
    (4, 0): 'GAP분석: 3대 한계 도출(의료정보 비대칭‧언어 장벽‧사후관리 단절)', (4, 1): '4월', (4, 2): '4월 완료', (4, 3): '0',
    (5, 0): '요구사항 도출: 6대 ICT 서비스 정의(사전상담 3 + 사후관리 3)', (5, 1): '4월', (5, 2): '4~6월 완료', (5, 3): '0',
    (6, 0): '분석단계 종합검토: 요구사항 정의서‧화면 설계서 확정', (6, 1): '4월', (6, 2): '4월 완료', (6, 3): '0',
    (7, 0): '설계',
    (7, 1): '인터페이스 설계: 6개 언어 UI 체계, 통합 문의 퍼널, 5종 권한 화면 구조', (7, 2): '4~5월', (7, 3): '5월 완료', (7, 4): '0',
    (8, 0): '데이터 설계: 개인정보 AES-256 컬럼, 접근 권한 규칙, 상담‧문의‧성과지표 스키마',
    (8, 1): '4~5월', (8, 2): '5월 완료', (8, 3): '0',
    (9, 0): '프로그램 설계: AI 상담 3단계 RAG, 원격협진 방‧토큰, 성과지표 자동집계',
    (9, 1): '4~5월', (9, 2): '5월 완료', (9, 3): '0',
    (10, 0): '시험 설계: 자동 검사 시나리오 25건, AI 회귀 시험 항목(05.19)', (10, 1): '5월', (10, 2): '5월 완료', (10, 3): '0',
    (11, 0): '개발',
    (11, 1): '개발 및 구축: 원격협진(WebRTC‧실시간 자막), AI 사전상담(RAG‧6개 언어), 성과 대시보드, '
             '협진 의뢰 흐름, 에이전시 포털, 사후관리 자동 안내, 대용량 영상‧판독 처리, 문의 접수 2단계 개편',
    (11, 2): '6~7월', (11, 3): '7월 완료, 8월 고도화', (11, 4): '0',
    (12, 0): '통합 및 시스템 시험: 자동 검사 상시 가동, AI 품질 매일 자동 채점', (12, 1): '7월', (12, 2): '7월 완료, 상시', (12, 3): '0',
    (13, 0): '사용자 교육: 계층별 사용설명서 배포(어드민‧코디네이터‧에이전시‧병원)', (13, 1): '7월', (13, 2): '7~8월 완료', (13, 3): '0',
    (14, 0): '사용자 시험: 실회의 투입 시험(카자흐 파트너 회의 실시간 통역 자막 112건, 07.14)', (14, 1): '7월', (14, 2): '7월 완료', (14, 3): '0',
    (15, 0): '운영',
    (15, 1): '운영환경 준비: 실서비스 배포 창구, 오프사이트 백업, 오류 감시 체계', (15, 2): '7월', (15, 3): '7월 완료', (15, 4): '0',
    (16, 0): '설치 및 인도: 실서비스 운영 개시(healwith.co.kr), 모바일 앱 출시(08.13)', (16, 1): '7월', (16, 2): '7~8월 완료', (16, 3): '0',
    (17, 0): '운영 및 통제: 성과지표 자동집계, 미완료 상담‧설문 미발송 자동 경보, 시험 데이터 자동 제외',
    (17, 1): '7~11월', (17, 2): '7월 개시, 운영 중', (17, 3): '0',
})

# ═══════════════════ 4부 미진사유 및 대책방향
put(28, {
    (1, 0): '운영(유치 실적)',
    (1, 1): '문의 대다수가 장기이식‧말기암으로 국내 치료 적응증 미충족. '
            '공여자 부재 또는 직접 검사 전 일정‧비용 안내 불가로 유치 미전환',
    (1, 2): '종합검진‧조기암 등 치료 가능 군으로 유입 채널 조정. '
            '현지 검색광고 직접 유입 병행, 파트너 방한 병원 실사 실시',
    (1, 3): '9월 전환 목표',
    (2, 0): '운영(사업비 집행)',
    (2, 1): '집행률 8.1%. 인건비‧국외여비‧위탁사업비가 8월 이후 집중',
    (2, 2): '8월 중 현지 검색광고 집행, 국외 출장 실행. 소모품비‧인건비 월별 한도 내 순차 집행',
    (2, 3): '',
    (3, 0): '', (3, 1): '', (3, 2): '', (3, 3): '',
})

# ═══════════════════ 표 밖 문단 (대표 작업본 기준 번호)
PARA_BLOCKS = {
    # 기타성과: 대표가 콘텐츠·네트워크 두 줄을 썼고 아래 두 칸이 비어 있다
    (77, 78): [
        'ㅇ (투입 대비 산출) 사업비 8.1% 집행 시점에 6대 ICT 서비스 구축을 완료하고 실서비스 운영에 진입. '
        '제2의료소견 6건 확보‧전달, 화상상담 15회 진행(2명 이상 실제 입장 기준)',
        'ㅇ (사회적 파급효과) 러시아어‧카자흐어 의료정보 공개 채널을 제공하여 브로커 의존 없이 '
        '한국 의료에 접근할 수 있는 경로 확보. 해외 에이전시 수수료‧정산 조건을 계약서로 명문화하여 '
        '구두 관행 대신 사전 확정 구조로 전환',
    ],
    # 자체 중간평가: 대표가 잘된 점·부진한 점을 썼고 아래 두 칸이 비어 있다
    (84, 85): [
        'ㅇ (애로사항) 현지 에이전시가 직접 병원 실사 후 송출을 요구하여 초기 송출이 지연됨. '
        '대학병원 의뢰와 회신에 걸리는 시간이 중증 환자에게는 부담으로 작용',
        'ㅇ (발전 방안) 종합검진‧조기암 등 치료 가능 군으로 유입 채널 조정, '
        '현지 검색광고 직접 유입 병행, 파트너 방한 병원 실사 실시',
    ],
    # 4. 개선 및 향후 추진계획
    (96, 97): [
        'ㅇ (집행률) 사업비 집행률 8.1%(보조금 10.2%). 인건비‧국외여비‧위탁사업비 미집행',
        'ㅇ (대책) 8월 중 현지 검색광고 집행, 국외 출장(현지 파트너‧의료기관 실사) 실행. '
        '참여기관 소모품비‧인건비 월별 한도 내 순차 집행',
        'ㅇ (사업계획 변경) 사업비 변경 승인(본로이-2026-0716-01)‧계좌이체 사전승인(본로이-2026-0720-01) '
        '진흥원 승인통보 수령(07.22). 사업비‧참여인력 변경 승인요청 추가 제출(08.13)',
        'ㅇ (9월) 파트너 방한 병원 실사 투어, 첫 유치 확정 4건 목표, 사전상담 누적 45건 목표, 현지 검색광고 본격 집행',
        'ㅇ (10월) 유치 환자 본치료 및 한방 회복기 재활 연계, 사후관리 자동 안내 가동, 만족도 설문 수집 개시. 유치 누적 8건 목표',
        'ㅇ (11월) 유치 누적 12건‧사전상담 120건 달성, UMIT 통한 귀국 후 현지 경과관찰 데이터 수집, 성과 정산 및 최종보고',
    ],
    # 4부 추진배경 및 목표
    (120,): [
        'ㅇ (배경) 카자흐스탄 등 CIS 지역의 한국 의료 연계는 오프라인 에이전시 중심의 비구조화 시장. '
        '병원‧비용 정보 사전 비교 불가, 러시아어‧카자흐어 대응 부족, 귀국 후 경과관리 단절',
        'ㅇ (필요성) 진흥원 소비패턴 분류상 카자흐스탄은 치료형 고액 소비 국가로 중증 치료 수요가 크나, '
        '기존 유치 경로는 수수료 20~30%의 에이전시에 의존',
        'ㅇ (목표) 사전상담 3대 서비스(병원안내‧매칭 / 진료의뢰‧상담 / 예약상담)와 '
        '사후관리 3대 서비스(경과 관찰 / 모니터링‧교육 / 재이용 예약)를 하나의 플랫폼에서 구현',
        'ㅇ (규모) 6개 언어 환자 화면, 5종 권한 백오피스, 원격협진(실시간 통역), 개인정보 암호화 저장, '
        '성과지표 자동집계 대시보드, 모바일 앱(iOS‧Android). 2026년 7월 개발 완료 후 운영 중',
        'ㅇ (사후 경과 모니터링) 치료완료일 입력 시 암종별 사후관리 일정 7단계 자동 생성'
        '(D+7‧10‧14‧30‧90‧180‧365, 암종별 항목 자동 가감). 환자 증상 보고를 AI가 위험도 4단계로 자동 판정하고 '
        '응급 키워드를 한‧영‧러‧카자흐어로 인식해 담당자에게 즉시 경보. 현지 의료기관 경과기록 업로드 창구 구축',
        'ㅇ (교육 콘텐츠) 암종 5종 × 치료단계 3개 교육자료 18건 구축, 6개 언어 제공. '
        '사후관리 일정에 맞춰 단계별 자동 배포. 암종‧치료경과일 2개 값으로 자동 선별하여 별도 진료정보 불요',
        'ㅇ (재이용 예약) 사후관리 경과와 증상 보고를 근거로 재예약 필요 여부를 자동 판정하고 '
        '판정 근거와 권장 시점을 동시 산출. 환자 화면에서 직접 확인‧수락',
        'ㅇ (검증) 사전상담‧사후관리‧재이용 전 구간 시험환경 실데이터 검증 완료. '
        '자동 회귀시험 통과. 유치환자 발생 시 추가 개발 없이 즉시 가동',
    ],
    # 4부 향후 추진계획
    (129, 130): [
        'ㅇ 운영 및 통제 단계를 사업 종료(11월)까지 지속. 실환자 유입에 따라 사전상담‧사후관리 실사용 데이터 축적',
        'ㅇ 사후관리 자동 안내(1주‧2주‧1개월‧3개월‧6개월) 실환자 적용, 만족도 설문 수집 개시',
        'ㅇ UMIT 국제암센터 협약에 따라 귀국 환자의 현지 추적검사 결과를 플랫폼으로 수집하는 연계 가동',
        'ㅇ 성과지표 집계 오류‧상담 미완료‧설문 미발송 자동 감지‧경보 체계 유지',
        'ㅇ 진흥원 「비대면진료 기반 사전‧사후관리 표준 운영체계」 확정 시 현재 운영 절차를 해당 표준에 맞춰 정비',
    ],
}


# ═══════════════════ 기계 (fill_midterm_hwpx.py 와 동일: 이유는 그 파일 머리말 참조)
def wipe(t):
    t.text = ''
    for child in t:
        child.tail = ''


def drop_linesegs(p):
    for ls in p.findall('./' + HP + 'linesegarray'):
        p.remove(ls)


def normalize_charpr(run):
    cid = run.get('charPrIDRef')
    if cid in CHAR_FIX:
        run.set('charPrIDRef', CHAR_FIX[cid])


def set_para_text(p, text):
    runs = p.findall('./' + HP + 'run')
    if not runs:
        return False
    drop_linesegs(p)
    for r in runs:
        normalize_charpr(r)
    done = False
    for run in runs:
        ts = run.findall('./' + HP + 't')
        if not done:
            if ts:
                wipe(ts[0])
                ts[0].text = text
                for extra in ts[1:]:
                    wipe(extra)
            else:
                etree.SubElement(run, HP + 't').text = text
            done = True
        else:
            for t in ts:
                wipe(t)
    return done


def set_cell_text(tc, text):
    ps = tc.findall('.//' + HP + 'p')
    if not ps:
        return False
    ok = set_para_text(ps[0], text)
    for p in ps[1:]:
        set_para_text(p, '')
    return ok


def clone_rows(tbl, src_row, times):
    trs = tbl.findall('./' + HP + 'tr')
    pos = list(tbl).index(trs[src_row])
    for k in range(times):
        tbl.insert(pos + 1 + k, copy.deepcopy(trs[src_row]))
    for ri, tr in enumerate(tbl.findall('./' + HP + 'tr')):
        for tc in tr.findall('./' + HP + 'tc'):
            ca = tc.find('./' + HP + 'cellAddr')
            if ca is not None:
                ca.set('rowAddr', str(ri))
    tbl.set('rowCnt', str(len(tbl.findall('./' + HP + 'tr'))))


LINE_H, CHAR_W = 2712, 960


def disp_len(s):
    return sum(1.0 if ord(c) > 0x1100 else 0.55 for c in s)


def cell_text(tc):
    return ''.join(x for t in tc.iter(HP + 't') for x in [t.text or ''] + [c.tail or '' for c in t])


def refit_table(tbl):
    trs = tbl.findall('./' + HP + 'tr')
    rows = len(trs)
    cells = []
    for tr in trs:
        for tc in tr.findall('./' + HP + 'tc'):
            ca, sp, sz = (tc.find('./' + HP + x) for x in ('cellAddr', 'cellSpan', 'cellSz'))
            if ca is None or sz is None:
                continue
            r = int(ca.get('rowAddr'))
            rs = int(sp.get('rowSpan')) if sp is not None else 1
            per = max(4.0, (int(sz.get('width')) - 400) / CHAR_W)
            txt = cell_text(tc)
            need = 0
            for ln in txt.split('\n'):
                need += max(1, -(-int(disp_len(ln) * 100) // int(per * 100)))
            cells.append((tc, sz, r, rs, max(1, need) * LINE_H, int(sz.get('height'))))
    row_h = [0] * rows
    for tc, sz, r, rs, need, old in cells:
        if rs == 1:
            row_h[r] = max(row_h[r], need, old)
    for r in range(rows):
        if row_h[r] == 0:
            row_h[r] = LINE_H
    for tc, sz, r, rs, need, old in cells:
        if rs > 1 and sum(row_h[r:r + rs]) < need:
            row_h[r + rs - 1] += need - sum(row_h[r:r + rs])
    for tc, sz, r, rs, need, old in cells:
        sz.set('height', str(sum(row_h[r:r + rs])))
    tsz = tbl.find('./' + HP + 'sz')
    if tsz is not None:
        tsz.set('height', str(sum(row_h)))


def build_char_fix(zf):
    hdr = etree.fromstring(zf.read('Contents/header.xml'))
    info, plain = {}, {}
    for cp in hdr.findall('.//' + HH + 'charPr'):
        cid = cp.get('id')
        key = (cp.get('height'), cp.find('./' + HH + 'bold') is not None)
        color = (cp.get('textColor') or '#000000').upper()
        italic = cp.find('./' + HH + 'italic') is not None
        info[cid] = (key, color, italic)
        if color == '#000000' and not italic:
            plain.setdefault(key, cid)
    return {cid: plain[key] for cid, (key, color, italic) in info.items()
            if (color != '#000000' or italic) and key in plain}


zf = zipfile.ZipFile(SRC)
CHAR_FIX = build_char_fix(zf)
root = etree.fromstring(zf.read('Contents/section0.xml'))
tbls = root.findall('.//' + HP + 'tbl')
miss = []

for t in tbls:
    t.set('pageBreak', 'CELL')

for ti, src_row, times in ROW_CLONES:
    clone_rows(tbls[ti], src_row, times)
for ti, ri, ci, extra in SPAN_FIX:
    sp = tbls[ti].findall('./' + HP + 'tr')[ri].findall('./' + HP + 'tc')[ci].find('./' + HP + 'cellSpan')
    if sp is not None:
        sp.set('rowSpan', str(int(sp.get('rowSpan')) + extra))

paras = root.findall('./' + HP + 'p')
blocks = []
AFTER = {}
for anchors, lines in PARA_BLOCKS.items():
    try:
        blocks.append(([paras[a] for a in anchors], lines))
    except IndexError:
        miss.append(('para-anchor', anchors))
for at, lines in AFTER.items():
    anchor, tmpl = paras[at], paras[83]      # 83 = 「ㅇ 비즈니스모델 체계도(안)」 = 그림 없는 ㅇ 문단
    parent = anchor.getparent()
    prev = anchor
    for ln in lines:
        new_p = copy.deepcopy(tmpl)
        parent.insert(list(parent).index(prev) + 1, new_p)
        set_para_text(new_p, ln)
        prev = new_p

for anchor_els, lines in blocks:
    parent = anchor_els[0].getparent()
    for i, el in enumerate(anchor_els):
        set_para_text(el, lines[i] if i < len(lines) else '')
    if len(lines) > len(anchor_els):
        prev = anchor_els[-1]
        for extra in lines[len(anchor_els):]:
            new = copy.deepcopy(prev)
            parent.insert(list(parent).index(prev) + 1, new)
            set_para_text(new, extra)
            prev = new

for (ti, ri, ci), val in CELLS.items():
    try:
        tc = tbls[ti].findall('./' + HP + 'tr')[ri].findall('./' + HP + 'tc')[ci]
    except IndexError:
        miss.append(('cell', ti, ri, ci))
        continue
    if not set_cell_text(tc, val):
        miss.append(('cell-run', ti, ri, ci))

BODY_H = 60000
for t in tbls:
    refit_table(t)
    tsz, pos = t.find('./' + HP + 'sz'), t.find('./' + HP + 'pos')
    if tsz is not None and pos is not None and int(tsz.get('height')) > BODY_H:
        pos.set('treatAsChar', '0')

new = etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)
with zipfile.ZipFile(DST, 'w') as out:
    for item in zf.infolist():
        if item.filename == 'Contents/section0.xml':
            data = new
        else:
            data = zf.read(item.filename)
        zi = zipfile.ZipInfo(item.filename, date_time=item.date_time)
        zi.compress_type = zipfile.ZIP_STORED if item.filename == 'mimetype' else zipfile.ZIP_DEFLATED
        zi.external_attr = item.external_attr
        out.writestr(zi, data)

print('채운 칸 %d개 / 문단 %d줄, 실패 %d건' % (len(CELLS), sum(len(v) for v in PARA_BLOCKS.values()), len(miss)))
for m in miss:
    print('  실패', m)
