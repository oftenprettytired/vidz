import type { ReactNode } from "react";
import SiteHeader from "./SiteHeader";
import Library from "./Library";
import NewClip from "./NewClip";
import ClipWorkspace from "./ClipWorkspace";
import RuleSets from "./RuleSets";
import { useRoute } from "./lib/router";
import "./App.css";

export default function App() {
  const { pathname, searchParams } = useRoute();

  let page: ReactNode;
  if (pathname === "/new") {
    page = <NewClip />;
  } else if (pathname === "/clip") {
    const id = searchParams.get("id");
    page = id ? <ClipWorkspace clipId={id} /> : <Library />;
  } else if (pathname === "/rules") {
    page = <RuleSets />;
  } else {
    page = <Library />;
  }

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="app-main">{page}</main>
    </div>
  );
}
