import React, { useState, useEffect } from 'react';

const CURRENT_APP_VERSION = "v1.5.0";

export default function InfoTab() {
  const [latestRelease, setLatestRelease] = useState(null);
  const [allReleases, setAllReleases] = useState([]);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");
  const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);

  useEffect(() => {
    const checkUpdate = async () => {
        setIsCheckingUpdate(true);
        try {
          const res = await fetch("https://api.github.com/repos/OuO-11/byokTrans/releases");
          if (res.ok) {
            const data = await res.json();
            setAllReleases(data);
            if (data.length > 0) {
              setLatestRelease(data[0]);
            }
          }
        } catch (err) {
          console.error("Failed to fetch releases", err);
        } finally {
          setIsCheckingUpdate(false);
        }
      };
      checkUpdate();
  }, []);

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) return;
    setIsSendingSuggestion(true);
    try {
      const res = await fetch("https://byoktrans.vercel.app/api/report_feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: new Date().toISOString(),
          type: "suggestion",
          content: suggestionText,
          appVersion: CURRENT_APP_VERSION,
        }),
      });
      if (res.ok) {
        alert("건의사항이 성공적으로 전송되었습니다! 소중한 의견 감사합니다.");
        setSuggestionText("");
      } else {
        alert("건의사항 전송에 실패했습니다.");
      }
    } catch (e) {
      alert("네트워크 오류로 건의사항을 전송하지 못했습니다.");
    } finally {
      setIsSendingSuggestion(false);
    }
  };

  const isNewer = (tag, current) => {
    const t = tag.replace('v', '').split('.').map(Number);
    const c = current.replace('v', '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((t[i] || 0) > (c[i] || 0)) return true;
      if ((t[i] || 0) < (c[i] || 0)) return false;
    }
    return false;
  };

  return (
    <>
      <div
          style={{
            padding: "16px",
            paddingBottom: "80px",
            color: "var(--text-main)",
            overflowY: "auto",
            height: "100%",
          }}
        >
          <h3
            style={{
              margin: 0,
              marginBottom: "16px",
              fontSize: "18px",
              fontWeight: "bold",
            }}
          >
            ℹ️ 이용 안내 & 소통
          </h3>
          
          <div style={{ backgroundColor: "var(--bg-card)", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "bold" }}>💡 개발자에게 건의하기</h4>
            <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5 }}>- 원하는 사항 입력. 지원 사이트 확대/필요 기능 등등.</p>
            <textarea
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder="여기에 건의사항을 작성해주세요..."
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--border-main)",
                backgroundColor: "var(--bg-main)",
                color: "var(--text-main)",
                fontSize: "14px",
                marginBottom: "8px",
                resize: "vertical",
                boxSizing: "border-box"
              }}
            />
            <button
              onClick={handleSendSuggestion}
              disabled={isSendingSuggestion || !suggestionText.trim()}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: (isSendingSuggestion || !suggestionText.trim()) ? "var(--border-main)" : "var(--primary)",
                color: (isSendingSuggestion || !suggestionText.trim()) ? "var(--text-muted)" : "#11111b",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: (isSendingSuggestion || !suggestionText.trim()) ? "not-allowed" : "pointer",
                fontSize: "14px"
              }}
            >
              {isSendingSuggestion ? "전송 중..." : "건의사항 보내기"}
            </button>
          </div>
      
          <div style={{ backgroundColor: "var(--bg-card)", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "bold" }}>🌐 지원 사이트 목록 현황</h4>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5 }}>- 52shuku (정상 지원)</p>
          </div>
      
          <div style={{ backgroundColor: "var(--bg-card)", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "bold" }}>📢 최신 업데이트 내역</h4>
            <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "var(--text-muted)" }}>현재 앱 버전: {CURRENT_APP_VERSION}</p>
            {isCheckingUpdate ? (
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5 }}>최신 버전 확인 중...</p>
            ) : (() => {
              const parseVersion = (tag) => {
                const match = tag.match(/v?(\d+)\.(\d+)\.(\d+)/);
                if (!match) return [0, 0, 0];
                return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
              };
              const isNewer = (v1, v2) => {
                const [a1, b1, c1] = parseVersion(v1);
                const [a2, b2, c2] = parseVersion(v2);
                if (a1 !== a2) return a1 > a2;
                if (b1 !== b2) return b1 > b2;
                return c1 > c2;
              };
              const newReleases = allReleases.filter(r => isNewer(r.tag_name, CURRENT_APP_VERSION));
              
              if (newReleases.length > 0) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {newReleases.map(release => (
                      <div key={release.id} style={{ padding: "10px", backgroundColor: "var(--bg-main)", borderRadius: "6px" }}>
                        <p style={{ margin: "0 0 6px 0", fontSize: "14px", color: "var(--text-main)", fontWeight: "bold" }}>
                          byokTrans {release.tag_name}
                        </p>
                        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                          {release.body}
                        </p>
                      </div>
                    ))}
                    
                    {latestRelease && latestRelease.assets && latestRelease.assets.find(a => a.name.endsWith('.apk')) && (
                      <button
                        onClick={() => window.open(latestRelease.assets.find(a => a.name.endsWith('.apk')).browser_download_url, "_blank")}
                        style={{
                          marginTop: "8px",
                          padding: "12px",
                          backgroundColor: "var(--primary)",
                          color: "#11111b",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: "bold",
                          cursor: "pointer",
                          fontSize: "14px",
                          textAlign: "center"
                        }}
                      >
                        🚀 {latestRelease.tag_name} 버전으로 통합 업데이트 (APK)
                      </button>
                    )}
                  </div>
                );
              } else if (latestRelease) {
                return (
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--primary)", lineHeight: 1.5, fontWeight: "bold" }}>
                    🎉 현재 가장 최신 버전을 사용 중입니다!
                  </p>
                );
              } else {
                return (
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5 }}>버전 정보를 불러올 수 없습니다.</p>
                );
              }
            })()}
          </div>
      
          <div style={{ backgroundColor: "var(--bg-card)", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "bold" }}>🔑 API 키 발급 가이드</h4>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5 }}></p>
          </div>
        </div>
    </>
  );
}
