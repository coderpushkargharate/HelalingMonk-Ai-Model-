import ClientApp from './ClientApp';

// Optional catch-all: every non-/api path is served by this single page, which
// mounts the client-side SPA (react-router + MediaPipe). A hard refresh on any
// deep route (e.g. /admin, /assessment/report/xyz) therefore still boots the
// app, and react-router reads the URL to render the right screen.
export default function Page() {
  return <ClientApp />;
}
