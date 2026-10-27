import { useEffect, useState } from 'react';
import { ExternalLink, Plus, Save, Trash2, UserPlus } from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, ConfirmDialog, LocaleTabs, Panel } from '@/components/admin/widgets';
import { Field, Modal, Spinner } from '@/components/common/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/authentication/AuthProvider';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import type { SiteSettings, Locale, Profile } from '@shared/domain/types';
import { ADMIN_ROLES, LOCALES, ROLE_LABELS } from '@shared/domain/types';
import { cn } from '@/lib/utilities/cn';

type Tab = 'business' | 'contact' | 'content' | 'hours' | 'staff';

export function AdminSettingsPage() {
  const { t, locale } = useI18n();
  const { allowed, profile } = useAuth();
  const settings = useAsync(() => backend.getSettings(), []);
  const staff = useAsync(() => (allowed('users:manage') ? backend.listStaff() : Promise.resolve([])), [allowed]);
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [tab, setTab] = useState<Tab>('business');
  const [contentLocale, setContentLocale] = useState<Locale>('en');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Profile | null>(null);

  useEffect(() => {
    if (settings.data) setDraft(settings.data);
  }, [settings.data]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await backend.saveSettings(draft);
      setDraft(updated);
      setMessage(t('admin.settings.saved'));
      settings.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: Tab; label: string; permission?: boolean }[] = [
    { key: 'business', label: t('admin.settings.businessTab') },
    { key: 'contact', label: t('admin.settings.contactTab') },
    { key: 'content', label: t('admin.settings.contentTab') },
    { key: 'hours', label: t('admin.settings.hoursTab') },
    { key: 'staff', label: t('admin.settings.staffTab'), permission: allowed('users:manage') },
  ];

  if (settings.loading) return <AdminLoading />;
  if (settings.error) return <AdminError message={settings.error} onRetry={settings.reload} />;
  if (!draft) return null;

  return (
    <div>
      <AdminPageHeader
        title={t('admin.settings.title')}
        subtitle={t('admin.settings.subtitle')}
        actions={
          <button type="button" className="btn-primary text-xs" onClick={() => void save()} disabled={saving}>
            {saving ? <Spinner className="size-3.5 text-white" /> : <Save className="size-3.5" aria-hidden="true" />}
            {t('common.save')}
          </button>
        }
      />

      {message && <p className="mb-3 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-900">{message}</p>}
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-ink-100">
        {tabs
          .filter((entry) => entry.permission !== false)
          .map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              className={cn('rounded-full px-3 py-1.5 text-xs font-semibold', tab === entry.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:text-ink-900')}
            >
              {entry.label}
            </button>
          ))}
      </div>

      {tab === 'business' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={t('admin.settings.businessTab')}>
            <div className="space-y-3">
              <Field label={t('admin.settings.name')} htmlFor="settings-business-name">
                <input id="settings-business-name" className="field" value={draft.business_name} onChange={(event) => setDraft({ ...draft, business_name: event.target.value })} />
              </Field>
              <LocaleTabs value={contentLocale} onChange={setContentLocale} />
              <Field label={t('admin.settings.tagline')} htmlFor="settings-tagline">
                <input
                  id="settings-tagline"
                  className="field"
                  value={draft.tagline[contentLocale] ?? ''}
                  onChange={(event) => setDraft({ ...draft, tagline: { ...draft.tagline, [contentLocale]: event.target.value } })}
                />
              </Field>
              <Field label={t('admin.settings.address')} htmlFor="settings-address">
                <input
                  id="settings-address"
                  className="field"
                  value={draft.address[contentLocale] ?? ''}
                  onChange={(event) => setDraft({ ...draft, address: { ...draft.address, [contentLocale]: event.target.value } })}
                />
              </Field>
              <p className="text-[0.68rem] text-ink-400">{t('admin.settings.addressHint')}</p>
            </div>
          </Panel>

          <Panel title={t('admin.settings.claims')}>
            <p className="mb-3 text-[0.7rem] text-ink-500">{t('admin.settings.claimsHint')}</p>
            <div className="space-y-2">
              {draft.about_claims.map((claim, index) => (
                <div key={index} className="rounded-lg border border-ink-100 p-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      className="field !w-24 !py-1 text-xs"
                      aria-label={t('admin.settings.claimValue')}
                      value={claim.value}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          about_claims: draft.about_claims.map((entry, position) => (position === index ? { ...entry, value: event.target.value } : entry)),
                        })
                      }
                    />
                    <input
                      className="field !py-1 text-xs"
                      aria-label={t('admin.settings.claimLabel')}
                      value={claim.label[contentLocale] ?? ''}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          about_claims: draft.about_claims.map((entry, position) =>
                            position === index ? { ...entry, label: { ...entry.label, [contentLocale]: event.target.value } } : entry,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                      aria-label={t('common.delete')}
                      onClick={() => setDraft({ ...draft, about_claims: draft.about_claims.filter((_, position) => position !== index) })}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                className="btn-secondary !px-2 !py-1 text-[0.65rem]"
                onClick={() => setDraft({ ...draft, about_claims: [...draft.about_claims, { value: '', label: { en: '', fr: '', ar: '' } }] })}
              >
                <Plus className="size-3" aria-hidden="true" />
                {t('admin.settings.addClaim')}
              </button>
              <LocaleTabs value={contentLocale} onChange={setContentLocale} />
            </div>
          </Panel>
        </div>
      )}

      {tab === 'contact' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={t('admin.settings.contactTab')}>
            <div className="space-y-3">
              <Field label={t('common.phone')} htmlFor="settings-phone" hint="+212 613 993 957">
                <input id="settings-phone" className="field" dir="ltr" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              </Field>
              <Field label={t('admin.settings.whatsapp')} htmlFor="settings-whatsapp" hint="212613993957">
                <input id="settings-whatsapp" className="field" dir="ltr" value={draft.whatsapp} onChange={(event) => setDraft({ ...draft, whatsapp: event.target.value })} />
              </Field>
              <Field label={t('common.email')} htmlFor="settings-email">
                <input id="settings-email" type="email" className="field" dir="ltr" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              </Field>
              <Field label={t('admin.settings.maps')} htmlFor="settings-maps">
                <input id="settings-maps" className="field" dir="ltr" value={draft.maps_url} onChange={(event) => setDraft({ ...draft, maps_url: event.target.value })} />
              </Field>
            </div>
          </Panel>
          <Panel title={t('admin.settings.social')}>
            <div className="space-y-3">
              {(
                [
                  ['instagram_url', 'Instagram'],
                  ['facebook_url', 'Facebook'],
                  ['tiktok_url', 'TikTok'],
                  ['youtube_url', 'YouTube'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label} htmlFor={`settings-${key}`}>
                  <div className="flex gap-1.5">
                    <input
                      id={`settings-${key}`}
                      className="field"
                      dir="ltr"
                      value={draft[key]}
                      onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                    />
                    {draft[key] && (
                      <a href={draft[key]} target="_blank" rel="noreferrer" className="btn-secondary !px-2" aria-label={label}>
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </Field>
              ))}
              <p className="text-[0.68rem] text-ink-400">{t('admin.settings.socialHint')}</p>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'content' && (
        <Panel title={t('admin.settings.hoursTab')}>
          <p className="mb-3 text-[0.7rem] text-ink-500">{t('admin.settings.hoursHint')}</p>
          <div className="space-y-2">
            {draft.opening_hours.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <input
                  className="field !py-1.5 text-xs"
                  aria-label={t('admin.settings.days')}
                  value={entry.days}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      opening_hours: draft.opening_hours.map((item, position) => (position === index ? { ...item, days: event.target.value } : item)),
                    })
                  }
                />
                <input
                  className="field !w-40 !py-1.5 text-xs"
                  aria-label={t('admin.settings.hours')}
                  dir="ltr"
                  value={entry.hours}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      opening_hours: draft.opening_hours.map((item, position) => (position === index ? { ...item, hours: event.target.value } : item)),
                    })
                  }
                />
                <button
                  type="button"
                  className="rounded p-1 text-red-600 hover:bg-red-50"
                  aria-label={t('common.delete')}
                  onClick={() => setDraft({ ...draft, opening_hours: draft.opening_hours.filter((_, position) => position !== index) })}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn-secondary mt-3 !px-2 !py-1 text-[0.65rem]"
            onClick={() => setDraft({ ...draft, opening_hours: [...draft.opening_hours, { days: '', hours: '09:00 – 21:00' }] })}
          >
            <Plus className="size-3" aria-hidden="true" />
            {t('admin.settings.addHours')}
          </button>
          <p className="mt-4 rounded-xl bg-ink-50 px-3 py-2 text-[0.7rem] text-ink-500">{t('admin.settings.localeNote')}</p>
          <p className="mt-2 text-[0.68rem] text-ink-400">
            {LOCALES.map((entry) => entry.toUpperCase()).join(' · ')} — {locale.toUpperCase()}
          </p>
        </Panel>
      )}

      {tab === 'staff' && allowed('users:manage') && (
        <div className="space-y-4">
          <Panel
            title={t('admin.settings.staffTab')}
            action={
              <button type="button" className="btn-primary !px-2 !py-1 text-[0.65rem]" onClick={() => setInviteOpen(true)}>
                <UserPlus className="size-3" aria-hidden="true" />
                {t('admin.settings.invite')}
              </button>
            }
          >
            {staff.loading && <AdminLoading />}
            {staff.error && <AdminError message={staff.error} onRetry={staff.reload} />}
            {staff.data && staff.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.settings.name')}</th>
                      <th>{t('common.email')}</th>
                      <th>{t('admin.settings.role')}</th>
                      <th>{t('admin.settings.status')}</th>
                      <th>{t('admin.settings.lastSignIn')}</th>
                      <th className="text-end">{t('admin.common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.data.map((member) => (
                      <tr key={member.id}>
                        <td className="text-xs font-semibold">{member.full_name}</td>
                        <td className="text-xs" dir="ltr">
                          {member.email}
                        </td>
                        <td className="text-xs">{ROLE_LABELS[member.role]}</td>
                        <td>
                          <span className={cn('chip text-[0.6rem]', member.is_active ? 'bg-brand-50 text-brand-800' : 'bg-ink-100 text-ink-500')}>
                            {member.is_active ? t('admin.settings.active') : t('admin.settings.inactive')}
                          </span>
                        </td>
                        <td className="text-xs">{member.last_sign_in_at ? member.last_sign_in_at.slice(0, 10) : '—'}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="text-[0.65rem] font-semibold text-brand-700 hover:underline disabled:text-ink-300"
                            disabled={member.id === profile?.id}
                            onClick={() => setRemoveTarget(member)}
                          >
                            {member.is_active ? t('admin.settings.deactivate') : t('admin.settings.reactivate')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-[0.68rem] text-ink-400">{t('admin.settings.roleHint')}</p>
          </Panel>

          <Panel title={t('admin.settings.rolesTitle')}>
            <ul className="space-y-2 text-[0.72rem] text-ink-600">
              <li>
                <strong>Super Admin</strong> — {t('admin.settings.superAdminText')}
              </li>
              <li>
                <strong>Admin</strong> — {t('admin.settings.adminText')}
              </li>
              <li>
                <strong>Staff</strong> — {t('admin.settings.staffText')}
              </li>
            </ul>
          </Panel>
        </div>
      )}

      <InviteModal
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setTempPassword(null);
        }}
        tempPassword={tempPassword}
        onInvited={(password) => {
          setTempPassword(password ?? null);
          staff.reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={removeTarget?.is_active ? t('admin.settings.deactivate') : t('admin.settings.reactivate')}
        description={removeTarget?.full_name}
        confirmLabel={t('common.save')}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return;
          void backend
            .saveStaff({
              id: removeTarget.id,
              email: removeTarget.email,
              full_name: removeTarget.full_name,
              role: removeTarget.role,
              is_active: !removeTarget.is_active,
            })
            .then(() => {
              setRemoveTarget(null);
              staff.reload();
            });
        }}
      />
    </div>
  );
}

