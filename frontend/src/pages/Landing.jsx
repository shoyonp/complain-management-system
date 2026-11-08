import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios.js';
import { errorMessage } from '../utils/errorMessage.js';

const fetchHealth = async () => {
  const response = await api.get('/health');
  return response.data.data;
};

const STATUS_LABEL = {
  checking: 'Checking…',
  ok: 'Connected',
  unreachable: 'Unreachable',
};

export default function Landing() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  const status = isPending ? 'checking' : isError ? 'unreachable' : 'ok';

  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">Dhaka International University</p>
        <h1>Complaint Management System</h1>
        <p className="lede">
          Report campus problems while your identity stays protected. Student, department and admin
          dashboards arrive in the next milestone.
        </p>

        <dl className="status-list" aria-live="polite">
          <div>
            <dt>API</dt>
            <dd>
              <span className={`status status--${status}`}>
                <span className="status-dot" aria-hidden="true" />
                {STATUS_LABEL[status]}
              </span>
            </dd>
          </div>
          {data ? (
            <div>
              <dt>Environment</dt>
              <dd>{data.environment}</dd>
            </div>
          ) : null}
          {data ? (
            <div>
              <dt>Version</dt>
              <dd>{data.version}</dd>
            </div>
          ) : null}
        </dl>

        {isError ? (
          <p className="error-note" role="alert">
            Could not reach the API at <code>{api.defaults.baseURL}</code>. {errorMessage(error)}
          </p>
        ) : null}

        <p className="hint">
          Foundation milestone (M0) — API health endpoint: <code>/health</code>
        </p>
      </section>
    </main>
  );
}
