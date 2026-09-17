import React from 'react';
import { FolderHeart, Download, Trash2 } from 'lucide-react';

export default function LibraryTab({ novels, handleLoadNovel, handleDownload, handleDeleteNovel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>
        📚 소설 보관함
      </h3>

      {novels.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "50px 20px",
            border: "2px dashed #242824",
            borderRadius: "16px",
            color: "var(--text-muted)",
          }}
        >
          보관함이 비어 있습니다. [실시간번역] 탭으로 이동하여 번역을
          진행하면 소설이 이곳에 자동 저장됩니다.
        </div>
      ) : (
        novels.map((novel) => (
          <div
            key={novel.id}
            onClick={() => handleLoadNovel(novel)}
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "var(--bg-main)",
              border: "1px solid #242824",
              borderRadius: "16px",
              padding: "16px",
              gap: "16px",
              cursor: "pointer",
              transition: "transform 0.15s",
            }}
          >
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                padding: "10px",
                borderRadius: "12px",
              }}
            >
              <FolderHeart size={22} color="#e78284" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4
                onClick={(e) => e.stopPropagation()}
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "15px",
                  fontWeight: "bold",
                  overflowX: "auto",
                  overflowY: "hidden",
                  whiteSpace: "nowrap",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {novel.title}
              </h4>
              <div
                style={{ display: "flex", gap: "8px", fontSize: "11px" }}
              >
                <span
                  style={{
                    backgroundColor: "var(--bg-card)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    color: "var(--primary)",
                  }}
                >
                  {novel.site}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  마지막으로 읽은 회차: {novel.lastReadChapter}화
                </span>
              </div>
            </div>

            {/* 조작 버튼 영역 */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={(e) => handleDownload(novel, e)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  padding: "6px",
                  cursor: "pointer",
                }}
                title="텍스트 파일 다운로드"
              >
                <Download size={18} />
              </button>
              <button
                onClick={(e) =>
                  handleDeleteNovel(novel.id, novel.title, e)
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--danger)",
                  padding: "6px",
                  cursor: "pointer",
                }}
                title="삭제"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
