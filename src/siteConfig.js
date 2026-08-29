// src/siteConfig.js

export const SiteConfigs = {
  // 모든 사이트에 공통으로 적용되는 악질 광고/팝업/불필요 요소 CSS 선택자
  universal: {
    adSelectors: [
      '.ad', 
      '.ads', 
      '.adsbygoogle', 
      'iframe[src*="ads"]', 
      'iframe[src*="doubleclick"]',
      '.popup-banner'
    ]
  },
  
  // 각 도메인별 맞춤 광고/UI 차단 및 파싱 최적화 설정
  sites: [
    {
      name: "52shuku",
      domainRegex: /52shuku\.vip/i,
      // 실제 52shuku에서 걷어낼 광고나 불필요한 헤더/푸터 선택자 (추후 정확한 클래스명으로 업데이트 필요)
      adSelectors: [
        '.tj-ad', 
        '#header-ad', 
        '.bottom-banner'
      ]
    },
    {
      name: "jjwxc (진강)",
      domainRegex: /jjwxc\.net/i,
      adSelectors: [
        '.adv', 
        '#float_ad'
      ]
    }
  ]
};

/**
 * 주어진 URL에 매칭되는 모든 광고 차단 CSS(Universal + Site-specific)를 생성하여 반환합니다.
 */
export function getAdBlockCSS(url) {
  let selectors = [...SiteConfigs.universal.adSelectors];

  for (const site of SiteConfigs.sites) {
    if (site.domainRegex.test(url)) {
      selectors = selectors.concat(site.adSelectors);
    }
  }

  // 중복 제거
  selectors = [...new Set(selectors)];

  if (selectors.length === 0) return '';

  // 브라우저 렌더링 엔진 단에서 해당 요소들을 완전히 숨김 처리
  return `
    ${selectors.join(', ')} {
      display: none !important;
      opacity: 0 !important;
      pointer-events: none !important;
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
    }
  `;
}
