import { useEffect } from 'react';
import { LandingHeader } from './LandingHeader';
import { RoomPreview } from './RoomPreview';

interface Props {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: Props) {
  // Reveal sections on scroll
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
            Dessinez votre piece. Placez vos meubles.<br />
            L'algorithme s'occupe du reste.
          </p>
          <RoomPreview />
          <button onClick={onEnterApp} className="landing-hero-cta">
            Essayer gratuitement
          </button>
        </div>
        <div className="landing-hero-scroll">
          <div className="landing-hero-scroll-line" />
        </div>
      </section>

      {/* ── Introduction ── */}
      <section id="introduction" className="landing-section landing-section--light">
        <div className="landing-section-inner">
          <span className="landing-section-tag">Introduction</span>
          <h2 className="landing-section-title">Un outil simple et puissant</h2>
          <p className="landing-section-text">
            Rearrangeur est une application web de reagencement automatique de piece.
            Dessinez les murs de votre piece, placez vos portes, fenetres et elements
            fixes, selectionnez vos meubles dans le catalogue, et laissez l'algorithme
            generer un plan optimise. Un clic sur « Rearranger » pour explorer une
            nouvelle disposition.
          </p>
        </div>
      </section>

      {/* ── Fonctionnement ── */}
      <section id="fonctionnement" className="landing-section landing-section--dark">
        <div className="landing-section-inner">
          <span className="landing-section-tag">Fonctionnement</span>
          <h2 className="landing-section-title">Trois etapes</h2>
          <div className="landing-cards">
            <div className="landing-card">
              <span className="landing-card-num">01</span>
              <h3 className="landing-card-title">Dessinez</h3>
              <p className="landing-card-text">
                Tracez les murs de votre piece librement sur le canvas.
                Murs exterieurs, cloisons interieures — tout est possible.
              </p>
            </div>
            <div className="landing-card">
              <span className="landing-card-num">02</span>
              <h3 className="landing-card-title">Amenagez</h3>
              <p className="landing-card-text">
                Placez portes et fenetres sur les murs, positionnez vos elements
                fixes, et cochez les meubles souhaites dans le catalogue.
              </p>
            </div>
            <div className="landing-card">
              <span className="landing-card-num">03</span>
              <h3 className="landing-card-title">Generez</h3>
              <p className="landing-card-text">
                L'algorithme place automatiquement vos meubles en respectant
                les contraintes. Rearrangez autant de fois que vous le souhaitez.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Technologie ── */}
      <section id="technologie" className="landing-section landing-section--light">
        <div className="landing-section-inner">
          <span className="landing-section-tag">Technologie</span>
          <h2 className="landing-section-title">Placement intelligent</h2>
          <p className="landing-section-text">
            Notre algorithme de placement combine positionnement mural et aleatoire
            controle. Chaque meuble est valide : il doit etre a l'interieur du
            polygone de la piece, ne traverser aucun mur, et ne chevaucher aucun
            autre element. Un fallback par grille systematique garantit un resultat
            meme dans les configurations complexes.
          </p>
        </div>
      </section>

      {/* ── Resultats ── */}
      <section id="resultats" className="landing-section landing-section--dark">
        <div className="landing-section-inner">
          <span className="landing-section-tag">Resultats</span>
          <h2 className="landing-section-title">Exportez votre plan</h2>
          <p className="landing-section-text">
            Visualisez votre agencement en temps reel sur le canvas 2D.
            Exportez votre plan en PNG haute resolution d'un clic.
            Partagez-le, imprimez-le, ou utilisez-le comme base pour votre projet.
          </p>
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
            &copy; 2026 Rearrangeur. Tous droits reserves.
          </p>
        </div>
      </footer>
    </div>
  );
}
