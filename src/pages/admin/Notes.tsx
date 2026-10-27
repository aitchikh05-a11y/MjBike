import { useMemo, useState } from 'react';
import { Archive, CheckCircle2, Edit, Pin, Plus, Trash2, Undo2 } from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, ConfirmDialog, Panel, SelectFilter } from '@/components/admin/widgets';
import { Field, Modal, Spinner } from '@/components/common/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/authentication/AuthProvider';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import { NOTE_CATEGORIES, NOTE_PRIORITIES, type AdminNote } from '@shared/domain/types';
import type { NoteDraft } from '@/services/backend/types';
import { todayISO } from '@shared/domain/availability';
import { cn } from '@/lib/utilities/cn';

const priorityStyle: Record<AdminNote['priority'], string> = {
  low: 'bg-ink-100 text-ink-600',
  normal: 'bg-sky-50 text-sky-800',
  high: 'bg-amber-50 text-amber-800',
  urgent: 'bg-red-50 text-red-700',
};

const toDraft = (note: AdminNote | null): NoteDraft =>
  note
    ? { ...note }
    : {
        title: '',
        body: '',
        category: 'general',
        priority: 'normal',
        note_date: todayISO(),
        follow_up_date: null,
        is_completed: false,
        is_pinned: false,
        is_archived: false,
        reservation_id: null,
        customer_id: null,
        offer_id: null,
        calendar_event_id: null,
      };

