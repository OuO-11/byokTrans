import React from 'react';
import { useViewerStore } from '../store/useViewerStore';

export default function PageResultTab({
  setActiveTab,
  handleReportFeedback,
  handleCancelTranslation,
}) {
  const {
    novelHtmlResult,
    isTranslating,
    transProgress,
    setLastTranslateSubTab,
  } = useViewerStore();

  return (
    <>
      <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 112px)",
            }}
          >
            {/* 상단 미니 헤더 바 */}
            <div
              style={{
                padding: "6px 12px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                backgroundColor: "var(--bg-main)",
                borderBottom: "1px solid #222822",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => {
                  setLastTranslateSubTab("translate");
                  setActiveTab("translate");
                }}
                style={{
                  background: "var(--bg-panel)",
                  border: "none",
                  color: "var(--text-main)",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                ← 번역창
              </button>
              {/* 번역 완료 상태 표시 */}
              {!isTranslating && (
                <span style={{ fontSize: "12px", color: "var(--primary)" }}>
                  ✓ 번역 완료
                </span>
              )}
              {/* 번역 중 진행률 + 중지 버튼 */}
              {isTranslating && (
                <>
                  <span style={{ fontSize: "11px", color: "#ca9ee6" }}>
                    🔄 번역 중... ({transProgress}%)
                  </span>
                  <button
                    onClick={handleCancelTranslation}
                    style={{
                      background: "var(--danger)",
                      border: "none",
                      color: "#11111b",
                      padding: "3px 8px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "bold",
                      marginLeft: "auto",
                      whiteSpace: "nowrap",
                    }}
                  >
                    중지
                  </button>
                </>
              )}
              {/* 재번역 버튼 (번역 완료 후에만 표시) */}
              {!isTranslating && novelHtmlResult && (
                <div
                  style={{ display: "flex", gap: "6px", marginLeft: "auto" }}
                >
                  
                  <button
                    onClick={handleReportFeedback}
                    style={{
                      background: "var(--border-main)",
                      border: "1px solid #e78284",
                      color: "var(--danger)",
                      padding: "3px 8px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "11px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    오류 신고
                  </button>
                </div>
              )}
            </div>
            {/* iframe — 여백 없이 풀스크린 (key 갱신을 통해 중복 로드 및 상태 오염 방지) */}
            {/* iframe removed, using WebViewManager instead */}
          </div>
    </>
  );
}
