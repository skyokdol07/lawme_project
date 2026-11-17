// src/lib/law-api.ts
// 국가법령정보 공동활용 Open API 연동 모듈

const LAW_API_BASE = 'https://www.law.go.kr/DRF';
const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

export interface LawSearchResult {
  lawId: string;
  lawName: string;
  lawMst: string;
  enforcementDate: string;
}

export interface ArticleResult {
  lawName: string;
  title: string;
  articleNumber: string;
  articleContent: string;
  penaltyText: string;
  enforcementDate: string;
  lawUrl: string;
}

/**
 * 조문 번호(예: 250, 329 등)를 국가법령정보 API 명세에 맞춰 6자리 형태(JO 파라미터)로 변환
 * 규칙: 조문 본번 4자리 + 가지번호 2자리 = 6자리 (예: 250조 -> 025000, 329조 -> 032900)
 */
export function formatJoParam(articleNum: string | number): string {
  const clean = String(articleNum).replace(/[^0-9]/g, '');
  if (!clean) return '000100';
  return clean.padStart(4, '0') + '00';
}

/**
 * 법령명으로 국가법령정보 API(lawSearch.do) 검색 -> 현행 법령일련번호(MST) 획득
 */
export async function searchLaw(lawName: string): Promise<LawSearchResult | null> {
  const oc = process.env.LAW_API_OC || 'jinwoo_1234';
  const cleanName = lawName.replace(/\s+/g, '');
  const url = `${LAW_API_BASE}/lawSearch.do?OC=${oc}&target=law&type=JSON&query=${encodeURIComponent(lawName)}&display=50`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const data = await res.json();
    const laws = data?.LawSearch?.law || [];
    const list = Array.isArray(laws) ? laws : [laws];

    // 1순위: 법령명 정확 일치 + 현행
    // 2순위: 법령명 정확 일치
    // 3순위: 목록 첫 번째
    const exactCurrent = list.find(
      (l: Record<string, string>) =>
        l['법령명한글']?.replace(/\s+/g, '') === cleanName && l['현행연혁코드'] === '현행'
    );
    const exact = list.find(
      (l: Record<string, string>) => l['법령명한글']?.replace(/\s+/g, '') === cleanName
    );
    const target = exactCurrent || exact || list[0];

    if (!target) return null;

    return {
      lawName: target['법령명한글'] || lawName,
      lawMst: target['법령일련번호'] || '',
      lawId: target['법령ID'] || '',
      enforcementDate: target['시행일자'] || '',
    };
  } catch (err) {
    console.error(`[searchLaw] Error searching for ${lawName}:`, err);
    return null;
  }
}

/**
 * 법령일련번호(MST)와 조문 번호를 바탕으로 공식 조문 본문 및 법정형 조회
 */
export async function fetchArticle(
  lawMst: string,
  articleNum: string,
  paragraphNum?: string
): Promise<ArticleResult | null> {
  const oc = process.env.LAW_API_OC || 'jinwoo_1234';
  const joParam = formatJoParam(articleNum);
  const url = `${LAW_API_BASE}/lawService.do?OC=${oc}&target=law&MST=${lawMst}&type=JSON&JO=${joParam}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const data = await res.json();
    const lawBody = data?.법령;
    if (!lawBody) return null;

    const lawName =
      lawBody?.기본정보?.법령명_한글 || lawBody?.기본정보?.법령명한글 || '형법';
    const enforcementDate = lawBody?.기본정보?.시행일자 || '';
    const articles = lawBody?.조문?.조문단위;
    if (!articles) return null;

    const list = Array.isArray(articles) ? articles : [articles];
    // '전문'이 아닌 '조문' 단위 검색
    const target =
      list.find((a: Record<string, string>) => a['조문여부'] === '조문') || list[0];
    if (!target) return null;

    let content = target['조문내용'] || '';
    let penalty = '';
    const title = target['조문제목'] || '';

    // 항(Paragraph)이 있는 경우 특정 항 매칭
    if (target['항']) {
      const paras = Array.isArray(target['항']) ? target['항'] : [target['항']];
      let selectedPara = null;

      if (paragraphNum) {
        const cleanPara = String(paragraphNum).replace(/[^0-9]/g, '');
        const circle = circleNumbers[parseInt(cleanPara, 10) - 1] || cleanPara;
        selectedPara = paras.find(
          (p: Record<string, string>) =>
            String(p['항번호']).includes(circle) || String(p['항번호']).includes(cleanPara)
        );
      }
      if (!selectedPara && paras.length > 0) {
        selectedPara = paras[0];
      }

      if (selectedPara) {
        content = `${content}\n${selectedPara['항내용']}`;
        penalty = extractPenalty(selectedPara['항내용'] || '');
      }
    }

    if (!penalty) {
      penalty = extractPenalty(content);
    }

    const lawUrl = `https://www.law.go.kr/법령/${encodeURIComponent(lawName)}/(${lawMst})/${joParam}`;

    return {
      lawName,
      title,
      articleNumber: `제${articleNum}조${paragraphNum ? ` 제${paragraphNum}항` : ''}`,
      articleContent: content.trim(),
      penaltyText: penalty,
      enforcementDate,
      lawUrl,
    };
  } catch (err) {
    console.error(`[fetchArticle] Error fetching article ${articleNum}:`, err);
    return null;
  }
}

/**
 * 조문 본문 원문에서 공식 법정형 문구 정밀 추출
 */
export function extractPenalty(text: string): string {
  if (!text) return '';

  // 대한민국 형법 법정형 형식: 사형, 무기, 징역, 금고, 벌금, 구류, 과료 등
  const regex = /((?:사형|무기|무기징역|무기금고|\d+년\s*이상의\s*징역|\d+년\s*이하의\s*징역|\d+년\s*이하의\s*금고|\d+만\s*원\s*이하의\s*벌금|\d+천\s*만\s*원\s*이하의\s*벌금|벌금|구류|과료)[^.!?\n]*?에\s*처한다)/;
  const match = text.match(regex);
  if (match) {
    return match[1]
      .replace(/^[①-⑩\s]+/, '')
      .replace(/에\s*처한다.*$/, '')
      .trim();
  }

  // 2차 패턴: 문장 단위로 분리하여 형벌 관련 구문 탐색
  const sentences = text.split(/[.。\n]/);
  const found = sentences.find((s) => /징역|벌금|사형|금고|구류/.test(s));
  if (found) {
    return found.replace(/^[①-⑩\s]+/, '').trim();
  }

  return '';
}
