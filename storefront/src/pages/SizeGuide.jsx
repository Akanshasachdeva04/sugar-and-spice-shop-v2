import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import "./Info.css";

const ROWS = [
  ["S", "32", "30 – 32", "26 – 28"],
  ["M", "34", "32 – 34", "28 – 30"],
  ["L", "36", "34 – 36", "30 – 32"],
  ["XL", "38", "36 – 38", "32 – 34"],
  ["XXL", "40", "38 – 40", "34 – 36"],
  ["XXXL", "42", "40 – 42", "36 – 38"],
  ["XXXXL", "44", "42 – 44", "38 – 40"],
  ["XXXXXL", "46", "44 – 46", "40 – 42"],
  ["XXXXXXL", "48", "46 – 48", "42 – 44"],
  ["7XL", "50", "48 – 50", "44 – 46"],
];

export default function SizeGuide() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <div className="info-page">
      <Seo title="Size Guide" path="/size-guide" description="Find your perfect fit with the Sugar & Spice size chart: bust and underbust measurements for every size." />
      <div className="info-wrap">
        <p className="info-eyebrow">Find your perfect fit</p>
        <h1 className="info-title">Size Chart</h1>
        <p className="info-lead">Measure yourself once, pick the size that matches, and shop with confidence.</p>

        <section className="info-section">
          <button type="button" className="chart-btn" onClick={() => setOpen(true)} aria-label="Open the size chart in full size">
            <img src="/size-chart.jpg" alt="Sugar & Spice size chart with bust and underbust measurements" width="1536" height="1024" />
          </button>
          <p className="chart-hint">Tap the chart to enlarge it</p>
        </section>

        <section className="info-section">
          <h2>How to measure</h2>
          <div className="steps">
            <div className="info-card">
              <span className="step-num">1</span>
              <h3>Bust size</h3>
              <p>Measure around the fullest part of your bust, keeping the tape straight and relaxed.</p>
            </div>
            <div className="info-card">
              <span className="step-num">2</span>
              <h3>Underbust size</h3>
              <p>Measure around your ribcage, just below your bust, keeping the tape snug.</p>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>Size table (in inches)</h2>
          <div className="size-table-wrap">
            <table className="size-table">
              <thead>
                <tr><th>Our size</th><th>Label size</th><th>Bust (inches)</th><th>Underbust (inches)</th></tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="info-section">
          <p className="pro-tip"><strong>Pro tip:</strong> If you are between two sizes, we recommend choosing the larger size for a more comfortable fit.</p>
        </section>

        <div className="info-cta">
          <p>Not sure about your size? We are happy to help.</p>
          <div className="info-links">
            <Link to="/contact" className="btn btn-pill">Contact us</Link>
            <Link to="/shop" className="btn btn-outline">Continue shopping</Link>
          </div>
        </div>
      </div>

      {open && (
        <div className="lightbox" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Size chart">
          <button type="button" className="lightbox-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          <img src="/size-chart.jpg" alt="Sugar & Spice size chart" onClick={(e) => e.stopPropagation()} />
          <a className="lightbox-open" href="/size-chart.jpg" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            Open full size in a new tab
          </a>
        </div>
      )}
    </div>
  );
}
