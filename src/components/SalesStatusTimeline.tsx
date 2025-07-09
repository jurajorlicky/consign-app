import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import SalesStatusBadge from './SalesStatusBadge';
import { FaClock, FaUser, FaStickyNote } from 'react-icons/fa';

interface SalesStatusHistoryItem {
  id: string;
  old_status: string | null;
  new_status: string;
  created_at: string;
  notes: string | null;
  changed_by: string | null;
}

interface SalesStatusTimelineProps {
  saleId: string;
  currentStatus: string;
}

export default function SalesStatusTimeline({ saleId, currentStatus }: SalesStatusTimelineProps) {
  const [history, setHistory] = useState<SalesStatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatusHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('sales_status_history')
          .select('*')
          .eq('sale_id', saleId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setHistory(data || []);
      } catch (err: any) {
        console.error('Error fetching sales status history:', err);
        setError('Chyba pri načítavaní histórie statusu');
      } finally {
        setLoading(false);
      }
    };

    if (saleId) {
      fetchStatusHistory();
    }
  }, [saleId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
        <span className="ml-2 text-sm text-slate-600">Načítava sa história...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-slate-900 mb-4">História predaja</h4>
      
      {/* Current Status */}
      <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border-l-4 border-green-500">
        <SalesStatusBadge status={currentStatus} />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">Aktuálny status</p>
          <p className="text-xs text-slate-500">Posledná aktualizácia</p>
        </div>
      </div>

      {/* Status History */}
      <div className="space-y-3">
        {history.length > 0 ? (
          history.map((item, index) => (
            <div key={item.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-slate-200">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <FaClock className="text-slate-500 text-xs" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  {item.old_status && (
                    <>
                      <SalesStatusBadge status={item.old_status} className="text-xs" />
                      <span className="text-slate-400">→</span>
                    </>
                  )}
                  <SalesStatusBadge status={item.new_status} className="text-xs" />
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <div className="flex items-center">
                    <FaClock className="mr-1" />
                    {formatDate(item.created_at)}
                  </div>
                  {item.changed_by && (
                    <div className="flex items-center">
                      <FaUser className="mr-1" />
                      Admin
                    </div>
                  )}
                </div>
                
                {item.notes && (
                  <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                    <div className="flex items-center text-slate-600 mb-1">
                      <FaStickyNote className="mr-1 text-xs" />
                      Poznámka:
                    </div>
                    <p className="text-slate-700">{item.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-500">
            <p className="text-sm">Zatiaľ žiadna história zmien</p>
          </div>
        )}
      </div>
    </div>
  );
}