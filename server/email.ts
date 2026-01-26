import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { getFirstAndLastName } from "@shared/utils";
import { getGravatarUrl } from "@shared/schema";
import { getFromR2, isR2Configured, getPublicUrl } from "./r2-storage";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Helper function to download image from URL (HTTP, base64 data URL, or R2 URL) and return as Buffer
async function downloadImageAsBuffer(imageUrl: string): Promise<Buffer | null> {
  try {
    // Handle R2 URLs (e.g., "r2://seasons/image.webp")
    if (imageUrl.startsWith('r2://')) {
      if (isR2Configured()) {
        const result = await getFromR2(imageUrl);
        if (result) {
          return result.buffer;
        }
        console.error(`Failed to get image from R2: ${imageUrl}`);
        return null;
      }
      // If R2 is not configured, try to use public URL
      const publicUrl = getPublicUrl(imageUrl);
      if (publicUrl !== imageUrl) {
        const response = await fetch(publicUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      }
      console.error(`R2 not configured and no public URL available for: ${imageUrl}`);
      return null;
    }
    
    // Handle base64 data URLs (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches && matches[2]) {
        return Buffer.from(matches[2], 'base64');
      }
      console.error(`Invalid base64 data URL format`);
      return null;
    }
    
    // Handle HTTP/HTTPS URLs
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to download image from ${imageUrl}: ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error downloading image from ${imageUrl}:`, error);
    return null;
  }
}

// URL pública do logo para e-mails (sem espaços em branco)
const LOGO_EMAIL_URL = "https://umpemaus.com.br/logo-email.png";
console.log(`✓ Logo configured with public URL: ${LOGO_EMAIL_URL}`);

// Footer HTML padrão com logo abaixo do texto
const getEmailFooter = () => `
  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="color: #888; font-size: 12px; margin: 0 0 10px 0;">UMP Emaús</p>
    <img src="${LOGO_EMAIL_URL}" alt="Emaús" style="height: 24px; width: auto;" />
  </div>
`;

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] Verification code for ${email}: ${code}`);
    return false;
  }
  
  try {
    await resend.emails.send({
      from: "UMP Emaús <contato@umpemaus.com.br>" ,
      to: email,
      subject: "Seu código de verificação - UMP Emaús",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FFA500;">UMP Emaús</h2>
          <p>Olá,</p>
          <p>Seu código de verificação para primeiro acesso é:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #FFA500; font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p>Este código expira em 15 minutos.</p>
          <p>Se você não solicitou este código, ignore este email.</p>
          ${getEmailFooter()}
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] Password reset code for ${email}: ${code}`);
    return false;
  }
  
  try {
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: email,
      subject: "Recuperação de Senha - UMP Emaús",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Olá!</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Você solicitou a recuperação de senha para sua conta no sistema UMP Emaús.
          </p>

          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Use o código abaixo para recuperar sua senha:
          </p>

          <div style="background-color: #f5f5f5; padding: 25px; margin: 20px 0; text-align: center; border-radius: 6px;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 13px; font-weight: bold; text-transform: uppercase;">Código de Recuperação</p>
            <h1 style="color: #FFA500; margin: 0; font-size: 32px; letter-spacing: 8px; font-weight: bold;">${code}</h1>
          </div>

          <p style="font-size: 14px; color: #856404; margin: 20px 0;">
            <strong>Atenção:</strong> Este código expira em <strong>15 minutos</strong>.
          </p>

          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 20px 0;">
            Após inserir o código, você será solicitado a criar uma nova senha para sua conta.
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 14px; color: #888; line-height: 1.6; margin: 0;">
            <strong>Não solicitou esta recuperação?</strong><br>
            Se você não solicitou a recuperação de senha, ignore este email.
          </p>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    await resend.emails.send(emailPayload);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

export async function sendBirthdayEmail(
  memberName: string,
  memberEmail: string,
  photoUrl: string | null
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] Birthday email for ${memberEmail}: ${memberName}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(memberName);
    
    // Download member photo (from photoUrl or Gravatar) as Buffer for CID attachment
    const memberPhotoUrl = photoUrl || getGravatarUrl(memberEmail);
    console.log(`Downloading member photo from: ${memberPhotoUrl}`);
    let memberPhotoBuffer = await downloadImageAsBuffer(memberPhotoUrl);
    
    if (!memberPhotoBuffer) {
      console.error(`Failed to download member photo for ${memberEmail}, trying Gravatar fallback`);
      if (photoUrl) {
        const fallbackUrl = getGravatarUrl(memberEmail);
        console.log(`Trying Gravatar fallback: ${fallbackUrl}`);
        memberPhotoBuffer = await downloadImageAsBuffer(fallbackUrl);
      }
    }
    
    // Plain text version
    const plainText = `
Olá, ${formattedName}!

Hoje é um dia muito especial - é o seu aniversário!

Toda a UMP Emaús se une para celebrar este momento com você e desejar muitas alegrias, bênçãos e realizações neste novo ciclo que se inicia.

"Que o Senhor te abençoe e te guarde; que o Senhor faça resplandecer o seu rosto sobre ti e te conceda graça" - Números 6:24-25

Que este novo ano de vida seja repleto de saúde, paz, amor e muita alegria ao lado de Deus e de todos que você ama!

Com carinho,
Toda a família UMP Emaús
    `.trim();

    // Build HTML with member photo
    const photoHtml = memberPhotoBuffer 
      ? `<div style="text-align: center; margin-bottom: 25px;">
          <img src="cid:member-photo" alt="${formattedName}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #FFA500;" />
        </div>`
      : '';

    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      replyTo: "contato@umpemaus.com.br",
      to: memberEmail,
      subject: `Feliz aniversário, ${formattedName}!`,
      text: plainText,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px;">
          
          ${photoHtml}
          
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
            Olá, <strong>${formattedName}</strong>!
          </p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 20px 0;">
            Hoje é um dia muito especial - é o seu aniversário!
          </p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 25px 0;">
            Toda a UMP Emaús se une para celebrar este momento com você e desejar muitas alegrias, bênçãos e realizações neste novo ciclo que se inicia.
          </p>

          <div style="border-left: 3px solid #FFA500; padding-left: 15px; margin: 25px 0;">
            <p style="margin: 0 0 8px 0; color: #555; font-size: 15px; font-style: italic; line-height: 1.6;">
              "Que o Senhor te abençoe e te guarde; que o Senhor faça resplandecer o seu rosto sobre ti e te conceda graça"
            </p>
            <p style="margin: 0; color: #888; font-size: 13px;">
              Números 6:24-25
            </p>
          </div>

          <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 25px 0 20px 0;">
            Que este novo ano de vida seja repleto de saúde, paz, amor e muita alegria ao lado de Deus e de todos que você ama!
          </p>
          
          <p style="font-size: 15px; color: #333; margin: 20px 0 5px 0;">
            Com carinho,
          </p>
          <p style="font-size: 15px; color: #333; margin: 0;">
            <strong>Toda a família UMP Emaús</strong>
          </p>

        </div>
      `,
    };

    // Add member photo as CID attachment if available
    if (memberPhotoBuffer) {
      emailPayload.attachments = [
        {
          content: memberPhotoBuffer.toString('base64'),
          filename: 'photo.jpg',
          contentId: 'member-photo',
        },
      ];
    }

    await resend.emails.send(emailPayload);
    console.log(`✓ Birthday email sent to ${formattedName} (${memberEmail})`);
    return true;
  } catch (error) {
    console.error("Error sending birthday email:", error);
    return false;
  }
}

