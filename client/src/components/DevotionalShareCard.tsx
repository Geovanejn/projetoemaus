import { forwardRef } from "react";
import { BookOpen } from "lucide-react";
import logoFlame from "@assets/V1_1764865428588.png";

interface DevotionalShareCardProps {
  title: string;
  verse: string;
  verseReference: string;
  imageUrl: string;
}

export const DevotionalShareCard = forwardRef<HTMLDivElement, DevotionalShareCardProps>(
  ({ title, verse, verseReference, imageUrl }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: "1080px",
          height: "1920px",
          position: "relative",
          overflow: "hidden",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}
      >
        <img
          src={imageUrl}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
        
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(17, 24, 39, 0.4) 0%, rgba(17, 24, 39, 0.7) 50%, rgba(17, 24, 39, 0.95) 100%)",
          }}
        />
        
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "80px 60px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(255, 165, 0, 0.4)",
              }}
            >
              <BookOpen style={{ width: "28px", height: "28px", color: "white" }} />
            </div>
            <div>
              <span
                style={{
                  color: "#FFA500",
                  fontSize: "24px",
                  fontWeight: 600,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                Devocional
              </span>
              <span
                style={{
                  display: "block",
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "18px",
                  marginTop: "4px",
                }}
              >
                UMP Emaús
              </span>
            </div>
          </div>
          
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%" }}>
              <h1
                style={{
                  color: "white",
                  fontSize: "72px",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  marginBottom: "48px",
                  textShadow: "0 4px 30px rgba(0, 0, 0, 0.5)",
                }}
              >
                {title}
              </h1>
              
              <div
                style={{
                  borderLeft: "6px solid #FFA500",
                  paddingLeft: "32px",
                  marginLeft: "8px",
                }}
              >
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.95)",
                    fontSize: "42px",
                    fontStyle: "italic",
                    lineHeight: 1.5,
                    marginBottom: "24px",
                    textShadow: "0 2px 20px rgba(0, 0, 0, 0.4)",
                  }}
                >
                  "{verse}"
                </p>
                <cite
                  style={{
                    color: "#FFA500",
                    fontSize: "32px",
                    fontWeight: 600,
                    fontStyle: "normal",
                  }}
                >
                  - {verseReference}
                </cite>
              </div>
            </div>
          </div>
          
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "40px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <img
                src={logoFlame}
                alt="UMP Emaús"
                style={{
                  width: "80px",
                  height: "80px",
                  objectFit: "contain",
                }}
                crossOrigin="anonymous"
              />
              <div>
                <span
                  style={{
                    color: "white",
                    fontSize: "28px",
                    fontWeight: 700,
                    display: "block",
                  }}
                >
                  UMP Emaús
                </span>
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "20px",
                  }}
                >
                  umpemaus.com.br
                </span>
              </div>
            </div>
            
            <span
              style={{
                color: "#FFA500",
                fontSize: "22px",
                fontWeight: 600,
                textAlign: "center",
                textShadow: "0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.3)",
                letterSpacing: "0.5px",
              }}
            >
              Acesse e leia o devocional completo
            </span>
          </div>
        </div>
      </div>
    );
  }
);

DevotionalShareCard.displayName = "DevotionalShareCard";
