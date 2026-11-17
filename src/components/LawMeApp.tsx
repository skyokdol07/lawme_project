// src/components/LawMeApp.tsx
'use client';

import { useState, useRef } from 'react';
import type { AnalyzeResponse, AnalysisStep } from '@/types';
import AnalysisProgress from './AnalysisProgress';
import ResultCards from './ResultCards';
import EmergencyBanner from './EmergencyBanner';

const INITIAL_STEPS: AnalysisStep[] = [
  { id: 'analyze', label: '1. 사건 내용 분석 (AI 추론)', status: 'pending' },
  { id: 'search', label: '2. 관련 법률 검색 (국가법령정보 API)', status: 'pending' },
  { id: 'verify', label: '3. 공식 법조문 및 법정형 검증', status: 'pending' },
  { id: 'generate', label: '4. 최종 분석 결과 생성', status: 'pending' },
];

const PRESET_EXAMPLES = [
  {
    title: '사기 관련 사건',
    text: '중고거래로 돈을 먼저 입금받았는데 물건을 안 보냈어.',
    badge: '시나리오 A',
  },
  {
    title: '절도 관련 사건',
    text: '친구의 지갑을 몰래 가져갔어.',
    badge: '시나리오 B',
  },
  {
    title: '폭행·상해 관련 사건',
    text: '상대방을 밀었는데 넘어져서 크게 다쳤어.',
    badge: '시나리오 C',
  },
];

const MAX_LENGTH = 2000;

export default function LawMeApp() {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [steps, setSteps] = useState<AnalysisStep[]>(INITIAL_STEPS);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const updateStep = (id: string, status: AnalysisStep['status']) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  const handleAnalyze = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setIsAnalyzing(true);
    setResult(null);
    setError(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' })));

    // 단계별 진행 시뮬레이션
    updateStep('analyze', 'active');
    const timer1 = setTimeout(() => {
      updateStep('analyze', 'done');
      updateStep('search', 'active');
    }, 1200);

    const timer2 = setTimeout(() => {
      updateStep('search', 'done');
      updateStep('verify', 'active');
    }, 2400);

    const timer3 = setTimeout(() => {
      updateStep('verify', 'done');
      updateStep('generate', 'active');
    }, 3600);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const data: AnalyzeResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error_message || `서버 오류: ${res.status}`);
      }

      // 전체 단계 완료 처리
      setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'done' })));
      setResult(data);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const message =
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(message);
      setSteps((prev) =>
        prev.map((s) => (s.status === 'active' ? { ...s, status: 'error' } : s))
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectExample = (text: string) => {
    setInput(text);
    setError(null);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 antialiased">
      {/* 상단 네비게이션 헤더 */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
              ⚖️
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight">
                Law<span className="text-blue-600">Me</span>
              </span>
              <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold border border-blue-200/60">
                AI 형사법률 분석
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>국가법령정보센터 연동</span>
          </div>
        </div>
      </header>

      {/* 본문 콘텐츠 */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-8">
        {/* 히어로 헤더 */}
        <section className="text-center space-y-2.5 pt-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
            <span className="text-blue-600">LAWME</span> 형사 법률분석
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal">
            사건 상황을 일상 문장으로 설명하면, AI가 적용 가능한 죄명을 분석하고{' '}
            <strong className="font-semibold text-slate-800">
              대한민국 공식 국가법령정보 API
            </strong>
            로 검증된 조문과 법정형을 제공합니다.
          </p>
        </section>

        {/* 예시 입력 바로가기 배너 */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            💡 주요 시나리오 예시 클릭하여 시험해보기
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {PRESET_EXAMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectExample(ex.text)}
                disabled={isAnalyzing}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition group cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                    {ex.badge}
                  </span>
                  <span className="text-xs text-slate-400 group-hover:text-blue-600 transition">
                    선택 →
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800">{ex.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 italic">
                  &ldquo;{ex.text}&rdquo;
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* 메인 사건 입력 폼 */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="case-input" className="text-sm font-bold text-slate-800">
              어떤 상황인지 자유롭게 적어주세요
            </label>
            <span className="text-xs text-slate-400">
              {input.length} / {MAX_LENGTH}자
            </span>
          </div>

          <textarea
            id="case-input"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="어떤 상황인지 자유롭게 설명해 주세요.&#10;예: 친구의 지갑을 몰래 가져갔어요. / 상대방을 밀었는데 넘어져서 크게 다쳤어."
            rows={5}
            disabled={isAnalyzing}
            className="w-full border border-slate-300 rounded-xl p-4 text-slate-900 placeholder-slate-400 text-sm sm:text-base leading-relaxed resize-y min-h-[130px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:bg-slate-50 transition"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {input && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  disabled={isAnalyzing}
                  className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer"
                >
                  지우기
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {result && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  새로운 사건 분석
                </button>
              )}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!input.trim() || isAnalyzing}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm sm:text-base font-bold px-7 py-2.5 rounded-xl transition shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Spinner />
                    <span>법률 분석 진행 중…</span>
                  </>
                ) : (
                  <span>법률 분석하기 →</span>
                )}
              </button>
            </div>
          </div>

          {/* 한계 고지 안내문 */}
          <div className="border-t border-slate-100 pt-3.5 mt-2 flex items-start gap-2 text-xs text-slate-500">
            <span className="text-amber-500 font-bold shrink-0">※</span>
            <p>
              본 분석은 형사법률의 이해를 돕기 위한 <strong>일반적 법률정보</strong>
              입니다. 확정적인 범죄 성립 여부나 실제 선고 형량을 보장하지 않으며, 법률
              전문가의 자문을 대체할 수 없습니다.
            </p>
          </div>
        </section>

        {/* 7.2 분석 진행 화면 */}
        {isAnalyzing && <AnalysisProgress steps={steps} />}

        {/* 7.4 에러 화면 */}
        {error && !isAnalyzing && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 space-y-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <h3 className="font-bold text-base">분석 중 문제가 발생했습니다</h3>
            </div>
            <p className="text-sm text-red-700 pl-6">{error}</p>
            <div className="pt-2 pl-6">
              <button
                type="button"
                onClick={handleAnalyze}
                className="text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition"
              >
                다시 시도하기
              </button>
            </div>
          </div>
        )}

        {/* 7.3 결과 화면 */}
        {result && !isAnalyzing && (
          <div ref={resultRef} className="space-y-6 pt-2">
            {result.is_emergency && <EmergencyBanner />}
            <ResultCards result={result} onReset={handleReset} />
          </div>
        )}
      </main>

      {/* 하단 푸터 */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 space-y-2 mt-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">LawMe</span>
            <span>· AI 기반 형사법률 분석 웹 애플리케이션 (MVP)</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://www.law.go.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              국가법령정보센터 바로가기 ↗
            </a>
            <span>·</span>
            <a
              href="https://open.law.go.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              공공활용 Open API
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