export async function sendCongratulationsEmail(
  candidateName: string, 
  candidateEmail: string,
  positionName: string, 
  scrutinyRound: number
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] Congratulations email for ${candidateEmail}: ${candidateName} elected as ${positionName} in ${scrutinyRound}º scrutiny`);
    return false;
  }

  const ordinals = ["1º", "2º", "3º"];
  const scrutinyLabel = ordinals[scrutinyRound - 1] || `${scrutinyRound}º`;
  const formattedName = getFirstAndLastName(candidateName);
  
  try {
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: candidateEmail,
      subject: `Parabéns! Você foi eleito(a) - Emaús Vota`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 18px; color: #333; margin: 0 0 20px 0;">Olá, <strong>${formattedName}</strong>!</p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            É com grande alegria que informamos que você foi eleito(a) para o cargo de:
          </p>

          <div style="background-color: #f5f5f5; border-left: 4px solid #FFA500; padding: 20px; margin: 20px 0;">
            <h2 style="color: #333; margin: 0 0 10px 0; font-size: 22px; font-weight: bold;">${positionName}</h2>
            <p style="margin: 0; color: #666; font-size: 14px;">Eleito no <strong>${scrutinyLabel} escrutínio</strong></p>
          </div>

          <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 20px 0;">
            Este é um momento de celebração e também de responsabilidade. Confiamos em você para servir com dedicação e amor ao próximo.
          </p>

          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 6px; text-align: center;">
            <p style="font-style: italic; color: #555; font-size: 15px; line-height: 1.8; margin: 0;">
              "Porque de Deus somos cooperadores;<br/>
              lavoura de Deus, edifício de Deus sois vós."
            </p>
            <p style="color: #FFA500; font-weight: bold; margin: 15px 0 0 0; font-size: 14px;">
              1 Coríntios 3:9
            </p>
          </div>

          <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 20px 0;">
            Que Deus abençoe seu ministério e guie seus passos nesta nova jornada!
          </p>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    await resend.emails.send(emailPayload);
    
    console.log(`✓ Congratulations email sent to ${formattedName} (${candidateEmail}) for ${positionName}`);
    return true;
  } catch (error) {
    console.error("Error sending congratulations email:", error);
    return false;
  }
}

export async function sendAuditPDFEmail(
  presidentName: string,
  presidentEmail: string,
  electionName: string,
  pdfBuffer: Buffer
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] Audit PDF email for ${presidentEmail}: ${presidentName} - ${electionName}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(presidentName);
    
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: presidentEmail,
      subject: `Relatório de Auditoria - ${electionName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 18px; color: #333; margin: 0 0 20px 0;">Olá, <strong>${formattedName}</strong>!</p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Segue anexo o relatório de auditoria completo da eleição:
          </p>

          <div style="background-color: #f5f5f5; border-left: 4px solid #FFA500; padding: 20px; margin: 20px 0;">
            <h2 style="color: #333; margin: 0 0 10px 0; font-size: 18px; font-weight: bold;">${electionName}</h2>
            <p style="margin: 0; color: #666; font-size: 14px;">Relatório completo de auditoria em PDF</p>
          </div>

          <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 20px 0;">
            Este relatório contém todos os detalhes da eleição, incluindo:
          </p>

          <ul style="color: #555; font-size: 15px; line-height: 1.8; margin: 0 0 20px 0;">
            <li>Lista completa de presença</li>
            <li>Resultados por cargo e escrutínio</li>
            <li>Linha do tempo de votação</li>
            <li>Informações de auditoria</li>
          </ul>

          <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 20px 0;">
            Guarde este documento para seus registros oficiais.
          </p>
          
          ${getEmailFooter()}
        </div>
      `,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Auditoria_${electionName.replace(/\s+/g, '_')}.pdf`,
          type: 'application/pdf',
        },
      ],
    };

    await resend.emails.send(emailPayload);
    
    console.log(`✓ Audit PDF email sent to ${formattedName} (${presidentEmail}) for ${electionName}`);
    return true;
  } catch (error) {
    console.error("Error sending audit PDF email:", error);
    return false;
  }
}

