// src/lib/openrouter.ts
import type { AiAnalysisResult, CandidateCrime } from '@/types';

// 신뢰성 높은 모델 순서: Baidu Ernie -> Nvidia Nemotron
const FALLBACK_MODELS = [
  'baidu/ernie-5.5-flash-preview:free',
  'nvidia/nemotron-3.5-lightning:free',
];

const SYSTEM_PROMPT = `당신은 대한민국 형사법률 분석 전문가입니다.
사용자가 자연어로 입력한 사건을 엄밀하게 분석하여 관련 형사 범죄 후보를 추출합니다.

[중요 원칙]
1. 입력되지 않은 사실을 임의로 단정하거나 추측하여 확정하지 마십시오.
2. 확인된 사실(facts)과 확인되지 않은 불명확한 사실(unknowns)을 명확하게 구분하십시오.
3. 여러 죄명이 검토될 수 있는 사건(예: 단순 폭행 vs 상해치상 vs 과실치상 등)인 경우 candidate_crimes에 가능한 후보들을 모두 포함하십시오.
4. 사람의 사망, 심각한 신체 상해, 자해, 흉기 위협 등 생명이나 신체에 즉각적인 위험이 느껴지는 진술인 경우 is_emergency를 true로 설정하십시오.
5. candidate_crimes 내 조문 번호(article)는 반드시 순수 아라비아 숫자만 입력하십시오 (예: 250, 329, 257, 260).
6. 항 번호(paragraph)가 명확하면 숫자로 적고, 불명확하거나 단일 조문이면 빈 문자열("")로 두십시오.
7. 반드시 아래 JSON 형식으로만 응답하고, 마크다운 코드블록이나 다른 텍스트는 일체 포함하지 마십시오.

[JSON 응답 포맷]
{
  "facts": ["확인된 사실"],
  "unknowns": ["확인되지 않았거나 추가 확인이 필요한 사실"],
  "candidate_crimes": [
    {
      "crime_name": "죄명 (예: 폭행죄, 상해치상죄, 폭행치상죄)",
      "law_name": "법률명 (예: 형법)",
      "article": "조문 번호 숫자만 (예: 260)",
      "paragraph": "항 번호 숫자만 (예: 1 또는 빈 문자열)",
      "reason": "적용 검토 사유"
    }
  ],
  "requires_clarification": true,
  "is_emergency": false
}`;

/**
 * LLM이 생성한 느슨한/불완전한 JSON 텍스트를 견고하게 정제하고 파싱
 */
function cleanAndParseJson(raw: string): AiAnalysisResult {
  // 1. 마크다운 코드 블록 제거
  let text = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // 2. { ... } 블록 추출
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  // 3. 주석(// ..., /* ... */) 제거
  text = text.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');

  // 4. 후행 쉼표(Trailing commas) 제거 (예: [1, 2, ] -> [1, 2], {"a": 1, } -> {"a": 1})
  text = text.replace(/,(\s*[\]}])/g, '$1');

  // 5. 제어 문자 정리
  text = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
    if (c === '\n' || c === '\r' || c === '\t') return c;
    return '';
  });

  try {
    return JSON.parse(text);
  } catch (firstErr) {
    // 따옴표 누락 등 사소한 오류 추가 보정 시도
    const relaxed = text
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
      .replace(/'/g, '"');
    try {
      return JSON.parse(relaxed);
    } catch {
      throw firstErr;
    }
  }
}

/**
 * OpenRouter API를 통해 사용자 입력을 분석하고 구조화된 JSON 반환
 */
export async function analyzeWithAI(userInput: string): Promise<AiAnalysisResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  const primaryModel = process.env.OPENROUTER_MODEL;
  const modelsToTry = Array.from(
    new Set([primaryModel, ...FALLBACK_MODELS].filter(Boolean))
  ) as string[];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://lawme.vercel.app',
          'X-Title': 'LawMe - Criminal Law Analyzer',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userInput },
          ],
          max_tokens: 2500,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[analyzeWithAI] Model ${model} returned ${res.status}:`, errText);
        continue;
      }

      const data = await res.json();
      let content = data.choices?.[0]?.message?.content;

      // reasoning 전용 모델 대응: content가 비어있고 reasoning_details에 내용이 있는 경우
      if (!content && data.choices?.[0]?.message?.reasoning) {
        content = data.choices[0].message.reasoning;
      }

      if (!content) {
        console.warn(`[analyzeWithAI] Model ${model} returned empty content`);
        continue;
      }

      const parsed = cleanAndParseJson(content);
      if (parsed && Array.isArray(parsed.candidate_crimes)) {
        return parsed;
      }
    } catch (err) {
      console.warn(`[analyzeWithAI] Error with model ${model}:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw (
    lastError ||
    new Error('AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.')
  );
}

/**
 * 검증된 공식 법조문을 기반으로 해당 사건의 적용 가능성 설명 생성
 */
export async function generateApplicabilityText(
  crime: CandidateCrime,
  articleContent: string,
  unknowns: string[]
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return crime.reason;

  const model = 'baidu/ernie-5.5-flash-preview:free';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lawme.vercel.app',
        'X-Title': 'LawMe - Criminal Law Analyzer',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              '당신은 대한민국 형사법률 분석 전문가입니다. 확인된 공식 법조문과 사실관계를 바탕으로 해당 죄명의 적용 가능성을 2~3문장으로 간결하고 객관적으로 설명하십시오. 법원의 확정적 유무죄를 단정하지 마십시오.',
          },
          {
            role: 'user',
            content: `죄명: ${crime.crime_name}
선정 이유: ${crime.reason}
공식 법조문 원문:
${articleContent}
추가 확인 필요 사항:
${unknowns.join(', ')}

위 정보를 바탕으로 이 사건에 대한 해당 죄명의 법적 적용 가능성 검토 내용을 한국어로 간결하게 설명해 주세요.`,
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return crime.reason;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || crime.reason;
  } catch {
    return crime.reason;
  }
}
