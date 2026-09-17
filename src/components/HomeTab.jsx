import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useViewerStore } from '../store/useViewerStore';
import { useSettingsStore } from '../store/useSettingsStore';

export default function HomeTab({ handleUrlChange, handleTranslateStart, handleCancelTranslation }) {
  const { inputUrl, isTranslating, transProgress, transMode, setTransMode } = useViewerStore();
  const { selectedLang, setSelectedLang, selectedPreset, setSelectedPreset, promptsTree } = useSettingsStore();

  const currentPresets = promptsTree[selectedLang] || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>
        🚀 번역 기동 시작
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          소설 주소 (URL)
        </label>
        <textarea
          rows={3}
          placeholder="예: https://www.52shuku.net/bl/..."
          value={inputUrl}
          onChange={handleUrlChange}
          style={{
            backgroundColor: "var(--bg-main)",
            border: "1px solid #242824",
            borderRadius: "10px",
            padding: "12px",
            color: "var(--text-main)",
            fontSize: "14px",
            resize: "vertical",
            fontFamily: "inherit",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* 번역 옵션 그룹 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            번역 모드 (언어 선택)
          </label>
          <select
            value={selectedLang}
            onChange={(e) => {
              setSelectedLang(e.target.value);
              setSelectedPreset("default");
            }}
            style={{
              backgroundColor: "var(--bg-main)",
              border: "1px solid #242824",
              borderRadius: "8px",
              padding: "8px",
              color: "var(--text-main)",
            }}
          >
            <option value="chinese">중국어 번역기</option>
            <option value="japanese">일본어 번역기</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            프롬프트 템플릿
          </label>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            style={{
              backgroundColor: "var(--bg-main)",
              border: "1px solid #242824",
              borderRadius: "8px",
              padding: "8px",
              color: "var(--text-main)",
            }}
          >
            {Object.keys(currentPresets).map((presetId) => (
              <option key={presetId} value={presetId}>
                {currentPresets[presetId].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 번역 기동 버튼 */}
      <button
        onClick={handleTranslateStart}
        disabled={isTranslating}
        style={{
          background: "linear-gradient(135deg, #81c784, #83c5be)",
          border: "none",
          borderRadius: "12px",
          padding: "16px",
          color: "#11111b",
          fontWeight: "bold",
          fontSize: "15px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginTop: "10px",
        }}
      >
        {isTranslating ? (
          <>
            <RefreshCw className="animate-spin" size={18} />
            AI 번역 가동 중... ({transProgress}%)
          </>
        ) : (
          "번역 시작"
        )}
      </button>

      {isTranslating && (
        <button
          onClick={handleCancelTranslation}
          style={{
            backgroundColor: "var(--danger)",
            border: "none",
            borderRadius: "12px",
            padding: "12px",
            color: "#11111b",
            fontWeight: "bold",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginTop: "8px",
          }}
        >
          번역 즉시 중단
        </button>
      )}
    </div>
  );
}
