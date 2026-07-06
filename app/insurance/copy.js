// /insurance 보험 가이드 카피 v2 (6개 언어) — 재구성 워크플로(2026-07-06, PO 가독성 피드백 반영).
// 구조: 짧은 문장 + 스펙 칩(specs) + 대기기간 콜아웃(waitNote). 사실 기준: docs/marketing/madanes-insurance/RESEARCH.md.
export const COPY = {
  "ko": {
    "hero": {
      "eyebrow": "가이드 · 보험으로 받는 한국 치료",
      "title": "당신의 보험이 이미 한국 암치료를\n보장하고 있을지도 모릅니다",
      "lede": "일부 러시아 중증질환 보험은 해외 치료를 보장하며, 한국도 그중 하나입니다. 저희가 무료로 확인을 돕고, 한국 치료를 준비해 드립니다.",
      "cta": "무료 상담 받기",
      "note": "이미 진단을 받았거나 보험이 없어도, 무료 상담을 받으실 수 있습니다."
    },
    "products": {
      "title": "해외 치료를 포함하는 보험 상품",
      "lede": "러시아 밖 암치료를 공식적으로 포함하는 현행 러시아 보험 상품과, 그 치료를 대신 준비해 주는 회사(어시스턴스)를 소개합니다. 내용은 각 회사의 공개 자료 기준이며, 정확한 조건은 개별 계약이 정합니다.",
      "waitNote": "솔직한 안내 하나 — 이 상품들의 해외 치료에는 대기 기간(180일·120일)이 있습니다. 그래서 미리, 앞날을 위해 들어두는 보험입니다.",
      "items": [
        {
          "name": "레소-가란티야(РЕСО-Гарантия) «국경 없는 건강»",
          "tag": "보험 상품",
          "desc": "암·심혈관 수술·신경외과·골수이식을 보장하는 보험 상품입니다.",
          "specs": [
            {
              "label": "보장 한도",
              "value": "€1,000,000 클래식 / €500,000 온콜로지 확장"
            },
            {
              "label": "가입 연령",
              "value": "0~64세, 건강검진 불필요"
            },
            {
              "label": "보험료",
              "value": "연 €75부터"
            },
            {
              "label": "대기 기간",
              "value": "해외 치료 180일"
            }
          ],
          "korea": "치료 가능 국가 목록에 이스라엘·스페인과 함께 한국이 명시되어 있습니다."
        },
        {
          "name": "로스고스스트라흐(Росгосстрах) «국경 없는 치료»",
          "tag": "보험 상품",
          "desc": "암과 심장·신경외과 수술, 재활을 보장합니다. 최초 진단 시 일시금 20만 루블이 추가로 지급됩니다.",
          "specs": [
            {
              "label": "보장 한도",
              "value": "2,500만 루블"
            },
            {
              "label": "가입 연령",
              "value": "1~64세, 검진 대신 건강고지"
            },
            {
              "label": "보험료",
              "value": "연 7,390루블부터"
            },
            {
              "label": "대기 기간",
              "value": "120일"
            }
          ],
          "korea": "치료 지역은 미국을 뺀 전 세계 — 한국은 명시된 제외 대상이 아니지만, 실제 적용 여부는 보험사 약관으로 확인하세요."
        },
        {
          "name": "마다네스/МСР — ManagedCare Russia",
          "tag": "치료 지원 회사",
          "desc": "보험사가 아니라, 보험사의 위탁으로 환자 치료를 준비하는 치료 지원 회사입니다. 회사 발표 기준 환자 5년 생존율은 85%로, 자체 집계라 국가 통계와 직접 비교하기는 어렵습니다.",
          "specs": [
            {
              "label": "운영 이력",
              "value": "러시아에서 2009년부터"
            },
            {
              "label": "규모",
              "value": "고객 100만 명 이상 · 파트너 보험사 30곳 이상"
            },
            {
              "label": "확장 패키지",
              "value": "월 100,000루블"
            },
            {
              "label": "패키지 내용",
              "value": "클리닉 선정 · 입원 조율 · 국제 의료진 소통 · 해외 의약품"
            }
          ],
          "korea": "가입한 보험사가 МСР와 협력한다면, 내 보험 증권으로 해외 치료가 어떻게 준비되는지 보험사에 확인해 보세요."
        }
      ]
    },
    "coverage": {
      "title": "이런 보험이 대신 부담하는 것들",
      "lede": "«국경 없는 건강»을 예로 들면, 보험은 병원비만이 아니라 치료를 둘러싼 거의 모든 것을 부담합니다. 정확한 보장 구성은 각자의 약관이 정합니다.",
      "items": [
        {
          "title": "치료비",
          "body": "필요한 의료비를 프로그램 한도 내에서 전액 지급합니다. «클래식» 기준 최대 €1,000,000입니다."
        },
        {
          "title": "이동",
          "body": "치료지까지 왕복 이동이 보장에 포함됩니다. 이동 준비는 서비스 회사가 맡습니다."
        },
        {
          "title": "숙박 — 환자와 동반자",
          "body": "환자와 동반자의 숙박을 프로그램 한도 안에서 지원합니다. 치료 기간 동안 가족이 곁에 있을 수 있습니다."
        },
        {
          "title": "전담 안내인과 러시아어",
          "body": "러시아어 전담 안내인이 환자와 동행하고, 제2의료의견도 포함됩니다. 한국 병원에서는 healwith 팀이 의료통역을 더합니다."
        },
        {
          "title": "병원으로 직접 지불",
          "body": "보험사가 병원에 직접 지불합니다. 먼저 내고 나중에 환급받는 구조가 아닙니다."
        }
      ]
    },
    "steps": {
      "title": "이용 절차 5단계 — «국경 없는 건강» 예시",
      "items": [
        {
          "title": "보험사에 연락",
          "body": "진단을 받았다면 보험 증권에 적힌 번호로 먼저 연락하세요. 어디서 시작할지 막막하면 healwith가 무료로 도와드립니다."
        },
        {
          "title": "진단 서류 제출",
          "body": "보험사와 치료 지원 회사가 소견서·검사 결과를 요청합니다. 한국 병원이 흔히 찾는 서류를 미리 알려드려 한 번에 준비하게 돕습니다."
        },
        {
          "title": "클리닉 선택 — 최소 3곳 제안",
          "body": "프로그램 조건에 따라 최소 3곳의 클리닉을 제안받습니다. 한국이 있다면 healwith가 진단에 맞는 병원과 진료과 찾기를 돕습니다."
        },
        {
          "title": "이동·숙박은 서비스 회사가 맡습니다",
          "body": "이동과 숙소는 서비스 회사가 준비합니다. 한국에서는 healwith가 병원 명의 비자 초청장을 돕고, 도착하면 마중과 병원 동행을 맡습니다."
        },
        {
          "title": "보험사가 병원에 직접 지불",
          "body": "정산은 보험사와 병원 사이에서 끝나 선지출이 없습니다 — 환자는 치료에만 집중하시면 됩니다. 귀국 후에는 healwith가 원격 관리를 이어가고, 필요하면 한국 의료진과 연결해 드립니다."
        }
      ]
    },
    "whyKorea": {
      "title": "왜 한국인가",
      "lede": "한국은 «국경 없는 건강»의 치료 가능 국가 목록에 이스라엘·스페인과 함께 올라 있습니다. 과장 없이 사실만 소개합니다.",
      "stat": {
        "value": "72.9%",
        "label": "한국 암환자 5년 생존율 — 특정 병원이 아닌 전국 공식 통계",
        "source": "국립암센터 국가암등록통계 2018–2022"
      },
      "hospitals": {
        "title": "대학병원 4곳, 이름을 밝힙니다",
        "caption": "이대서울 · 이대목동 · 고려대구로 · 신촌세브란스"
      },
      "support": {
        "title": "러시아어로 동행합니다",
        "body": "첫 문의부터 귀국까지 의료통역과 병원 동행을 러시아어로 제공합니다. healwith는 러시아어·카자흐어를 포함한 6개 언어로 일하고, 퇴원 후에도 연락을 잇습니다."
      }
    },
    "partner": {
      "title": "보험사·치료 지원 회사 제휴 안내",
      "body": "healwith는 보험사·치료 지원 회사와의 협력에 열려 있으며, 각 치료 사례의 한국 측 전 과정을 맡습니다. 한국 보건복지부 등록 외국인환자 유치업체입니다(등록번호 A-2026-01-02-06761). 협진 네트워크는 대학병원 4곳(이대서울·이대목동·고려대구로·신촌세브란스)과 면력한방병원 4개 지점(강서·신촌·광명·성동)입니다. 병원 매칭, 의료통역, 비자 초청장, 입원 동행, 퇴원 후 원격 관리까지 6개 언어로 준비합니다."
    },
    "faq": {
      "title": "자주 묻는 질문",
      "items": [
        {
          "q": "제 보험으로 한국 치료가 가능한가요?",
          "a": "각자의 보험 증권이 정합니다 — 암 보장 여부, 해외 치료 포함 여부, 보장 지역에 한국이 있는지 세 가지를 확인하세요. 최종 판단은 보험사 몫이고, 확인 과정과 질문 정리는 healwith가 무료로 돕습니다."
        },
        {
          "q": "제 돈은 얼마나 드나요?",
          "a": "직접 지불 구조에서는 보험사가 병원에 바로 정산해 환자의 선지출이 없습니다 — 한도와 약관 조건 안에서 그렇습니다. 보장을 넘는 비용의 범위는 각자의 보험 증권이 정하며, healwith 상담은 무료입니다."
        },
        {
          "q": "한국어도 영어도 못하는데, 소통이 될까요?",
          "a": "네, healwith 팀이 한국 병원에서 러시아어·카자흐어 의료통역과 동행을 제공합니다 — 어떤 보험이든, 보험이 없어도 똑같습니다. «국경 없는 건강»에는 러시아어 전담 안내인의 동행도 포함됩니다."
        },
        {
          "q": "이런 보험이 없다면요?",
          "a": "보험 없이도 한국 치료는 가능합니다 — 치료비를 병원에 직접 내는 방식입니다. 비용 수준을 솔직히 안내하고 병원 찾기·비자 초청장·동행까지 똑같이, 무료로 돕습니다."
        }
      ]
    },
    "disclaimer": {
      "title": "중요 안내",
      "body": "이 페이지의 보험 상품은 레소-가란티야, 로스고스스트라흐, ManagedCare Russia가 제공합니다. 조건·한도·면책은 각 회사의 공식 약관과 개별 계약이 정하니, 가입 전 보험사의 공식 문서를 확인하세요. healwith는 보험사가 아니며 보험을 판매하지 않습니다 — 보건복지부 등록 외국인환자 유치업체로서 치료 과정을 준비·지원할 뿐, 의료행위는 하지 않습니다. 본 내용은 각 회사의 공개 자료 기준이며, 기준일은 2026년 7월입니다."
    },
    "closing": {
      "title": "간단한 질문 하나로 시작하세요",
      "body": "가입한 보험 상품명을 보내 주시거나, 상황을 편하게 적어 주세요. 보장 확인 방법과 한국 치료 진행 과정을 무료로 안내해 드립니다 — 의무도 부담도 없습니다.",
      "cta": "무료로 문의하기"
    }
  },
  "en": {
    "hero": {
      "eyebrow": "Guide · Treatment in Korea Covered by Insurance",
      "title": "Your insurance may already cover\ncancer treatment in Korea",
      "lede": "Some Russian critical illness insurance programs include treatment abroad — South Korea among the destinations. We will help you check your policy for free and organize the treatment on the Korean side.",
      "cta": "Get a free consultation",
      "note": "A free consultation is available even if you already have a diagnosis — or no insurance at all."
    },
    "products": {
      "title": "Which programs include treatment abroad",
      "lede": "Current Russian insurance products that officially include cancer treatment outside Russia — and the assistance company that organizes such treatment. Details are based on the companies' public materials; the exact terms are set by your own contract.",
      "waitNote": "One honest note up front: these programs apply a waiting period to treatment abroad — 180 and 120 days — so this kind of policy is taken out in advance, for the future. Already diagnosed and uninsured? Treatment in Korea is still possible — see the end of this page.",
      "items": [
        {
          "name": "RESO-Garantia (РЕСО) — \"Health Without Borders\"",
          "tag": "Insurance product",
          "desc": "Covers oncology, cardiovascular surgery, neurosurgery, and bone marrow transplantation. No medical examination is required to enroll.",
          "specs": [
            {
              "label": "Coverage limit",
              "value": "€1,000,000 (\"Classic\") / €500,000 (\"Oncology Extended\")"
            },
            {
              "label": "Enrollment age",
              "value": "0–64"
            },
            {
              "label": "Premium",
              "value": "from €75 per year"
            },
            {
              "label": "Waiting period",
              "value": "180 days for treatment abroad"
            }
          ],
          "korea": "South Korea is explicitly named on the list of treatment countries — alongside Israel and Spain."
        },
        {
          "name": "Rosgosstrakh (Росгосстрах) — \"Treatment Without Borders\"",
          "tag": "Insurance product",
          "desc": "Covers oncology, cardiac and neurosurgical operations, and rehabilitation. A health declaration replaces the medical examination.",
          "specs": [
            {
              "label": "Coverage limit",
              "value": "₽25,000,000 + ₽200,000 lump sum on first diagnosis"
            },
            {
              "label": "Enrollment age",
              "value": "1–64"
            },
            {
              "label": "Premium",
              "value": "from ₽7,390 per year"
            },
            {
              "label": "Waiting period",
              "value": "120 days"
            }
          ],
          "korea": "Treatment geography: worldwide except the USA — South Korea is not a named exclusion; confirm applicability to your case with the insurer."
        },
        {
          "name": "Madanes / MCR — medical assistance by ManagedCare Russia",
          "tag": "Treatment support company",
          "desc": "Not an insurer but an assistance company: commissioned by insurers, it organizes treatment for patients. Its \"Extended\" package covers organizing treatment abroad — clinic selection, hospitalization coordination, communication with international doctors, and medications from abroad. According to the company, its patients' five-year survival rate is 85% — the company's own estimate for its own clients, which cannot fairly be compared directly with the national statistics of entire countries: the patient groups and counting methods differ.",
          "specs": [
            {
              "label": "In Russia since",
              "value": "2009"
            },
            {
              "label": "Clients",
              "value": "over 1 million"
            },
            {
              "label": "Partner insurers",
              "value": "30+"
            },
            {
              "label": "\"Extended\" package",
              "value": "₽100,000 per month"
            }
          ],
          "korea": "If your insurer works with MCR, ask how treatment abroad is organized under your policy — healwith can take on the Korean side of the case."
        }
      ]
    },
    "coverage": {
      "title": "What this kind of insurance takes care of",
      "lede": "Taking \"Health Without Borders\" as an example: the policy pays not only the clinic's bills but nearly everything around the treatment. The exact scope is defined by your contract.",
      "items": [
        {
          "title": "Treatment",
          "body": "Necessary medical expenses are paid in full within the program limit — up to €1,000,000 under \"Classic\"."
        },
        {
          "title": "Travel",
          "body": "Travel to the place of treatment and back is covered. The service company handles the arrangements."
        },
        {
          "title": "Accommodation — for you and a loved one",
          "body": "Accommodation is paid for both the patient and an accompanying person, within the program's terms and limit. Someone close to you can be at your side throughout treatment."
        },
        {
          "title": "A care coordinator and the Russian language",
          "body": "A Russian-speaking medical coordinator accompanies the patient, and a second medical opinion is included. At the Korean clinic, the healwith team additionally provides medical interpretation."
        },
        {
          "title": "Payment — directly to the clinic",
          "body": "The insurance company settles with the clinic directly. No paying upfront and waiting for reimbursement."
        }
      ]
    },
    "steps": {
      "title": "How it works: five steps — \"Health Without Borders\" example",
      "items": [
        {
          "title": "Contact your insurer",
          "body": "If you have a diagnosis, call your insurer at the number on your policy. Still working out the terms? healwith consultants will help you figure out where to start — free of charge."
        },
        {
          "title": "Submit your diagnosis documents",
          "body": "The insurer and its assistance company will request medical documents — discharge summaries and test results. We will tell you what Korean clinics usually require, so you can gather everything in one go."
        },
        {
          "title": "Choose a clinic — from at least three options",
          "body": "Under the program's terms, you are offered at least three clinics to choose from. If South Korea is among them, healwith will help you compare hospitals and find the specialized department for your diagnosis."
        },
        {
          "title": "Travel and accommodation are arranged for you",
          "body": "The service company handles travel and accommodation. On the Korean side, healwith assists with the visa invitation letter issued by the receiving hospital, meets you on arrival, and accompanies you at the clinic."
        },
        {
          "title": "The insurer pays the clinic directly",
          "body": "Settlement takes place between the insurer and the clinic — no upfront payment from you. After you return home, healwith continues remote follow-up, with a line to the Korean doctors when needed."
        }
      ]
    },
    "whyKorea": {
      "title": "Why South Korea",
      "lede": "South Korea is explicitly named on the \"Health Without Borders\" list of treatment countries — alongside Israel and Spain. A few facts about cancer care in Korea, without the sales pitch.",
      "stat": {
        "value": "72.9%",
        "label": "Five-year survival rate for cancer patients in Korea — official nationwide statistics, not a single clinic's estimate",
        "source": "National Cancer Center of Korea, national cancer registry statistics, 2018–2022"
      },
      "hospitals": {
        "title": "University hospitals — named, not vague",
        "caption": "Ewha Womans University Seoul and Mokdong Hospitals · Korea University Guro Hospital · Severance Hospital in Sinchon — plus four branches of the Immune Hospital of Korean Medicine"
      },
      "support": {
        "title": "Russian spoken at your side",
        "body": "From your first inquiry until you return home, you are accompanied in Russian — medical interpretation, support at the clinic, communication with the doctors. healwith works in six languages, including Russian and Kazakh, and stays in touch after discharge."
      }
    },
    "partner": {
      "title": "For insurance and assistance companies",
      "body": "healwith is open to cooperation with insurance and assistance companies and takes on the Korean side of each case. We are registered with the Ministry of Health and Welfare of the Republic of Korea as an international patient facilitator (reg. no. A-2026-01-02-06761). Our network: four university hospitals (Ewha Womans University Seoul and Mokdong Hospitals, Korea University Guro Hospital, Severance Hospital in Sinchon) and four branches of the Immune Hospital of Korean Medicine (Gangseo, Sinchon, Gwangmyeong, Seongdong). We organize the full cycle in six languages — clinic matching, medical interpretation, visa invitation letters, inpatient accompaniment, and remote follow-up after discharge."
    },
    "faq": {
      "title": "Frequently asked questions",
      "items": [
        {
          "q": "Will my insurance work for treatment in Korea?",
          "a": "Your policy terms decide — check whether oncology is covered, whether treatment abroad is included, and whether the program's geography allows South Korea. The final answer always comes from your insurer; healwith will help you work through it for free and prepare the questions to ask."
        },
        {
          "q": "How much will I pay out of my own pocket?",
          "a": "In direct-payment programs, the insurer settles with the clinic — no upfront payment from you, within the limit and terms of your contract. Any costs beyond the coverage are governed by your policy; the healwith consultation is free."
        },
        {
          "q": "Will I be understood? I speak neither Korean nor English.",
          "a": "Yes — healwith provides medical interpretation and accompaniment at the Korean clinic in Russian and Kazakh, whatever your insurance situation. Under \"Health Without Borders\", a Russian-speaking medical coordinator additionally accompanies the patient."
        },
        {
          "q": "What if I don't have insurance like this?",
          "a": "Treatment in Korea is possible without a policy too — in that case, you pay the clinic directly. We give you an honest picture of the likely costs, find a clinic for your diagnosis, help with the visa invitation letter, and stay at your side — the consultation is free."
        }
      ]
    },
    "disclaimer": {
      "title": "Important information",
      "body": "The insurance programs on this page are provided by the respective insurance and assistance companies (RESO-Garantia, Rosgosstrakh, ManagedCare Russia); their terms, limits, and exclusions are defined by those companies' official rules and your contract. Check the insurer's documents before purchasing. healwith is not an insurance company and does not sell policies — we are a Korea-registered international patient facilitator that organizes the treatment process but does not provide medical or insurance services. The information is based on the companies' publicly available materials as of July 2026."
    },
    "closing": {
      "title": "Start with a simple question",
      "body": "Send us the name of your insurance program — or simply describe your situation in your own words. We will explain, free of charge, how to check your coverage and how treatment in Korea works — no obligations, no pressure.",
      "cta": "Write to us — it's free"
    }
  },
  "ru": {
    "hero": {
      "eyebrow": "Гид · Лечение в Корее по страховке",
      "title": "Ваша страховка, возможно,\nуже покрывает лечение рака в Корее",
      "lede": "Некоторые российские программы страхования критических заболеваний включают лечение за рубежом — в том числе в Южной Корее. Мы бесплатно поможем разобраться и организуем лечение на корейской стороне.",
      "cta": "Получить бесплатную консультацию",
      "note": "Если диагноз уже поставлен или полиса нет — бесплатная консультация всё равно доступна: лечение в Корее возможно и без страховки."
    },
    "products": {
      "title": "Какие программы включают лечение за рубежом",
      "lede": "Ниже — действующие российские страховые продукты, официально включающие лечение онкологии за пределами России, и ассистанс-компания, которая такое лечение организует. Данные — по открытым материалам компаний; точные условия определяет ваш договор.",
      "waitNote": "Скажем честно сразу: по зарубежному лечению действует период ожидания — 180 дней у РЕСО и 120 дней у Росгосстраха, поэтому такой полис оформляют заранее, «на будущее». Если диагноз уже поставлен, а полиса нет, лечение в Корее всё равно возможно — с этим мы тоже помогаем бесплатно.",
      "items": [
        {
          "name": "РЕСО-Гарантия — «Здоровье без границ»",
          "tag": "Страховая программа",
          "desc": "Покрывает онкологию, сердечно-сосудистую хирургию, нейрохирургию и трансплантацию костного мозга.",
          "specs": [
            {
              "label": "Лимит покрытия",
              "value": "€1 000 000 «Классика» / €500 000 «Онкология расширенная»"
            },
            {
              "label": "Возраст оформления",
              "value": "с 0 до 64 лет"
            },
            {
              "label": "Стоимость",
              "value": "от €75 в год, без медицинского обследования"
            },
            {
              "label": "Период ожидания",
              "value": "180 дней по зарубежному лечению"
            }
          ],
          "korea": "Южная Корея прямо названа в списке стран лечения — наряду с Израилем и Испанией."
        },
        {
          "name": "Росгосстрах — «Лечение без границ»",
          "tag": "Страховая программа",
          "desc": "Покрывает онкологию, кардио- и нейрохирургические операции и реабилитацию. При первом установленном диагнозе дополнительно выплачивается 200 000 ₽.",
          "specs": [
            {
              "label": "Лимит покрытия",
              "value": "25 000 000 ₽"
            },
            {
              "label": "Возраст оформления",
              "value": "от 1 года до 64 лет"
            },
            {
              "label": "Стоимость",
              "value": "от 7 390 ₽ в год, декларация о здоровье вместо обследования"
            },
            {
              "label": "Период ожидания",
              "value": "120 дней"
            }
          ],
          "korea": "География лечения — весь мир, кроме США: Южная Корея не входит в названные исключения; применимость к вашему случаю уточняйте у страховщика."
        },
        {
          "name": "Маданес / МСР — ассистанс ManagedCare Russia",
          "tag": "Ассистанс-компания: организация лечения",
          "desc": "Это не страховая, а ассистанс-компания: по поручению страховщиков она организует лечение пациентов. Пакет «Расширенный» включает организацию лечения за рубежом — подбор клиники, координацию госпитализации, общение с международными врачами и зарубежные препараты.",
          "specs": [
            {
              "label": "Опыт",
              "value": "в России с 2009 года"
            },
            {
              "label": "Клиенты и партнёры",
              "value": "более 1 млн клиентов, 30+ страховых компаний-партнёров"
            },
            {
              "label": "Пакет «Расширенный»",
              "value": "100 000 ₽ в месяц"
            },
            {
              "label": "Выживаемость пациентов (5 лет)",
              "value": "85% — собственные данные компании, напрямую не сопоставимые с государственной статистикой целых стран"
            }
          ],
          "korea": "Если ваша страховая сотрудничает с МСР, уточните у неё, как по вашему полису организуется лечение за рубежом."
        }
      ]
    },
    "coverage": {
      "title": "Что берёт на себя такая страховка",
      "lede": "На примере программы «Здоровье без границ»: полис оплачивает не только счета клиники, но и почти всё вокруг лечения. Точный состав покрытия определяет ваш договор.",
      "items": [
        {
          "title": "Лечение",
          "body": "Необходимые медицинские расходы оплачиваются в полном объёме — в пределах лимита программы, до €1 000 000 по «Классике»."
        },
        {
          "title": "Дорога",
          "body": "Проезд к месту лечения и обратно входит в покрытие программы. Организацию дороги берёт на себя сервисная компания."
        },
        {
          "title": "Проживание — для вас и близкого человека",
          "body": "Оплачивается размещение не только пациента, но и сопровождающего — в пределах условий и лимита программы. Родной человек может быть рядом во время лечения."
        },
        {
          "title": "Куратор и русский язык",
          "body": "Пациента сопровождает русскоязычный медицинский куратор, программа включает и второе медицинское мнение. В корейской клинике команда healwith дополнительно обеспечивает медицинский перевод."
        },
        {
          "title": "Оплата — напрямую клинике",
          "body": "Страховая компания рассчитывается с клиникой напрямую. Вам не нужно платить вперёд и ждать возмещения."
        }
      ]
    },
    "steps": {
      "title": "Как это работает: пять шагов — на примере «Здоровье без границ»",
      "items": [
        {
          "title": "Свяжитесь со своей страховой",
          "body": "При установленном диагнозе позвоните страховщику по номеру из полиса. Если вы пока только разбираетесь в условиях, консультанты healwith бесплатно подскажут, с чего начать."
        },
        {
          "title": "Передайте документы о диагнозе",
          "body": "Страховая и её ассистанс запросят выписки и результаты обследований. Мы заранее подскажем, какие документы обычно требуются корейским клиникам, — чтобы собрать всё за один раз."
        },
        {
          "title": "Выберите клинику — минимум из трёх",
          "body": "По условиям программы вам предложат не менее трёх клиник на выбор. Если среди них Южная Корея, healwith поможет сравнить больницы и подобрать профильное отделение под ваш диагноз."
        },
        {
          "title": "Дорогу и проживание организуют за вас",
          "body": "Дорогу и размещение берёт на себя сервисная компания. На корейской стороне healwith помогает с визовым приглашением от принимающей больницы, встречает по прибытии и сопровождает в клинике."
        },
        {
          "title": "Страховая платит клинике напрямую",
          "body": "Расчёт идёт между страховщиком и клиникой — без предоплаты с вашей стороны. После возвращения домой healwith продолжает дистанционное сопровождение, при необходимости со связью с корейскими врачами."
        }
      ]
    },
    "whyKorea": {
      "title": "Почему Южная Корея",
      "lede": "Южная Корея прямо названа в списке стран лечения программы «Здоровье без границ» — наряду с Израилем и Испанией. Несколько фактов о корейской онкологии — без рекламы.",
      "stat": {
        "value": "72,9%",
        "label": "пятилетняя выживаемость онкологических пациентов в Корее — официальные государственные данные по всей стране",
        "source": "Национальная статистика ракового регистра, Национальный онкологический центр Кореи, 2018–2022"
      },
      "hospitals": {
        "title": "Университетские клиники — по именам",
        "caption": "Больницы университета Ихва в Сеуле и Мокдоне · Больница Университета Корё в Куро · Больница Северанс в Синчхоне"
      },
      "support": {
        "title": "Русский язык рядом",
        "body": "С первого запроса до возвращения домой вас сопровождают на русском: медицинский перевод, помощь в клинике, связь с врачами. healwith работает на шести языках, включая русский и казахский, и остаётся на связи после выписки."
      }
    },
    "partner": {
      "title": "Страховым и ассистанс-компаниям",
      "body": "healwith открыт к сотрудничеству со страховыми и ассистанс-компаниями и берёт на себя корейскую сторону кейса — мы зарегистрированы Министерством здравоохранения и социального обеспечения Республики Корея как оператор по приёму иностранных пациентов (рег. № A-2026-01-02-06761). Наша сеть — четыре университетские клиники и четыре филиала клиники корейской медицины Immune Hospital (Кансо, Синчхон, Кванмён, Сондон); полный цикл организуем на шести языках: подбор клиники, медицинский перевод, визовые приглашения, сопровождение в стационаре и дистанционное ведение после выписки."
    },
    "faq": {
      "title": "Частые вопросы",
      "items": [
        {
          "q": "Подойдёт ли моя страховка для лечения в Корее?",
          "a": "Это определяют условия вашего полиса: проверьте, входит ли онкология в покрытие, предусмотрено ли лечение за рубежом и допускает ли география программы Южную Корею. Окончательный ответ всегда даёт страховая; консультанты healwith бесплатно помогут разобраться и подготовить вопросы для неё."
        },
        {
          "q": "Сколько я заплачу из собственных средств?",
          "a": "В программах с прямой оплатой страховая рассчитывается с клиникой напрямую, без предоплаты с вашей стороны — в пределах лимита и условий договора. Консультация healwith бесплатна."
        },
        {
          "q": "Меня поймут? Я не говорю ни по-корейски, ни по-английски.",
          "a": "Да: команда healwith обеспечивает медицинский перевод и сопровождение в корейской клинике на русском и казахском — с любой страховой программой и без неё. А по «Здоровью без границ» пациента дополнительно сопровождает русскоязычный медицинский куратор."
        },
        {
          "q": "А если у меня нет такой страховки?",
          "a": "Лечение в Корее возможно и без страховой программы — в этом случае вы оплачиваете лечение клинике напрямую. Мы честно расскажем о порядке расходов, подберём клинику под диагноз, поможем с визовым приглашением — консультация бесплатна."
        }
      ]
    },
    "disclaimer": {
      "title": "Важная информация",
      "body": "Упомянутые на этой странице программы предоставляют соответствующие страховые и ассистанс-компании: РЕСО-Гарантия, Росгосстрах, ManagedCare Russia. Их условия, лимиты и исключения определяются официальными правилами компаний и вашим договором — перед оформлением сверяйтесь с документами страховщика. healwith не является страховой компанией и не продаёт полисы: мы — зарегистрированный в Корее оператор по приёму иностранных пациентов, организуем процесс лечения, но не оказываем медицинских и страховых услуг. Информация приведена по открытым материалам компаний по состоянию на июль 2026 года."
    },
    "closing": {
      "title": "Начните с простого вопроса",
      "body": "Напишите название вашей страховой программы — или просто опишите ситуацию своими словами. Мы бесплатно подскажем, как проверить покрытие, и расскажем, как устроено лечение в Корее — без обязательств и без давления.",
      "cta": "Написать нам — это бесплатно"
    }
  },
  "kz": {
    "hero": {
      "eyebrow": "Нұсқаулық · Кореяда сақтандыру арқылы емделу",
      "title": "Сіздің сақтандыруыңыз Кореядағы қатерлі ісік емін\nқазірдің өзінде қамтуы мүмкін",
      "lede": "Ресейдің ауыр аурулардан сақтандыру бағдарламаларының кейбірі шетелде емделуді қамтиды — соның ішінде Оңтүстік Кореяда. Біз мұны анықтауға тегін көмектесеміз және емдеуді Корея тарапында ұйымдастырамыз.",
      "cta": "Тегін кеңес алу",
      "note": "Диагноз қойылған болса да, сақтандыруыңыз болмаса да — тегін кеңес ала аласыз."
    },
    "products": {
      "title": "Шетелде емделуді қамтитын бағдарламалар",
      "lede": "Төменде — онкологияны Ресейден тыс жерде емдеуді ресми түрде қамтитын қолданыстағы ресейлік сақтандыру өнімдері және мұндай емдеуді ұйымдастыратын ассистанс-компания. Деректер компаниялардың ашық материалдары бойынша; нақты шарттарды сіздің келісімшартыңыз айқындайды.",
      "waitNote": "Адал ескерту: бұл бағдарламаларда шетелде емделу бойынша күту кезеңі бар — 180 және 120 күн. Сондықтан мұндай полисті алдын ала, «болашаққа арнап» рәсімдейді.",
      "items": [
        {
          "name": "РЕСО-Гарантия — «Здоровье без границ» («Шекарасыз денсаулық»)",
          "tag": "Сақтандыру өнімі",
          "desc": "Онкологияны, жүрек-қантамыр хирургиясын, нейрохирургияны және сүйек кемігін трансплантациялауды қамтиды.",
          "specs": [
            {
              "label": "Лимит",
              "value": "«Классика» — €1 000 000 / «Онкология расширенная» — €500 000"
            },
            {
              "label": "Рәсімдеу жасы",
              "value": "0–64 жас"
            },
            {
              "label": "Жарна",
              "value": "жылына €75-тен, медициналық тексерусіз"
            },
            {
              "label": "Күту кезеңі",
              "value": "180 күн"
            }
          ],
          "korea": "Оңтүстік Корея емдеу елдерінің тізімінде тікелей аталған — Израиль және Испаниямен қатар."
        },
        {
          "name": "Росгосстрах — «Лечение без границ» («Шекарасыз емдеу»)",
          "tag": "Сақтандыру өнімі",
          "desc": "Онкологияны, кардио- және нейрохирургиялық операцияларды және оңалтуды қамтиды.",
          "specs": [
            {
              "label": "Лимит",
              "value": "25 000 000 ₽ + алғашқы диагноз кезінде біржолғы 200 000 ₽"
            },
            {
              "label": "Рәсімдеу жасы",
              "value": "1–64 жас"
            },
            {
              "label": "Жарна",
              "value": "жылына 7 390 ₽-ден, тексерудің орнына денсаулық туралы декларация"
            },
            {
              "label": "Күту кезеңі",
              "value": "120 күн"
            }
          ],
          "korea": "Емдеу географиясы — АҚШ-ты қоспағанда бүкіл әлем: Оңтүстік Корея аталған алып тастаулардың қатарында жоқ; сіздің жағдайыңызға қолданылатынын сақтандырушыдан нақтылаңыз."
        },
        {
          "name": "Маданес / МСР — ManagedCare Russia ассистансы",
          "tag": "Емдеуді ұйымдастыратын компания",
          "desc": "Бұл сақтандыру компаниясы емес — сақтандырушылардың тапсырмасы бойынша пациенттердің емделуін ұйымдастыратын ассистанс-компания. Компанияның өз деректері бойынша, пациенттерінің бес жылдық өмір сүру көрсеткіші — 85% (өз клиенттері бойынша жеке есеп, елдердің мемлекеттік статистикасымен тікелей салыстыруға келмейді).",
          "specs": [
            {
              "label": "Тәжірибе",
              "value": "Ресейде 2009 жылдан бері"
            },
            {
              "label": "Ауқымы",
              "value": "1 миллионнан астам клиент, 30+ серіктес сақтандыру компаниясы"
            },
            {
              "label": "«Расширенный» пакеті",
              "value": "айына 100 000 ₽"
            },
            {
              "label": "Пакетке кіретіні",
              "value": "клиника таңдау, госпитализацияны үйлестіру, халықаралық дәрігерлермен байланыс, шетелдік дәрі-дәрмектер"
            }
          ],
          "korea": "Сақтандыру компанияңыз МСР-мен ынтымақтасатын болса, полисіңіз бойынша шетелде емдеу қалай ұйымдастырылатынын одан нақтылаңыз."
        }
      ]
    },
    "coverage": {
      "title": "Мұндай сақтандыру нені өз мойнына алады",
      "lede": "«Здоровье без границ» бағдарламасының мысалында: полис клиниканың шоттарын ғана емес, емдеуге қатысты барлық дерлік шығынды төлейді. Өтемнің нақты құрамын сіздің келісімшартыңыз айқындайды.",
      "items": [
        {
          "title": "Емдеу",
          "body": "Қажетті медициналық шығындар бағдарлама лимиті шегінде толық төленеді — «Классика» бойынша €1 000 000-ға дейін."
        },
        {
          "title": "Жол",
          "body": "Емделу орнына бару және қайту жолы өтемге кіреді. Ұйымдастыруды сервистік компания өз мойнына алады."
        },
        {
          "title": "Тұру орны — сізге және жақыныңызға",
          "body": "Пациенттің де, ертіп жүрушінің де тұруы бағдарлама шарттары мен лимиті шегінде төленеді. Емделу кезінде жақын адамыңыз қасыңызда бола алады."
        },
        {
          "title": "Куратор және орыс тілі",
          "body": "Пациентке орыстілді медициналық куратор еріп жүреді, бағдарламаға екінші медициналық пікір де кіреді. Корея клиникасында healwith командасы қосымша медициналық аударманы қамтамасыз етеді."
        },
        {
          "title": "Төлем — тікелей клиникаға",
          "body": "Сақтандыру компаниясы клиникамен тікелей есеп айырысады. Алдын ала төлеп, өтемді күтудің қажеті жоқ."
        }
      ]
    },
    "steps": {
      "title": "Бес қадам — «Здоровье без границ» мысалында",
      "items": [
        {
          "title": "Сақтандырушыңызбен байланысыңыз",
          "body": "Диагноз қойылған болса, алдымен полисте көрсетілген нөмірге қоңырау шалыңыз. Әлі шарттарды енді зерттеп жүрсеңіз, healwith кеңесшілері неден бастау керегін тегін көрсетеді."
        },
        {
          "title": "Диагноз құжаттарын тапсырыңыз",
          "body": "Сақтандырушы мен оның ассистансы эпикриздер мен тексеру нәтижелерін сұратады. Корея клиникаларына әдетте қандай құжаттар қажет екенін алдын ала айтып, бәрін бір ретте жинауға көмектесеміз."
        },
        {
          "title": "Клиника таңдаңыз — кемінде үш нұсқадан",
          "body": "Бағдарлама шарты бойынша сізге кемінде үш клиника ұсынылады. Араларында Оңтүстік Корея болса, healwith корей ауруханаларын салыстырып, диагнозыңызға сай бейінді бөлімшені табуға көмектеседі."
        },
        {
          "title": "Жол мен тұруды сіз үшін ұйымдастырады",
          "body": "Жол мен орналастыруды сервистік компания өз мойнына алады. Корея тарапында healwith қабылдаушы аурухана атынан берілетін визалық шақыртуға көмектеседі, келгенде қарсы алады және клиникада еріп жүреді."
        },
        {
          "title": "Сақтандырушы клиникаға тікелей төлейді",
          "body": "Есеп айырысу сақтандырушы мен клиника арасында жүреді — сізден алдын ала төлем жоқ. Үйге оралғаннан кейін healwith қашықтан қолдауды жалғастырады, қажет болса корей дәрігерлерімен байланыстырады."
        }
      ]
    },
    "whyKorea": {
      "title": "Неліктен Оңтүстік Корея",
      "lede": "Оңтүстік Корея «Здоровье без границ» бағдарламасының емдеу елдері тізімінде тікелей аталған — Израиль және Испаниямен қатар. Төменде — Корея онкологиясы туралы бірнеше факт, жарнамасыз.",
      "stat": {
        "value": "72,9%",
        "label": "Кореядағы онкологиялық пациенттердің бес жылдық өмір сүру көрсеткіші — жекелеген клиниканың не компанияның бағасы емес, бүкіл ел бойынша ресми мемлекеттік дерек",
        "source": "Корея Ұлттық онкологиялық орталығы, қатерлі ісік тіркелімінің ұлттық статистикасы, 2018–2022"
      },
      "hospitals": {
        "title": "Университеттік клиникалар — нақты атауымен",
        "caption": "Сеул мен Мокдондағы Ихва университетінің ауруханалары · Куродағы Корё университетінің ауруханасы · Синчхондағы Северанс ауруханасы · сондай-ақ Immune Hospital корей медицинасы клиникасының төрт филиалы"
      },
      "support": {
        "title": "Орыс тілі — қасыңызда",
        "body": "Алғашқы өтініштен үйге оралғанға дейін сізге орыс тілінде еріп жүреді: медициналық аударма, клиникадағы көмек, дәрігерлермен байланыс. healwith орыс және қазақ тілдерін қоса алғанда алты тілде жұмыс істейді және шыққаннан кейін де байланыста қалады."
      }
    },
    "partner": {
      "title": "Сақтандыру және ассистанс-компанияларға",
      "body": "healwith сақтандыру және ассистанс-компаниялармен ынтымақтастыққа ашық және кейстің Корея тарапын толық өз мойнына алады. Біз Корея Республикасының Денсаулық сақтау және әлеуметтік қамсыздандыру министрлігінде шетелдік пациенттерді қабылдау жөніндегі оператор ретінде тіркелгенбіз (тіркеу № A-2026-01-02-06761). Желіміз — төрт университеттік клиника (Сеул мен Мокдондағы Ихва университетінің ауруханалары, Куродағы Корё университетінің ауруханасы, Синчхондағы Северанс ауруханасы) және Immune Hospital корей медицинасы клиникасының төрт филиалы (Кансо, Синчхон, Кванмён, Сондон). Толық циклді алты тілде ұйымдастырамыз: клиника таңдау, медициналық аударма, визалық шақырту, стационарда еріп жүру және шыққаннан кейін қашықтан бақылау."
    },
    "faq": {
      "title": "Жиі қойылатын сұрақтар",
      "items": [
        {
          "q": "Менің сақтандыруым Кореяда емделуге жарай ма?",
          "a": "Мұны полисіңіздің шарттары айқындайды: онкология өтемге кіре ме, шетелде емделу қарастырылған ба және бағдарлама географиясы Оңтүстік Кореяны қамти ма — осы үш тармақты тексеріңіз. Түпкілікті жауапты әрқашан сақтандырушы береді; healwith кеңесшілері тексеруге және сақтандырушыға қоятын сұрақтарды дайындауға тегін көмектеседі."
        },
        {
          "q": "Өз қалтамнан қанша төлеймін?",
          "a": "Тікелей төлем қарастырылған бағдарламаларда сақтандырушы клиникамен тікелей есеп айырысады — лимит пен келісімшарт шегінде сізден алдын ала төлем жоқ. Өтемнен тыс шығын туындай қалса, оның көлемін полисіңіз айқындайды; healwith кеңесі тегін."
        },
        {
          "q": "Мені түсінер ме екен? Корей тілін де, ағылшын тілін де білмеймін.",
          "a": "Иә: healwith командасы Корея клиникасында медициналық аударма мен еріп жүруді орыс және қазақ тілдерінде қамтамасыз етеді — сақтандыруыңыздың бар-жоғына қарамастан. Ал «Здоровье без границ» бойынша пациентке қосымша орыстілді медициналық куратор еріп жүреді."
        },
        {
          "q": "Ал менде мұндай сақтандыру болмаса ше?",
          "a": "Кореяда емделу сақтандырусыз да мүмкін — бұл жағдайда емдеу ақысын клиникаға тікелей төлейсіз. Шығын шамасын адал айтамыз, клиника таңдаймыз, визалық шақыртуға көмектесеміз және әр қадамда қасыңызда боламыз — кеңес тегін."
        }
      ]
    },
    "disclaimer": {
      "title": "Маңызды ақпарат",
      "body": "Осы бетте аталған сақтандыру бағдарламаларын тиісті сақтандыру және ассистанс-компаниялар ұсынады: РЕСО-Гарантия, Росгосстрах, ManagedCare Russia. Шарттарды, лимиттер мен алып тастауларды олардың ресми қағидалары мен сіздің келісімшартыңыз айқындайды — рәсімдеу алдында сақтандырушының құжаттарын тексеріңіз. healwith сақтандыру компаниясы емес және полис сатпайды: біз — Кореяда тіркелген шетелдік пациенттерді қабылдау жөніндегі оператормыз, емдеу процесін ұйымдастырамыз, бірақ медициналық және сақтандыру қызметтерін көрсетпейміз. Ақпарат компаниялардың ашық материалдары бойынша, 2026 жылғы шілдедегі жағдайға сай келтірілген."
    },
    "closing": {
      "title": "Қарапайым сұрақтан бастаңыз",
      "body": "Сақтандыру бағдарламаңыздың атауын жазып жіберіңіз — немесе жағдайыңызды өз сөзіңізбен сипаттаңыз. Өтемді қалай тексеру керегін және Кореядағы емдеу қалай өтетінін тегін түсіндіреміз — міндеттемесіз және қысымсыз.",
      "cta": "Бізге жазыңыз — бұл тегін"
    }
  },
  "zh": {
    "hero": {
      "eyebrow": "指南 · 用保险赴韩治疗",
      "title": "您的保险，或许\n已经涵盖在韩国的癌症治疗",
      "lede": "俄罗斯部分重大疾病保险产品将海外治疗纳入保障范围——其中就包括韩国。我们免费帮您核实保单，并安排韩国一侧的治疗。",
      "cta": "获取免费咨询",
      "note": "即使已经确诊、或者没有任何保险，也可以免费咨询。"
    },
    "products": {
      "title": "哪些保险产品包含海外治疗",
      "lede": "以下俄罗斯保险产品正式涵盖在俄境外的肿瘤治疗，另有一家实际安排此类治疗的医疗援助公司。内容依据各公司公开资料整理，确切条件以您的保险合同为准。",
      "waitNote": "坦诚说明：这些产品的海外治疗设有等待期——分别为180天和120天，属于提前“为将来”投保的类型。已确诊而没有保单？赴韩治疗依然可行，本页末尾有说明。",
      "items": [
        {
          "name": "РЕСО-Гарантия（RESO-Garantia）——“健康无国界”",
          "tag": "保险产品",
          "desc": "保障肿瘤、心血管外科、神经外科及骨髓移植。",
          "specs": [
            {
              "label": "保额",
              "value": "“经典”方案 €1,000,000 / “肿瘤扩展”方案 €500,000"
            },
            {
              "label": "投保年龄",
              "value": "0–64岁"
            },
            {
              "label": "保费",
              "value": "每年 €75 起，无需体检"
            },
            {
              "label": "等待期",
              "value": "海外治疗 180 天"
            }
          ],
          "korea": "韩国与以色列、西班牙一同被明确列入可治疗国家名单。"
        },
        {
          "name": "Росгосстрах（Rosgosstrakh）——“治疗无国界”",
          "tag": "保险产品",
          "desc": "保障肿瘤、心脏及神经外科手术和康复治疗。",
          "specs": [
            {
              "label": "保额",
              "value": "25,000,000 卢布，首次确诊另行一次性给付 200,000 卢布"
            },
            {
              "label": "投保年龄",
              "value": "1–64岁"
            },
            {
              "label": "保费",
              "value": "每年 7,390 卢布起，以健康告知代替体检"
            },
            {
              "label": "等待期",
              "value": "120 天"
            }
          ],
          "korea": "治疗地域为除美国外的全球范围——韩国不在所列除外之内，是否适用于您的情况请向保险公司核实。"
        },
        {
          "name": "Маданес / МСР（Madanes / MCR）——医疗援助公司 ManagedCare Russia",
          "tag": "治疗支持公司",
          "desc": "它不是保险公司，而是受各保险公司委托为患者安排治疗的医疗援助公司——自2009年起在俄罗斯运营，客户超过100万人，合作保险公司超过30家。",
          "specs": [
            {
              "label": "“扩展”套餐",
              "value": "每月 100,000 卢布"
            },
            {
              "label": "套餐内容",
              "value": "海外治疗安排：挑选医院、协调住院、对接国际医生、海外药品"
            },
            {
              "label": "运营规模",
              "value": "2009年起在俄罗斯运营 · 客户超100万人 · 合作保险公司超30家"
            },
            {
              "label": "五年生存率",
              "value": "85%（公司自行发布，基于自身客户统计，不宜与国家统计直接比较）"
            }
          ],
          "korea": "若您投保的保险公司与 МСР 有合作，请向保险公司确认按您的保单如何安排海外治疗。"
        }
      ]
    },
    "coverage": {
      "title": "这类保险为您承担什么",
      "lede": "以“健康无国界”计划为例：保单支付的不只是医院账单，还有治疗周边的几乎一切。具体保障构成以您的合同条款为准。",
      "items": [
        {
          "title": "治疗",
          "body": "必要的医疗费用在方案保额内全额支付——按“经典”方案最高 €1,000,000。"
        },
        {
          "title": "交通",
          "body": "往返治疗地的交通包含在方案保障之内，行程安排由服务公司负责。"
        },
        {
          "title": "住宿——患者与陪同亲友",
          "body": "患者本人和陪同者的住宿均在方案条件与保额范围内支付。治疗期间，亲人可以一直陪在身边。"
        },
        {
          "title": "医疗协调员与俄语服务",
          "body": "讲俄语的医疗协调员全程陪同患者，方案还包含第二医疗意见。在韩国医院，healwith 团队额外提供医疗翻译。"
        },
        {
          "title": "费用直接支付给医院",
          "body": "保险公司与医院直接结算。您无需先行垫付、再等待报销。"
        }
      ]
    },
    "steps": {
      "title": "如何运作：五个步骤——以“健康无国界”为例",
      "items": [
        {
          "title": "联系您的保险公司",
          "body": "如果已经确诊，第一步是拨打保单上的电话联系保险公司。还在了解条款的阶段？healwith 顾问免费帮您弄清从哪里开始。"
        },
        {
          "title": "提交诊断文件",
          "body": "保险公司及其援助机构会要求提供诊断书和检查结果等医疗文件。我们会提前告诉您韩国医院通常需要哪些材料，帮您一次备齐。"
        },
        {
          "title": "选择医院——至少三家可选",
          "body": "按方案条款，将为您提供不少于三家医院供选择。如果其中有韩国，healwith 帮您比较韩国各医院，并按诊断匹配对口的专科科室。"
        },
        {
          "title": "交通与住宿有人替您安排",
          "body": "行程与住宿由服务公司负责。在韩国一侧，healwith 协助办理接收医院出具的签证邀请函，抵达时接机并在医院全程陪同。"
        },
        {
          "title": "保险公司直接向医院付款",
          "body": "结算在保险公司与医院之间进行，您无需预付，只需安心治疗。回国后 healwith 继续远程跟进，必要时为您对接韩国医生。"
        }
      ]
    },
    "whyKorea": {
      "title": "为什么是韩国",
      "lede": "韩国与以色列、西班牙一同被明确列入“健康无国界”计划的可治疗国家名单。以下是关于韩国肿瘤医疗的几个事实——不加渲染。",
      "stat": {
        "value": "72.9%",
        "label": "韩国肿瘤患者的五年生存率——覆盖全国患者的官方国家统计",
        "source": "韩国国立癌症中心 国家癌症登记统计（2018–2022）"
      },
      "hospitals": {
        "title": "大学医院——直接点名",
        "caption": "梨大首尔医院 · 梨大木洞医院 · 高丽大学九老医院 · 新村世福兰斯医院（另有免疫韩方医院四家分院）"
      },
      "support": {
        "title": "俄语始终在身边",
        "body": "从首次咨询到回国，全程俄语陪同：医疗翻译、院内协助、与医生沟通。healwith 以包括俄语和哈萨克语在内的六种语言提供服务，出院后也保持联系。"
      }
    },
    "partner": {
      "title": "致保险公司与医疗援助公司",
      "body": "healwith 欢迎与保险公司及医疗援助公司合作，承接病例在韩国一侧的全部工作。我们是韩国保健福祉部登记的外国患者招揽机构（登记号 A-2026-01-02-06761），网络包括四家大学医院（梨大首尔医院、梨大木洞医院、高丽大学九老医院、新村世福兰斯医院）和免疫韩方医院的四家分院（江西、新村、光明、城东）。我们以六种语言组织全流程服务：匹配医院、医疗翻译、签证邀请函、住院陪同及出院后的远程管理。"
    },
    "faq": {
      "title": "常见问题",
      "items": [
        {
          "q": "我的保险适用于在韩国治疗吗？",
          "a": "由您保单的条款决定——请核实三点：肿瘤是否在保障范围内、是否包含海外治疗、地域范围是否涵盖韩国。最终答案由保险公司给出，healwith 顾问免费帮您理清情况并准备好要问的问题。"
        },
        {
          "q": "我自己要花多少钱？",
          "a": "在直接结算类方案中，保险公司在保额和合同条件范围内与医院直接结算，患者无需预付。如产生超出保障的费用，其归属由您的保单决定；healwith 的咨询是免费的。"
        },
        {
          "q": "我既不会韩语也不会英语，能沟通吗？",
          "a": "可以。healwith 团队在韩国医院提供俄语和哈萨克语的医疗翻译与陪同——无论有无保险；按“健康无国界”计划，还会额外安排讲俄语的医疗协调员全程陪同。"
        },
        {
          "q": "如果我没有这类保险呢？",
          "a": "没有保险同样可以在韩国治疗，费用由您直接支付给医院。我们会如实说明大致费用、匹配医院、协助办理签证邀请函并全程陪伴——流程一样，只是少了保险这一环，咨询免费。"
        }
      ]
    },
    "disclaimer": {
      "title": "重要信息",
      "body": "本页提及的保险产品由相应的保险公司及医疗援助公司（РЕСО-Гарантия、Росгосстрах、ManagedCare Russia）提供，条件、保额与除外责任以各公司官方条款及您的个人合同为准。投保前请核对保险公司的正式文件。healwith 不是保险公司，也不销售保单——我们是在韩国登记的外国患者招揽机构，负责组织治疗流程，不提供医疗和保险服务。本页信息依据各公司公开资料整理，截至2026年7月。"
    },
    "closing": {
      "title": "从一个简单的问题开始",
      "body": "把您投保的保险产品名称发给我们，或者用自己的话描述一下情况。我们会免费告诉您如何核实保障范围、在韩国治疗如何进行——没有义务，也没有推销压力。",
      "cta": "给我们留言——完全免费"
    }
  },
  "ja": {
    "hero": {
      "eyebrow": "ガイド · 保険で受ける韓国での治療",
      "title": "あなたの保険は、すでに韓国での\nがん治療を保障しているかもしれません",
      "lede": "ロシアの重大疾病保険の中には、海外での治療 — 韓国を含む — を保障する商品があります。保障の確認は私たちが無料でお手伝いし、韓国側での治療も手配します。",
      "cta": "無料相談を受ける",
      "note": "すでに診断を受けている方も、保険をお持ちでない方も、無料相談をご利用いただけます。"
    },
    "products": {
      "title": "海外での治療を含む保険商品",
      "lede": "以下は、ロシア国外でのがん治療を公式に保障範囲に含む現行のロシアの保険商品と、そうした治療を実際に手配するアシスタンス会社です。内容は各社の公開資料に基づきます。",
      "waitNote": "正直なお知らせをひとつ — これらの商品の海外治療には待機期間(180日・120日)があります。つまり、あらかじめ「将来に備えて」加入しておく性格の保険です。",
      "items": [
        {
          "name": "РЕСО-Гарантия(レソ・ガランティア)『国境なき健康』",
          "tag": "保険商品",
          "desc": "がん、心臓血管外科、脳神経外科、骨髄移植を保障します。加入時の健康診断は不要です。",
          "specs": [
            {
              "label": "保障限度額",
              "value": "『クラシック』€1,000,000 / 『オンコロジー拡張』€500,000"
            },
            {
              "label": "加入年齢",
              "value": "0〜64歳"
            },
            {
              "label": "保険料",
              "value": "年間€75から"
            },
            {
              "label": "待機期間",
              "value": "海外治療は180日"
            }
          ],
          "korea": "治療可能な国のリストに、イスラエル・スペインと並んで韓国が明記されています。"
        },
        {
          "name": "Росгосстрах(ロスゴスストラフ)『国境なき治療』",
          "tag": "保険商品",
          "desc": "がん、心臓・脳神経外科手術、リハビリテーションを保障します。初回診断時には一時金20万ルーブルが追加で支払われ、加入は健康診断の代わりに健康告知書で足ります。",
          "specs": [
            {
              "label": "保障限度額",
              "value": "2,500万ルーブル"
            },
            {
              "label": "加入年齢",
              "value": "1〜64歳"
            },
            {
              "label": "保険料",
              "value": "年間7,390ルーブルから"
            },
            {
              "label": "待機期間",
              "value": "120日"
            }
          ],
          "korea": "治療地域は米国を除く全世界 — 韓国は明示された除外対象には含まれていません(ご自身のケースへの適用は保険会社にご確認ください)。"
        },
        {
          "name": "マダネス/МСР — ManagedCare Russia",
          "tag": "治療サポート会社",
          "desc": "保険会社ではなく、保険会社からの委託を受けて患者の治療を手配するアシスタンス会社です。同社の発表によれば、患者の5年生存率は85%です — ただしこれは自社の利用者を対象とした自社集計であり、母集団も集計方法も異なるため、国全体の公式統計と直接比較するのは適切ではありません。",
          "specs": [
            {
              "label": "実績",
              "value": "ロシアで2009年から / 利用者100万人以上 / 提携保険会社30社以上"
            },
            {
              "label": "『拡張(Расширенный)』パッケージ",
              "value": "月額100,000ルーブル"
            },
            {
              "label": "パッケージ内容",
              "value": "海外の病院選定 · 入院の調整 · 海外の医師との連絡 · 海外医薬品"
            }
          ],
          "korea": "ご加入の保険会社がМСРと提携している場合は、ご自身の保険証券で海外治療がどのように手配されるか、保険会社にご確認ください。"
        }
      ]
    },
    "coverage": {
      "title": "こうした保険が負担してくれるもの",
      "lede": "『国境なき健康』プランを例にとると、保険は病院の請求額だけでなく、治療を取り巻くほぼすべての費用を負担します。",
      "items": [
        {
          "title": "治療費",
          "body": "必要な医療費はプランの限度額内で全額支払われます — 『クラシック』では最大€1,000,000。"
        },
        {
          "title": "渡航",
          "body": "治療地までの往復の渡航が保障に含まれ、移動の手配はサービス会社が担当します。"
        },
        {
          "title": "宿泊 — ご本人と付き添いの方",
          "body": "患者ご本人だけでなく、付き添いの方の宿泊費もプランの範囲内で支払われます。治療の間、家族がそばにいられます。"
        },
        {
          "title": "キュレーターとロシア語",
          "body": "ロシア語対応の医療キュレーターが付き添い、セカンドオピニオンもプランに含まれます。韓国の病院では、healwithチームがさらに医療通訳を提供します。"
        },
        {
          "title": "支払いは病院へ直接",
          "body": "保険会社が病院に直接支払います。立て替えて払い戻しを待つ必要はありません。"
        }
      ]
    },
    "steps": {
      "title": "ご利用の流れ:5つのステップ — 『国境なき健康』の例",
      "items": [
        {
          "title": "保険会社に連絡する",
          "body": "診断を受けたら、まず保険証券に記載された番号で保険会社に連絡してください。条件を調べている段階なら、healwithの相談員が何から始めるかを無料でお手伝いします。"
        },
        {
          "title": "診断に関する書類を提出する",
          "body": "保険会社とアシスタンス会社から、診療情報提供書や検査結果などの医療書類を求められます。韓国の病院が通常必要とする書類を事前にお伝えし、一度で揃えられるようにします。"
        },
        {
          "title": "病院を選ぶ — 最低3か所の中から",
          "body": "プランの条件により、少なくとも3か所の病院の中から選べます。韓国が含まれていれば、healwithが病院の比較と、診断に合った専門診療科の選定をお手伝いします。"
        },
        {
          "title": "渡航と宿泊は手配してもらえます",
          "body": "渡航と宿泊はサービス会社が手配します。韓国側では、healwithが受け入れ病院名義のビザ招へい状をサポートし、到着時の出迎えと院内での付き添いを行います。"
        },
        {
          "title": "保険会社が病院に直接支払う",
          "body": "精算は保険会社と病院の間で行われ、患者側の立て替え払いはありません。帰国後もhealwithが遠隔フォローを続け、必要に応じて韓国の医師とおつなぎします。"
        }
      ]
    },
    "whyKorea": {
      "title": "なぜ韓国なのか",
      "lede": "韓国は『国境なき健康』プランの治療可能な国リストに、イスラエル・スペインと並んで明記されています。誇張なしに、事実だけをご紹介します。",
      "stat": {
        "value": "72.9%",
        "label": "韓国のがん患者の5年生存率 — 国全体を対象とした公式の国家統計",
        "source": "韓国国立がんセンター・国家がん登録統計 2018–2022"
      },
      "hospitals": {
        "title": "大学病院 — 名前を挙げてご紹介",
        "caption": "梨花(イファ)女子大学ソウル病院 · 梨花女子大学木洞(モクトン)病院 · 高麗(コリョ)大学九老(クロ)病院 · 新村(シンチョン)セブランス病院"
      },
      "support": {
        "title": "ロシア語がいつもそばに",
        "body": "最初のお問い合わせから帰国まで、医療通訳・院内サポート・医師とのやり取りをロシア語で伴走します。healwithはロシア語・カザフ語を含む6言語で対応し、退院後も連絡を続けます。"
      }
    },
    "partner": {
      "title": "保険会社・アシスタンス会社の皆さまへ",
      "body": "healwithは保険会社・アシスタンス会社との協業を歓迎し、ケースの韓国側の全工程を担います。当社は大韓民国保健福祉部に登録された外国人患者受け入れ事業者です(登録番号 A-2026-01-02-06761)。提携ネットワークは、4つの大学病院(梨花女子大学ソウル病院・梨花女子大学木洞病院・高麗大学九老病院・新村セブランス病院)と、韓方の免疫病院の4院(江西〈カンソ〉・新村〈シンチョン〉・光明〈クァンミョン〉・城東〈ソンドン〉)です。病院の選定、医療通訳、ビザ招へい状、入院中の付き添い、退院後の遠隔フォローまで、全工程を6言語で手配します。"
    },
    "faq": {
      "title": "よくあるご質問",
      "items": [
        {
          "q": "私の保険で韓国での治療は受けられますか?",
          "a": "それは個々の保険証券(ポリシー)の条件によって決まり、最終的な判断は常にご加入の保険会社が行います。確認すべきは、がんが保障対象か・海外治療が含まれるか・保障地域に韓国が入るかの3点 — healwithの相談員が確認と質問の準備を無料でお手伝いします。"
        },
        {
          "q": "自己負担はどのくらいかかりますか?",
          "a": "直接支払い方式のプランでは、保険会社が限度額と契約条件の範囲内で病院に直接精算するため、立て替え払いはありません。保障を超える費用が生じた場合の扱いは、個々の保険証券が定めます。"
        },
        {
          "q": "韓国語も英語も話せませんが、意思疎通はできますか?",
          "a": "はい。healwithチームが保険の有無を問わず、韓国の病院でロシア語・カザフ語の医療通訳と付き添いを提供し、『国境なき健康』プランではロシア語対応の医療キュレーターの付き添いも加わります。"
        },
        {
          "q": "そのような保険に入っていない場合は?",
          "a": "保険がなくても韓国での治療は可能です — その場合は治療費を病院に直接お支払いいただきます。費用の目安のご案内、病院選び、ビザ招へい状のサポート、各ステップでの付き添いまで、流れは同じです。"
        }
      ]
    },
    "disclaimer": {
      "title": "重要なご案内",
      "body": "このページで言及した保険商品は各保険会社・アシスタンス会社(РЕСО-Гарантия、Росгосстрах、ManagedCare Russia)が提供するもので、条件・限度額・免責事項は各社の公式約款と個々の契約が定めます。ご加入前に必ず保険会社の公式書類をご確認ください。healwithは保険会社ではなく、保険の販売も行いません — 韓国で登録された外国人患者受け入れ事業者として治療プロセスの手配・支援を行うのみで、医療行為・保険サービスは提供しません。本情報は各社の公開資料に基づく、2026年7月時点のものです。"
    },
    "closing": {
      "title": "簡単な質問ひとつから始めましょう",
      "body": "ご加入の保険商品名をお送りいただくか、状況をご自身の言葉でそのままお書きください。保障の確認方法と韓国での治療の進み方を無料でご案内します — 義務も、無理な勧誘も一切ありません。",
      "cta": "無料で問い合わせる"
    }
  }
};
