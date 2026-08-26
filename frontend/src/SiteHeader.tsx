import { navigate, useRoute } from "./lib/router";
import "./SiteHeader.css";

export default function SiteHeader() {
  const { pathname } = useRoute();

  return (
    <header className="site-header">
      <a
        href="#/"
        className="site-header-brand"
        onClick={(e) => {
          e.preventDefault();
          navigate("/");
        }}
      >
        Vidz
      </a>
      <nav className="site-header-nav">
        <a
          href="#/"
          className={pathname === "/" ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          Library
        </a>
        <a
          href="#/rules"
          className={pathname === "/rules" ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            navigate("/rules");
          }}
        >
          Rule Sets
        </a>
        <button className="btn btn-primary" onClick={() => navigate("/new")}>
          + New Clip
        </button>
      </nav>
    </header>
  );
}
