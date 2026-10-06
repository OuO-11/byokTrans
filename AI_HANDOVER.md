# byokTrans 프로젝트 인수인계서 (AI Handover Document)

이 문서는 다음 AI 에이전트가 프로젝트의 맥락을 즉시 파악하고, 단절 없이 업무를 이어가기 위해 작성된 인수인계서입니다. 다음 에이전트는 본 문서를 읽은 즉시 프로젝트의 현재 상태와 주의사항을 숙지하십시오.

## 1. 프로젝트 개요
* **프로젝트명**: byokTrans (웹소설/웹페이지 AI 번역기 앱)
* **주요 스택**: React, Vite, Zustand, Capacitor (InAppBrowser), Tailwind/CSS
* **핵심 기능**: 사용자가 입력한 URL을 Capacitor 웹뷰(InAppBrowser)로 열고, 화면 위에 번역 리모컨(플로팅 UI, Shadow DOM)을 띄워 실시간으로 Gemini API(스트리밍)를 통해 페이지를 번역함.

## 2. 현재 작업 진척도 (100 ~ 102단계 완료)
가장 최근(102단계)까지 **UI 컴포넌트 완전 분리 및 Zustand 상태 관리 도입(대규모 리팩토링)**과 그에 따른 **치명적 런타임 버그 픽스**를 모두 성공적으로 마쳤습니다.

### 최근 해결된 주요 런타임 버그 (참고용)
1. **스트리밍 파서 버퍼 지수 폭발 버그**: `apiRotator.js`가 스트림의 전체 누적 텍스트를 반환하던 것을 Delta(조각)만 반환하도록 수정하여, `App.jsx`의 정규식 파서가 완벽하게 동작하도록 수정함.
2. **웹뷰 플로팅 리모컨 미출력 버그**: `translatorContent.js` 주입 시 대상 웹페이지의 특이한 DOM(숨겨진 iframe 등)에서 `window.getComputedStyle`이 에러를 뿜어 스크립트가 죽는 현상을 `try-catch`로 방어함.
3. **빈 화면 크래시(ReferenceError) 및 템플릿 증발**: `HomeTab`과 `SettingsTab` 분리 과정에서 누락되었던 `const currentPresets = promptsTree[selectedLang]?.presets || {};` 데이터 참조를 정확히 복구하여 리액트 백화 현상을 해결함.

## 3. 핵심 아키텍처 및 파일 구조
* `src/App.jsx`: 메인 라우팅 및 번역 스트리밍 수신 본체.
* `src/store/useViewerStore.js` / `useSettingsStore.js`: 앱의 모든 상태를 관장하는 Zustand 스토어. (수정 시 구조 변경에 매우 유의할 것)
* `src/WebViewManager.js`: Cordova InAppBrowser 생명주기 관리 및 메시지 브릿지 통신.
* `src/injections/translatorContent.js`: 웹뷰 내부로 주입(`?raw` 로딩)되어 원본 웹페이지의 DOM을 조작하고 번역 리모컨(Shadow DOM)을 렌더링하는 스크립트.
* `src/apiRotator.js`: Gemini 등 LLM API와의 스트리밍 통신 및 키 로테이션 담당.

## 4. 🚨 다음 AI 에이전트를 위한 절대 수칙 (필독)

1. **정적 검증(문법 체크) 맹신 금지 & 런타임 데이터 흐름 추적**
   * 코드를 눈으로만 읽고 "문법이 맞으니 정상 작동할 것"이라고 확신하지 마십시오. API가 `Delta`를 주는지 `Full Text`를 주는지, 객체의 Depth가 `[lang]`인지 `[lang].presets`인지 **데이터의 실제 흐름(Data Flow)**을 끝까지 추적하십시오.
2. **하이브리드 QA (사용자 협업 테스팅) 적극 활용**
   * 웹뷰(DOM) 환경에서 터지는 에러를 잡기 위해 과도하게 토큰을 소모하는 E2E 툴을 쓰기보다는, 핵심 로직에 `console.log()`를 심고 **사용자에게 "로컬(`npm run dev`)에서 브라우저로 띄워 F12 콘솔 로그를 복사해달라"고 요청**하십시오. 이것이 가장 빠르고 비용 효율적입니다.
3. **병렬 적대적 검증(PAV) 필수 수행**
   * 주요 로직 수정 후에는 반드시 하위 에이전트를 소환해 **Data Flow Tracer**(데이터 구조 일치 확인)와 **Reference Auditor**(미선언 변수 색출) 역할을 맡겨 교차 검증하십시오.
4. **사용자 권한 통제 준수 (`AGENTS.md` 규칙 3번)**
   * 코드를 수정/생성/삭제하기 전에는 **반드시 사용자에게 계획을 설명하고 사전 승인**을 받으십시오. 독단적으로 롤백하거나 수정해서는 절대 안 됩니다.

## 5. 다음 작업 추천
* 사용자의 지시에 따라 다음 기능 개발 또는 추가 디버깅을 진행하면 됩니다. 
* 작업 시작 전 `project_info.md`와 `user_profile.json`을 읽고 사용자의 스타일을 파악하는 것을 잊지 마십시오.