// ==================== NOTIFICATION EMAILS ====================

export async function sendNewPrayerRequestEmail(
  recipientEmail: string,
  recipientName: string,
  requesterName: string,
  category: string,
  requestPreview: string
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] New prayer request notification to ${recipientEmail}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(recipientName);
    const preview = requestPreview.length > 150 ? requestPreview.substring(0, 150) + '...' : requestPreview;
    
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : (process.env.APP_URL || 'https://umpemaus.com.br');
    
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: recipientEmail,
      subject: `Novo Pedido de Oração - ${category}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Olá, <strong>${formattedName}</strong>!</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Um irmão da nossa comunidade enviou um pedido de oração. Vamos interceder juntos?
          </p>
          
          <div style="background-color: #f5f5f5; border-left: 4px solid #FFA500; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #333; font-weight: bold; font-size: 14px;">Categoria: ${category}</p>
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">De: ${requesterName}</p>
            <p style="margin: 0; color: #555; font-size: 14px; font-style: italic;">"${preview}"</p>
          </div>
          
          <p style="font-size: 15px; color: #555; margin: 20px 0; text-align: center;">
            Ore por este pedido e visite o Mural de Oração para ver mais pedidos.
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${appUrl}/oracao" style="display: inline-block; background-color: #FFA500; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Ver Mural de Oração
            </a>
          </div>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    await resend.emails.send(emailPayload);
    console.log(`✓ Prayer request notification email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending prayer request notification email:", error);
    return false;
  }
}