export function AdminNotesPage() {
  const { t, date } = useI18n();
  const { profile } = useAuth();
  const notes = useAsync(() => backend.listNotes(), []);
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('open');
  const [onlyMine, setOnlyMine] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<AdminNote | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminNote | null>(null);

  const filtered = useMemo(() => {
    let list = notes.data ?? [];
    if (category) list = list.filter((note) => note.category === category);
    if (priority) list = list.filter((note) => note.priority === priority);
    if (status === 'open') list = list.filter((note) => !note.is_completed);
    if (status === 'done') list = list.filter((note) => note.is_completed);
    if (onlyMine && profile) list = list.filter((note) => note.created_by === profile.id);
    if (!showArchived) list = list.filter((note) => !note.is_archived);
    return [...list].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.created_at.localeCompare(a.created_at));
  }, [notes.data, category, priority, status, onlyMine, showArchived, profile]);

  const toggle = async (note: AdminNote, patch: Partial<AdminNote>) => {
    await backend.saveNote({ ...note, ...patch } as NoteDraft);
    notes.reload();
  };

  return (
    <div>
      <AdminPageHeader
        title={t('admin.notes.title')}
        subtitle={t('admin.notes.subtitle')}
        actions={
          <button type="button" className="btn-primary text-xs" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t('admin.notes.create')}
          </button>
        }
      />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <SelectFilter
          label={t('admin.notes.filterCategory')}
          value={category}
          onChange={setCategory}
          options={[{ value: '', label: t('admin.common.all') }, ...NOTE_CATEGORIES.map((value) => ({ value, label: t(`admin.notes.categories.${value}`) }))]}
        />
        <SelectFilter
          label={t('admin.notes.filterPriority')}
          value={priority}
          onChange={setPriority}
          options={[{ value: '', label: t('admin.common.all') }, ...NOTE_PRIORITIES.map((value) => ({ value, label: t(`admin.notes.priorities.${value}`) }))]}
        />
        <SelectFilter
          label={t('admin.notes.filterStatus')}
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: t('admin.common.all') },
            { value: 'open', label: t('admin.notes.filterOpen') },
            { value: 'done', label: t('admin.notes.completed') },
          ]}
        />
        <label className="flex items-center gap-1.5 pb-2 text-xs text-ink-600">
          <input type="checkbox" className="size-3.5 rounded border-ink-300 text-brand-600" checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} />
          {t('admin.notes.onlyMine')}
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-xs text-ink-600">
          <input type="checkbox" className="size-3.5 rounded border-ink-300 text-brand-600" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
          {t('admin.notes.showArchived')}
        </label>
      </div>

      {notes.loading && <AdminLoading />}
      {notes.error && <AdminError message={notes.error} onRetry={notes.reload} />}

      {notes.data && filtered.length === 0 && <p className="card px-4 py-10 text-center text-sm text-ink-500">{t('admin.notes.empty')}</p>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((note) => {
          const overdue = note.follow_up_date && !note.is_completed && note.follow_up_date < todayISO();
          return (
            <article key={note.id} className={cn('card flex flex-col gap-2 p-4', note.is_archived && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <h2 className={cn('text-sm font-bold text-ink-900', note.is_completed && 'line-through opacity-60')}>{note.title}</h2>
                {note.is_pinned && <Pin className="size-3.5 shrink-0 fill-brand-500 text-brand-500" aria-hidden="true" />}
              </div>
              <p className="line-clamp-3 whitespace-pre-line text-xs text-ink-600">{note.body}</p>
              <div className="flex flex-wrap gap-1.5 text-[0.62rem]">
                <span className="chip bg-ink-100 text-ink-700">{t(`admin.notes.categories.${note.category}`)}</span>
                <span className={cn('chip', priorityStyle[note.priority])}>{t(`admin.notes.priorities.${note.priority}`)}</span>
                {note.follow_up_date && (
                  <span className={cn('chip', overdue ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-800')}>
                    {t('admin.notes.followUp')}: {date(note.follow_up_date)}
                  </span>
                )}
              </div>
              <p className="text-[0.62rem] text-ink-400">{note.created_by_name}</p>
              <div className="mt-auto flex flex-wrap gap-1 border-t border-ink-100 pt-2">
                <button type="button" className="rounded p-1 text-ink-500 hover:bg-ink-100" onClick={() => void toggle(note, { is_completed: !note.is_completed })} aria-label={t('admin.notes.markDone')}>
                  {note.is_completed ? <Undo2 className="size-3.5" aria-hidden="true" /> : <CheckCircle2 className="size-3.5" aria-hidden="true" />}
                </button>
                <button type="button" className="rounded p-1 text-ink-500 hover:bg-ink-100" onClick={() => void toggle(note, { is_pinned: !note.is_pinned })} aria-label={t('admin.notes.pinned')}>
                  <Pin className="size-3.5" aria-hidden="true" />
                </button>
                <button type="button" className="rounded p-1 text-ink-500 hover:bg-ink-100" onClick={() => setEditing(note)} aria-label={t('admin.common.edit')}>
                  <Edit className="size-3.5" aria-hidden="true" />
                </button>
                <button type="button" className="rounded p-1 text-ink-500 hover:bg-ink-100" onClick={() => void toggle(note, { is_archived: !note.is_archived })} aria-label={t('admin.notes.archive')}>
                  <Archive className="size-3.5" aria-hidden="true" />
                </button>
                <button type="button" className="ms-auto rounded p-1 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(note)} aria-label={t('admin.common.delete')}>
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {(editing || creating) && (
        <NoteEditor
          note={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            notes.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('admin.common.confirmDelete')}
        confirmLabel={t('admin.common.delete')}
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void backend.deleteNote(deleteTarget.id).then(() => {
            setDeleteTarget(null);
            notes.reload();
          });
        }}
      />
    </div>
  );
}

function NoteEditor({ note, onClose, onSaved }: { note: AdminNote | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<NoteDraft>(() => toDraft(note));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await backend.saveNote(draft);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={note ? t('admin.notes.edit') : t('admin.notes.create')}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={onClose}>
            {t('admin.common.cancel')}
          </button>
          <button type="button" className="btn-primary text-xs" onClick={() => void save()} disabled={saving}>
            {saving && <Spinner className="size-3.5 text-white" />}
            {t('admin.common.save')}
          </button>
        </div>
      }
    >
      <Panel>
        <div className="space-y-3">
          <Field label={t('admin.notes.titleLabel')} htmlFor="note-title" required>
            <input id="note-title" className="field" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </Field>
          <Field label={t('admin.notes.body')} htmlFor="note-body" required>
            <textarea id="note-body" rows={4} className="field" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={t('admin.notes.category')} htmlFor="note-category">
              <select id="note-category" className="field" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as NoteDraft['category'] })}>
                {NOTE_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`admin.notes.categories.${value}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.notes.priority')} htmlFor="note-priority">
              <select id="note-priority" className="field" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as NoteDraft['priority'] })}>
                {NOTE_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`admin.notes.priorities.${value}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.notes.date')} htmlFor="note-date">
              <input id="note-date" type="date" className="field" value={draft.note_date ?? ''} onChange={(event) => setDraft({ ...draft, note_date: event.target.value || null })} />
            </Field>
            <Field label={t('admin.notes.followUp')} htmlFor="note-follow-up">
              <input id="note-follow-up" type="date" className="field" value={draft.follow_up_date ?? ''} onChange={(event) => setDraft({ ...draft, follow_up_date: event.target.value || null })} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" className="size-3.5 rounded border-ink-300 text-brand-600" checked={draft.is_pinned} onChange={(event) => setDraft({ ...draft, is_pinned: event.target.checked })} />
              {t('admin.notes.pinned')}
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" className="size-3.5 rounded border-ink-300 text-brand-600" checked={draft.is_completed} onChange={(event) => setDraft({ ...draft, is_completed: event.target.checked })} />
              {t('admin.notes.completed')}
            </label>
          </div>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
        </div>
      </Panel>
    </Modal>
  );
}
