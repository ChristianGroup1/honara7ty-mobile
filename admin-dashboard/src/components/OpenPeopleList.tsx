import Link from 'next/link';
import {
  activitySummary,
  AppOpenPerson,
  formatOpenedAt,
  personPlatforms,
  platformNames,
} from '@/lib/appPulse';

function PeopleGroup({
  title,
  people,
}: {
  title: string;
  people: AppOpenPerson[];
}) {
  if (people.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
        {title}: مفيش حد
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {people.map((person) => (
          <Link
            key={person.user_id}
            href={`/users/${person.user_id}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <span>
              <strong>{person.full_name || person.email}</strong>
              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13 }}>
                {platformNames(person)} · {person.email}
              </span>
              <span style={{ display: 'block', marginTop: 4, fontSize: 13 }}>
                {activitySummary(person)}
              </span>
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'left' }}>
              {formatOpenedAt(person.last_opened_at)}
              <span style={{ display: 'block' }}>{person.opens_30_days} فتحة</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function OpenPeopleList({ people }: { people: AppOpenPerson[] }) {
  const ios = people.filter((person) => personPlatforms(person).includes('ios'));
  const android = people.filter(
    (person) =>
      personPlatforms(person).includes('android') && !personPlatforms(person).includes('ios'),
  );
  const other = people.filter(
    (person) => !personPlatforms(person).some((platform) => platform === 'ios' || platform === 'android'),
  );

  return (
    <div>
      <PeopleGroup title={`آيفون (${ios.length})`} people={ios} />
      <PeopleGroup title={`أندرويد (${android.length})`} people={android} />
      {other.length > 0 ? <PeopleGroup title={`أجهزة أخرى (${other.length})`} people={other} /> : null}
    </div>
  );
}
