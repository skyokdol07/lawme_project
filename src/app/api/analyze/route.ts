// src/app/api/analyze/route.ts
import { NextRequest } from 'next/server';
import { analyzeWithAI, generateApplicabilityText } from '@/lib/openrouter';
import { searchLaw, fetchArticle } from '@/lib/law-api';
import type { AnalyzeResponse, CrimeResult } from '@/types';

const DISCLAIMER =
  '본 서비스는 일반적인 법률정보를 제공하기 위한 것으로, 실제 범죄 성립 여부와 선고 형량은 구체적인 사실관계, 증거, 법원의 판단에 따라 달라집니다. 본 분석 결과는 법률 전문가의 공식 상담이나 판단을 대체할 수 없습니다.';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userInput: string = body?.input?.trim();

    if (!userInput) {
      return Response.json(
        {
          status: 'error',
          results: [],
          facts: [],
          unknowns: [],
          disclaimer: DISCLAIMER,
          error_message: '사건 내용을 입력해 주세요.',
        } satisfies AnalyzeResponse,
        { status: 400 }
      );
    }

    if (userInput.length > 2000) {
      return Response.json(
        {
          status: 'error',
          results: [],
          facts: [],
          unknowns: [],
          disclaimer: DISCLAIMER,
          error_message: '입력 내용이 너무 깁니다. 2,000자 이내로 작성해 주세요.',
        } satisfies AnalyzeResponse,
        { status: 400 }
      );
    }

    // Step 1: OpenRouter AI를 통한 사실 관계 및 죄명 후보 분석
    const aiResult = await analyzeWithAI(userInput);

    if (!aiResult.candidate_crimes || aiResult.candidate_crimes.length === 0) {
      const response: AnalyzeResponse = {
        status: 'unverified',
        results: [],
        facts: aiResult.facts || [],
        unknowns: aiResult.unknowns || [],
        disclaimer: DISCLAIMER,
        error_message:
          '입력하신 내용에서 형사 범죄로 검토할 수 있는 법률적 쟁점을 찾지 못했습니다. 상황을 좀 더 구체적으로 설명해 주세요.',
        is_emergency: aiResult.is_emergency || false,
        query_timestamp: new Date().toISOString(),
      };
      return Response.json(response);
    }

    // Step 2 & 3: 국가법령정보 API를 통한 공식 법령 검색 및 법조문 검증
    const results: CrimeResult[] = [];

    for (const crime of aiResult.candidate_crimes) {
      const cleanLawName = crime.law_name || '형법';
      const cleanArticle = String(crime.article).replace(/[^0-9]/g, '');

      try {
        // 1) 법령 검색 (법령일련번호 MST 획득)
        const lawInfo = await searchLaw(cleanLawName);

        if (!lawInfo || !lawInfo.lawMst) {
          results.push({
            crime_name: crime.crime_name,
            law_name: cleanLawName,
            article: `제${cleanArticle || crime.article}조`,
            statutory_penalty: '',
            verified: false,
            verification_source: '공식 법령 미확인',
            law_url: `https://www.law.go.kr/법령/${encodeURIComponent(cleanLawName)}`,
            article_content: '',
            applicability: crime.reason,
            missing_facts: aiResult.unknowns || [],
            reason: crime.reason,
          });
          continue;
        }

        // 2) 공식 조문 조회
        const articleInfo = await fetchArticle(
          lawInfo.lawMst,
          cleanArticle,
          crime.paragraph
        );

        if (!articleInfo || !articleInfo.articleContent) {
          results.push({
            crime_name: crime.crime_name,
            law_name: lawInfo.lawName || cleanLawName,
            article: `제${cleanArticle}조${crime.paragraph ? ` 제${crime.paragraph}항` : ''}`,
            statutory_penalty: '',
            verified: false,
            verification_source: '조문 번호 불일치 (미검증)',
            law_url: `https://www.law.go.kr/법령/${encodeURIComponent(lawInfo.lawName)}`,
            article_content: '',
            applicability: crime.reason,
            missing_facts: aiResult.unknowns || [],
            reason: crime.reason,
            enforcement_date: lawInfo.enforcementDate,
          });
          continue;
        }

        // 3) 검증된 공식 법조문을 바탕으로 적용 가능성 설명 보강
        const applicability = await generateApplicabilityText(
          crime,
          articleInfo.articleContent,
          aiResult.unknowns || []
        );

        results.push({
          crime_name: crime.crime_name,
          law_name: articleInfo.lawName,
          title: articleInfo.title,
          article: articleInfo.articleNumber,
          statutory_penalty: articleInfo.penaltyText || '조문 원문 참조',
          verified: true,
          verification_source: '국가법령정보센터 (법제처)',
          law_url: articleInfo.lawUrl,
          article_content: articleInfo.articleContent,
          applicability,
          missing_facts: aiResult.unknowns || [],
          reason: crime.reason,
          enforcement_date: articleInfo.enforcementDate,
        });
      } catch (crimeErr) {
        console.error(`[analyze] Error verifying crime ${crime.crime_name}:`, crimeErr);
        results.push({
          crime_name: crime.crime_name,
          law_name: cleanLawName,
          article: `제${cleanArticle}조`,
          statutory_penalty: '',
          verified: false,
          verification_source: '검증 실패',
          law_url: `https://www.law.go.kr/법령/${encodeURIComponent(cleanLawName)}`,
          article_content: '',
          applicability: crime.reason,
          missing_facts: aiResult.unknowns || [],
          reason: crime.reason,
        });
      }
    }

    const hasVerified = results.some((r) => r.verified);
    let status: AnalyzeResponse['status'] = 'needs_clarification';

    if (aiResult.is_emergency) {
      status = 'emergency';
    } else if (hasVerified) {
      status = aiResult.requires_clarification ? 'needs_clarification' : 'verified';
    } else {
      status = 'unverified';
    }

    const response: AnalyzeResponse = {
      status,
      results,
      facts: aiResult.facts || [],
      unknowns: aiResult.unknowns || [],
      disclaimer: DISCLAIMER,
      is_emergency: aiResult.is_emergency || false,
      query_timestamp: new Date().toISOString(),
    };

    return Response.json(response);
  } catch (error) {
    console.error('[/api/analyze] 서버 오류:', error);
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return Response.json(
      {
        status: 'error',
        results: [],
        facts: [],
        unknowns: [],
        disclaimer: DISCLAIMER,
        error_message: message,
      } satisfies AnalyzeResponse,
      { status: 500 }
    );
  }
}
