// /insurance 보험 가이드 카피 v3 (6개 언어) — 재구성+6개 언어 원어민 다듬기 워크플로(2026-07-06, PO 가독성·외래어 피드백 반영).
// 구조: 짧은 문장 + 스펙 칩(specs) + 대기기간 콜아웃(waitNote). 사실 기준: docs/marketing/madanes-insurance/RESEARCH.md.
export const COPY = {
  "ko": {
    "hero": {
      "eyebrow": "안내 · 보험으로 받는 한국 치료",
      "title": "가입해 둔 보험이 이미 한국 암치료를\n보장하고 있을지도 모릅니다",
      "lede": "러시아의 일부 중증질환 보험은 해외 치료까지 보장하며, 한국도 그 대상에 들어 있습니다. 내 보험이 해당되는지 저희가 무료로 확인을 돕고, 한국에서 받으실 치료까지 준비해 드립니다.",
      "cta": "무료 상담 받기",
      "note": "이미 진단을 받으셨거나 보험이 없어도, 무료 상담은 똑같이 받으실 수 있습니다."
    },
    "products": {
      "title": "해외 치료를 보장하는 보험 상품",
      "lede": "러시아 밖에서 받는 암치료를 공식적으로 보장하는 현행 러시아 보험 상품과, 그 치료를 대신 준비해 주는 치료 지원 회사를 소개합니다. 내용은 각 회사의 공개 자료 기준이며, 정확한 조건은 각자의 계약이 정합니다.",
      "waitNote": "솔직한 안내 하나 — 이 상품들의 해외 치료에는 대기 기간(180일·120일)이 있습니다. 그래서 아프기 전에 미리, 앞날을 위해 들어두는 보험입니다.",
      "items": [
        {
          "name": "레소-가란티야(РЕСО-Гарантия) — «국경 없는 건강»(Здоровье без границ)",
          "tag": "보험 상품",
          "desc": "암, 심혈관 수술, 신경외과 수술, 골수이식을 보장합니다.",
          "specs": [
            {
              "label": "보장 한도",
              "value": "«클래식» €1,000,000 / «온콜로지 확장» €500,000"
            },
            {
              "label": "가입 연령",
              "value": "0~64세, 건강검진 없이 가입"
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
          "name": "로스고스스트라흐(Росгосстрах) — «국경 없는 치료»(Лечение без границ)",
          "tag": "보험 상품",
          "desc": "암과 심장·신경외과 수술, 재활을 보장합니다. 처음 진단이 확정되면 일시금 20만 루블을 따로 받습니다.",
          "specs": [
            {
              "label": "보장 한도",
              "value": "2,500만 루블"
            },
            {
              "label": "가입 연령",
              "value": "1~64세, 검진 대신 건강 고지"
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
          "korea": "치료 지역은 미국을 뺀 전 세계입니다. 한국은 명시된 제외 대상이 아니지만, 실제 적용 여부는 보험사 약관으로 확인하세요."
        },
        {
          "name": "마다네스(Маданес)/МСР — ManagedCare Russia",
          "tag": "치료 지원 회사",
          "desc": "보험사가 아니라, 보험사의 위탁을 받아 환자의 치료를 대신 준비하는 회사입니다. 회사 발표 기준으로 환자 5년 생존율은 85%인데, 자사 고객만 집계한 수치라 국가 통계와 그대로 비교하기는 어렵습니다.",
          "specs": [
            {
              "label": "운영 이력",
              "value": "러시아에서 2009년부터"
            },
            {
              "label": "규모",
              "value": "고객 100만 명 이상 · 제휴 보험사 30곳 이상"
            },
            {
              "label": "«확장» 패키지",
              "value": "월 100,000루블"
            },
            {
              "label": "패키지 내용",
              "value": "병원 선정 · 입원 조율 · 해외 의료진 소통 · 해외 의약품"
            }
          ],
          "korea": "가입하신 보험사가 МСР와 협력하고 있다면, 내 보험 증권으로 해외 치료가 어떻게 준비되는지 보험사에 물어보세요."
        }
      ]
    },
    "coverage": {
      "title": "이런 보험이 대신 내주는 것들",
      "lede": "«국경 없는 건강»을 예로 들면, 보험은 병원비만이 아니라 치료를 둘러싼 거의 모든 것을 부담합니다. 정확한 보장 구성은 각자의 약관이 정합니다.",
      "items": [
        {
          "title": "치료비",
          "body": "필요한 의료비를 상품 한도 안에서 전액 지급합니다. «클래식» 기준 최대 €1,000,000입니다."
        },
        {
          "title": "이동",
          "body": "치료받으러 가는 길과 돌아오는 길 모두 보장에 포함됩니다. 준비는 치료 지원 회사가 맡습니다."
        },
        {
          "title": "숙박 — 환자와 동반자",
          "body": "환자와 동반자의 숙박을 상품 조건과 한도 안에서 지원합니다. 치료 기간 내내 가족이 곁에 있을 수 있습니다."
        },
        {
          "title": "전담 안내인과 러시아어",
          "body": "러시아어를 쓰는 전담 안내인이 환자와 동행하고, 2차 의료 소견도 포함됩니다. 한국 병원에서는 healwith 팀이 의료통역을 더합니다."
        },
        {
          "title": "병원으로 직접 지급",
          "body": "보험사가 치료비를 병원에 직접 냅니다. 환자가 먼저 내고 나중에 돌려받는 방식이 아닙니다."
        }
      ]
    },
    "steps": {
      "title": "이용 절차 5단계 — «국경 없는 건강» 예시",
      "items": [
        {
          "title": "보험사에 연락",
          "body": "진단을 받으셨다면 보험 증권에 적힌 번호로 먼저 연락하세요. 어디서부터 시작할지 막막하시다면 healwith가 무료로 함께 정리해 드립니다."
        },
        {
          "title": "진단 서류 제출",
          "body": "보험사와 치료 지원 회사가 소견서와 검사 결과를 요청합니다. 한국 병원이 흔히 찾는 서류를 미리 알려드려, 한 번에 준비하실 수 있게 돕습니다."
        },
        {
          "title": "병원 선택 — 최소 3곳 제안",
          "body": "상품 조건에 따라 최소 3곳의 병원을 제안받습니다. 그 안에 한국이 있다면, healwith가 진단에 맞는 병원과 진료과를 찾도록 돕습니다."
        },
        {
          "title": "이동과 숙박은 치료 지원 회사가 맡습니다",
          "body": "가는 길과 머물 곳은 치료 지원 회사가 준비합니다. 한국에서는 healwith가 병원 명의의 비자 초청장 준비를 돕고, 도착하시면 마중과 병원 동행을 맡습니다."
        },
        {
          "title": "보험사가 병원에 직접 지불",
          "body": "정산은 보험사와 병원 사이에서 끝나므로 환자가 미리 낼 돈이 없습니다 — 치료에만 집중하시면 됩니다. 귀국 후에도 healwith가 원격 관리를 이어가고, 필요하면 한국 의료진과 연결해 드립니다."
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
        "body": "첫 문의부터 귀국까지 의료통역과 병원 동행을 러시아어로 함께합니다. healwith는 러시아어·카자흐어를 포함한 6개 언어로 일하며, 퇴원 후에도 연락을 이어갑니다."
      }
    },
    "partner": {
      "title": "보험사·치료 지원 회사 제휴 안내",
      "body": "healwith는 보험사·치료 지원 회사와의 협력에 열려 있으며, 각 치료 사례의 한국 측 전 과정을 맡습니다. 한국 보건복지부에 등록된 외국인환자 유치업체입니다(등록번호 A-2026-01-02-06761). 협력 병원은 대학병원 4곳(이대서울·이대목동·고려대구로·신촌세브란스)과 면력한방병원 4개 지점(강서·신촌·광명·성동)입니다. 병원 연결, 의료통역, 비자 초청장, 입원 동행, 퇴원 후 원격 관리까지 6개 언어로 준비합니다."
    },
    "faq": {
      "title": "자주 묻는 질문",
      "items": [
        {
          "q": "제 보험으로 한국 치료가 가능한가요?",
          "a": "가입하신 보험 증권이 정합니다 — 암을 보장하는지, 해외 치료가 들어 있는지, 보장 지역에 한국이 포함되는지 세 가지를 확인하세요. 최종 판단은 보험사의 몫이고, 확인 과정과 보험사에 물어볼 질문 정리는 healwith가 무료로 돕습니다."
        },
        {
          "q": "제 돈은 얼마나 드나요?",
          "a": "보험사가 병원에 직접 내는 방식에서는 환자가 미리 낼 돈이 없습니다 — 한도와 약관 조건 안에서 그렇습니다. 보장을 넘어서는 비용이 있다면 그 범위는 가입하신 증권이 정하며, healwith 상담은 무료입니다."
        },
        {
          "q": "한국어도 영어도 못하는데, 소통이 될까요?",
          "a": "네, healwith 팀이 한국 병원에서 러시아어·카자흐어 의료통역과 동행을 맡습니다 — 어떤 보험이든, 보험이 없어도 똑같습니다. «국경 없는 건강»에는 러시아어 전담 안내인의 동행도 포함됩니다."
        },
        {
          "q": "이런 보험이 없다면요?",
          "a": "보험 없이도 한국 치료는 가능합니다 — 치료비를 병원에 직접 내는 방식입니다. 비용이 어느 정도 드는지 솔직히 알려드리고, 병원 찾기·비자 초청장·동행까지 똑같이 무료로 돕습니다."
        }
      ]
    },
    "disclaimer": {
      "title": "중요 안내",
      "body": "이 페이지에 소개한 보험 상품은 레소-가란티야, 로스고스스트라흐, ManagedCare Russia가 제공합니다. 조건·한도·면책은 각 회사의 공식 약관과 개별 계약이 정하므로, 가입 전에 보험사의 공식 문서를 꼭 확인하세요. healwith는 보험사가 아니며 보험을 판매하지 않습니다 — 보건복지부에 등록된 외국인환자 유치업체로서 치료 과정을 준비하고 도울 뿐, 의료행위는 하지 않습니다. 본 내용은 각 회사의 공개 자료를 기준으로 하며, 기준일은 2026년 7월입니다."
    },
    "closing": {
      "title": "간단한 질문 하나로 시작하세요",
      "body": "가입하신 보험 상품 이름을 보내 주시거나, 지금 상황을 편하게 적어 주세요. 보장을 확인하는 방법과 한국 치료가 어떻게 진행되는지 무료로 알려드립니다 — 아무런 의무도 부담도 없습니다.",
      "cta": "무료로 문의하기"
    }
  },
  "en": {
    "hero": {
      "eyebrow": "Guide · Treatment in Korea, covered by insurance",
      "title": "Your insurance may already cover\ncancer treatment in Korea",
      "lede": "Some Russian critical-illness policies cover treatment abroad — and South Korea is one of the destinations. We'll help you check your policy for free and arrange the treatment on the Korean side.",
      "cta": "Get a free consultation",
      "note": "The consultation is free even if you already have a diagnosis — or no insurance at all."
    },
    "products": {
      "title": "Which policies cover treatment abroad",
      "lede": "Here are the current Russian insurance products that officially cover cancer treatment outside Russia — and the assistance company that arranges it. Details come from the companies' public materials; the exact terms are set by your own contract.",
      "waitNote": "One honest note up front: these policies have a waiting period for treatment abroad — 180 or 120 days — so this is insurance you buy in advance, for the future. Already diagnosed, or uninsured? Treatment in Korea is still possible — see the end of this page.",
      "items": [
        {
          "name": "RESO-Garantia (РЕСО-Гарантия) — \"Health Without Borders\"",
          "tag": "Insurance product",
          "desc": "Covers cancer, cardiovascular surgery, neurosurgery, and bone marrow transplants. No medical exam needed to enroll.",
          "specs": [
            {
              "label": "Coverage limit",
              "value": "€1,000,000 (Classic) / €500,000 (Oncology Extended)"
            },
            {
              "label": "Enrollment age",
              "value": "0–64"
            },
            {
              "label": "Premium",
              "value": "from €75 a year"
            },
            {
              "label": "Waiting period",
              "value": "180 days for treatment abroad"
            }
          ],
          "korea": "South Korea is named on the list of treatment countries, alongside Israel and Spain."
        },
        {
          "name": "Rosgosstrakh (Росгосстрах) — \"Treatment Without Borders\"",
          "tag": "Insurance product",
          "desc": "Covers cancer, heart surgery, neurosurgery, and rehabilitation. A health declaration takes the place of a medical exam.",
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
              "value": "from ₽7,390 a year"
            },
            {
              "label": "Waiting period",
              "value": "120 days"
            }
          ],
          "korea": "Treatment is available worldwide except the USA. South Korea is not a named exclusion — but confirm with the insurer that it applies to your case."
        },
        {
          "name": "Madanes / MCR — ManagedCare Russia",
          "tag": "Treatment support company",
          "desc": "Not an insurer — an assistance company that arranges treatment for patients on insurers' behalf. Its Extended package covers arranging treatment abroad: choosing a clinic, coordinating admission, communicating with international doctors, and sourcing medications from overseas. The company reports an 85% five-year survival rate among its patients — its own count of its own clients, so it can't be compared directly with national statistics.",
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
              "label": "Extended package",
              "value": "₽100,000 a month"
            }
          ],
          "korea": "If your insurer works with MCR, ask how treatment abroad works under your policy — healwith can take on the Korean side."
        }
      ]
    },
    "coverage": {
      "title": "What this insurance takes care of",
      "lede": "Take Health Without Borders as an example: the policy pays for far more than the hospital bill — nearly everything around your treatment. The exact scope is set by your contract.",
      "items": [
        {
          "title": "Treatment",
          "body": "The medical care you need is paid in full, within the program limit — up to €1,000,000 on the Classic plan."
        },
        {
          "title": "Travel",
          "body": "Your trip to treatment and back is covered. The service company makes the arrangements."
        },
        {
          "title": "Accommodation — for you and a loved one",
          "body": "The policy pays for your accommodation and your companion's, within the program's terms and limit. Someone close to you can stay by your side through treatment."
        },
        {
          "title": "A coordinator who speaks Russian",
          "body": "A Russian-speaking medical coordinator stays with you, and a second medical opinion is included. At the hospital in Korea, the healwith team adds medical interpretation."
        },
        {
          "title": "Payment — straight to the clinic",
          "body": "The insurer pays the clinic directly. You never pay upfront and wait to be reimbursed."
        }
      ]
    },
    "steps": {
      "title": "How it works in five steps — the Health Without Borders example",
      "items": [
        {
          "title": "Contact your insurer",
          "body": "If you have a diagnosis, call the number on your policy first. Not sure where to start? healwith will help you figure it out, free of charge."
        },
        {
          "title": "Submit your diagnosis documents",
          "body": "The insurer and its assistance company will ask for medical records — discharge summaries and test results. We'll tell you what Korean hospitals usually need, so you can gather everything in one go."
        },
        {
          "title": "Choose a clinic — at least three options",
          "body": "Under the program's terms, you're offered at least three clinics to choose from. If South Korea is among them, healwith will help you compare hospitals and find the right department for your diagnosis."
        },
        {
          "title": "Travel and accommodation are arranged for you",
          "body": "The service company books your travel and lodging. On the Korean side, healwith helps with the visa invitation letter from the receiving hospital, meets you on arrival, and stays with you at the hospital."
        },
        {
          "title": "The insurer pays the clinic directly",
          "body": "Payment is settled between the insurer and the clinic — nothing upfront from you, so you can focus on treatment. Once you're home, healwith continues remote follow-up and connects you with your Korean doctors when needed."
        }
      ]
    },
    "whyKorea": {
      "title": "Why South Korea",
      "lede": "South Korea is on the Health Without Borders list of treatment countries, alongside Israel and Spain. Here are a few facts about cancer care in Korea — no sales pitch.",
      "stat": {
        "value": "72.9%",
        "label": "Five-year cancer survival rate in Korea — an official nationwide figure, not one hospital's estimate",
        "source": "National Cancer Center of Korea, national cancer registry statistics, 2018–2022"
      },
      "hospitals": {
        "title": "University hospitals, by name",
        "caption": "Ewha Womans University Seoul and Mokdong Hospitals · Korea University Guro Hospital · Severance Hospital in Sinchon — plus four branches of the Immune Hospital of Korean Medicine"
      },
      "support": {
        "title": "Russian at your side",
        "body": "From your first message until you're back home, you're supported in Russian — medical interpretation, help at the hospital, communication with your doctors. healwith works in six languages, including Russian and Kazakh, and stays in touch after discharge."
      }
    },
    "partner": {
      "title": "For insurance and assistance companies",
      "body": "healwith is open to partnerships with insurers and assistance companies, and takes on the Korean side of every case. We are registered with Korea's Ministry of Health and Welfare as an international patient facilitator (reg. no. A-2026-01-02-06761). Our network: four university hospitals — Ewha Womans University Seoul and Mokdong Hospitals, Korea University Guro Hospital, and Severance Hospital in Sinchon — plus four branches of the Immune Hospital of Korean Medicine (Gangseo, Sinchon, Gwangmyeong, Seongdong). We handle the full cycle in six languages: hospital matching, medical interpretation, visa invitation letters, inpatient accompaniment, and remote follow-up after discharge."
    },
    "faq": {
      "title": "Frequently asked questions",
      "items": [
        {
          "q": "Will my insurance work for treatment in Korea?",
          "a": "That depends on your policy. Check three things: whether cancer is covered, whether treatment abroad is included, and whether the program's geography includes South Korea. The final answer always comes from your insurer — healwith will help you check and prepare the right questions, free of charge."
        },
        {
          "q": "How much will I pay out of pocket?",
          "a": "In direct-payment programs, the insurer settles with the clinic — nothing upfront from you, within your contract's limit and terms. Anything beyond the coverage is governed by your policy. The healwith consultation is free."
        },
        {
          "q": "Will I be understood? I speak neither Korean nor English.",
          "a": "Yes. healwith provides medical interpretation and accompaniment at Korean hospitals in Russian and Kazakh — whatever your insurance situation. Under Health Without Borders, a Russian-speaking medical coordinator stays with you as well."
        },
        {
          "q": "What if I don't have insurance like this?",
          "a": "You can still be treated in Korea — you'd pay the hospital directly. We'll give you an honest picture of the costs, find a hospital for your diagnosis, help with the visa invitation letter, and stay at your side. The consultation is free."
        }
      ]
    },
    "disclaimer": {
      "title": "Important information",
      "body": "The programs on this page are provided by the respective insurance and assistance companies — RESO-Garantia, Rosgosstrakh, and ManagedCare Russia. Their terms, limits, and exclusions are set by each company's official rules and your own contract — check the insurer's documents before you buy. healwith is not an insurance company and does not sell policies. We are a Korea-registered international patient facilitator: we organize the treatment process, but we do not provide medical or insurance services. All information comes from the companies' public materials, as of July 2026."
    },
    "closing": {
      "title": "Start with a simple question",
      "body": "Send us the name of your insurance program — or just describe your situation in your own words. We'll explain how to check your coverage and how treatment in Korea works, free of charge — no obligation, no pressure.",
      "cta": "Write to us — it's free"
    }
  },
  "ru": {
    "hero": {
      "eyebrow": "Гид · Лечение в Корее по страховке",
      "title": "Возможно, ваша страховка\nуже покрывает лечение рака в Корее",
      "lede": "Некоторые российские программы страхования от критических заболеваний включают лечение за границей — в том числе в Южной Корее. Мы бесплатно поможем это проверить и возьмём на себя организацию лечения в Корее.",
      "cta": "Получить бесплатную консультацию",
      "note": "Консультация бесплатна, даже если диагноз уже поставлен или полиса нет: лечение в Корее возможно и без страховки."
    },
    "products": {
      "title": "Какие программы включают лечение за границей",
      "lede": "Ниже — действующие российские страховые программы, которые официально включают лечение рака за пределами России, и ассистанс-компания, которая такое лечение организует. Данные — из открытых материалов компаний; точные условия определяет ваш договор.",
      "waitNote": "Сразу скажем честно: у лечения за границей есть период ожидания — 180 дней у РЕСО и 120 дней у Росгосстраха. Поэтому такой полис оформляют заранее, «на будущее». Если диагноз уже есть, а полиса нет — лечение в Корее всё равно возможно, и с этим мы тоже помогаем бесплатно.",
      "items": [
        {
          "name": "РЕСО-Гарантия — «Здоровье без границ»",
          "tag": "Страховая программа",
          "desc": "Покрывает онкологию, операции на сердце и сосудах, нейрохирургию и пересадку костного мозга.",
          "specs": [
            {
              "label": "Лимит покрытия",
              "value": "€1 000 000 «Классика» / €500 000 «Онкология расширенная»"
            },
            {
              "label": "Возраст оформления",
              "value": "от 0 до 64 лет"
            },
            {
              "label": "Стоимость",
              "value": "от €75 в год, без медицинского обследования"
            },
            {
              "label": "Период ожидания",
              "value": "180 дней для лечения за границей"
            }
          ],
          "korea": "Южная Корея прямо названа в списке стран лечения — вместе с Израилем и Испанией."
        },
        {
          "name": "Росгосстрах — «Лечение без границ»",
          "tag": "Страховая программа",
          "desc": "Покрывает онкологию, кардио- и нейрохирургические операции, реабилитацию. При первом установленном диагнозе дополнительно выплачивают 200 000 ₽.",
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
              "value": "от 7 390 ₽ в год, вместо обследования — декларация о здоровье"
            },
            {
              "label": "Период ожидания",
              "value": "120 дней"
            }
          ],
          "korea": "Лечиться можно по всему миру, кроме США: Южная Корея в названные исключения не входит, но подойдёт ли программа именно в вашем случае — уточните у страховой."
        },
        {
          "name": "Маданес / МСР — ассистанс ManagedCare Russia",
          "tag": "Ассистанс-компания: организация лечения",
          "desc": "Это не страховая, а ассистанс-компания: по поручению страховщиков она организует лечение пациентов. Пакет «Расширенный» — это организация лечения за границей: подбор клиники, помощь с госпитализацией, связь с зарубежными врачами и лекарства из-за рубежа.",
          "specs": [
            {
              "label": "Опыт",
              "value": "в России с 2009 года"
            },
            {
              "label": "Клиенты и партнёры",
              "value": "более 1 млн клиентов · более 30 страховых компаний-партнёров"
            },
            {
              "label": "Пакет «Расширенный»",
              "value": "100 000 ₽ в месяц"
            },
            {
              "label": "Выживаемость пациентов (5 лет)",
              "value": "85% — собственные данные компании, их нельзя напрямую сравнивать с государственной статистикой целых стран"
            }
          ],
          "korea": "Если ваша страховая работает с МСР, спросите у неё, как по вашему полису устроено лечение за границей."
        }
      ]
    },
    "coverage": {
      "title": "Что берёт на себя такая страховка",
      "lede": "На примере программы «Здоровье без границ»: полис оплачивает не только счета клиники, но и почти всё вокруг лечения. Точный состав покрытия определяет ваш договор.",
      "items": [
        {
          "title": "Лечение",
          "body": "Необходимое лечение оплачивается полностью — в пределах лимита программы, по «Классике» это до €1 000 000."
        },
        {
          "title": "Дорога",
          "body": "Дорога до места лечения и обратно входит в покрытие. Организует поездку сервисная компания."
        },
        {
          "title": "Проживание — для вас и близкого человека",
          "body": "Программа оплачивает проживание не только пациенту, но и сопровождающему — в пределах условий и лимита. Родной человек может быть рядом всё время лечения."
        },
        {
          "title": "Куратор и русский язык",
          "body": "Рядом с пациентом — русскоязычный медицинский куратор, в программу входит и второе медицинское мнение. А в корейской клинике команда healwith добавит медицинский перевод."
        },
        {
          "title": "Оплата — напрямую клинике",
          "body": "Страховая компания рассчитывается с клиникой напрямую. Вам не нужно платить вперёд и ждать возмещения."
        }
      ]
    },
    "steps": {
      "title": "Как это работает: пять шагов на примере программы «Здоровье без границ»",
      "items": [
        {
          "title": "Свяжитесь со своей страховой",
          "body": "Если диагноз уже поставлен, позвоните в страховую по номеру из полиса. Пока только разбираетесь в условиях? Консультанты healwith бесплатно подскажут, с чего начать."
        },
        {
          "title": "Передайте документы о диагнозе",
          "body": "Страховая и её ассистанс попросят выписки и результаты обследований. Мы заранее подскажем, что обычно нужно корейским клиникам, — соберёте всё за один раз."
        },
        {
          "title": "Выберите клинику — минимум из трёх",
          "body": "По условиям программы вам предложат не менее трёх клиник на выбор. Если среди них Южная Корея, healwith поможет сравнить больницы и найти профильное отделение под ваш диагноз."
        },
        {
          "title": "Дорогу и проживание организуют за вас",
          "body": "Дорогу и жильё берёт на себя сервисная компания. В Корее healwith поможет с визовым приглашением от принимающей больницы, встретит по приезде и будет сопровождать в клинике."
        },
        {
          "title": "Страховая платит клинике напрямую",
          "body": "Страховая и клиника рассчитываются между собой — платить вперёд вам не нужно, можно сосредоточиться на лечении. А когда вы вернётесь домой, healwith останется на связи и при необходимости соединит вас с корейскими врачами."
        }
      ]
    },
    "whyKorea": {
      "title": "Почему Южная Корея",
      "lede": "Южная Корея прямо названа в списке стран лечения программы «Здоровье без границ» — вместе с Израилем и Испанией. Несколько фактов о корейской онкологии — без рекламы.",
      "stat": {
        "value": "72,9%",
        "label": "пятилетняя выживаемость онкологических пациентов в Корее — официальная статистика по всей стране, а не данные одной клиники",
        "source": "Национальный онкологический центр Кореи, национальный раковый регистр, 2018–2022"
      },
      "hospitals": {
        "title": "Университетские клиники — называем по именам",
        "caption": "Больницы университета Ихва в Сеуле и Мокдоне · Больница университета Корё в Куро · Больница Северанс в Синчхоне"
      },
      "support": {
        "title": "Сопровождение на русском",
        "body": "С первого обращения и до возвращения домой с вами говорят по-русски: медицинский перевод, помощь в клинике, общение с врачами. healwith работает на шести языках, включая русский и казахский, и остаётся на связи и после выписки."
      }
    },
    "partner": {
      "title": "Страховым и ассистанс-компаниям",
      "body": "healwith открыт к сотрудничеству со страховыми и ассистанс-компаниями и берёт на себя корейскую часть каждого случая. Мы зарегистрированы Министерством здравоохранения и социального обеспечения Республики Корея как оператор по приёму иностранных пациентов (рег. № A-2026-01-02-06761). Наша сеть — четыре университетские клиники (больницы университета Ихва в Сеуле и Мокдоне, больница университета Корё в Куро, больница Северанс в Синчхоне) и четыре филиала клиники корейской медицины Immune Hospital (Кансо, Синчхон, Кванмён, Сондон). Полный цикл организуем на шести языках: подбор клиники, медицинский перевод, визовые приглашения, сопровождение в стационаре и дистанционное ведение после выписки."
    },
    "faq": {
      "title": "Частые вопросы",
      "items": [
        {
          "q": "Подойдёт ли моя страховка для лечения в Корее?",
          "a": "Это решают условия вашего полиса. Проверьте три вещи: входит ли онкология в покрытие, предусмотрено ли лечение за границей и есть ли Южная Корея в географии программы. Окончательный ответ всегда за страховой — а healwith бесплатно поможет разобраться и подготовить вопросы для неё."
        },
        {
          "q": "Сколько я заплачу из своего кармана?",
          "a": "В программах с прямой оплатой страховая рассчитывается с клиникой сама — платить вперёд вам не нужно, в пределах лимита и условий договора. Расходы сверх покрытия определяет ваш полис. Консультация healwith бесплатна."
        },
        {
          "q": "Меня поймут? Я не говорю ни по-корейски, ни по-английски.",
          "a": "Да. Команда healwith обеспечивает медицинский перевод и сопровождение в корейской клинике на русском и казахском — с любой страховкой и без неё. А по «Здоровью без границ» пациента дополнительно сопровождает русскоязычный медицинский куратор."
        },
        {
          "q": "А если у меня нет такой страховки?",
          "a": "Лечение в Корее возможно и без полиса — тогда вы платите клинике напрямую. Мы честно расскажем о примерных расходах, подберём клинику под диагноз, поможем с визовым приглашением и будем рядом — консультация бесплатна."
        }
      ]
    },
    "disclaimer": {
      "title": "Важная информация",
      "body": "Программы на этой странице предоставляются самими страховыми и ассистанс-компаниями: РЕСО-Гарантия, Росгосстрах, ManagedCare Russia. Их условия, лимиты и исключения определяются официальными правилами компаний и вашим договором — перед оформлением сверьтесь с документами страховщика. healwith — не страховая компания и полисы не продаёт: мы зарегистрированный в Корее оператор по приёму иностранных пациентов, организуем процесс лечения, но не оказываем ни медицинских, ни страховых услуг. Информация приведена по открытым материалам компаний по состоянию на июль 2026 года."
    },
    "closing": {
      "title": "Начните с простого вопроса",
      "body": "Напишите нам название вашей страховой программы — или просто опишите ситуацию своими словами. Мы бесплатно подскажем, как проверить покрытие, и объясним, как устроено лечение в Корее, — без обязательств и без давления.",
      "cta": "Написать нам — это бесплатно"
    }
  },
  "kz": {
    "hero": {
      "eyebrow": "Нұсқаулық · Кореяда сақтандырумен емделу",
      "title": "Сіздің сақтандыруыңыз Кореядағы қатерлі ісік емін\nқазірдің өзінде қамтуы мүмкін",
      "lede": "Ресейдің ауыр аурулардан сақтандыратын кейбір бағдарламалары шетелде емделуді де қамтиды — соның ішінде Оңтүстік Кореяда. Полисіңізді тексеруге тегін көмектесеміз, ал Корея жағындағы емді өзіміз ұйымдастырамыз.",
      "cta": "Тегін кеңес алу",
      "note": "Диагноз қойылған болса да, сақтандыруыңыз болмаса да — тегін кеңес ала аласыз."
    },
    "products": {
      "title": "Шетелде емделуді қамтитын бағдарламалар",
      "lede": "Төменде — қатерлі ісікті Ресейден тыс жерде емдеуді ресми түрде қамтитын қолданыстағы ресейлік сақтандыру бағдарламалары және сол емді ұйымдастыратын көмекші компания (ассистанс). Мәліметтер — компаниялардың ашық деректерінен; нақты шарттарды әркімнің өз келісімшарты белгілейді.",
      "waitNote": "Бірден адалын айтайық: бұл бағдарламаларда шетелде емделуге күту мерзімі бар — 180 күн және 120 күн. Сондықтан мұндай полисті алдын ала, болашақты ойлап рәсімдейді.",
      "items": [
        {
          "name": "РЕСО-Гарантия — «Здоровье без границ» («Шекарасыз денсаулық»)",
          "tag": "Сақтандыру бағдарламасы",
          "desc": "Қатерлі ісікті, жүрек-қантамыр хирургиясын, нейрохирургияны және сүйек кемігін ауыстырып салуды қамтиды.",
          "specs": [
            {
              "label": "Өтем шегі",
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
              "label": "Күту мерзімі",
              "value": "шетелде емделуге 180 күн"
            }
          ],
          "korea": "Ем алуға болатын елдер тізімінде Оңтүстік Корея нақты аталған — Израиль және Испаниямен қатар."
        },
        {
          "name": "Росгосстрах — «Лечение без границ» («Шекарасыз емдеу»)",
          "tag": "Сақтандыру бағдарламасы",
          "desc": "Қатерлі ісікті, жүрек пен нейрохирургиялық оталарды және оңалтуды қамтиды.",
          "specs": [
            {
              "label": "Өтем шегі",
              "value": "25 000 000 ₽ + диагноз алғаш қойылғанда біржолғы 200 000 ₽"
            },
            {
              "label": "Рәсімдеу жасы",
              "value": "1–64 жас"
            },
            {
              "label": "Жарна",
              "value": "жылына 7 390 ₽-ден, тексерудің орнына денсаулық туралы мәлімдеме"
            },
            {
              "label": "Күту мерзімі",
              "value": "120 күн"
            }
          ],
          "korea": "Емдеу аумағы — АҚШ-тан басқа бүкіл әлем. Оңтүстік Корея аталған алып тастаулар қатарында жоқ; бірақ өз жағдайыңызға жарай ма — оны сақтандырушының ресми қағидаларынан нақтылаңыз."
        },
        {
          "name": "Маданес / МСР — ManagedCare Russia ассистансы",
          "tag": "Ем ұйымдастыратын компания",
          "desc": "Бұл сақтандыру компаниясы емес: сақтандырушылардың тапсырысымен науқастардың емін ұйымдастыратын көмекші компания. Компанияның өз мәліметі бойынша, науқастарының бес жылдық өмір сүру көрсеткіші — 85%; бұл — өз клиенттері бойынша ішкі есеп, сондықтан оны елдердің мемлекеттік статистикасымен тікелей салыстыруға болмайды.",
          "specs": [
            {
              "label": "Тәжірибе",
              "value": "Ресейде 2009 жылдан бері"
            },
            {
              "label": "Ауқымы",
              "value": "1 миллионнан астам клиент, 30-дан астам серіктес сақтандыру компаниясы"
            },
            {
              "label": "«Расширенный» пакеті",
              "value": "айына 100 000 ₽"
            },
            {
              "label": "Пакет құрамы",
              "value": "клиника таңдау, ауруханаға жатқызуды үйлестіру, халықаралық дәрігерлермен байланыс, шетелдік дәрі-дәрмек"
            }
          ],
          "korea": "Сақтандыру компанияңыз МСР-мен жұмыс істесе, шетелдегі ем полисіңіз бойынша қалай ұйымдастырылатынын одан сұрап біліңіз."
        }
      ]
    },
    "coverage": {
      "title": "Мұндай сақтандыру нені өз мойнына алады",
      "lede": "«Здоровье без границ» мысалында: полис клиниканың шотын ғана емес, емге қатысты барлық дерлік шығынды төлейді. Өтемнің нақты құрамын әркімнің өз келісімшарты белгілейді.",
      "items": [
        {
          "title": "Ем",
          "body": "Қажетті медициналық шығын бағдарлама шегінде толық төленеді — «Классика» бойынша €1 000 000-ға дейін."
        },
        {
          "title": "Жол",
          "body": "Ем алатын жерге барып-қайту жолы өтемге кіреді. Сапарды қызмет көрсетуші компания реттейді."
        },
        {
          "title": "Тұрар орын — өзіңізге және жақыныңызға",
          "body": "Науқастың да, ертіп жүрген адамның да тұратын жері бағдарлама шарттары мен шегінде төленеді. Ем бойы жақыныңыз қасыңызда бола алады."
        },
        {
          "title": "Үйлестіруші және орыс тілі",
          "body": "Науқасқа орысша сөйлейтін медициналық үйлестіруші еріп жүреді; бағдарламаға екінші медициналық пікір де кіреді. Корея клиникасында healwith тобы оған қоса медициналық аударма жасайды."
        },
        {
          "title": "Төлем — тікелей клиникаға",
          "body": "Сақтандыру компаниясы клиникамен тікелей есеп айырысады. Әуелі өз қалтаңыздан төлеп, өтемін күтудің қажеті жоқ."
        }
      ]
    },
    "steps": {
      "title": "Бес қадам — «Здоровье без границ» мысалында",
      "items": [
        {
          "title": "Сақтандырушыға хабарласыңыз",
          "body": "Диагноз қойылған болса, әуелі полисте көрсетілген нөмірге қоңырау шалыңыз. Неден бастарыңызды білмей отырсаңыз, healwith кеңесшілері тегін бағыт береді."
        },
        {
          "title": "Диагноз құжаттарын тапсырыңыз",
          "body": "Сақтандырушы мен оның көмекші компаниясы дәрігер қорытындылары мен тексеру нәтижелерін сұратады. Корея клиникалары әдетте қандай құжат сұрайтынын алдын ала айтып, бәрін бір-ақ рет жинауға көмектесеміз."
        },
        {
          "title": "Клиника таңдаңыз — кемінде үш нұсқадан",
          "body": "Бағдарлама шарты бойынша сізге кемінде үш клиника ұсынылады. Ішінде Оңтүстік Корея болса, healwith корей ауруханаларын салыстырып, диагнозыңызға сай бөлімше табуға көмектеседі."
        },
        {
          "title": "Жол мен тұрар орынды сіз үшін реттейді",
          "body": "Жол мен қонатын жерді қызмет көрсетуші компания өз мойнына алады. Корея жағында healwith қабылдаушы аурухана атынан берілетін виза шақыртуын алуға көмектеседі, келгенде күтіп алады, клиникада бірге жүреді."
        },
        {
          "title": "Сақтандырушы клиникаға тікелей төлейді",
          "body": "Есеп айырысу сақтандырушы мен клиника арасында жүреді — сіз алдын ала ештеңе төлемейсіз, тек емге көңіл бөлесіз. Үйге оралған соң healwith қашықтан бақылауды жалғастырады, қажет болса корей дәрігерлерімен байланыстырып береді."
        }
      ]
    },
    "whyKorea": {
      "title": "Неге Оңтүстік Корея",
      "lede": "Оңтүстік Корея «Здоровье без границ» бағдарламасында ем алуға болатын елдер тізімінде нақты аталған — Израиль және Испаниямен қатар. Төменде — Кореядағы қатерлі ісік емі туралы бірнеше дерек, боямасыз.",
      "stat": {
        "value": "72,9%",
        "label": "Кореядағы қатерлі ісікпен ауыратын науқастардың бес жылдық өмір сүру көрсеткіші — жеке бір клиниканың есебі емес, бүкіл ел қамтылған ресми мемлекеттік дерек",
        "source": "Корея Ұлттық онкологиялық орталығы, қатерлі ісік тіркелімінің ұлттық статистикасы, 2018–2022"
      },
      "hospitals": {
        "title": "Университет ауруханалары — атын ашық атаймыз",
        "caption": "Сеул мен Мокдондағы Ихва университетінің ауруханалары · Куродағы Корё университетінің ауруханасы · Синчхондағы Северанс ауруханасы · және Immune Hospital корей медицинасы клиникасының төрт филиалы"
      },
      "support": {
        "title": "Орыс тілі — қасыңызда",
        "body": "Алғаш хабарласқаннан үйге оралғанға дейін сізді орыс тілінде сүйемелдейміз: медициналық аударма, клиникадағы көмек, дәрігерлермен байланыс. healwith орыс және қазақ тілдерін қоса, алты тілде жұмыс істейді, емнен шыққаннан кейін де байланысты үзбейді."
      }
    },
    "partner": {
      "title": "Сақтандыру және ассистанс-компанияларға",
      "body": "healwith сақтандыру және ассистанс-компаниялармен ынтымақтастыққа ашық, әр істің Корея жағын толық өз мойнына алады. Біз Корея Республикасы Денсаулық сақтау және әлеуметтік қамсыздандыру министрлігінде шетелдік науқастарды қабылдау жөніндегі оператор ретінде тіркелгенбіз (тіркеу № A-2026-01-02-06761). Желіміз — төрт университет ауруханасы (Сеул мен Мокдондағы Ихва университетінің ауруханалары, Куродағы Корё университетінің ауруханасы, Синчхондағы Северанс ауруханасы) және Immune Hospital корей медицинасы клиникасының төрт филиалы (Кансо, Синчхон, Кванмён, Сондон). Клиника таңдау, медициналық аударма, виза шақыртуы, стационарда бірге жүру және емнен кейін қашықтан бақылау — бәрін алты тілде ұйымдастырамыз."
    },
    "faq": {
      "title": "Жиі қойылатын сұрақтар",
      "items": [
        {
          "q": "Менің сақтандыруым Кореяда емделуге жарай ма?",
          "a": "Оны полисіңіздің шарттары шешеді. Үш нәрсені тексеріңіз: қатерлі ісік өтемге кіре ме, шетелде емделу қарастырылған ба, бағдарлама аумағына Оңтүстік Корея кіре ме. Түпкілікті жауапты әрқашан сақтандырушы береді; healwith мұны анықтауға да, сақтандырушыға қоятын сұрақтарды дайындауға да тегін көмектеседі."
        },
        {
          "q": "Өз қалтамнан қанша төлеймін?",
          "a": "Тікелей төлем қарастырылған бағдарламаларда сақтандырушы клиникамен өзі есеп айырысады — келісімшарттың шегі мен шарттары аясында сізден алдын ала төлем талап етілмейді. Өтемнен тыс шығын шыға қалса, оның көлемін өз полисіңіз белгілейді; healwith кеңесі тегін."
        },
        {
          "q": "Мені түсінер ме екен? Корейше де, ағылшынша да білмеймін.",
          "a": "Иә. healwith тобы Корея клиникасында медициналық аударма жасап, қасыңызда жүреді — орыс және қазақ тілдерінде, сақтандыруыңыздың бар-жоғына қарамастан. Ал «Здоровье без границ» бойынша науқасқа оған қоса орысша сөйлейтін медициналық үйлестіруші еріп жүреді."
        },
        {
          "q": "Ал мұндай сақтандыруым болмаса ше?",
          "a": "Сақтандырусыз да Кореяда емделуге болады — бұл жағдайда ем ақысын клиникаға өзіңіз тікелей төлейсіз. Шығынның шамасын жасырмай айтамыз, диагнозыңызға сай клиника табамыз, виза шақыртуына көмектесеміз, әр қадамда қасыңызда боламыз — кеңес тегін."
        }
      ]
    },
    "disclaimer": {
      "title": "Маңызды ақпарат",
      "body": "Бұл беттегі сақтандыру бағдарламаларын тиісті сақтандыру және ассистанс-компаниялар ұсынады: РЕСО-Гарантия, Росгосстрах, ManagedCare Russia. Шарттарды, өтем шегі мен алып тастауларды сол компаниялардың ресми қағидалары және сіздің жеке келісімшартыңыз белгілейді — полис рәсімдер алдында сақтандырушының ресми құжаттарын қараңыз. healwith — сақтандыру компаниясы емес, полис сатпайды. Біз — Кореяда тіркелген шетелдік науқастарды қабылдау жөніндегі оператормыз: ем жолын ұйымдастырамыз, бірақ медициналық қызметті де, сақтандыру қызметін де көрсетпейміз. Ақпарат компаниялардың ашық материалдары негізінде, 2026 жылғы шілдедегі жағдай бойынша берілген."
    },
    "closing": {
      "title": "Қарапайым сұрақтан бастаңыз",
      "body": "Сақтандыру бағдарламаңыздың атауын жазып жіберіңіз — немесе жағдайыңызды өз сөзіңізбен айтып беріңіз. Өтемді қалай тексеруге болатынын және Кореядағы ем қалай жүретінін тегін түсіндіреміз — ешқандай міндеттеме де, қысым да жоқ.",
      "cta": "Бізге жазыңыз — бұл тегін"
    }
  },
  "zh": {
    "hero": {
      "eyebrow": "指南 · 用保险赴韩治疗",
      "title": "您的保险，也许已经\n涵盖了在韩国的癌症治疗",
      "lede": "俄罗斯的一些重大疾病保险，保障范围包括海外治疗，韩国也在其中。我们免费帮您核实保单，并安排在韩国的治疗。",
      "cta": "免费咨询",
      "note": "已经确诊，或者没有任何保险？也一样可以免费咨询。"
    },
    "products": {
      "title": "哪些保险包含海外治疗",
      "lede": "下面是正式把俄罗斯境外癌症治疗纳入保障的现行俄罗斯保险产品，以及一家实际安排这类治疗的医疗援助公司。内容按各公司公开资料整理，确切条件以您自己的保险合同为准。",
      "waitNote": "先把话说在前面：这些产品的海外治疗都有等待期——分别是180天和120天，所以这类保险要提前买、为将来做准备。已经确诊、手里没有保单？去韩国治疗照样可行，本页末尾有说明。",
      "items": [
        {
          "name": "RESO-Garantia——“健康无国界”",
          "tag": "保险产品",
          "desc": "保障癌症、心血管手术、神经外科手术和骨髓移植。",
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
          "korea": "可治疗国家名单中明确列有韩国——与以色列、西班牙并列。"
        },
        {
          "name": "俄罗斯国家保险公司（Rosgosstrakh）——“治疗无国界”",
          "tag": "保险产品",
          "desc": "保障癌症、心脏和神经外科手术，以及康复治疗。",
          "specs": [
            {
              "label": "保额",
              "value": "25,000,000 卢布，首次确诊另行一次性赔付 200,000 卢布"
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
          "korea": "治疗地域为全球（美国除外）——韩国不在列明的除外范围内；是否适用于您的情况，请按条款向保险公司核实。"
        },
        {
          "name": "Madanes / MCR——医疗援助公司 ManagedCare Russia",
          "tag": "治疗支持公司",
          "desc": "它不是保险公司，而是受保险公司委托、为患者安排治疗的医疗援助公司。",
          "specs": [
            {
              "label": "“扩展”套餐",
              "value": "每月 100,000 卢布"
            },
            {
              "label": "套餐内容",
              "value": "安排海外治疗：挑选医院、协调住院、对接国际医生、海外药品"
            },
            {
              "label": "运营规模",
              "value": "2009年起在俄罗斯运营 · 客户超100万人 · 合作保险公司超30家"
            },
            {
              "label": "五年生存率",
              "value": "85%（公司自行发布，只统计自家客户，不宜与国家统计直接比较）"
            }
          ],
          "korea": "如果您投保的保险公司与 MCR 有合作，请向保险公司确认：按您的保单，海外治疗会怎样安排。"
        }
      ]
    },
    "coverage": {
      "title": "这类保险替您承担什么",
      "lede": "以“健康无国界”为例：保单付的不只是医院账单，还包括围绕治疗的几乎所有开销。具体保障内容以您自己的合同为准。",
      "items": [
        {
          "title": "治疗",
          "body": "必要的医疗费用在方案保额内全额支付——按“经典”方案最高 €1,000,000。"
        },
        {
          "title": "交通",
          "body": "往返治疗地的交通在保障范围内，行程由服务公司安排。"
        },
        {
          "title": "住宿——患者与陪同亲友",
          "body": "患者和陪同者的住宿都在方案条件与保额内支付。治疗期间，亲人可以一直陪在身边。"
        },
        {
          "title": "医疗协调员与俄语服务",
          "body": "讲俄语的医疗协调员全程陪同，方案还包含第二诊疗意见。在韩国医院，healwith 团队还会额外提供医疗翻译。"
        },
        {
          "title": "费用直接付给医院",
          "body": "保险公司直接和医院结算，您不用先垫钱再等报销。"
        }
      ]
    },
    "steps": {
      "title": "流程五步——以“健康无国界”为例",
      "items": [
        {
          "title": "联系您的保险公司",
          "body": "如果已经确诊，第一步是拨打保单上的电话联系保险公司。还在了解条款？healwith 顾问免费帮您弄清从哪里开始。"
        },
        {
          "title": "提交诊断文件",
          "body": "保险公司及其援助公司会要求提供诊断书、检查结果等材料。我们会提前告诉您韩国医院通常需要什么，帮您一次备齐。"
        },
        {
          "title": "选择医院——至少三家可选",
          "body": "按方案条款，您会得到至少三家医院供选择。如果其中有韩国，healwith 帮您比较各家医院，并按诊断找到对口的专科。"
        },
        {
          "title": "交通与住宿有人替您安排",
          "body": "行程和住宿由服务公司负责。到了韩国这边，healwith 协助办理接收医院出具的签证邀请函，落地接机，在医院全程陪同。"
        },
        {
          "title": "保险公司直接向医院付款",
          "body": "结算在保险公司和医院之间完成，您无需预付，只管安心治疗。回国后 healwith 继续远程跟进，需要时为您对接韩国医生。"
        }
      ]
    },
    "whyKorea": {
      "title": "为什么是韩国",
      "lede": "“健康无国界”的可治疗国家名单中明确列有韩国——与以色列、西班牙并列。下面是关于韩国癌症治疗的几个事实，不加渲染。",
      "stat": {
        "value": "72.9%",
        "label": "韩国癌症患者的五年生存率——不是某一家医院的数据，而是覆盖全国的官方统计",
        "source": "韩国国立癌症中心 国家癌症登记统计（2018–2022）"
      },
      "hospitals": {
        "title": "四家大学医院，名字都在这里",
        "caption": "梨大首尔医院 · 梨大木洞医院 · 高丽大学九老医院 · 新村世福兰斯医院（另有免疫韩方医院四家分院）"
      },
      "support": {
        "title": "俄语始终在身边",
        "body": "从第一次咨询到回国，全程有俄语陪同：医疗翻译、院内协助、与医生沟通。healwith 用包括俄语、哈萨克语在内的六种语言提供服务，出院后也保持联系。"
      }
    },
    "partner": {
      "title": "致保险公司与医疗援助公司",
      "body": "healwith 欢迎与保险公司、医疗援助公司合作，承接病例在韩国这边的全部环节。我们是韩国保健福祉部登记的外国患者招揽机构（登记号 A-2026-01-02-06761）。合作网络包括四家大学医院（梨大首尔医院、梨大木洞医院、高丽大学九老医院、新村世福兰斯医院）和免疫韩方医院的四家分院（江西、新村、光明、城东）。全流程以六种语言完成：匹配医院、医疗翻译、签证邀请函、住院陪同、出院后远程管理。"
    },
    "faq": {
      "title": "常见问题",
      "items": [
        {
          "q": "我的保险能用于在韩国治疗吗？",
          "a": "由您保单的条款决定——请核实三点：癌症是否在保障范围内、是否包含海外治疗、地域范围是否包括韩国。最终答案由保险公司给出；healwith 顾问免费帮您理清情况，并准备好要问的问题。"
        },
        {
          "q": "我自己要花多少钱？",
          "a": "在直接结算的方案里，保险公司在保额和合同条件内直接与医院结算，您无需预付。超出保障的费用如何承担，由您的保单决定；healwith 的咨询免费。"
        },
        {
          "q": "我既不会韩语也不会英语，能沟通吗？",
          "a": "可以。healwith 团队在韩国医院提供俄语和哈萨克语的医疗翻译与陪同——有没有保险都一样。按“健康无国界”计划，还会安排讲俄语的医疗协调员全程陪同。"
        },
        {
          "q": "如果我没有这类保险呢？",
          "a": "没有保险也可以在韩国治疗——费用由您直接付给医院。我们会如实说明大致费用，帮您选医院、办签证邀请函、全程陪同——流程一样，咨询同样免费。"
        }
      ]
    },
    "disclaimer": {
      "title": "重要提示",
      "body": "本页介绍的保险产品由相应的保险公司及医疗援助公司提供：RESO-Garantia、Rosgosstrakh（俄罗斯国家保险公司）、ManagedCare Russia。条件、保额与除外责任以各公司官方条款及您的个人合同为准，投保前请核对保险公司的正式文件。healwith 不是保险公司，也不销售保单——我们是在韩国登记的外国患者招揽机构，负责安排治疗流程，不提供医疗服务，也不提供保险服务。本页信息按各公司公开资料整理，截至2026年7月。"
    },
    "closing": {
      "title": "从一个简单的问题开始",
      "body": "把您投保的产品名称发给我们，或者用自己的话说说情况。我们免费告诉您如何核实保障范围、在韩国治疗怎么进行——没有义务，也不会向您推销。",
      "cta": "给我们留言——完全免费"
    }
  },
  "ja": {
    "hero": {
      "eyebrow": "ガイド · 保険で受ける韓国での治療",
      "title": "あなたの保険は、すでに韓国での\nがん治療を保障しているかもしれません",
      "lede": "ロシアの重大疾病保険には、韓国を含む海外での治療を保障する商品があります。保障の確認は私たちが無料でお手伝いし、韓国側での治療の準備も担当します。",
      "cta": "無料相談を受ける",
      "note": "すでに診断を受けた方も、保険をお持ちでない方も、無料でご相談いただけます。"
    },
    "products": {
      "title": "海外での治療を保障する保険商品",
      "lede": "ロシア国外でのがん治療を公式に保障している現行のロシアの保険商品と、その治療を実際に手配する会社（アシスタンス会社）をご紹介します。内容は各社の公開資料に基づくもので、正確な条件は個々のご契約で定められます。",
      "waitNote": "先に正直にお伝えします — これらの商品の海外治療には待機期間（180日・120日）があります。つまり、将来に備えてあらかじめ入っておく性格の保険です。",
      "items": [
        {
          "name": "レソ・ガランティア（РЕСО-Гарантия）『国境なき健康（Здоровье без границ）』",
          "tag": "保険商品",
          "desc": "がん・心臓血管外科・脳神経外科・骨髄移植を保障します。加入時の健康診断は不要です。",
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
          "korea": "治療できる国のリストに、イスラエル・スペインと並んで韓国が明記されています。"
        },
        {
          "name": "ロスゴスストラフ（Росгосстрах）『国境なき治療』",
          "tag": "保険商品",
          "desc": "がん、心臓・脳神経外科の手術、リハビリを保障します。初めて診断を受けたときは一時金20万ルーブルが追加で支払われ、加入は健康診断の代わりに健康告知書で済みます。",
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
          "korea": "治療できる地域は米国を除く全世界です。韓国は明示された除外対象ではありませんが、ご自身のケースに当てはまるかは保険会社の約款でご確認ください。"
        },
        {
          "name": "マダネス／МСР — ManagedCare Russia",
          "tag": "治療サポート会社",
          "desc": "保険会社ではなく、保険会社から委託を受けて患者の治療を手配するアシスタンス会社です。同社の発表では、患者の5年生存率は85%。ただし自社の利用者を対象にした自社集計であり、対象も数え方も異なるため、国全体の公式統計とそのまま比べることはできません。",
          "specs": [
            {
              "label": "実績",
              "value": "ロシアで2009年から / 利用者100万人以上 / 提携保険会社30社以上"
            },
            {
              "label": "『拡張（Расширенный）』パッケージ",
              "value": "月額100,000ルーブル"
            },
            {
              "label": "パッケージ内容",
              "value": "病院の選定 · 入院の調整 · 海外の医師との連絡 · 海外医薬品"
            }
          ],
          "korea": "ご加入の保険会社がМСРと提携している場合は、お手持ちの保険証券で海外治療がどう手配されるのか、保険会社に確認してみてください。"
        }
      ]
    },
    "coverage": {
      "title": "こうした保険が代わりに負担してくれるもの",
      "lede": "『国境なき健康』を例にすると、保険は病院の請求額だけでなく、治療を取り巻くほぼすべての費用を負担します。実際の保障内容は、ご自身のご契約で定められます。",
      "items": [
        {
          "title": "治療費",
          "body": "必要な医療費は、プランの限度額内で全額支払われます。『クラシック』なら最大€1,000,000です。"
        },
        {
          "title": "渡航",
          "body": "治療先までの往復の移動も保障に含まれます。手配はサービス会社が担当します。"
        },
        {
          "title": "宿泊 — ご本人と付き添いの方",
          "body": "患者ご本人だけでなく、付き添いの方の宿泊費もプランの範囲内で支払われます。治療のあいだ、家族がそばにいられます。"
        },
        {
          "title": "医療コーディネーターとロシア語",
          "body": "ロシア語を話す医療コーディネーターが患者に付き添い、セカンドオピニオンもプランに含まれます。韓国の病院では、healwithのチームがさらに医療通訳を提供します。"
        },
        {
          "title": "支払いは病院へ直接",
          "body": "保険会社が病院に直接支払います。立て替えて払い戻しを待つ必要はありません。"
        }
      ]
    },
    "steps": {
      "title": "ご利用の流れ：5つのステップ — 『国境なき健康』の例",
      "items": [
        {
          "title": "保険会社に連絡する",
          "body": "診断を受けたら、まず保険証券に記載の番号へ連絡してください。条件を調べている段階なら、何から始めればよいか、healwithの相談員が無料でお手伝いします。"
        },
        {
          "title": "診断の書類を提出する",
          "body": "保険会社とアシスタンス会社から、紹介状や検査結果などの書類を求められます。韓国の病院がよく求める書類を事前にお伝えするので、一度で揃えられます。"
        },
        {
          "title": "病院を選ぶ — 最低3か所の中から",
          "body": "プランの条件により、少なくとも3か所の病院から選べます。その中に韓国があれば、healwithが病院の比較と、診断に合った診療科探しをお手伝いします。"
        },
        {
          "title": "渡航と宿泊は手配してもらえます",
          "body": "渡航と宿泊はサービス会社が手配します。韓国側ではhealwithが、受け入れ病院名義のビザ招へい状の準備をお手伝いし、到着時のお出迎えと院内での付き添いを担当します。"
        },
        {
          "title": "保険会社が病院に直接支払う",
          "body": "精算は保険会社と病院の間で完結し、立て替え払いはありません。患者さんは治療に専念できます。帰国後もhealwithが遠隔でのフォローを続け、必要なときは韓国の医師とおつなぎします。"
        }
      ]
    },
    "whyKorea": {
      "title": "なぜ韓国なのか",
      "lede": "韓国は『国境なき健康』の治療できる国のリストに、イスラエル・スペインと並んで明記されています。誇張はせず、事実だけをご紹介します。",
      "stat": {
        "value": "72.9%",
        "label": "韓国のがん患者の5年生存率 — 特定の病院ではなく、国全体を対象とした公式統計",
        "source": "韓国国立がんセンター・国家がん登録統計 2018–2022"
      },
      "hospitals": {
        "title": "大学病院4か所 — 名前を挙げてご紹介します",
        "caption": "梨花（イファ）女子大学ソウル病院 · 梨花女子大学木洞（モクトン）病院 · 高麗（コリョ）大学九老（クロ）病院 · 新村（シンチョン）セブランス病院"
      },
      "support": {
        "title": "ロシア語がいつもそばに",
        "body": "最初のお問い合わせから帰国まで、医療通訳・院内でのお手伝い・医師とのやり取りをロシア語で行います。healwithはロシア語・カザフ語を含む6言語で対応し、退院後も連絡を続けます。"
      }
    },
    "partner": {
      "title": "保険会社・アシスタンス会社の皆さまへ",
      "body": "healwithは、保険会社・アシスタンス会社との協業を歓迎し、各ケースの韓国側の工程をまとめて担います。大韓民国保健福祉部に登録された外国人患者受け入れ事業者です（登録番号 A-2026-01-02-06761）。提携ネットワークは、大学病院4か所（梨花女子大学ソウル病院・梨花女子大学木洞病院・高麗大学九老病院・新村セブランス病院）と、韓方の免疫病院4院（江西〈カンソ〉・新村〈シンチョン〉・光明〈クァンミョン〉・城東〈ソンドン〉）。病院の選定、医療通訳、ビザ招へい状、入院中の付き添い、退院後の遠隔フォローまで、6言語で手配します。"
    },
    "faq": {
      "title": "よくあるご質問",
      "items": [
        {
          "q": "私の保険で、韓国での治療は受けられますか？",
          "a": "決めるのは、ご自身の保険証券の条件です。確認するのは3点 — がんが保障の対象か、海外治療が含まれるか、保障地域に韓国が入っているか。最終的な判断は保険会社が行いますが、確認の進め方と質問の整理は、healwithが無料でお手伝いします。"
        },
        {
          "q": "自己負担はどれくらいかかりますか？",
          "a": "直接支払い方式のプランでは、限度額と契約条件の範囲内で、保険会社が病院に直接精算します。立て替え払いはありません。保障を超える費用の扱いは、ご自身の保険証券が定めます。healwithの相談は無料です。"
        },
        {
          "q": "韓国語も英語も話せません。意思疎通はできますか？",
          "a": "はい、できます。healwithのチームが、保険の有無にかかわらず、韓国の病院でロシア語・カザフ語の医療通訳と付き添いを行います。『国境なき健康』では、ロシア語対応の医療コーディネーターの付き添いも加わります。"
        },
        {
          "q": "こうした保険に入っていない場合は？",
          "a": "保険がなくても、韓国での治療は可能です。その場合は、治療費を病院に直接お支払いいただきます。費用の目安を率直にお伝えし、病院探し・ビザ招へい状・付き添いまで、同じ流れで無料でお手伝いします。"
        }
      ]
    },
    "disclaimer": {
      "title": "重要なご案内",
      "body": "このページでご紹介した保険商品は、各保険会社・アシスタンス会社（レソ・ガランティア、ロスゴスストラフ、ManagedCare Russia）が提供するものです。条件・限度額・免責は、各社の公式約款と個々の契約で定められます。ご加入前に、必ず保険会社の公式書類をご確認ください。healwithは保険会社ではなく、保険の販売も行いません。韓国の保健福祉部に登録された外国人患者受け入れ事業者として治療の過程を手配・支援するのみで、医療行為や保険サービスは提供しません。本ページの内容は各社の公開資料に基づく、2026年7月時点のものです。"
    },
    "closing": {
      "title": "簡単な質問ひとつから始めましょう",
      "body": "ご加入の保険商品の名前をお送りください。状況をご自身の言葉で書いていただくだけでも構いません。保障の確認方法と、韓国での治療の進み方を無料でご案内します。義務も、無理な勧誘もありません。",
      "cta": "無料で問い合わせる"
    }
  }
};
