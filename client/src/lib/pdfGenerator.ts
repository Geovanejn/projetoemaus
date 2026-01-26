import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import type { ElectionResults, ElectionAuditData } from "@shared/schema";

async function loadImageAsBase64(imagePath: string): Promise<{ data: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({ 
          data: canvas.toDataURL('image/png'),
          width: img.width,
          height: img.height
        });
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = imagePath;
  });
}

async function generateQRCode(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 256,
      margin: 1,
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

export async function generateElectionAuditPDF(electionResults: ElectionResults | ElectionAuditData): Promise<void> {
  const results = 'results' in electionResults ? electionResults.results : electionResults;
  const auditData = 'results' in electionResults ? electionResults : null;
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let yPosition = 8;

  const maxLogoWidth = pageWidth * 0.3;
  
  try {
    const logoImage = await loadImageAsBase64('/logo-ump.png');
    const aspectRatio = logoImage.height / logoImage.width;
    const logoWidth = maxLogoWidth;
    const logoHeight = logoWidth * aspectRatio;
    
    doc.addImage(logoImage.data, 'PNG', (pageWidth - logoWidth) / 2, yPosition, logoWidth, logoHeight);
    yPosition += logoHeight + 12;
  } catch (error) {
    console.warn('Logo não pôde ser carregado no PDF:', error);
    yPosition += 12;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE AUDITORIA DE ELEIÇÃO", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 4;

  doc.setFontSize(11);
  doc.text("União de Mocidade Presbiteriana Emaús", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  const electionTitle = results.electionName.startsWith("Eleição") 
    ? results.electionName 
    : `Eleição ${results.electionName}`;
  doc.text(electionTitle, margin, yPosition);
  yPosition += 6;
  
  const totalActiveMembers = auditData?.electionMetadata?.totalMembers;
  if (totalActiveMembers !== undefined) {
    doc.text(`Total de membros presentes: ${results.presentCount} de ${totalActiveMembers}`, margin, yPosition);
  } else {
    doc.text(`Total de membros presentes: ${results.presentCount}`, margin, yPosition);
  }
  yPosition += 6;

  if (auditData?.electionMetadata?.createdAt) {
    const createdDate = new Date(auditData.electionMetadata.createdAt);
    const dateOptions: Intl.DateTimeFormatOptions = { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "America/Sao_Paulo"
    };
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
      hour12: false
    };
    const formattedDate = createdDate.toLocaleDateString("pt-BR", dateOptions);
    const formattedTime = createdDate.toLocaleTimeString("pt-BR", timeOptions);
    
    doc.text(`Data de Abertura: ${formattedDate} às ${formattedTime}`, margin, yPosition);
    yPosition += 6;
  }

  const closedAt = auditData?.electionMetadata?.closedAt;
  if (closedAt) {
    const closureDate = new Date(closedAt);
    const dateOptions: Intl.DateTimeFormatOptions = { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "America/Sao_Paulo"
    };
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
      hour12: false
    };
    const formattedDate = closureDate.toLocaleDateString("pt-BR", dateOptions);
    const formattedTime = closureDate.toLocaleTimeString("pt-BR", timeOptions);
    
    doc.text(`Data de Encerramento: ${formattedDate} às ${formattedTime}`, margin, yPosition);
    yPosition += 9;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Resultados por Cargo", margin, yPosition);
  yPosition += 9;

  for (const position of results.positions) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(position.positionName, margin, yPosition);
    yPosition += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Escrutínio: ${position.currentScrutiny}º`, margin, yPosition);
    yPosition += 5;
    doc.text(`Status: ${position.status === 'completed' ? 'Concluído' : position.status === 'active' ? 'Ativo' : 'Pendente'}`, margin, yPosition);
    yPosition += 6;

    const tableData = position.candidates.map((candidate) => {
      const status = candidate.isElected 
        ? `✓ ${candidate.voteCount} votos`
        : `${candidate.voteCount} voto${candidate.voteCount !== 1 ? 's' : ''}`;
      return [
        candidate.candidateName,
        status,
        candidate.isElected,
      ];
    });

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Candidato', 'Resultado']],
        body: tableData.map(row => [row[0], row[1]]),
        theme: 'grid',
        headStyles: {
          fillColor: [255, 165, 0],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 1.5,
        },
        didParseCell: function(data) {
          if (data.section === 'body' && tableData[data.row.index][2]) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 6;
    } else {
      doc.text("Nenhum candidato registrado para este cargo", margin, yPosition);
      yPosition += 6;
    }
  }

  // Add detailed scrutiny breakdown section
  if (auditData?.scrutinyHistory && auditData.scrutinyHistory.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Detalhamento de Escrutínios", margin, yPosition);
    yPosition += 8;

    for (const positionHistory of auditData.scrutinyHistory) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(positionHistory.positionName, margin, yPosition);
      yPosition += 6;

      for (const scrutiny of positionHistory.scrutinies) {
        if (yPosition > pageHeight - 45) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`${scrutiny.round}º Escrutínio`, margin, yPosition);
        yPosition += 5;

        const scrutinyTableData = scrutiny.candidates.map((candidate: any) => {
          let status = `${candidate.voteCount} voto${candidate.voteCount !== 1 ? 's' : ''}`;
          let advancement = '';
          
          if (candidate.isElected) {
            advancement = '✓ ELEITO';
          } else if (candidate.advancedToNext && scrutiny.round < 3) {
            advancement = 'Avançou';
          }

          return [
            candidate.candidateName,
            status,
            advancement,
            candidate.isElected,
          ];
        });

        if (scrutinyTableData.length > 0) {
          autoTable(doc, {
            startY: yPosition,
            head: [['Candidato', 'Votos', 'Status']],
            body: scrutinyTableData.map((row: any) => [row[0], row[1], row[2]]),
            theme: 'grid',
            headStyles: {
              fillColor: [255, 165, 0],
              textColor: [255, 255, 255],
              fontSize: 7,
              fontStyle: 'bold',
            },
            bodyStyles: {
              fontSize: 7,
              cellPadding: 1.5,
            },
            didParseCell: function(data) {
              if (data.section === 'body' && scrutinyTableData[data.row.index][3]) {
                data.cell.styles.fontStyle = 'bold';
              }
            },
            margin: { left: margin, right: margin },
          });

          yPosition = (doc as any).lastAutoTable.finalY + 6;
        }
      }

      yPosition += 4;
    }
  }

  if (auditData?.voterAttendance && auditData.voterAttendance.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Presença de Membros", margin, yPosition);
    yPosition += 8;

    const attendanceData = auditData.voterAttendance.map((voter: any) => [
      voter.voterName,
      voter.totalVotes.toString(),
      new Date(voter.firstVoteAt).toLocaleString('pt-BR', { 
        day: "2-digit", 
        month: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit" 
      }),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Nome', 'Total de Votos', 'Primeira Votação']],
      body: attendanceData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 165, 0],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;
  }

  if (auditData?.voteTimeline && auditData.voteTimeline.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Linha do Tempo de Votação", margin, yPosition);
    yPosition += 8;

    const timelineData = auditData.voteTimeline.map((vote: any) => [
      vote.voterName,
      vote.positionName,
      vote.candidateName,
      `${vote.scrutinyRound}º`,
      new Date(vote.votedAt).toLocaleString('pt-BR', { 
        day: "2-digit", 
        month: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit" 
      }),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Membro', 'Cargo', 'Candidato', 'Escrutínio', 'Data/Hora']],
      body: timelineData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 165, 0],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;
  }

  if (yPosition > pageHeight - 70) {
    doc.addPage();
    yPosition = margin;
  } else {
    yPosition += 12;
  }

  // Add QR Code for verification if hash is available
  const verificationHash = (auditData as any)?.verificationHash;
  if (verificationHash) {
    try {
      const verificationUrl = `${window.location.origin}/verificar/${verificationHash}`;
      const qrCodeDataUrl = await generateQRCode(verificationUrl);
      
      const qrSize = 25;
      doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - qrSize, yPosition, qrSize, qrSize);
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      const qrText = "Escaneie para";
      const qrText2 = "verificar autenticidade";
      doc.text(qrText, pageWidth - margin - qrSize / 2, yPosition + qrSize + 3, { align: "center" });
      doc.text(qrText2, pageWidth - margin - qrSize / 2, yPosition + qrSize + 6, { align: "center" });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  }

  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPosition, margin + 80, yPosition);
  yPosition += 6;
  
  const presidentName = (auditData as any)?.presidentName;
  if (presidentName) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(presidentName, margin, yPosition);
    yPosition += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Presidente em Exercício da UMP Emaús", margin, yPosition);
  }
  
  yPosition += 9;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const currentDate = new Date();
  const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", 
                      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const formattedDate = `${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
  const formattedTime = currentDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  
  doc.text(`São Paulo, SP, ${formattedDate} às ${formattedTime}`, pageWidth / 2, yPosition, { align: "center" });

  const fileName = `Auditoria_${results.electionName.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf`;
  doc.save(fileName);
}

export async function generateElectionAuditPDFBase64(electionResults: ElectionResults | ElectionAuditData): Promise<string> {
  const results = 'results' in electionResults ? electionResults.results : electionResults;
  const auditData = 'results' in electionResults ? electionResults : null;
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let yPosition = 8;

  const maxLogoWidth = pageWidth * 0.3;
  
  try {
    const logoImage = await loadImageAsBase64('/logo-ump.png');
    const aspectRatio = logoImage.height / logoImage.width;
    const logoWidth = maxLogoWidth;
    const logoHeight = logoWidth * aspectRatio;
    
    doc.addImage(logoImage.data, 'PNG', (pageWidth - logoWidth) / 2, yPosition, logoWidth, logoHeight);
    yPosition += logoHeight + 12;
  } catch (error) {
    console.warn('Logo não pôde ser carregado no PDF:', error);
    yPosition += 12;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE AUDITORIA DE ELEIÇÃO", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 4;

  doc.setFontSize(11);
  doc.text("União de Mocidade Presbiteriana Emaús", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  const electionTitle = results.electionName.startsWith("Eleição") 
    ? results.electionName 
    : `Eleição ${results.electionName}`;
  doc.text(electionTitle, margin, yPosition);
  yPosition += 6;
  
  const totalActiveMembers = auditData?.electionMetadata?.totalMembers;
  if (totalActiveMembers !== undefined) {
    doc.text(`Total de membros presentes: ${results.presentCount} de ${totalActiveMembers}`, margin, yPosition);
  } else {
    doc.text(`Total de membros presentes: ${results.presentCount}`, margin, yPosition);
  }
  yPosition += 6;

  if (auditData?.electionMetadata?.createdAt) {
    const createdDate = new Date(auditData.electionMetadata.createdAt);
    const dateOptions: Intl.DateTimeFormatOptions = { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "America/Sao_Paulo"
    };
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
      hour12: false
    };
    const formattedDate = createdDate.toLocaleDateString("pt-BR", dateOptions);
    const formattedTime = createdDate.toLocaleTimeString("pt-BR", timeOptions);
    
    doc.text(`Data de Abertura: ${formattedDate} às ${formattedTime}`, margin, yPosition);
    yPosition += 6;
  }

  if (auditData?.electionMetadata?.closedAt) {
    const closedDate = new Date(auditData.electionMetadata.closedAt);
    const dateOptions: Intl.DateTimeFormatOptions = { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "America/Sao_Paulo"
    };
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
      hour12: false
    };
    const formattedDate = closedDate.toLocaleDateString("pt-BR", dateOptions);
    const formattedTime = closedDate.toLocaleTimeString("pt-BR", timeOptions);
    doc.text(`Data de Encerramento: ${formattedDate} às ${formattedTime}`, margin, yPosition);
    yPosition += 9;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Resultados por Cargo", margin, yPosition);
  yPosition += 9;

  for (const position of results.positions) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(position.positionName, margin, yPosition);
    yPosition += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Escrutínio: ${position.currentScrutiny}º`, margin, yPosition);
    yPosition += 5;
    doc.text(`Status: ${position.status === 'completed' ? 'Concluído' : position.status === 'active' ? 'Ativo' : 'Pendente'}`, margin, yPosition);
    yPosition += 6;

    const tableData = position.candidates.map((candidate) => {
      const status = candidate.isElected 
        ? `✓ ${candidate.voteCount} votos`
        : `${candidate.voteCount} voto${candidate.voteCount !== 1 ? 's' : ''}`;
      return [
        candidate.candidateName,
        status,
        candidate.isElected,
      ];
    });

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Candidato', 'Resultado']],
        body: tableData.map(row => [row[0], row[1]]),
        theme: 'grid',
        headStyles: {
          fillColor: [255, 165, 0],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 1.5,
        },
        didParseCell: function(data) {
          if (data.section === 'body' && tableData[data.row.index][2]) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 6;
    } else {
      doc.text("Nenhum candidato registrado para este cargo", margin, yPosition);
      yPosition += 6;
    }
  }

  // Add detailed scrutiny breakdown section
  if (auditData?.scrutinyHistory && auditData.scrutinyHistory.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Detalhamento de Escrutínios", margin, yPosition);
    yPosition += 8;

    for (const positionHistory of auditData.scrutinyHistory) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(positionHistory.positionName, margin, yPosition);
      yPosition += 6;

      for (const scrutiny of positionHistory.scrutinies) {
        if (yPosition > pageHeight - 45) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`${scrutiny.round}º Escrutínio`, margin, yPosition);
        yPosition += 5;

        const scrutinyTableData = scrutiny.candidates.map((candidate: any) => {
          let status = `${candidate.voteCount} voto${candidate.voteCount !== 1 ? 's' : ''}`;
          let advancement = '';
          
          if (candidate.isElected) {
            advancement = '✓ ELEITO';
          } else if (candidate.advancedToNext && scrutiny.round < 3) {
            advancement = 'Avançou';
          }

          return [
            candidate.candidateName,
            status,
            advancement,
            candidate.isElected,
          ];
        });

        if (scrutinyTableData.length > 0) {
          autoTable(doc, {
            startY: yPosition,
            head: [['Candidato', 'Votos', 'Status']],
            body: scrutinyTableData.map((row: any) => [row[0], row[1], row[2]]),
            theme: 'grid',
            headStyles: {
              fillColor: [255, 165, 0],
              textColor: [255, 255, 255],
              fontSize: 7,
              fontStyle: 'bold',
            },
            bodyStyles: {
              fontSize: 7,
              cellPadding: 1.5,
            },
            didParseCell: function(data) {
              if (data.section === 'body' && scrutinyTableData[data.row.index][3]) {
                data.cell.styles.fontStyle = 'bold';
              }
            },
            margin: { left: margin, right: margin },
          });

          yPosition = (doc as any).lastAutoTable.finalY + 6;
        }
      }

      yPosition += 4;
    }
  }

  if (auditData?.voterAttendance && auditData.voterAttendance.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Presença de Membros", margin, yPosition);
    yPosition += 8;

    const attendanceData = auditData.voterAttendance.map((voter: any) => [
      voter.voterName,
      voter.totalVotes.toString(),
      new Date(voter.firstVoteAt).toLocaleString('pt-BR', { 
        day: "2-digit", 
        month: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit" 
      }),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Nome', 'Total de Votos', 'Primeira Votação']],
      body: attendanceData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 165, 0],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;
  }

  if (auditData?.voteTimeline && auditData.voteTimeline.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Linha do Tempo de Votação", margin, yPosition);
    yPosition += 8;

    const timelineData = auditData.voteTimeline.map((vote: any) => [
      vote.voterName,
      vote.positionName,
      vote.candidateName,
      `${vote.scrutinyRound}º`,
      new Date(vote.votedAt).toLocaleString('pt-BR', { 
        day: "2-digit", 
        month: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit" 
      }),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Membro', 'Cargo', 'Candidato', 'Escrutínio', 'Data/Hora']],
      body: timelineData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 165, 0],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;
  }

  if (yPosition > pageHeight - 70) {
    doc.addPage();
    yPosition = margin;
  } else {
    yPosition += 12;
  }

  // Add QR Code for verification if hash is available
  const verificationHash = (auditData as any)?.verificationHash;
  if (verificationHash) {
    try {
      const verificationUrl = `${window.location.origin}/verificar/${verificationHash}`;
      const qrCodeDataUrl = await generateQRCode(verificationUrl);
      
      const qrSize = 25;
      doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - qrSize, yPosition, qrSize, qrSize);
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      const qrText = "Escaneie para";
      const qrText2 = "verificar autenticidade";
      doc.text(qrText, pageWidth - margin - qrSize / 2, yPosition + qrSize + 3, { align: "center" });
      doc.text(qrText2, pageWidth - margin - qrSize / 2, yPosition + qrSize + 6, { align: "center" });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  }

  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPosition, margin + 80, yPosition);
  yPosition += 6;
  
  const presidentName = (auditData as any)?.presidentName;
  if (presidentName) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(presidentName, margin, yPosition);
    yPosition += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Presidente em Exercício da UMP Emaús", margin, yPosition);
  }
  
  yPosition += 9;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const currentDate = new Date();
  const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", 
                      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const formattedDate = `${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
  const formattedTime = currentDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  
  doc.text(`São Paulo, SP, ${formattedDate} às ${formattedTime}`, pageWidth / 2, yPosition, { align: "center" });

  return doc.output('dataurlstring').split(',')[1];
}
