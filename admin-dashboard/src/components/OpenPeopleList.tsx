'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  activitySummary,
  AppOpenPerson,
  formatOpenedAt,
  openedToday,
  platformNames,
} from '@/lib/appPulse';

type OpenTab = 'month' | 'today';

function PeopleTable({ people }: { people: AppOpenPerson[] }) {
  if (people.length === 0) {
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
            <th>الجهاز</th>
            <th>آخر فتح</th>
            <th>اللي عمله</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person, index) => (
            <tr key={person.user_id}>
              <td>{index + 1}</td>
              <td>
                <Link href={`/users/${person.user_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <strong>{person.full_name || person.email}</strong>
                  <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {person.email}
                  </span>
                </Link>
              </td>
              <td>{platformNames(person)}</td>
              <td>{formatOpenedAt(person.last_opened_at)}</td>
              <td>{activitySummary(person)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OpenPeopleList({ people }: { people: AppOpenPerson[] }) {
  const [tab, setTab] = useState<OpenTab>('today');
  const today = people
    .filter(openedToday)
    .sort((a, b) => b.last_opened_at.localeCompare(a.last_opened_at));
  const month = [...people].sort((a, b) => b.last_opened_at.localeCompare(a.last_opened_at));

  const tabs: { id: OpenTab; label: string; count: number; note: string }[] = [
    {
      id: 'month',
      label: 'مين فتح التطبيق',
      count: month.length,
      note: 'آخر ٣٠ يوم: آيفون أو أندرويد، واللي عمله بعد الدخول',
    },
    {
      id: 'today',
      label: 'مين فتح التطبيق النهاردة',
      count: today.length,
      note: 'اللي دخلوا النهاردة بس، آيفون أو أندرويد',
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
      <PeopleTable people={tab === 'today' ? today : month} />
    </div>
  );
}
