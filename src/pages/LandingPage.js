import React, { useState, useEffect, useRef } from 'react';
import {
  Truck, Phone, Mail, MapPin, Clock, Shield, Users, Building2, FileCheck, Award,
  Target, Eye, CheckCircle, Star, Quote, MessageCircle, Send, Menu, X
} from "lucide-react";
import heroImage from "../assets/truck-hero.jpg";
import truckRoadImage from "../assets/truck-road.jpg";
import truckFleetImage from "../assets/truck-fleet.jpg";
import truckLoadingImage from "../assets/truck-loading.jpg";
import { useNavigate } from 'react-router-dom';
// clientes
import chefritoImg from "../assets/images/clients/chefrito-IMG.png";
import elReyImg from "../assets/images/clients/el-rey-IMG.png";
import empresaAcerroImg from "../assets/images/clients/empresa-de-acero-IMG.jpg";
import harineraDelValleImg from "../assets/images/clients/harinera-del-valle-IMG.png";
import nutrisurImg from "../assets/images/clients/nutrisur-IMG.jpg";
import servialleImg from "../assets/images/clients/servivalle-IMG.jpg";
import surtisurImg from "../assets/images/clients/surtisur-IMG.jpg";
import corbetaImg from "../assets/images/clients/corbeta-IMG.jpg";
import dulcesydulces from "../assets/images/clients/dulces-y-dulces-IMG.png";
import alpina from "../assets/alpina-IMG.png";

import styles from './LandingPage.module.css';

// Hook personalizado para detectar cuando un elemento está visible
const useIntersectionObserver = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        // Opcionalmente, dejar de observar después de que sea visible
        if (options.once) {
          observer.unobserve(entry.target);
        }
      } else if (!options.once) {
        setIsVisible(false);
      }
    }, {
      threshold: options.threshold || 0.1,
      rootMargin: options.rootMargin || '0px'
    });

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [options.once, options.threshold, options.rootMargin]);

  return [elementRef, isVisible];
};

