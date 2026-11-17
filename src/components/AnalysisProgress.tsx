// src/components/AnalysisProgress.tsx
'use client';

import type { AnalysisStep } from '@/types';

interface Props {
  steps: AnalysisStep[];
}

export default function AnalysisProgress({ steps }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
          <span>형사법률 정밀 분석 진행 중</span>
        </h3>
        <span className="text-xs text-slate-400">잠시만 기다려주세요…</span>
      </div>

      <div className="space-y-3 pt-1">
        {steps.map((step, idx) => {
          const isActive = step.status === 'active';
          const isDone = step.status === 'done';
          const isError = step.status === 'error';

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all duration-300 ${
                isActive
                  ? 'bg-blue-50/70 border-blue-200 shadow-xs'
                  : isDone
                  ? 'bg-emerald-50/40 border-emerald-100'
                  : isError
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-slate-50/50 border-slate-100 opacity-60'
              }`}
            >
              {/* 상태 아이콘 */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : isError
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isDone ? '✓' : isError ? '!' : idx + 1}
              </div>

              {/* 단계 텍스트 */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs sm:text-sm font-semibold truncate ${
                    isActive
                      ? 'text-blue-900 font-bold'
                      : isDone
                      ? 'text-emerald-900'
                      : isError
                      ? 'text-rose-900'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </p>
              </div>

              {/* 상태 뱃지 또는 로더 */}
              {isActive && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold shrink-0">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></span>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  ></span>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  ></span>
                  <span className="ml-1 text-[11px]">처리 중</span>
                </div>
              )}
              {isDone && (
                <span className="text-xs font-bold text-emerald-600 shrink-0">
                  완료됨
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
