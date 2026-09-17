import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useViewerStore } from '../store/useViewerStore';
import { useSettingsStore } from '../store/useSettingsStore';

export default function ReaderViewer({
  handleNavigateEpisode,
  handleParagraphClick,
  handleReportFeedback,
  startViewerTranslation,
  setActiveTab,
  handleCancelTranslation,
}) {
  const {
    inputUrl,
    transProgress,
    isTranslating,
    viewerTitle,
    viewerParagraphs,
    viewerPrevUrl,
    viewerNextUrl,
    viewerIndexUrl,
    activeViewerChapter,
    clickedOriginals,
    setLastTranslateSubTab,
  } = useViewerStore();

  const { readerSettings } = useSettingsStore();

  return (
    <>
      <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              position: "relative",
              width: "100%",
            }}
          >
            {/* 번역 진행률 플로팅 프로그래스 바 */}
            {isTranslating && (
              <div
                style={{
                  position: "sticky",
                  top: "55px",
                  zIndex: 5,
                  backgroundColor: "#222922",
                  color: "var(--primary)",
                  border: "1px solid #3d4f3d",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  fontSize: "13px",
                  maxWidth: "650px",
                  width: "calc(100% - 40px)",
                  margin: "0 auto",
                }}
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <RefreshCw
                    style={{ animation: "spin 1.2s linear infinite" }}
                    size={16}
                  />
                  번역 진행 중 ({transProgress}%)
                </span>
                <button
                  onClick={handleCancelTranslation}
                  style={{
                    backgroundColor: "var(--danger)",
                    color: "#11111b",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  번역 중지
                </button>
              </div>
            )}

            {/* 뷰어 상단 헤더 & 컨트롤 영역: 중앙에 정렬하고 양옆 20px 패딩을 주어 가독성 유지 */}
            <div
              style={{
                borderBottom: "1px solid #242824",
                paddingBottom: "12px",
                paddingLeft: "20px",
                paddingRight: "20px",
                paddingTop: "10px",
                maxWidth: "650px",
                width: "100%",
                margin: "0 auto",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "8px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => {
                    setLastTranslateSubTab("translate");
                    setActiveTab("translate");
                    setActiveTab("translate");
                  }}
                  style={{
                    background: "var(--bg-card)",
                    border: "none",
                    color: "var(--primary)",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  ← 주소 입력창으로
                </button>
                <button
                  onClick={handleReportFeedback}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid #ea999c",
                    color: "#ea999c",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <AlertTriangle size={14} />
                  오류 제보
                </button>
                {!isTranslating && (
                  <button
                    onClick={() => {
                      startViewerTranslation(
                        inputUrl,
    transProgress,
                        activeViewerChapter,
                        true,
                      );
                    }}
                    style={{
                      background: "linear-gradient(135deg, #81c784, #83c5be)",
                      border: "none",
                      color: "#11111b",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    다시 번역
                  </button>
                )}
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "var(--primary)",
                }}
              >
                {viewerTitle}
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "6px",
                }}
              >
                <span>제 {activeViewerChapter}화 감상 중</span>
              </div>
            </div>

            {/* colomo.dev 기반 리더기 커스텀 및 대조 독서 뷰어 렌더링 */}
            <div
              style={{
                fontFamily: readerSettings.fontFamily,
                color: readerSettings.fontColor,
                backgroundColor: readerSettings.bgColor,
                fontSize: `${parseInt(readerSettings.fontSize) || 17}px`,
                fontWeight: parseInt(readerSettings.fontWeight) || 400,
                lineHeight: parseFloat(readerSettings.lineHeight) || 1.8,
                paddingLeft: `${readerSettings.paddingX !== "" ? readerSettings.paddingX : 0}px`,
                paddingRight: `${readerSettings.paddingX !== "" ? readerSettings.paddingX : 0}px`,
                paddingTop: "20px",
                paddingBottom: readerSettings.bottomSpacing ? "100px" : "20px",
                borderRadius: 0,
                border: "none",
                display: "flex",
                flexDirection: "column",
                gap: `${parseInt(readerSettings.paragraphGap) || 20}px`,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {viewerParagraphs
                .filter(
                  (p) =>
                    p.translated !== "AI 번역 대기 중..." &&
                    p.translated !== "AI 번역 가동 중...",
                )
                .map((p, idx) => {
                  const showOriginal =
                    readerSettings.keepOriginalText &&
                    p.original &&
                    (readerSettings.opacity > 0 || clickedOriginals[idx]);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleParagraphClick(idx)}
                      style={{
                        textIndent: `${readerSettings.textIndent}em`,
                        cursor:
                          readerSettings.keepOriginalText &&
                          readerSettings.opacity === 0
                            ? "pointer"
                            : "default",
                      }}
                    >
                      {/* 번역문 출력 */}
                      <p style={{ margin: 0, color: readerSettings.fontColor }}>
                        {p.translated}
                      </p>

                      {/* 원문 출력 (35단계 핵심: 투명도 0일 때 숨김 처리 및 개별 클릭 탭 오픈 지원) */}
                      {showOriginal && (
                        <p
                          style={{
                            margin: "6px 0 0 0",
                            color: readerSettings.fontColor,
                            fontSize: "0.85em",
                            opacity:
                              readerSettings.opacity === 0
                                ? 0.5
                                : readerSettings.opacity / 100,
                          }}
                        >
                          {p.original}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* 소설 네비게이션 버튼 그룹 (이전화, 목차, 다음화) (18단계 핵심) */}
            {(viewerPrevUrl || viewerNextUrl || viewerIndexUrl) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "12px",
                  marginTop: "24px",
                  marginBottom: "40px",
                  paddingTop: "20px",
                  borderTop: "1px solid #242824",
                  maxWidth: "650px",
                  width: "100%",
                  margin: "24px auto 40px auto",
                  boxSizing: "border-box",
                  paddingLeft: "20px",
                  paddingRight: "20px",
                }}
              >
                {viewerPrevUrl && (
                  <button
                    onClick={() => handleNavigateEpisode(viewerPrevUrl)}
                    style={{
                      backgroundColor: "var(--bg-panel)",
                      color: "var(--text-main)",
                      border: "1px solid #2d2d2d",
                      borderRadius: "8px",
                      padding: "10px 18px",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      transition: "background 0.2s",
                    }}
                  >
                    이전화
                  </button>
                )}
                {viewerIndexUrl && (
                  <button
                    onClick={() => handleNavigateEpisode(viewerIndexUrl)}
                    style={{
                      backgroundColor: "var(--bg-panel)",
                      color: "var(--accent2)",
                      border: "1px solid #2d2d2d",
                      borderRadius: "8px",
                      padding: "10px 18px",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      transition: "background 0.2s",
                    }}
                  >
                    목차
                  </button>
                )}
                {viewerNextUrl && (
                  <button
                    onClick={() => handleNavigateEpisode(viewerNextUrl)}
                    style={{
                      backgroundColor: "var(--bg-panel)",
                      color: "var(--text-main)",
                      border: "1px solid #2d2d2d",
                      borderRadius: "8px",
                      padding: "10px 18px",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      transition: "background 0.2s",
                    }}
                  >
                    다음화
                  </button>
                )}
              </div>
            )}
          </div>
    </>
  );
}
