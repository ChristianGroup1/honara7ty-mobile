import Link from 'next/link';
import {
  activitySummary,
  AppOpenPerson,
  formatOpenedAt,
  openedToday,
  platformNames,
} from '@/lib/appPulse';

export function OpenPeopleList({ people }: { people: AppOpenPerson[] }) {
  const sorted = [...people].sort((a, b) => {
    const todayDelta = Number(openedToday(b)) - Number(openedToday(a));
    if (todayDelta !== 0) return todayDelta;
    return b.last_opened_at.localeCompare(a.last_opened_at);
  });
  const todayCount = sorted.filter(openedToday).length;

  return (
    <div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>
        {todayCount} دخلوا النهاردة · القائمة فيها {sorted.length} شخص، من غير قص
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم</th>
              <th>الجهاز</th>
              <th>آخر فتح</th>
              <th>النشاط آخر ٣٠ يوم</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((person, index) => (
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
                <td>
                  {formatOpenedAt(person.last_opened_at)}
                  {openedToday(person) ? (
                    <span style={{ display: 'block', color: 'var(--success)', fontSize: 12 }}>النهاردة</span>
                  ) : null}
                </td>
                <td>{activitySummary(person)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