// Componente wrapper para animaciones
const AnimatedSection = ({ children, animation = 'fadeInUp', delay = 0, className = '' }) => {
  const [ref, isVisible] = useIntersectionObserver({ once: true, threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`${styles.animateOnScroll} ${isVisible ? `${styles.animated} ${styles[animation]}` : ''} ${delay > 0 ? styles[`delay-${delay}`] : ''} ${className}`}
    >
      {children}
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const services = [
    {
      icon: Truck,
      title: "Transporte Terrestre",
      description: "Servicio de transporte de carga terrestre con cobertura nacional, atención a todos los sectores de la economía.",
      features: ["Entregas en tiempos acordados", "Tarifas competitivas", "Soporte 24/7", "Vehículos modernos"]
    },
    {
      icon: Building2,
      title: "Servicio Empresarial",
      description: "Servicio especializado para empresas en todos los sectores de la economía, con atención a nivel nacional.",
      features: ["Acompañamiento logístico", "Documentación al día", "Cumplimiento normativo", "Calidad en el servicio"]
    }
  ];

  const advantages = [
    {
      icon: Clock,
      title: "Eficiencia",
      description: "Entregas en el menor tiempo posible con procesos ágiles para una rápida trazabilidad."
    },
    {
      icon: Shield,
      title: "Seguridad",
      description: "Cuidamos la mercancía con el más alto grado de seguridad y respaldo en cada recorrido."
    },
    {
      icon: Users,
      title: "Atención personalizada",
      description: "Contamos con atención exclusiva para resolver cualquier inquietud o imprevisto en el transporte."
    },
    {
      icon: Award,
      title: "Precios competitivos",
      description: "La mejor relación calidad-precio del mercado, generando seguridad en el servicio brindado."
    }
  ];

  const departments = [
    { name: "Risaralda", capital: "Pereira" },
    { name: "Chocó", capital: "Quibdó" },
    { name: "Caldas", capital: "Manizales" },
    { name: "Quindío", capital: "Armenia" },
    { name: "Nariño", capital: "Pasto" },
    { name: "Putumayo", capital: "Mocoa" },
    { name: "Huila", capital: "Neiva" },
    { name: "Valle del Cauca", capital: "Cali" },
    { name: "Cauca", capital: "Popayán" }
  ];

  const testimonials = [
    {
      company: "Harina del Valle",
      text: "Cooespatrans ha sido nuestro aliado estratégico por más de 5 años. Su puntualidad y cuidado con nuestros productos es excepcional.",
      rating: 5
    },
    {
      company: "G&J Empresa de Acero",
      text: "La seguridad en el transporte de nuestros materiales pesados es fundamental. Cooespatrans nos brinda esa tranquilidad.",
      rating: 5
    },
    {
      company: "Nutrisur",
      text: "Excelente servicio de distribución. Sus conductores son profesionales y siempre cumplen con los tiempos acordados.",
      rating: 5
    }
  ];

  const contactInfo = [
    {
      icon: MapPin,
      title: "Dirección",
      content: "Carrera 27 Calle 4, Barrio Tamasagra de Briceño",
      subtitle: "Pasto, Nariño"
    },
    {
      icon: Phone,
      title: "Teléfonos",
      content: "Fijo: 731 2917",
      subtitle: "Cel: 310 607 2637 • 321 685 6970"
    },
    {
      icon: Mail,
      title: "Correo electrónico",
      content: "cooespatrans@hotmail.com",
      subtitle: "Respuesta en menos de 24 horas"
    },
    {
      icon: Clock,
      title: "Horario de atención",
      content: "Lunes a viernes: 8:00 AM–12:00 PM y 2:00 PM–6:00 PM",
      subtitle: "Sábados: 8:00 AM–12:00 PM"
    }
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          {/* Main navigation */}
          <nav className={styles.nav}>
            <div className={styles.logo}>
              <div>
                <h1 className={styles.logoTitle}>COOESPATRANS</h1>
                <p className={styles.logoSubtitle}>Cooperativa de Transporte España</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className={styles.navMenu}>
              <a href="#inicio" className={styles.navLink}>Inicio</a>
              <a href="#servicios" className={styles.navLink}>Servicios</a>
              <a href="#cobertura" className={styles.navLink}>Cobertura</a>
              <a href="#clientes" className={styles.navLink}>Clientes</a>
              <a href="#contacto" className={styles.navLink}>Contacto</a>

              <button
                onClick={() => {
                  navigate("/login");
                }}
                className={styles.navButton}>
                Iniciar sesión
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className={styles.mobileMenuButton}
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className={styles.mobileMenuIcon} />
              ) : (
                <Menu className={styles.mobileMenuIcon} />
              )}
            </button>
          </nav>

          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <div className={styles.mobileMenuOverlay} onClick={closeMobileMenu} />
          )}

          {/* Mobile Menu */}
          <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
            <div className={styles.mobileMenuContent}>
              <a 
                href="#inicio" 
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Inicio
              </a>
              <a 
                href="#servicios" 
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Servicios
              </a>
              <a 
                href="#cobertura" 
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Cobertura
              </a>
              <a 
                href="#clientes" 
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Clientes
              </a>
              <a 
                href="#contacto" 
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Contacto
              </a>

              <button
                onClick={() => {
                  navigate("/login");
                  closeMobileMenu();
                }}
                className={styles.mobileNavButton}
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className={styles.hero}>
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContainer}>
          <div className={styles.heroGrid}>
            {/* Content */}
            <div className={styles.heroContent}>
              <div className={styles.heroTextGroup}>
                <AnimatedSection animation="fadeInDown">
                  <div className={styles.heroBadge}>
                    +20 años de experiencia
                  </div>
                </AnimatedSection>
                
                <AnimatedSection animation="fadeInUp" delay={100}>
                  <h1 className={styles.heroTitle}>
                    Transporte de carga
                    <span className={styles.heroTitleAccent}>seguro y confiable</span>
                  </h1>
                </AnimatedSection>
                
                <AnimatedSection animation="fadeInUp" delay={200}>
                  <p className={styles.heroDescription}>
                    Más de 20 años de experiencia en transporte de carga por carretera.
                    Servicio puerta a puerta con camiones modernos y personal altamente calificado.
                  </p>
                </AnimatedSection>
              </div>

              {/* Stats */}
              <div className={styles.heroStats}>
                {[
                  { icon: Truck, number: "9", label: "Departamentos" },
                  { icon: Clock, number: "24/7", label: "Asistencia" },
                  { icon: Shield, number: "20+", label: "Años experiencia" }
                ].map((stat, index) => (
                  <AnimatedSection key={index} animation="scaleIn" delay={(index + 3) * 100}>
                    <div className={styles.statItem}>
                      <div className={styles.statIcon}>
                        <stat.icon className={styles.statIconSvg} />
                      </div>
                      <div className={styles.statNumber}>{stat.number}</div>
                      <div className={styles.statLabel}>{stat.label}</div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>

              {/* CTA */}
              <AnimatedSection animation="fadeInUp" delay={600}>
                <div className={styles.heroCta}>
                  <button className={styles.ctaPrimary}>
                    Conoce nuestros servicios
                  </button>
                </div>
              </AnimatedSection>
            </div>

            {/* Image */}
            <AnimatedSection animation="fadeInRight" delay={300}>
              <div className={styles.heroImageContainer}>
                <div className={styles.heroImage}>
                  <img
                    src={heroImage}
                    alt="Camión de transporte Cooespatrans"
                    className={styles.heroImg}
                  />
                  <div className={styles.heroImageOverlay}></div>
                </div>

                {/* Floating card */}
                <div className={styles.floatingCard}>
                  <div className={styles.floatingCardContent}>
                    <div className={styles.floatingCardIcon}>
                      <Users className={styles.floatingCardIconSvg} />
                    </div>
                    <div>
                      <div className={styles.floatingCardTitle}>Personal calificado</div>
                      <div className={styles.floatingCardSubtitle}>Conductores con experiencia comprobada</div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className={styles.services}>
        <div className={styles.sectionContainer}>
          {/* Header */}
          <div className={styles.sectionHeader}>
            <AnimatedSection animation="fadeIn">
              <div className={styles.servicesBadge}>
                Servicios Especializados
              </div>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={100}>
              <h2 className={styles.sectionTitle}>
                Cobertura nacional con
                <span className={styles.sectionTitleAccent}>excelencia operativa</span>
              </h2>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={200}>
              <p className={styles.sectionDescription}>
                Ofrecemos servicios de transporte de carga con los más altos estándares de calidad,
                seguridad y eficiencia en todo el territorio nacional.
              </p>
            </AnimatedSection>
          </div>

          {/* Main Services */}
          <div className={styles.servicesGrid}>
            {services.map((service, index) => (
              <AnimatedSection key={index} animation="fadeInUp" delay={index * 100}>
                <div className={styles.serviceCard}>
                  <div className={styles.serviceCardHeader}>
                    <div className={styles.serviceCardHeaderContent}>
                      <div className={styles.serviceIcon}>
                        <service.icon className={styles.serviceIconSvg} />
                      </div>
                      <div>
                        <h3 className={styles.serviceTitle}>{service.title}</h3>
                      </div>
                    </div>
                  </div>
                  <div className={styles.serviceCardContent}>
                    <p className={styles.serviceDescription}>
                      {service.description}
                    </p>
                    <div className={styles.serviceFeatures}>
                      {service.features.map((feature, idx) => (
                        <div key={idx} className={styles.serviceFeature}>
                          <div className={styles.serviceFeatureDot}></div>
                          <span className={styles.serviceFeatureText}>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Image Section */}
          <AnimatedSection animation="scaleIn">
            <div className={styles.serviceImageSection}>
              <img
                src={truckRoadImage}
                alt="Camión en carretera colombiana"
                className={styles.serviceImage}
              />
              <div className={styles.serviceImageOverlay}></div>
              <div className={styles.serviceImageContent}>
                <div className={styles.serviceImageContainer}>
                  <div className={styles.serviceImageText}>
                    <h3 className={styles.serviceImageTitle}>
                      Conectamos Colombia con seguridad y confianza
                    </h3>
                    <p className={styles.serviceImageDescription}>
                      Nuestros vehículos modernos y personal calificado garantizan
                      la entrega segura de tu carga en todo el territorio nacional.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Why Choose Us */}
          <div className={styles.advantagesHeader}>
            <AnimatedSection animation="fadeInUp">
              <h3 className={styles.advantagesTitle}>
                ¿Por qué elegirnos?
              </h3>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={100}>
              <p className={styles.advantagesDescription}>
                Nos diferenciamos por nuestro compromiso con la excelencia,
                la seguridad y la satisfacción total de nuestros clientes.
              </p>
            </AnimatedSection>
          </div>

          <div className={styles.advantagesGrid}>
            {advantages.map((advantage, index) => (
              <AnimatedSection key={index} animation="fadeInUp" delay={index * 100}>
                <div className={styles.advantageCard}>
                  <div className={styles.advantageCardContent}>
                    <div className={styles.advantageIcon}>
                      <advantage.icon className={styles.advantageIconSvg} />
                    </div>
                    <h4 className={styles.advantageTitle}>{advantage.title}</h4>
                    <p className={styles.advantageDescription}>{advantage.description}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Professional Staff Section */}
          <AnimatedSection animation="scaleIn">
            <div className={styles.staffSection}>
              <div className={styles.staffCard}>
                <div className={styles.staffCardContent}>
                  <div className={styles.staffGrid}>
                    <div>
                      <div className={styles.staffHeader}>
                        <div className={styles.staffIcon}>
                          <Users className={styles.staffIconSvg} />
                        </div>
                        <h3 className={styles.staffTitle}>Personal Calificado</h3>
                      </div>
                      <p className={styles.staffDescription}>
                        Nuestros conductores y monitores son personas competentes, idóneas, serias y responsables
                        en el manejo de la mercancía. Seleccionamos a quienes según experiencia, antecedentes y
                        perfil profesional cumplen con los más altos estándares.
                      </p>
                    </div>
                    <div className={styles.staffFeatures}>
                      {[
                        "Experiencia comprobada de conducción",
                        "Verificación documental completa",
                        "Exámenes médicos actualizados",
                        "Documentación legal requerida"
                      ].map((item, idx) => (
                        <div key={idx} className={styles.staffFeature}>
                          <div className={styles.staffFeatureIcon}>
                            <FileCheck className={styles.staffFeatureIconSvg} />
                          </div>
                          <span className={styles.staffFeatureText}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Coverage Section */}
      <section id="cobertura" className={styles.coverage}>
        <div className={styles.sectionContainer}>
          {/* Header */}
          <div className={styles.sectionHeader}>
            <AnimatedSection animation="fadeIn">
              <div className={styles.coverageBadge}>
                Cobertura Nacional
              </div>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={100}>
              <h2 className={styles.sectionTitle}>
                Prestamos servicio de transporte
                <span className={styles.sectionTitleAccent}>directo a múltiples departamentos</span>
              </h2>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={200}>
              <p className={styles.sectionDescription}>
                Con la mejor calidad y los más altos estándares de seguridad,
                llegamos a los principales departamentos de Colombia.
              </p>
            </AnimatedSection>
          </div>

          <div className={styles.coverageGrid}>
            {/* Map/Image Section */}
            <AnimatedSection animation="fadeInLeft">
              <div className={styles.coverageImageContainer}>
                <div className={styles.coverageImage}>
                  <img
                    src={truckFleetImage}
                    alt="Flota de camiones Cooespatrans"
                    className={styles.coverageImg}
                  />
                  <div className={styles.coverageImageOverlay}></div>

                  {/* Stats overlay */}
                  <div className={styles.coverageStats}>
                    <div className={styles.coverageStatsContent}>
                      <div className={styles.coverageStatsGrid}>
                        <div className={styles.coverageStatItem}>
                          <div className={styles.coverageStatNumber}>9</div>
                          <div className={styles.coverageStatLabel}>Departamentos</div>
                        </div>
                        <div className={styles.coverageStatItem}>
                          <div className={styles.coverageStatNumber}>100+</div>
                          <div className={styles.coverageStatLabel}>Ciudades</div>
                        </div>
                        <div className={styles.coverageStatItem}>
                          <div className={styles.coverageStatNumber}>24/7</div>
                          <div className={styles.coverageStatLabel}>Disponibilidad</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Departments List */}
            <div className={styles.coverageContent}>
              <AnimatedSection animation="fadeInRight">
                <div className={styles.coverageInfo}>
                  <h3 className={styles.coverageTitle}>
                    Departamentos que cubrimos
                  </h3>
                  <p className={styles.coverageText}>
                    Prestamos servicios de transporte directo a los siguientes departamentos
                    con conexiones a más de 100 ciudades en todo Colombia.
                  </p>
                </div>
              </AnimatedSection>

              <div className={styles.departmentsList}>
                {departments.map((dept, index) => (
                  <AnimatedSection key={index} animation="fadeInRight" delay={index * 50}>
                    <div className={styles.departmentItem}>
                      <div className={styles.departmentIcon}>
                        <MapPin className={styles.departmentIconSvg} />
                      </div>
                      <div className={styles.departmentInfo}>
                        <div className={styles.departmentName}>{dept.name}</div>
                        <div className={styles.departmentCapital}>Capital: {dept.capital}</div>
                      </div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>

              {/* Coverage Features */}
              <div className={styles.coverageFeatures}>
                {[
                  { 
                    icon: Target, 
                    title: "Entregas directas", 
                    desc: "Servicio puerta a puerta sin intermediarios" 
                  },
                  { 
                    icon: Eye, 
                    title: "Seguimiento en tiempo real", 
                    desc: "Trazabilidad completa de tu carga" 
                  }
                ].map((feature, index) => (
                  <AnimatedSection key={index} animation="fadeInUp" delay={index * 100}>
                    <div className={styles.coverageFeature}>
                      <div className={styles.coverageFeatureIcon}>
                        <feature.icon className={styles.coverageFeatureIconSvg} />
                      </div>
                      <div className={styles.coverageFeatureText}>
                        <div className={styles.coverageFeatureTitle}>{feature.title}</div>
                        <div className={styles.coverageFeatureDesc}>{feature.desc}</div>
                      </div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="nosotros" className={styles.about}>
        <div className={styles.sectionContainer}>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutContent}>
              <div className={styles.aboutHeader}>
                <AnimatedSection animation="fadeIn">
                  <div className={styles.aboutBadge}>
                    Nuestra Historia
                  </div>
                </AnimatedSection>
                
                <AnimatedSection animation="fadeInUp" delay={100}>
                  <h2 className={styles.sectionTitle}>
                    Más de 20 años
                    <span className={styles.sectionTitleAccent}>conectando Colombia</span>
                  </h2>
                </AnimatedSection>
              </div>

              <AnimatedSection animation="fadeInUp" delay={200}>
                <div className={styles.aboutText}>
                  <p className={styles.aboutParagraph}>
                    Cooespatrans nació en 2003 como una cooperativa comprometida con el desarrollo
                    del transporte de carga en Colombia. Durante más de dos décadas, hemos construido
                    una reputación sólida basada en la confianza, eficiencia y calidad en el servicio.
                  </p>
                  <p className={styles.aboutParagraph}>
                    Nuestra experiencia nos ha permitido desarrollar procesos optimizados y establecer
                    alianzas estratégicas que garantizan un servicio excepcional para nuestros clientes
                    en todos los sectores de la economía nacional.
                  </p>
                </div>
              </AnimatedSection>

              {/* Mission & Vision */}
              <AnimatedSection animation="fadeInUp" delay={300}>
                <div className={styles.missionVision}>
                  <div className={styles.missionVisionItem}>
                    <div className={styles.missionVisionIcon}>
                      <Target className={styles.missionVisionIconSvg} />
                    </div>
                    <div>
                      <h4 className={styles.missionVisionTitle}>Misión</h4>
                      <p className={styles.missionVisionText}>
                        Brindar servicios de transporte de mercancías por carretera con calidad,
                        seguridad y eficiencia, contribuyendo al desarrollo económico del país.
                      </p>
                    </div>
                  </div>
                  <div className={styles.missionVisionItem}>
                    <div className={styles.missionVisionIcon}>
                      <Eye className={styles.missionVisionIconSvg} />
                    </div>
                    <div>
                      <h4 className={styles.missionVisionTitle}>Visión</h4>
                      <p className={styles.missionVisionText}>
                        Ser la cooperativa de transporte líder en el suroccidente colombiano,
                        reconocida por su excelencia operativa y compromiso social.
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Values */}
              <AnimatedSection animation="fadeInUp" delay={400}>
                <div className={styles.values}>
                  <h4 className={styles.valuesTitle}>Nuestros Valores</h4>
                  <div className={styles.valuesList}>
                    {[
                      { icon: Shield, text: "Confiabilidad y seguridad" },
                      { icon: Users, text: "Compromiso con el cliente" },
                      { icon: Award, text: "Excelencia en el servicio" },
                      { icon: CheckCircle, text: "Responsabilidad social" }
                    ].map((value, index) => (
                      <div key={index} className={styles.valueItem}>
                        <value.icon className={styles.valueIcon} />
                        <span className={styles.valueText}>{value.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            </div>

            <AnimatedSection animation="fadeInRight" delay={200}>
              <div className={styles.aboutImageContainer}>
                <div className={styles.aboutImage}>
                  <img
                    src={truckLoadingImage}
                    alt="Equipo Cooespatrans cargando mercancía"
                    className={styles.aboutImg}
                  />
                  <div className={styles.aboutImageOverlay}></div>
                </div>

                {/* Achievement cards */}
                <div className={styles.achievementCards}>
                  <div className={styles.achievementCard}>
                    <div className={styles.achievementNumber}>20+</div>
                    <div className={styles.achievementText}>Años de experiencia</div>
                  </div>
                  <div className={styles.achievementCard}>
                    <div className={styles.achievementNumber}>500+</div>
                    <div className={styles.achievementText}>Clientes satisfechos</div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Clients Section */}
      <section id="clientes" className={styles.clients}>
        <div className={styles.sectionContainer}>
          {/* Header */}
          <div className={styles.sectionHeader}>
            <AnimatedSection animation="fadeIn">
              <div className={styles.clientsBadge}>
                Nuestros Clientes
              </div>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={100}>
              <h2 className={styles.sectionTitle}>
                Empresas que confían
                <span className={styles.sectionTitleAccent}>en nuestro servicio</span>
              </h2>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={200}>
              <p className={styles.sectionDescription}>
                Trabajamos con empresas líderes en diferentes sectores,
                brindando soluciones logísticas confiables y eficientes.
              </p>
            </AnimatedSection>
          </div>

          {/* Clients Grid */}
          <div className={styles.clientsGrid}>
            {[
              { name: "Distribuidora SurtiSur de Nariño", img: surtisurImg },
              { name: "Distribuidora Nutrisur de Nariño", img: nutrisurImg },
              { name: "Distribuidora Dulces y Dulces", img: dulcesydulces },
              { name: "Colombiana de Comercio S.A.", img: corbetaImg },
              { name: "Distribuidora Servivalle", img: servialleImg },
              { name: "Distribuidora surtiventas" },
              { name: "Condimentos El Rey", img: elReyImg },
              { name: "Harina del Valle", img: harineraDelValleImg },
              { name: "Ferreteria G&J", img: empresaAcerroImg },
              { name: "Chefrito", img: chefritoImg },
              { name: "Alpina", img: alpina }
            ].map((client, index) => (
              <AnimatedSection key={index} animation="scaleIn" delay={(index % 4) * 50}>
                <div className={styles.clientCard}>
                  {client.img ? (
                    <>
                      <div className={styles.clientImageWrapper}>
                        <img
                          src={client.img}
                          alt={`Logo ${client.name}`}
                          className={styles.clientImage}
                        />
                      </div>
                      <div className={styles.clientName}>{client.name}</div>
                    </>
                  ) : (
                    <div className={styles.clientTextOnly}>{client.name}</div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Testimonials */}
          <div className={styles.testimonialsSection}>
            <AnimatedSection animation="fadeInUp">
              <h3 className={styles.testimonialsTitle}>
                Lo que dicen nuestros clientes
              </h3>
            </AnimatedSection>
            
            <div className={styles.testimonialsGrid}>
              {testimonials.map((testimonial, index) => (
                <AnimatedSection key={index} animation="fadeInUp" delay={index * 100}>
                  <div className={styles.testimonialCard}>
                    <div className={styles.testimonialContent}>
                      <div className={styles.testimonialQuote}>
                        <Quote className={styles.testimonialQuoteIcon} />
                      </div>
                      <p className={styles.testimonialText}>
                        {testimonial.text}
                      </p>
                      <div className={styles.testimonialFooter}>
                        <div className={styles.testimonialCompany}>
                          {testimonial.company}
                        </div>
                        <div className={styles.testimonialRating}>
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className={styles.testimonialStar} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className={styles.contact}>
        <div className={styles.sectionContainer}>
          {/* Header */}
          <div className={styles.sectionHeader}>
            <AnimatedSection animation="fadeIn">
              <div className={styles.contactBadge}>
                Contáctanos
              </div>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={100}>
              <h2 className={styles.sectionTitle}>
                ¿Necesitas nuestros servicios?
                <span className={styles.sectionTitleAccent}>Estamos aquí para ayudarte</span>
              </h2>
            </AnimatedSection>
            
            <AnimatedSection animation="fadeInUp" delay={200}>
              <p className={styles.sectionDescription}>
                Ponte en contacto con nosotros para conocer más sobre nuestros servicios
                y cómo podemos ayudarte con tus necesidades de transporte.
              </p>
            </AnimatedSection>
          </div>

          <div className={styles.contactGrid}>
            {/* Contact Info */}
            <div className={styles.contactInfo}>
              {contactInfo.map((info, index) => (
                <AnimatedSection key={index} animation="scaleIn" delay={index * 100}>
                  <div className={styles.contactInfoCard}>
                    <div className={styles.contactInfoIcon}>
                      <info.icon className={styles.contactInfoIconSvg} />
                    </div>
                    <div className={styles.contactInfoContent}>
                      <h4 className={styles.contactInfoTitle}>{info.title}</h4>
                      <p className={styles.contactInfoText}>{info.content}</p>
                      <p className={styles.contactInfoSubtext}>{info.subtitle}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerGrid}>
            {/* Company Info */}
            <div className={styles.footerSection}>
              <div className={styles.footerLogo}>
                <div className={styles.footerLogoIcon}>
                  <Truck className={styles.footerLogoTruck} />
                </div>
                <div>
                  <h3 className={styles.footerLogoTitle}>COOESPATRANS</h3>
                  <p className={styles.footerLogoSubtitle}>Cooperativa de Transporte Esparta</p>
                </div>
              </div>
              <p className={styles.footerDescription}>
                Más de 20 años conectando Colombia con servicios de transporte
                de carga seguros, confiables y eficientes.
              </p>
              <div className={styles.footerSocial}>
                <button className={styles.footerSocialButton}>
                  <MessageCircle className={styles.footerSocialIcon} />
                </button>
                <button className={styles.footerSocialButton}>
                  <Phone className={styles.footerSocialIcon} />
                </button>
                <button className={styles.footerSocialButton}>
                  <Mail className={styles.footerSocialIcon} />
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div className={styles.footerSection}>
              <h4 className={styles.footerSectionTitle}>Enlaces Rápidos</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#inicio" className={styles.footerLink}>Inicio</a></li>
                <li><a href="#servicios" className={styles.footerLink}>Servicios</a></li>
                <li><a href="#cobertura" className={styles.footerLink}>Cobertura</a></li>
                <li><a href="#nosotros" className={styles.footerLink}>Nosotros</a></li>
                <li><a href="#clientes" className={styles.footerLink}>Clientes</a></li>
                <li><a href="#contacto" className={styles.footerLink}>Contacto</a></li>
              </ul>
            </div>

            {/* Services */}
            <div className={styles.footerSection}>
              <h4 className={styles.footerSectionTitle}>Servicios</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#servicios" className={styles.footerLink}>Transporte Terrestre</a></li>
                <li><a href="#servicios" className={styles.footerLink}>Servicio Empresarial</a></li>
                <li><a href="#servicios" className={styles.footerLink}>Logística Especializada</a></li>
                <li><a href="#servicios" className={styles.footerLink}>Transporte Nacional</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className={styles.footerSection}>
              <h4 className={styles.footerSectionTitle}>Contacto</h4>
              <div className={styles.footerContactInfo}>
                <div className={styles.footerContactItem}>
                  <MapPin className={styles.footerContactIcon} />
                  <span>Carrera 27 Calle 4, Pasto, Nariño</span>
                </div>
                <div className={styles.footerContactItem}>
                  <Phone className={styles.footerContactIcon} />
                  <span>731 2917 • 310 607 2637</span>
                </div>
                <div className={styles.footerContactItem}>
                  <Mail className={styles.footerContactIcon} />
                  <span>cooespatrans@hotmail.com</span>
                </div>
                <div className={styles.footerContactItem}>
                  <Clock className={styles.footerContactIcon} />
                  <span>Lun-Vie: 8:00-18:00, Sáb: 8:00-12:00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className={styles.footerBottom}>
            <div className={styles.footerBottomContent}>
              <p className={styles.footerCopyright}>
                © 2024 Cooespatrans. Todos los derechos reservados.
              </p>
              <div className={styles.footerBottomLinks}>
                <a href="#" className={styles.footerBottomLink}>Política de Privacidad</a>
                <a href="#" className={styles.footerBottomLink}>Términos de Servicio</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;