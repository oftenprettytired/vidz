import { useEffect, useState } from "react";

// Hash-based routing: GitHub Pages (and any static host) can't rewrite
// arbitrary deep-link paths back to index.html, so real URLs like /clip?id=
// would 404 on refresh or a direct link. Everything after "#" is served by
// the static host as a plain fragment, so it always resolves.

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [pathname, query = ""] = raw.split("?");
  return { pathname: pathname || "/", searchParams: new URLSearchParams(query) };
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}