function InviteModal({
  open,
  onClose,
  onInvited,
  tempPassword,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: (password: string | undefined) => void;
  tempPassword: string | null;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<{ email: string; full_name: string; role: Profile['role']; phone: string }>({
    email: '',
    full_name: '',
    role: 'staff',
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await backend.saveStaff({ ...draft, phone: draft.phone || null });
      onInvited(result.temporaryPassword ?? undefined);
      setDraft({ email: '', full_name: '', role: 'staff', phone: '' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('admin.settings.invite')}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={onClose}>
            {t('common.close')}
          </button>
          {!tempPassword && (
            <button type="button" className="btn-primary text-xs" onClick={() => void submit()} disabled={saving || !draft.email || !draft.full_name}>
              {saving && <Spinner className="size-3.5 text-white" />}
              {t('admin.settings.invite')}
            </button>
          )}
        </div>
      }
    >
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
      {tempPassword ? (
        <div className="space-y-2 text-sm">
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{t('admin.settings.tempPasswordHint')}</p>
          <p className="rounded-xl bg-ink-100 px-3 py-2 font-mono text-xs" dir="ltr">
            {tempPassword}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="rounded-xl bg-ink-50 px-3 py-2 text-[0.7rem] text-ink-500">{t('admin.settings.inviteHint')}</p>
          <Field label={t('admin.settings.name')} htmlFor="invite-name" required>
            <input id="invite-name" className="field" value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} />
          </Field>
          <Field label={t('common.email')} htmlFor="invite-email" required>
            <input id="invite-email" type="email" className="field" dir="ltr" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
          </Field>
          <Field label={t('common.phone')} htmlFor="invite-phone">
            <input id="invite-phone" className="field" dir="ltr" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
          </Field>
          <Field label={t('admin.settings.role')} htmlFor="invite-role">
            <select id="invite-role" className="field" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as Profile['role'] })}>
              {ADMIN_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </Modal>
  );
}
