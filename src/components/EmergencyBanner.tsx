// src/components/EmergencyBanner.tsx
'use client';

export default function EmergencyBanner() {
  return (
    <div className="bg-rose-600 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-rose-700 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl sm:text-3xl shrink-0">🚨</span>
        <div className="space-y-1">
          <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
            생명 또는 신체에 긴급한 위험이 있나요?
          </h3>
          <p className="text-xs sm:text-sm text-rose-100 leading-relaxed">
            입력하신 진술에 인명 피해나 즉각적인 위험 정황이 감지되었습니다.
            웹앱의 법률 분석에 앞서, 신체적 안전 확보와 공적 기관의 도움을 받는 것이 최우선입니다.
          </p>
        </div>
      </div>

      <div className="pt-1 flex flex-wrap items-center gap-2.5">
        <a
          href="tel:112"
          className="bg-white text-rose-700 hover:bg-rose-50 text-xs sm:text-sm font-extrabold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
        >
          <span>🚔</span>
          <span>경찰청 범죄신고 (국번없이 112)</span>
        </a>
        <a
          href="tel:119"
          className="bg-white text-rose-700 hover:bg-rose-50 text-xs sm:text-sm font-extrabold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
        >
          <span>🚑</span>
          <span>소방청 응급구조 (국번없이 119)</span>
        </a>
        <a
          href="tel:132"
          className="bg-rose-800 text-white hover:bg-rose-900 border border-rose-500 text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
        >
          <span>⚖️</span>
          <span>대한법률구조공단 (국번없이 132)</span>
        </a>
      </div>
    </div>
  );
}
