// src/components/ResultCards.tsx
'use client';

import { useState } from 'react';
import type { AnalyzeResponse, CrimeResult } from '@/types';

interface Props {
  result: AnalyzeResponse;
  onReset?: () => void;
}

export default function ResultCards({ result, onReset }: Props) {
  const hasResults = result.results && result.results.length > 0;

  return (
    <div className="space-y-6">
      {/* 상태 요약 배너 */}
      <StatusBanner
        status={result.status}
        count={result.results.length}
        errorMessage={result.error_message}
      />

      {/* 사실 관계 분석 요약 (확인된 사실 vs 추가 확인 필요 사실) */}
      {(result.facts?.length > 0 || result.unknowns?.length > 0) && (
        <FactSummary facts={result.facts} unknowns={result.unknowns} />
      )}

      {/* 죄명별 결과 카드 목록 */}
      {hasResults ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>검토 대상 죄명</span>
              <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                총 {result.results.length}건
              </span>
            </h2>
            <span className="text-xs text-slate-400">
              공식 국가법령정보 실시간 검증
            </span>
          </div>

          <div className="space-y-4">
            {result.results.map((crime, idx) => (
              <CrimeCard key={idx} crime={crime} index={idx + 1} />
            ))}
          </div>
        </div>
      ) : (
        /* 결과가 없는 경우 예외 카드 */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
          <span className="text-4xl block">🔍</span>
          <h3 className="text-base font-bold text-slate-800">
            적용 가능한 형사 죄명을 찾지 못했습니다
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {result.error_message ||
              '입력하신 사건에서 특정 가능한 형사범죄 구성요건을 확인하기 어렵습니다. 구체적인 행위, 피해 사실, 발생 결과를 포함하여 다시 작성해 보세요.'}
          </p>
          {onReset && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onReset}
                className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition cursor-pointer"
              >
                사건 내용 수정하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 공식 면책 고지 배너 */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 text-xs text-amber-900 space-y-1.5 shadow-xs">
        <p className="font-bold flex items-center gap-1.5 text-sm text-amber-800">
          <span>⚠️</span>
          <span>법률정보 제공 서비스 한계 및 면책 고지</span>
        </p>
        <p className="leading-relaxed text-amber-800/90">{result.disclaimer}</p>
        <p className="text-amber-700/80 pt-1">
          ※ 실제 재판에서는 위법성 조각사유(정당방위 등), 책임능력, 고의나 과실의
          증명, 피해자와의 합의 및 양형 기준에 따라 선고형이 법정형 범위 내에서 크게
          달라지거나 무죄가 선고될 수 있습니다.
        </p>
      </div>
    </div>
  );
}

function StatusBanner({
  status,
  count,
  errorMessage,
}: {
  status: AnalyzeResponse['status'];
  count: number;
  errorMessage?: string;
}) {
  const configs = {
    verified: {
      bg: 'bg-emerald-50 border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800',
      text: 'text-emerald-900',
      descText: 'text-emerald-800/90',
      icon: '✅',
      title: '국가법령정보 공식 검증 완료',
      desc: `입력된 사건을 분석하여 ${count}개의 관련 죄명과 공식 법조문·법정형을 확인했습니다.`,
    },
    needs_clarification: {
      bg: 'bg-blue-50 border-blue-200',
      badge: 'bg-blue-100 text-blue-800',
      text: 'text-blue-900',
      descText: 'text-blue-800/90',
      icon: '📋',
      title: '추가 사실 확인 필요 (검토 진행)',
      desc: `법률적 쟁점 ${count}건을 선별하였으나, 고의 여부·피해 정도 등 미확인된 사실관계에 따라 최종 죄명 및 적용 여부가 달라집니다.`,
    },
    emergency: {
      bg: 'bg-rose-50 border-rose-200',
      badge: 'bg-rose-100 text-rose-800',
      text: 'text-rose-900',
      descText: 'text-rose-800/90',
      icon: '🚨',
      title: '긴급 정황 감지 및 형사법률 검토',
      desc: '신체나 생명에 중대한 침해가 발생한 것으로 보입니다. 신속한 법적/응급 대응이 필요할 수 있습니다.',
    },
    unverified: {
      bg: 'bg-slate-50 border-slate-200',
      badge: 'bg-slate-200 text-slate-800',
      text: 'text-slate-900',
      descText: 'text-slate-600',
      icon: '❓',
      title: '분석 결과 검토 필요',
      desc: errorMessage || '구체적인 혐의나 조문을 특정하기 어려운 진술입니다.',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      badge: 'bg-red-100 text-red-800',
      text: 'text-red-900',
      descText: 'text-red-700',
      icon: '⚠️',
      title: '분석 오류',
      desc: errorMessage || '분석 중 일시적인 오류가 발생했습니다.',
    },
  };

  const c = configs[status] || configs.needs_clarification;

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${c.bg} shadow-xs`}>
      <div className="flex items-start gap-3">
        <span className="text-xl sm:text-2xl shrink-0 mt-0.5">{c.icon}</span>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold text-sm sm:text-base ${c.text}`}>{c.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.badge}`}>
              {status.toUpperCase()}
            </span>
          </div>
          <p className={`text-xs sm:text-sm leading-relaxed ${c.descText}`}>{c.desc}</p>
        </div>
      </div>
    </div>
  );
}

function FactSummary({
  facts,
  unknowns,
}: {
  facts: string[];
  unknowns: string[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full text-left px-5 py-3.5 flex items-center justify-between text-sm font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <span>📌</span>
          <span>사건 사실관계 분석 (추론 vs 미확인 사실)</span>
        </span>
        <span className="text-xs text-slate-400 font-semibold">
          {open ? '접기 ▲' : '펼쳐보기 ▼'}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100">
          {/* 확인된 사실 */}
          <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100">
            <p className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
              <span>✓</span>
              <span>확인된 사실 (진술 기반)</span>
            </p>
            {facts.length > 0 ? (
              <ul className="space-y-1.5">
                {facts.map((f, i) => (
                  <li key={i} className="text-xs sm:text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">명시적으로 확인된 사실이 부족합니다.</p>
            )}
          </div>

          {/* 추가 확인 필요 사실 */}
          <div className="bg-amber-50/50 rounded-xl p-3.5 border border-amber-100">
            <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
              <span>?</span>
              <span>추가 확인 필요 (불확실성 요소)</span>
            </p>
            {unknowns.length > 0 ? (
              <ul className="space-y-1.5">
                {unknowns.map((u, i) => (
                  <li key={i} className="text-xs sm:text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-amber-500 font-bold shrink-0">•</span>
                    <span>{u}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">추가적인 불확실성 정보가 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CrimeCard({ crime, index }: { crime: CrimeResult; index: number }) {
  const [showArticleText, setShowArticleText] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden">
      {/* 카드 상단 헤더 */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-black text-white bg-slate-800 w-5 h-5 rounded-full inline-flex items-center justify-center">
              {index}
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {crime.crime_name}
            </h3>
            {crime.verified ? (
              <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                <span>✓</span> 공식 법조문 검증됨
              </span>
            ) : (
              <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                조문 미확인
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 font-medium">
            관련 법률: <strong className="text-slate-700">{crime.law_name}</strong>{' '}
            <span className="text-blue-600 font-bold">{crime.article}</span>
            {crime.title && (
              <span className="ml-1 text-slate-400">({crime.title})</span>
            )}
          </p>
        </div>

        {/* 시행일 정보 */}
        {crime.enforcement_date && (
          <div className="text-right text-xs text-slate-400 shrink-0">
            <span>시행일 기준: </span>
            <strong className="text-slate-600 font-semibold">
              {formatDate(crime.enforcement_date)}
            </strong>
          </div>
        )}
      </div>

      {/* 법정형 하이라이트 박스 */}
      <div className="px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            법정형 (법률 규정 형벌 범위)
          </span>
          <span className="text-xs text-slate-400">※ 실제 선고형과 다름</span>
        </div>
        <div className="text-base sm:text-lg font-black text-rose-600 tracking-tight">
          {crime.statutory_penalty ? (
            crime.statutory_penalty
          ) : (
            <span className="text-slate-400 text-sm font-normal">
              공식 법정형을 원문에서 확인 중이거나 조회되지 않음
            </span>
          )}
        </div>
      </div>

      {/* AI 적용 가능성 설명 */}
      <div className="p-5 sm:p-6 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <span>⚖️</span>
            <span>사건 적용 가능성 검토 (AI 추론)</span>
          </h4>
          <p className="text-sm text-slate-700 leading-relaxed bg-blue-50/30 p-3.5 rounded-xl border border-blue-100/60 font-normal">
            {crime.applicability}
          </p>
        </div>

        {/* 확인되지 않은 핵심 사실 (불확실성 태그) */}
        {crime.missing_facts && crime.missing_facts.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span>⚠️</span>
              <span>범죄 성립을 위해 추가 확인이 필요한 사실</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {crime.missing_facts.map((fact, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-lg"
                >
                  {fact}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 공식 조문 원문 펼쳐보기 (FR-04, FR-05) */}
      {crime.article_content && (
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowArticleText((prev) => !prev)}
            className="w-full text-left px-5 sm:px-6 py-3 flex items-center justify-between text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <span>📜</span>
              <span>공식 법조문 원문 보기</span>
            </span>
            <span className="text-slate-400 font-semibold">
              {showArticleText ? '접기 ▲' : '원문 보기 ▼'}
            </span>
          </button>

          {showArticleText && (
            <div className="px-5 sm:px-6 pb-4">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 overflow-x-auto">
                {crime.article_content}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 하단 출처 링크 */}
      <div className="px-5 sm:px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          <span>출처: </span>
          <strong className="text-slate-700 font-semibold">
            {crime.verification_source || '국가법령정보센터'}
          </strong>
        </div>
        {crime.law_url && (
          <a
            href={crime.law_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-bold hover:underline inline-flex items-center gap-1"
          >
            <span>국가법령정보센터 원문 확인</span>
            <span>↗</span>
          </a>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}년 ${dateStr.slice(4, 6)}월 ${dateStr.slice(6, 8)}일`;
}
