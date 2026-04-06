'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, Clock, User, ChevronRight } from 'lucide-react';
import { createSupabaseBrowserClient } from '../../../src/lib/supabase/browser';

const URGENCY_STYLE = {
  emergency: { label: '긴급', bg: 'bg-red-100 text-red-800', border: 'border-red-200' },
  high: { label: '높음', bg: 'bg-orange-100 text-orange-800', border: 'border-orange-200' },
  medium: { label: '보통', bg: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-200' },
  low: { label: '낮음', bg: 'bg-green-100 text-green-800', border: 'border-green-200' },
  minimal: { label: '최소', bg: 'bg-gray-100 text-gray-600', border: 'border-gray-200' },
};

export default function AlertsPage() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('high');

  useEffect(() => {
    const fetchAlerts = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const url = filter === 'all'
          ? '/api/khidi/followup?limit=50'
          : `/api/khidi/followup?urgency=${filter}&limit=50`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.ok) setReports(data.data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchAlerts();
  }, [filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">증상 알림</h1>
        <p className="text-gray-500 text-sm mt-1">환자가 제출한 증상 보고를 긴급도별로 확인합니다.</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'high', label: '긴급/높음' },
          { key: 'medium', label: '보통' },
          { key: 'all', label: '전체' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setLoading(true); setFilter(tab.key); }}
            className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
              filter === tab.key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports */}
      {reports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
          <p className="text-gray-500 font-medium">긴급 증상 보고가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => {
            const urgency = URGENCY_STYLE[report.urgency_level] || URGENCY_STYLE.minimal;
            return (
              <div key={report.id} className={`bg-white border rounded-xl p-4 ${urgency.border}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
                      <User size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgency.bg}`}>
                          {urgency.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          Risk Score: {(report.risk_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{report.assessment || report.recommended_action || '-'}</p>
                      {report.flagged_symptoms && report.flagged_symptoms.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {report.flagged_symptoms.map((s, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-2">
                        <Clock size={10} className="inline mr-1" />
                        {report.created_at ? new Date(report.created_at).toLocaleString('ko-KR') : '-'}
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