export async function sendNewCommentEmail(
  recipientEmail: string,
  recipientName: string,
  commenterName: string,
  devotionalTitle: string,
  commentPreview: string
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] New comment notification to ${recipientEmail}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(recipientName);
    const preview = commentPreview.length > 150 ? commentPreview.substring(0, 150) + '...' : commentPreview;
    
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : (process.env.APP_URL || 'https://umpemaus.com.br');
    
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: recipientEmail,
      subject: `Novo Comentário em "${devotionalTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Olá, <strong>${formattedName}</strong>!</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Um novo comentário foi recebido no devocional e precisa de aprovação:
          </p>
          
          <div style="background-color: #f5f5f5; border-left: 4px solid #FFA500; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #333; font-weight: bold; font-size: 14px;">Devocional: ${devotionalTitle}</p>
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">De: ${commenterName}</p>
            <p style="margin: 0; color: #555; font-size: 14px; font-style: italic;">"${preview}"</p>
          </div>
          
          <p style="font-size: 15px; color: #555; margin: 20px 0; text-align: center;">
            Acesse o painel para revisar e aprovar o comentário.
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${appUrl}/admin/espiritualidade" style="display: inline-block; background-color: #FFA500; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Acessar Painel
            </a>
          </div>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    await resend.emails.send(emailPayload);
    console.log(`✓ Comment notification email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending comment notification email:", error);
    return false;
  }
}

export async function sendNewDevotionalEmail(
  recipientEmail: string,
  recipientName: string,
  devotionalTitle: string,
  devotionalId: number,
  imageUrl: string | null = null
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] New devotional notification to ${recipientEmail}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(recipientName);
    
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : (process.env.APP_URL || 'https://umpemaus.com.br');
    
    const devotionalUrl = `${appUrl}/devocionais/${devotionalId}`;
    
    // Download devotional image if available
    let devotionalImageBuffer: Buffer | null = null;
    if (imageUrl) {
      devotionalImageBuffer = await downloadImageAsBuffer(imageUrl);
    }
    
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: recipientEmail,
      subject: `Novo Devocional: ${devotionalTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Olá, <strong>${formattedName}</strong>!</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Um novo devocional foi publicado para você:
          </p>
          
          ${devotionalImageBuffer ? `
            <div style="margin: 20px 0; text-align: center;">
              <img src="cid:devotional-image" alt="${devotionalTitle}" style="max-width: 100%; height: auto; border-radius: 8px;" />
            </div>
          ` : ''}
          
          <p style="margin: 0 0 20px 0; color: #333; font-weight: bold; font-size: 18px; text-align: center;">${devotionalTitle}</p>
          
          <p style="font-size: 15px; color: #555; margin: 0 0 25px 0; text-align: center;">
            Aproveite este momento de reflexão e crescimento espiritual!
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${devotionalUrl}" style="display: inline-block; background-color: #FFA500; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Ler Devocional
            </a>
          </div>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    const attachments: any[] = [];
    
    if (devotionalImageBuffer) {
      attachments.push({
        content: devotionalImageBuffer.toString('base64'),
        filename: 'devotional.jpg',
        contentId: 'devotional-image',
      });
    }
    
    if (attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    await resend.emails.send(emailPayload);
    return true;
  } catch (error) {
    console.error("Error sending devotional notification email:", error);
    return false;
  }
}

export async function sendNewEventEmail(
  recipientEmail: string,
  recipientName: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string | null,
  eventId: number,
  imageUrl: string | null = null
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] New event notification to ${recipientEmail}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(recipientName);
    
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : (process.env.APP_URL || 'https://umpemaus.com.br');
    
    const eventUrl = `${appUrl}/agenda/${eventId}`;
    
    // Download event image if available
    let eventImageBuffer: Buffer | null = null;
    if (imageUrl) {
      eventImageBuffer = await downloadImageAsBuffer(imageUrl);
    }
    
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: recipientEmail,
      subject: `Novo Evento: ${eventTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Olá, <strong>${formattedName}</strong>!</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Um novo evento foi adicionado à agenda:
          </p>
          
          ${eventImageBuffer ? `
            <div style="margin: 20px 0; text-align: center;">
              <img src="cid:event-image" alt="${eventTitle}" style="max-width: 100%; height: auto; border-radius: 8px;" />
            </div>
          ` : ''}
          
          <p style="margin: 0 0 10px 0; color: #333; font-weight: bold; font-size: 18px; text-align: center;">${eventTitle}</p>
          <p style="margin: 0 0 5px 0; color: #666; font-size: 14px; text-align: center;">Data: ${eventDate}</p>
          ${eventLocation ? `<p style="margin: 0 0 20px 0; color: #666; font-size: 14px; text-align: center;">Local: ${eventLocation}</p>` : ''}
          
          <p style="font-size: 15px; color: #555; margin: 20px 0; text-align: center;">
            Marque na sua agenda e participe!
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${eventUrl}" style="display: inline-block; background-color: #FFA500; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Ver Evento
            </a>
          </div>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    const attachments: any[] = [];
    
    if (eventImageBuffer) {
      attachments.push({
        content: eventImageBuffer.toString('base64'),
        filename: 'event.jpg',
        contentId: 'event-image',
      });
    }
    
    if (attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    await resend.emails.send(emailPayload);
    return true;
  } catch (error) {
    console.error("Error sending event notification email:", error);
    return false;
  }
}

