# 로봇 통화용 합성 음성 (가짜 마이크 입력)

야간 로봇 통화 테스트(`e2e/consultation-robot-call.spec.ts`)가 크로미움의
`--use-file-for-fake-audio-capture` 로 **마이크 입력 대신 재생**하는 파일이다.

> 왜 필요했나: 그 전까지 로봇은 크로미움 기본 가짜 장치(=「삐—」 사인톤)만 물고 있어서
> **말소리가 없었다.** 그래서 검증이 "둘이 연결됐나"에서 멈췄고, 자막·통역은 매일 밤
> 로봇이 돌면서도 한 번도 확인되지 않았다. 실제 말소리를 넣어야 STT·통역봇 경로가 깨어난다.
>
> "자동환경엔 마이크가 없어서 통역 검증은 못 한다"는 그동안의 설명은 **오진이었다** —
> 크로미움은 WAV 를 마이크로 재생해 준다. 진짜 막고 있던 건 «말소리 파일이 없다» 였다.

## 파일

| 파일 | 내용 | 형식 |
|---|---|---|
| `ko-patient-speech.wav` | "안녕하세요. 위암 수술을 받은 지 두 달 되었습니다." / "회복 기간이 얼마나 걸리는지 궁금합니다." | 48kHz · 모노 · 16bit PCM · 10.5초 |
| `ru-patient-speech.wav` | 위 한국어와 같은 뜻의 러시아어 환자 발화 2문장 | 48kHz 모노 16bit, 11.9초 |
| `en-coordinator-speech.wav` | 영어 코디네이터 발화 | 48kHz 모노 16bit, 16.7초 |

- **48kHz 모노 16bit PCM 고정** — 크로미움 가짜 마이크가 안정적으로 먹는 형식.
- 문장 앞뒤·사이에 **무음 0.8~1.0초**를 넣었다. 크로미움은 이 파일을 **무한 반복** 재생하므로,
  무음이 없으면 이어붙는 지점에서 말이 뭉개져 VAD(발화 감지)가 경계를 못 잡는다.
- 피크를 -3dBFS 로 정규화 — 너무 크면 클리핑, 너무 작으면 발화로 안 쳐준다.
- 내용은 **의료관광 실제 문맥**(위암 수술 후 회복 문의)이라 도메인 프라이밍·용어 처리까지 같이 탄다.

## 재생성 방법

합성은 로컬 TTS(**piper**, 신경망 음성)로 한다. 클라우드 키가 필요 없고 목소리가 사람에 가깝다.
(espeak-ng 도 한국어를 지원하지만 포먼트 합성이라 로봇 목소리 → STT 인식률이 떨어진다.)

```bash
pip install piper-tts
python3 -m piper.download_voices ko_KR-kss-medium     # 약 63MB, 저장소에 커밋하지 말 것

echo "안녕하세요. 위암 수술을 받은 지 두 달 되었습니다." | piper -m ko_KR-kss-medium -f s1.wav
echo "회복 기간이 얼마나 걸리는지 궁금합니다."          | piper -m ko_KR-kss-medium -f s2.wav
```

무음 삽입·48kHz 변환·정규화는 순수 파이썬으로 (Playwright 번들 ffmpeg 은 `concat` 필터가
빠진 최소 빌드라 못 쓴다 — 실측 확인):

```python
import wave, audioop
OUT_RATE = 48000
def load(p):
    w = wave.open(p); d = w.readframes(w.getnframes()); r = w.getframerate()
    if r != OUT_RATE: d, _ = audioop.ratecv(d, 2, 1, r, OUT_RATE, None)
    return d
sil = lambda sec: b"\x00\x00" * int(OUT_RATE * sec)
data = sil(0.8) + load("s1.wav") + sil(1.0) + load("s2.wav") + sil(0.8)
peak = audioop.max(data, 2) or 1
data = audioop.mul(data, 2, min(4.0, 23000 / peak))
w = wave.open("ko-patient-speech.wav", "wb")
w.setnchannels(1); w.setsampwidth(2); w.setframerate(OUT_RATE); w.writeframes(data); w.close()
```

## 주의

- **모델 파일(`*.onnx`, 63MB)은 커밋하지 않는다.** 결과 WAV(약 1MB)만 저장소에 둔다.
- 합성 음성이라 **실환자 음성이 아니다** — 무료 등급 키로 돌려도 개인정보 문제가 없다
  (`docs/LIVE_TRANSLATE_SETUP.md` 의 "무료 키는 구글이 음성을 학습에 쓸 수 있으니 실환자 금지" 조항과 무관).
- 다른 언어(kz 등) 픽스처가 필요해지면 같은 절차로 해당 voice 를 받아 추가하면 된다.
  러시아어는 2026-08-20 에 `ru_RU-irina-medium` 으로 만들어 이미 넣었다.

## ⚠️ 2026-08-20: 위 파이썬 예시는 파이썬 3.13 에서 그대로 안 돈다

`audioop` 모듈이 **파이썬 3.13 에서 표준 라이브러리에서 빠졌다.** 이 PC 는 3.13 이라
`ModuleNotFoundError: No module named 'audioop'` 로 멈춘다. 되살리는 방법은 한 줄이다:

```bash
pip install audioop-lts
```

그리고 윈도우에서는 목소리 목록을 뽑을 때 **한글 인코딩으로 중간에 끊긴다**
(`UnicodeEncodeError: 'cp949' codec ...`). 목록이 알파벳 중간에서 잘려 「러시아어 목소리가
없다」고 오해하기 쉽다. 앞에 `PYTHONIOENCODING=utf-8` 을 붙여라:

```bash
PYTHONIOENCODING=utf-8 python -m piper.download_voices | grep "^ru_RU"
```

piper 를 모듈로 부를 때도 `python -m piper -m <모델.onnx> -f out.wav < 문장.txt` 형태를 쓴다
(문서의 `echo ... | piper` 형태는 실행 파일이 PATH 에 잡혀 있을 때만 된다).

한국어 원본 문장과 러시아어 문장은 **같은 뜻**으로 맞춰 뒀다. 통역 결과를 눈으로 대조할 때
쓰라고 그렇게 했다:

| | 문장 1 | 문장 2 |
|---|---|---|
| ko | 안녕하세요. 위암 수술을 받은 지 두 달 되었습니다. | 회복 기간이 얼마나 걸리는지 궁금합니다. |
| ru | Здравствуйте. Два месяца назад мне сделали операцию по поводу рака желудка. | Меня интересует, сколько времени займёт восстановление. |
