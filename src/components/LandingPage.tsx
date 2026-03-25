import { useEffect } from 'react';
import { LandingHeader } from './LandingHeader';
import { RoomPreview } from './RoomPreview';

interface Props {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: Props) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-section--visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.landing-section').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">
      <LandingHeader onEnterApp={onEnterApp} />

      {/* ── Hero ── */}
      <section id="hero" className="landing-hero">
        <div className="landing-hero-content">
          <p className="landing-hero-tagline">
            Dessinez. Meublez.<br />
            L'algorithme arrange tout.
          </p>
          <RoomPreview />
          <button onClick={onEnterApp} className="landing-hero-cta">
            Commencer un projet
          </button>
        </div>
        <button className="landing-hero-down" onClick={() => {
          const el = document.getElementById('introduction');
          if (el) {
            const rect = el.getBoundingClientRect();
            window.scrollTo({ top: window.scrollY + rect.top - (window.innerHeight / 2 - rect.height / 2), behavior: 'smooth' });
          }
          window.dispatchEvent(new CustomEvent('show-toc'));
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </section>

      {/* ── Introduction ── */}
      <section id="introduction" className="landing-section landing-section--card">
        <div className="landing-section-inner">
          <span className="landing-section-tag">Introduction</span>
          <h2 className="landing-section-title">Votre piece, vos regles</h2>
          <p className="landing-section-text">
            Dessinez n'importe quelle forme. Placez portes, fenetres, equipements.
            Choisissez vos meubles. L'algo genere un plan. Cliquez « Rearranger »
            pour un autre.
          </p>
        </div>
      </section>

      {/* ── Fonctionnement ── */}
      <section id="fonctionnement" className="landing-section landing-section--card">
        <div className="landing-section-inner">
          <span className="landing-section-tag">Fonctionnement</span>
          <h2 className="landing-section-title">Trois etapes</h2>
          <div className="landing-cards">
            <div className="landing-card">
              <span className="landing-card-num">01</span>
              <h3 className="landing-card-title">Dessinez</h3>
              <p className="landing-card-text">
                Murs a main levee ou forme parametrique. Cloisons interieures. Surface en temps reel.
              </p>
            </div>
            <div className="landing-card">
              <span className="landing-card-num">02</span>
              <h3 className="landing-card-title">Equipez</h3>
              <p className="landing-card-text">
                Portes, fenetres, cuisine, salle de bain. Selectionnez les meubles, ajustez les quantites.
              </p>
            </div>
            <div className="landing-card">
              <span className="landing-card-num">03</span>
              <h3 className="landing-card-title">Generez</h3>
              <p className="landing-card-text">
                L'algo place tout. Choisissez un style. Rearrangez. Exportez en PNG.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Technologie ── */}
      <section id="technologie" className="landing-section landing-section--card">
        <div className="landing-section-inner">
          <span className="landing-section-tag">Technologie</span>
          <h2 className="landing-section-title">Pas du random</h2>
          <p className="landing-section-text">
            Tete de lit contre le mur. Canape pas dos a la porte. 60 cm de passage minimum.
            Meubles de cuisine loin du lit. 3 styles : Optimal, Cosy, Minimaliste.
          </p>
        </div>
      </section>

      {/* ── Resultats ── */}
      <section id="resultats" className="landing-section landing-section--card">
        <div className="landing-section-inner">
          <span className="landing-section-tag">Resultats</span>
          <h2 className="landing-section-title">Ce que vous obtenez</h2>
          <div className="landing-cards">
            <div className="landing-card">
              <h3 className="landing-card-title">Sauvegarde auto</h3>
              <p className="landing-card-text">
                Fermez, revenez. Tout est la.
              </p>
            </div>
            <div className="landing-card">
              <h3 className="landing-card-title">70 meubles</h3>
              <p className="landing-card-text">
                Salon, chambre, cuisine, sdb, bureau.
              </p>
            </div>
            <div className="landing-card">
              <h3 className="landing-card-title">100% navigateur</h3>
              <p className="landing-card-text">
                Pas de compte. Pas d'install. Vos donnees restent chez vous.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <h2 className="landing-footer-title">Pret a rearranger ?</h2>
          <button onClick={onEnterApp} className="landing-footer-cta">
            Lancer l'application
          </button>
          <p className="landing-footer-copy">
            &copy; 2025 Rearrangeur — Reagencement automatique de piece.
          </p>
        </div>
      </footer>
    </div>
  );
}
