import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="lede">The page you are looking for does not exist or has moved.</p>
        <Link className="link" to="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
