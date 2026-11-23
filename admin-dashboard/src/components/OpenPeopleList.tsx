'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  activitySummary,
  newUserLabel,
  AppOpenDevice,
  AppOpenPerson,
  formatOpenedAt,
  platformLabel,
} from '@/lib/appPulse';

type OpenTab = 'month' | 'today';

interface OpenRow {
  key: string;
  person: AppOpenPerson;
  device: AppOpenDevice;
}

function deviceRows(people: AppOpenPerson[]): OpenRow[] {
  return people.flatMap((person) => {
    const devices = person.devices.length > 0 ? person.devices : fallbackDevices(person);
    return devices.map((device) => ({
      key: `${person.user_id}-${device.platform}`,
      person,
      device,
    }));
  });
}

function fallbackDevices(person: AppOpenPerson): AppOpenDevice[] {
  const platforms = person.platforms.length > 0 ? person.platforms : [person.platform];
  return platforms.map((platform) => ({
    platform,
    last_opened_at: person.last_opened_at,
    last_opened_on: person.last_opened_on,
    opens: person.opens_30_days,
  }));
}

function PeopleTable({ rows }: { rows: OpenRow[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
        لسه مفيش حد في التبويب ده.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>الحساب</th>
            <th>الجهاز</th>
            <th>آخر فتح</th>
            <th>اللي عمله</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key}>
              <td>{index + 1}</td>
              <td>
                <Link href={`/users/${row.person.user_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <strong>{row.person.full_name || row.person.email}</strong>
                  <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {row.person.email}
                  </span>
                </Link>
              </td>
              <td style={{ color: row.person.is_new ? 'var(--success)' : 'var(--text-secondary)', fontWeight: row.person.is_new ? 700 : 400 }}>
                {newUserLabel(row.person)}
              </td>
              <td>{platformLabel(row.device.platform)}</td>
              <td>{formatOpenedAt(row.device.last_opened_at)}</td>
              <td>{activitySummary(row.person)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OpenPeopleList({ people }: { people: AppOpenPerson[] }) {
  const [tab, setTab] = useState<OpenTab>('today');
  const month = deviceRows(people).sort((a, b) =>
    b.device.last_opened_at.localeCompare(a.device.last_opened_at),
  );
  const today = month.filter((row) => row.device.last_opened_on.slice(0, 10) === todayKey());
  const android = month.filter((row) => row.device.platform === 'android').length;
  const ios = month.filter((row) => row.device.platform === 'ios').length;
  const uniquePeople = new Set(month.map((row) => row.person.user_id));
  const newPeople = new Set(
    month.filter((row) => row.person.is_new).map((row) => row.person.user_id),
  );
  const newTodayPeople = new Set(
    today.filter((row) => row.person.is_new).map((row) => row.person.user_id),
  );
  const unique = uniquePeople.size;

  const tabs: { id: OpenTab; label: string; count: number; note: string }[] = [
    {
      id: 'month',
      label: 'مين فتح التطبيق',
      count: month.length,
      note: `${android} أندرويد + ${ios} آيفون = ${android + ios}. الأشخاص المختلفون ${unique}، منهم ${newPeople.size} حساب جديد خلال ٧ أيام.`,
    },
    {
      id: 'today',
      label: 'مين فتح التطبيق النهاردة',
      count: today.length,
      note: `اللي دخلوا النهاردة، منهم ${newTodayPeople.size} حساب جديد.`,
    },
  ];
  const active = tabs.find((item) => item.id === tab) ?? tabs[1];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 24,
          borderBottom: '1px solid var(--border-color)',
          marginBottom: 16,
          overflowX: 'auto',
        }}
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            style={{
              paddingBottom: 12,
              borderBottom: tab === item.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>{active.note}</div>
      <PeopleTable rows={tab === 'today' ? today : month} />
    </div>
  );
}

function todayKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
