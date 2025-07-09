import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import SalesStatusBadge from './SalesStatusBadge';
import { FaSave, FaStickyNote } from 'react-icons/fa';

interface AdminSalesStatusManagerProps {
  saleId: string;
  currentStatus: string;
  currentExternalId?: string;
  onStatusUpdate: (newStatus: string) => void;
  onExternalIdUpdate: (newExternalId: string) => void;
  onClose: () => void;
}

const statusOptions = [
  { value: 'accepted', label: 'Prijatý' },
  { value: 'processing', label: 'Spracováva sa' },
  { value: 'shipped', label: 'Odoslaný' },
  { value: 'delivered', label: 'Doručený' },
  { value: 'completed', label: 'Dokončený' },
  { value: 'cancelled', label: 'Zrušený' },
  { value: 'returned', label: 'Vrátený' }
];

export default function AdminSalesStatusManager({ 
  saleId, 
  currentStatus, 
  currentExternalId = '', 
  onStatusUpdate, 
  onExternalIdUpdate,
  onClose
}: AdminSalesStatusManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [externalId, setExternalId] = useState(currentExternalId);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (selectedStatus === currentStatus && externalId === currentExternalId && !notes.trim()) {
      return; // No changes to save
    }

    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('user_sales')
        .update({ 
          status: selectedStatus,
          external_id: externalId || null,
          status_notes: notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId);

      if (updateError) throw updateError;

      onStatusUpdate(selectedStatus);
      onExternalIdUpdate(externalId);
      setNotes('');
      onClose(); // Close modal after successful save
      
    } catch (err: any) {
      console.error('Error updating sales status:', err);
      setError('Chyba pri aktualizácii statusu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = selectedStatus !== currentStatus || externalId !== currentExternalId || notes.trim();

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
      <h4 className="text-lg font-semibold text-slate-900">Správa statusu predaja</h4>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Current Status Display */}
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-slate-700">Aktuálny status:</span>
        <SalesStatusBadge status={currentStatus} />
      </div>

      {/* Status Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Nový status:
        </label>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* External ID */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Externé ID:
        </label>
        <input
          type="text"
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          placeholder="Zadajte externé ID..."
          className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          <FaStickyNote className="inline mr-1" />
          Poznámka (voliteľné):
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Pridajte poznámku k zmene statusu..."
          rows={3}
          className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
        />
      </div>

      {/* Preview of new status */}
      {selectedStatus !== currentStatus && (
        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <span className="text-sm font-medium text-green-800">Nový status:</span>
          <SalesStatusBadge status={selectedStatus} />
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Ukladá sa...
          </>
        ) : (
          <>
            <FaSave className="mr-2" />
            Uložiť zmeny
          </>
        )}
      </button>
    </div>
  );
}