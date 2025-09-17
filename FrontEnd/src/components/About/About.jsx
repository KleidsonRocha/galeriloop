import React from "react";
import "./About.css";
import Header from "../templates/Header";
import Footer from "../templates/Footer";

const About = () => {
  return (
    <div className="about">
      <Header />
      <main className="about-content">
        <section className="about-columns">
          <div className="about-info">
            <img
              className="about-logo"
              alt="Logo GaleriLoop"
              src="../../../public/assets/logo.svg"
            />
            <h1 className="about-title">GALERILOOP</h1>
            <p className="about-description">
              O GaleriLoop oferece uma solução inovadora para o gerenciamento
              eficiente e seguro de fotografias. Com upload simplificado,
              armazenamento seguro, marca d'água e compartilhamento controlado,
              garantimos praticidade e proteção para suas imagens.
            </p>
          </div>
          <div className="about-screens">
            <img
              className="screen-svg"
              alt="Desktop Screen" 
              src="../../../public/assets/images/Desktop.png" 
            />
            <img
              className="screen-svg"
              alt="Mobile Screen"
              src="../../../public/assets/images/Mobile.png"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;