export async function sendSeasonPublishedEmail(
  recipientEmail: string,
  recipientName: string,
  seasonTitle: string,
  seasonDescription: string | null,
  coverImageUrl: string | null = null
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] Season published notification to ${recipientEmail}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(recipientName);
    
    // Download cover image if available
    let coverImageBuffer: Buffer | null = null;
    if (coverImageUrl) {
      coverImageBuffer = await downloadImageAsBuffer(coverImageUrl);
    }
    
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : (process.env.APP_URL || 'https://umpemaus.com.br');
    
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: recipientEmail,
      subject: `Nova Revista DeoGlory: ${seasonTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Olá, <strong>${formattedName}</strong>!</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Uma nova revista de estudos está disponível no DeoGlory:
          </p>
          
          ${coverImageBuffer ? `
            <div style="margin: 20px 0; text-align: center;">
              <img src="cid:cover-image" alt="${seasonTitle}" style="max-width: 200px; height: auto; border-radius: 8px;" />
            </div>
          ` : ''}
          
          <p style="margin: 0 0 10px 0; color: #333; font-weight: bold; font-size: 18px; text-align: center;">${seasonTitle}</p>
          ${seasonDescription ? `<p style="margin: 0 0 20px 0; color: #666; font-size: 14px; text-align: center;">${seasonDescription}</p>` : ''}
          
          <p style="font-size: 15px; color: #555; margin: 20px 0; text-align: center;">
            Comece seus estudos agora e ganhe XP!
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${appUrl}/study" style="display: inline-block; background-color: #FFA500; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Acessar DeoGlory
            </a>
          </div>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    const attachments: any[] = [];
    
    if (coverImageBuffer) {
      attachments.push({
        content: coverImageBuffer.toString('base64'),
        filename: 'cover.jpg',
        contentId: 'cover-image',
      });
    }
    
    if (attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    await resend.emails.send(emailPayload);
    return true;
  } catch (error) {
    console.error("Error sending season published email:", error);
    return false;
  }
}

export async function sendNewStudyEventEmail(
  recipientEmail: string,
  recipientName: string,
  eventTitle: string,
  eventDescription: string | null,
  startDate: string,
  endDate: string,
  eventId: number,
  imageUrl: string | null = null
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] New study event notification to ${recipientEmail}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(recipientName);
    
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : (process.env.APP_URL || 'https://umpemaus.com.br');
    
    const eventUrl = `${appUrl}/study/eventos/${eventId}`;
    
    // Download event image if available
    let eventImageBuffer: Buffer | null = null;
    if (imageUrl) {
      eventImageBuffer = await downloadImageAsBuffer(imageUrl);
    }
    
    // Format dates in Brazilian format
    const formatDateBR = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    };
    
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: recipientEmail,
      subject: `Novo Evento Especial DeoGlory: ${eventTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Olá, <strong>${formattedName}</strong>!</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Um novo evento especial de estudos está disponível no DeoGlory:
          </p>
          
          ${eventImageBuffer ? `
            <div style="margin: 20px 0; text-align: center;">
              <img src="cid:event-image" alt="${eventTitle}" style="max-width: 100%; height: auto; border-radius: 8px;" />
            </div>
          ` : ''}
          
          <p style="margin: 0 0 10px 0; color: #333; font-weight: bold; font-size: 18px; text-align: center;">${eventTitle}</p>
          ${eventDescription ? `<p style="margin: 0 0 15px 0; color: #666; font-size: 14px; text-align: center;">${eventDescription}</p>` : ''}
          
          <div style="background-color: #f5f5f5; border-left: 4px solid #FFA500; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #333; font-size: 14px;">
              <strong>Período:</strong> ${formatDateBR(startDate)} até ${formatDateBR(endDate)}
            </p>
          </div>
          
          <p style="font-size: 15px; color: #555; margin: 20px 0; text-align: center;">
            Participe e ganhe XP em dobro + cards colecionáveis exclusivos!
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${eventUrl}" style="display: inline-block; background-color: #FFA500; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Participe!
            </a>
          </div>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    const attachments: any[] = [];
    
    if (eventImageBuffer) {
      attachments.push({
        content: eventImageBuffer.toString('base64'),
        filename: 'event.jpg',
        contentId: 'event-image',
      });
    }
    
    if (attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    await resend.emails.send(emailPayload);
    return true;
  } catch (error) {
    console.error("Error sending study event notification email:", error);
    return false;
  }
}

export async function sendSeasonEndedEmail(
  recipientEmail: string,
  recipientName: string,
  seasonTitle: string,
  lessonsCompleted: number,
  totalLessons: number,
  xpEarned: number,
  correctPercentage: number
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] Season ended notification to ${recipientEmail}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(recipientName);
    const completionRate = Math.round((lessonsCompleted / totalLessons) * 100);
    
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : (process.env.APP_URL || 'https://umpemaus.com.br');
    
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: recipientEmail,
      subject: `Revista Finalizada: ${seasonTitle} - Seu Relatório`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Parabéns, <strong>${formattedName}</strong>!</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            A revista "${seasonTitle}" chegou ao fim. Confira seu desempenho:
          </p>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 0 0 15px 0; text-align: center;">
              <strong style="font-size: 24px; color: #333;">${lessonsCompleted}/${totalLessons}</strong>
              <span style="color: #666; font-size: 14px; display: block;">Lições Completas</span>
            </p>
            <p style="margin: 0 0 15px 0; text-align: center;">
              <strong style="font-size: 24px; color: #FFA500;">${xpEarned} XP</strong>
              <span style="color: #666; font-size: 14px; display: block;">XP Ganho</span>
            </p>
            <p style="margin: 0; text-align: center;">
              <strong style="font-size: 24px; color: #10B981;">${correctPercentage}%</strong>
              <span style="color: #666; font-size: 14px; display: block;">Acertos</span>
            </p>
          </div>
          
          <p style="font-size: 15px; color: #555; margin: 20px 0; text-align: center;">
            Continue crescendo na Palavra! Novas revistas virão em breve.
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${appUrl}/study" style="display: inline-block; background-color: #FFA500; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Acessar DeoGlory
            </a>
          </div>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    await resend.emails.send(emailPayload);
    return true;
  } catch (error) {
    console.error("Error sending season ended email:", error);
    return false;
  }
}

export async function sendBonusEventEmail(
  recipientEmail: string,
  recipientName: string,
  eventName: string,
  eventDescription: string,
  bonusXp: number
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] Bonus event notification to ${recipientEmail}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(recipientName);
    
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : (process.env.APP_URL || 'https://umpemaus.com.br');
    
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: recipientEmail,
      subject: `Evento Especial DeoGlory: ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Olá, <strong>${formattedName}</strong>!</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Um evento especial está acontecendo no DeoGlory:
          </p>
          
          <div style="background-color: #f5f5f5; border-left: 4px solid #FFA500; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #333; font-weight: bold; font-size: 18px;">${eventName}</p>
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${eventDescription}</p>
            ${bonusXp > 0 ? `<p style="margin: 0; color: #059669; font-weight: bold; font-size: 14px;">Bônus: +${bonusXp} XP</p>` : ''}
          </div>
          
          <p style="font-size: 15px; color: #555; margin: 20px 0; text-align: center;">
            Não perca essa oportunidade de ganhar XP extra!
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${appUrl}/study" style="display: inline-block; background-color: #FFA500; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Acessar DeoGlory
            </a>
          </div>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    await resend.emails.send(emailPayload);
    return true;
  } catch (error) {
    console.error("Error sending bonus event email:", error);
    return false;
  }
}

export async function sendLessonAvailableEmail(
  recipientEmail: string,
  recipientName: string,
  lessonTitle: string,
  seasonTitle: string
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] Lesson available notification to ${recipientEmail}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(recipientName);
    
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : (process.env.APP_URL || 'https://umpemaus.com.br');
    
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: recipientEmail,
      subject: `Nova Lição: ${lessonTitle} - DeoGlory`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Olá, <strong>${formattedName}</strong>!</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Uma nova lição foi liberada para você estudar:
          </p>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 6px; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #333; font-weight: bold; font-size: 18px;">${lessonTitle}</p>
            <p style="margin: 0; color: #666; font-size: 14px;">Revista: ${seasonTitle}</p>
          </div>
          
          <p style="font-size: 15px; color: #555; margin: 20px 0; text-align: center;">
            Acesse o DeoGlory e continue sua jornada de aprendizado!
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${appUrl}/study" style="display: inline-block; background-color: #FFA500; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Estudar Agora
            </a>
          </div>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    await resend.emails.send(emailPayload);
    return true;
  } catch (error) {
    console.error("Error sending lesson available email:", error);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return resend !== null;
}

export async function sendSeasonRankingEmail(
  recipientName: string,
  recipientEmail: string,
  seasonTitle: string,
  position: number,
  totalXp: number,
  podium: { name: string; position: number; xp: number }[],
  coverImageUrl: string | null = null
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] Season ranking email for ${recipientEmail} (position ${position})`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(recipientName);
    
    // Download cover image if available
    let coverImageBuffer: Buffer | null = null;
    if (coverImageUrl) {
      coverImageBuffer = await downloadImageAsBuffer(coverImageUrl);
    }
    
    const positionLabels: Record<number, { emoji: string; color: string; text: string }> = {
      1: { emoji: "", color: "#FFD700", text: "Primeiro Lugar" },
      2: { emoji: "", color: "#C0C0C0", text: "Segundo Lugar" },
      3: { emoji: "", color: "#CD7F32", text: "Terceiro Lugar" }
    };
    
    const positionInfo = positionLabels[position] || { emoji: "", color: "#888", text: `${position} Lugar` };
    
    const podiumHtml = podium.map((p, idx) => {
      const pInfo = positionLabels[p.position] || { emoji: "", color: "#888", text: `${p.position}` };
      const isWinner = p.position === position;
      return `
        <div style="padding: 12px; margin: 8px 0; background-color: ${isWinner ? '#FFF9E6' : '#f5f5f5'}; border-radius: 6px; border-left: 4px solid ${pInfo.color};">
          <p style="margin: 0; font-weight: ${isWinner ? 'bold' : 'normal'}; color: #333;">
            <strong>${p.position}º</strong> - ${p.name}
          </p>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">${p.xp.toLocaleString('pt-BR')} XP</p>
        </div>
      `;
    }).join('');
    
    const emailPayload: any = {
      from: "UMP Emaús <contato@umpemaus.com.br>",
      to: recipientEmail,
      subject: `Parabéns! Você ficou em ${position}º lugar na revista ${seasonTitle}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 18px; color: #333; text-align: center; margin: 0 0 20px 0;">
            Parabéns, <strong>${formattedName}</strong>!
          </p>
          
          ${coverImageBuffer ? `
            <div style="margin: 20px 0; text-align: center;">
              <img src="cid:cover-image" alt="${seasonTitle}" style="max-width: 200px; height: auto; border-radius: 8px;" />
            </div>
          ` : ''}
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; text-align: center; margin: 0 0 20px 0;">
            Você concluiu a revista <strong>${seasonTitle}</strong> em <strong>${position}º lugar</strong>
            com um total de <strong style="color: #FFA500;">${totalXp.toLocaleString('pt-BR')} XP</strong>!
          </p>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 6px;">
            <h3 style="margin: 0 0 15px 0; color: #333; text-align: center; font-size: 16px;">Pódio Final</h3>
            ${podiumHtml}
          </div>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; text-align: center; margin: 20px 0;">
            Continue sua jornada de aprendizado no DeoGlory!
          </p>
          
          ${getEmailFooter()}
        </div>
      `,
    };

    // Add cover image attachment if available
    if (coverImageBuffer) {
      emailPayload.attachments = [{
        content: coverImageBuffer.toString('base64'),
        filename: 'cover.jpg',
        contentId: 'cover-image',
      }];
    }

    await resend.emails.send(emailPayload);
    return true;
  } catch (error) {
    console.error("Error sending season ranking email:", error);
    return false;
  }
}


export async function sendNewProductEmail(
  recipientEmail: string,
  recipientName: string,
  productName: string,
  productSlug: string,
  productImageBase64: string | null,
  productPrice: number,
  productDescription: string | null,
  baseUrl: string
): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL DISABLED] New product notification for ${recipientEmail}: ${productName}`);
    return false;
  }

  try {
    const formattedName = getFirstAndLastName(recipientName);
    // Price is stored in cents, divide by 100 to get the actual value
    const priceInReais = productPrice / 100;
    const formattedPrice = priceInReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const productUrl = `${baseUrl}/loja/produto/${productSlug}`;
    const shortDescription = productDescription ? productDescription.substring(0, 150) + (productDescription.length > 150 ? '...' : '') : '';

    const emailPayload: any = {
      from: "Loja UMP Emaús <contato@umpemaus.com.br>",
      to: recipientEmail,
      subject: `Novidade na Loja! ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
            Olá, <strong>${formattedName}</strong>!
          </p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
            Temos uma novidade na nossa loja que você vai adorar!
          </p>

          ${productImageBase64 ? `
          <div style="text-align: center; margin: 20px 0;">
            <img src="cid:product-image" style="max-width: 100%; height: auto; border-radius: 8px;" alt="${productName}" />
          </div>
          ` : ''}

          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 6px;">
            <h2 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${productName}</h2>
            ${shortDescription ? `<p style="font-size: 14px; color: #666; line-height: 1.5; margin: 0 0 15px 0;">${shortDescription}</p>` : ''}
            <p style="margin: 0; font-size: 22px; font-weight: bold; color: #FFA500;">${formattedPrice}</p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${productUrl}" style="display: inline-block; background-color: #FFA500; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              CONFIRA
            </a>
          </div>

          <p style="font-size: 14px; color: #888; text-align: center; margin: 20px 0;">
            Aproveite antes que acabe!
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          ${getEmailFooter()}
        </div>
      `,
    };

    // Build attachments array for product image only
    const attachments: any[] = [];

    if (productImageBase64) {
      // Remove data URL prefix if present
      const cleanBase64 = productImageBase64.replace(/^data:image\/\w+;base64,/, '');
      attachments.push({
        content: cleanBase64,
        filename: 'product-image.jpg',
        contentId: 'product-image',
      });
    }

    if (attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    await resend.emails.send(emailPayload);
    return true;
  } catch (error) {
    console.error("Error sending new product email:", error);
    return false;
  }
}
