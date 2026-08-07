import React from 'react';
import {
  Truck, Phone, Mail, MapPin, Clock, Shield, Smartphone, Eye, Lock,
  Database, UserCheck, AlertTriangle, FileText, ChevronRight, CheckCircle,
  Globe, Server, Trash2, Settings, Bell, RefreshCw, MessageCircle, ArrowLeft
} from "lucide-react";
import { Link } from 'react-router-dom';
import styles from './PrivacidadAPP.module.css';

const PrivacidadAPP = () => {
  const dataCollected = [
    {
      icon: MapPin,
      title: "Datos de Ubicación",
      description: "Recopilamos la ubicación GPS de su dispositivo móvil en tiempo real para permitir el seguimiento vehicular.",
      details: [
        "Coordenadas de latitud y longitud",
        "Velocidad de desplazamiento",
        "Dirección del movimiento",
        "Historial de rutas recorridas"
      ]
    },
    {
      icon: Smartphone,
      title: "Información del Dispositivo",
      description: "Datos técnicos necesarios para el funcionamiento óptimo de la aplicación.",
      details: [
        "Modelo y marca del dispositivo",
        "Versión del sistema operativo",
        "Identificador único del dispositivo",
        "Estado de la batería"
      ]
    },
    {
      icon: UserCheck,
      title: "Datos de la Cuenta",
      description: "Información proporcionada durante el registro y uso de la aplicación.",
      details: [
        "Nombre completo del usuario",
        "Número de contacto",
        "Correo electrónico",
        "Información del vehículo asignado"
      ]
    }
  ];

  const dataUsage = [
    {
      icon: Eye,
      title: "Monitoreo en Tiempo Real",
      description: "Permitir a la cooperativa visualizar la ubicación de los vehículos para optimizar operaciones logísticas."
    },
    {
      icon: Shield,
      title: "Seguridad del Transporte",
      description: "Garantizar la seguridad de conductores, vehículos y mercancía mediante seguimiento continuo."
    },
    {
      icon: RefreshCw,
      title: "Optimización de Rutas",
      description: "Analizar patrones de desplazamiento para mejorar tiempos de entrega y eficiencia operativa."
    },
    {
      icon: Bell,
      title: "Alertas y Notificaciones",
      description: "Enviar notificaciones sobre eventos importantes relacionados con el transporte y la operación."
    }
  ];

  const userRights = [
    {
      icon: Eye,
      title: "Derecho de Acceso",
      description: "Puede solicitar información sobre los datos personales que tenemos almacenados sobre usted."
    },
    {
      icon: Settings,
      title: "Derecho de Rectificación",
      description: "Puede solicitar la corrección de datos personales inexactos o incompletos."
    },
    {
      icon: Trash2,
      title: "Derecho de Supresión",
      description: "Puede solicitar la eliminación de sus datos cuando ya no sean necesarios para los fines establecidos."
    },
    {
      icon: Lock,
      title: "Derecho de Oposición",
      description: "Puede oponerse al tratamiento de sus datos en determinadas circunstancias."
    }
  ];

  const securityMeasures = [
    "Cifrado de datos en tránsito y en reposo mediante protocolos SSL/TLS",
    "Acceso restringido solo a personal autorizado de la cooperativa",
    "Servidores seguros con monitoreo 24/7",
    "Copias de seguridad periódicas y protegidas",
    "Auditorías regulares de seguridad",
    "Políticas de contraseñas robustas"
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
          <nav className={styles.nav}>
            <Link to="/" className={styles.logo}>
              <div>
                <h1 className={styles.logoTitle}>SurTrack</h1>
              </div>
            </Link>

            <Link to="/" className={styles.backButton}>
              <ArrowLeft className={styles.backIcon} />
              Volver al inicio
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <Shield className={styles.heroBadgeIcon} />
              Documento Legal
            </div>
            <h1 className={styles.heroTitle}>
              Política de Privacidad
              <span className={styles.heroTitleAccent}>Aplicación de Rastreo Vehicular</span>
            </h1>
            <p className={styles.heroDescription}>
              En SurTrack nos comprometemos a proteger la privacidad y seguridad de los datos 
              personales de nuestros usuarios. Esta política describe cómo recopilamos, utilizamos 
              y protegemos su información en nuestra aplicación de rastreo vehicular.
            </p>
            <div className={styles.heroMeta}>
              <div className={styles.heroMetaItem}>
                <Clock className={styles.heroMetaIcon} />
                <span>Última actualización: Diciembre 2024</span>
              </div>
              <div className={styles.heroMetaItem}>
                <FileText className={styles.heroMetaIcon} />
                <span>Versión 1.0</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className={styles.section}>
        <div className={styles.sectionContainer}>
          <div className={styles.introCard}>
            <div className={styles.introIcon}>
              <Globe className={styles.introIconSvg} />
            </div>
            <div className={styles.introContent}>
              <h2 className={styles.introTitle}>Ámbito de Aplicación</h2>
              <p className={styles.introText}>
                Esta Política de Privacidad aplica a la aplicación móvil de rastreo vehicular 
                de <strong>SurTrack</strong>, utilizada para el seguimiento y monitoreo de 
                vehículos de transporte de carga. Al utilizar nuestra aplicación, usted acepta 
                las prácticas descritas en esta política.
              </p>
              <p className={styles.introText}>
                La aplicación está diseñada exclusivamente para uso de los conductores y personal 
                autorizado de la cooperativa, permitiendo el seguimiento en tiempo real de los 
                vehículos durante las operaciones de transporte.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Collection Section */}
      <section className={styles.section}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionBadge}>
              <Database className={styles.sectionBadgeIcon} />
              Recopilación de Datos
            </div>
            <h2 className={styles.sectionTitle}>
              Información que
              <span className={styles.sectionTitleAccent}>recopilamos</span>
            </h2>
            <p className={styles.sectionDescription}>
              Para proporcionar nuestros servicios de rastreo vehicular, recopilamos los siguientes 
              tipos de información de su dispositivo móvil.
            </p>
          </div>

          <div className={styles.dataGrid}>
            {dataCollected.map((item, index) => (
              <div key={index} className={styles.dataCard}>
                <div className={styles.dataCardHeader}>
                  <div className={styles.dataIcon}>
                    <item.icon className={styles.dataIconSvg} />
                  </div>
                  <h3 className={styles.dataTitle}>{item.title}</h3>
                </div>
                <p className={styles.dataDescription}>{item.description}</p>
                <ul className={styles.dataList}>
                  {item.details.map((detail, idx) => (
                    <li key={idx} className={styles.dataListItem}>
                      <ChevronRight className={styles.dataListIcon} />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className={styles.importantNote}>
            <AlertTriangle className={styles.noteIcon} />
            <div className={styles.noteContent}>
              <h4 className={styles.noteTitle}>Importante sobre la ubicación</h4>
              <p className={styles.noteText}>
                La aplicación requiere acceso a la ubicación del dispositivo incluso cuando la 
                aplicación está en segundo plano. Esto es necesario para mantener el seguimiento 
                continuo del vehículo durante las operaciones de transporte. El rastreo solo se 
                activa durante las horas laborales o rutas asignadas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Usage Section */}
      <section className={styles.sectionAlt}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionBadge}>
              <Eye className={styles.sectionBadgeIcon} />
              Uso de Información
            </div>
            <h2 className={styles.sectionTitle}>
              Cómo utilizamos
              <span className={styles.sectionTitleAccent}>sus datos</span>
            </h2>
            <p className={styles.sectionDescription}>
              La información recopilada se utiliza exclusivamente para los siguientes propósitos 
              relacionados con las operaciones de transporte.
            </p>
          </div>

          <div className={styles.usageGrid}>
            {dataUsage.map((item, index) => (
              <div key={index} className={styles.usageCard}>
                <div className={styles.usageIcon}>
                  <item.icon className={styles.usageIconSvg} />
                </div>
                <h3 className={styles.usageTitle}>{item.title}</h3>
                <p className={styles.usageDescription}>{item.description}</p>
              </div>
            ))}
          </div>

          <div className={styles.noShareCard}>
            <div className={styles.noShareContent}>
              <Lock className={styles.noShareIcon} />
              <div>
                <h3 className={styles.noShareTitle}>No compartimos sus datos</h3>
                <p className={styles.noShareText}>
                  Su información personal y de ubicación NO se vende, alquila ni comparte con 
                  terceros para fines de marketing. Los datos solo son accesibles por personal 
                  autorizado de SurTrack y se utilizan exclusivamente para fines operativos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className={styles.section}>
        <div className={styles.sectionContainer}>
          <div className={styles.securityContent}>
            <div className={styles.securityInfo}>
              <div className={styles.sectionBadge}>
                <Shield className={styles.sectionBadgeIcon} />
                Seguridad
              </div>
              <h2 className={styles.sectionTitle}>
                Protección de
                <span className={styles.sectionTitleAccent}>sus datos</span>
              </h2>
              <p className={styles.securityText}>
                Implementamos medidas de seguridad técnicas y organizativas para proteger 
                su información personal contra acceso no autorizado, alteración, divulgación 
                o destrucción.
              </p>

              <div className={styles.securityList}>
                {securityMeasures.map((measure, index) => (
                  <div key={index} className={styles.securityItem}>
                    <CheckCircle className={styles.securityItemIcon} />
                    <span>{measure}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.securityCard}>
              <div className={styles.securityCardIcon}>
                <Server className={styles.securityCardIconSvg} />
              </div>
              <h3 className={styles.securityCardTitle}>Almacenamiento Seguro</h3>
              <p className={styles.securityCardText}>
                Los datos de ubicación se almacenan en servidores seguros con acceso 
                restringido. La información histórica de rutas se conserva por un período 
                máximo de 12 meses, después del cual se elimina de forma segura.
              </p>
              <div className={styles.retentionInfo}>
                <Clock className={styles.retentionIcon} />
                <span>Período de retención: 12 meses máximo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Rights Section */}
      <section className={styles.sectionAlt}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionBadge}>
              <UserCheck className={styles.sectionBadgeIcon} />
              Sus Derechos
            </div>
            <h2 className={styles.sectionTitle}>
              Derechos del
              <span className={styles.sectionTitleAccent}>usuario</span>
            </h2>
            <p className={styles.sectionDescription}>
              De acuerdo con la legislación colombiana de protección de datos personales 
              (Ley 1581 de 2012), usted tiene los siguientes derechos.
            </p>
          </div>

          <div className={styles.rightsGrid}>
            {userRights.map((right, index) => (
              <div key={index} className={styles.rightCard}>
                <div className={styles.rightIcon}>
                  <right.icon className={styles.rightIconSvg} />
                </div>
                <h3 className={styles.rightTitle}>{right.title}</h3>
                <p className={styles.rightDescription}>{right.description}</p>
              </div>
            ))}
          </div>

          <div className={styles.exerciseRights}>
            <h3 className={styles.exerciseTitle}>¿Cómo ejercer sus derechos?</h3>
            <p className={styles.exerciseText}>
              Para ejercer cualquiera de estos derechos, puede comunicarse con nosotros a través 
              de los canales de contacto proporcionados al final de esta política. Responderemos 
              a su solicitud en un plazo máximo de 15 días hábiles.
            </p>
          </div>
        </div>
      </section>

      {/* Updates Section */}
      <section className={styles.section}>
        <div className={styles.sectionContainer}>
          <div className={styles.updatesCard}>
            <div className={styles.updatesContent}>
              <RefreshCw className={styles.updatesIcon} />
              <div>
                <h3 className={styles.updatesTitle}>Actualizaciones de esta Política</h3>
                <p className={styles.updatesText}>
                  Podemos actualizar esta Política de Privacidad periódicamente para reflejar 
                  cambios en nuestras prácticas o por razones operativas, legales o regulatorias. 
                  Le notificaremos sobre cualquier cambio significativo a través de la aplicación 
                  o por correo electrónico. Le recomendamos revisar esta política regularmente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className={styles.contactSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.contactBadge}>
              Contacto
            </div>
            <h2 className={styles.sectionTitle}>
              ¿Preguntas sobre
              <span className={styles.sectionTitleAccent}>privacidad?</span>
            </h2>
            <p className={styles.sectionDescription}>
              Si tiene alguna pregunta, inquietud o solicitud relacionada con esta política 
              de privacidad o el tratamiento de sus datos personales, no dude en contactarnos.
            </p>
          </div>

          <div className={styles.contactGrid}>
            {contactInfo.map((info, index) => (
              <div key={index} className={styles.contactCard}>
                <div className={styles.contactIcon}>
                  <info.icon className={styles.contactIconSvg} />
                </div>
                <div className={styles.contactContent}>
                  <h4 className={styles.contactTitle}>{info.title}</h4>
                  <p className={styles.contactText}>{info.content}</p>
                  <p className={styles.contactSubtext}>{info.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerContent}>
            <div className={styles.footerLogo}>
              <div className={styles.footerLogoIcon}>
                <Truck className={styles.footerLogoTruck} />
              </div>
              <div>
                <h3 className={styles.footerLogoTitle}>SurTrack</h3>
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

          <div className={styles.footerBottom}>
            <p className={styles.footerCopyright}>
              © 2024 SurTrack. Todos los derechos reservados.
            </p>
            <Link to="/" className={styles.footerLink}>
              Volver al sitio principal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacidadAPP;