import jsPDF from 'jspdf'

/**
 * Generates an official PDF receipt for a verified church contribution.
 * 
 * @param {Object} contribution - The contribution details.
 * @param {Object} memberProfile - Member user details.
 */
export const generateContributionReceipt = async (contribution, memberProfile = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const primaryColor = '#1e3a8a' // Deep Navy Blue
  const secondaryColor = '#0d9488' // Teal accent
  const darkTextColor = '#1f2937'
  const lightBgColor = '#f8fafc'

  // Header Background Accent Bar
  doc.setFillColor(30, 58, 138) // #1e3a8a
  doc.rect(0, 0, 210, 24, 'F')

  // Header Title
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('ST. FRANCIS OF ASSISI CATHOLIC CHURCH', 105, 12, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('P.O. Box 14221, Ntinda, Kampala - Uganda | Building & Development Fund', 105, 18, { align: 'center' })

  // Subheader Banner
  doc.setFillColor(241, 245, 249)
  doc.rect(15, 30, 180, 16, 'F')
  doc.setDrawColor(203, 213, 225)
  doc.rect(15, 30, 180, 16, 'S')

  doc.setTextColor(30, 58, 138)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('OFFICIAL CONTRIBUTION RECEIPT', 22, 40)

  // Status Badge
  const status = (contribution?.status || 'APPROVED').toUpperCase()
  doc.setFillColor(16, 185, 129) // Emerald green
  doc.roundedRect(145, 34, 42, 8, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(status, 166, 39.5, { align: 'center' })

  // Metadata Box (Receipt Ref & Date)
  let y = 56
  doc.setTextColor(darkTextColor)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')

  doc.text('Receipt Reference:', 15, y)
  doc.setFont('helvetica', 'normal')
  doc.text(contribution?.reference || 'SFA-REF-UNKNOWN', 55, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Issue Date:', 125, y)
  doc.setFont('helvetica', 'normal')
  const dateStr = contribution?.date || contribution?.createdAt || new Date().toISOString()
  doc.text(new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), 150, y)

  // Divider Line
  y += 6
  doc.setDrawColor(226, 232, 240)
  doc.line(15, y, 195, y)

  // Member Details Section
  y += 10
  doc.setFillColor(248, 250, 252)
  doc.rect(15, y, 180, 32, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(15, y, 180, 32, 'S')

  doc.setTextColor(30, 58, 138)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('MEMBER DETAILS', 20, y + 7)

  doc.setTextColor(darkTextColor)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Full Name:', 20, y + 16)
  doc.setFont('helvetica', 'normal')
  doc.text(contribution?.userName || memberProfile?.full_name || 'Valued Parish Member', 45, y + 16)

  doc.setFont('helvetica', 'bold')
  doc.text('Email / Contact:', 20, y + 24)
  doc.setFont('helvetica', 'normal')
  doc.text(memberProfile?.email || memberProfile?.phone || 'N/A', 45, y + 24)

  // Payment Breakdown Table
  y += 40
  doc.setFillColor(30, 58, 138)
  doc.rect(15, y, 180, 8, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DESCRIPTION / PURPOSE', 20, y + 5.5)
  doc.text('PAYMENT METHOD', 110, y + 5.5)
  doc.text('AMOUNT (UGX)', 190, y + 5.5, { align: 'right' })

  // Row 1
  y += 8
  doc.setFillColor(255, 255, 255)
  doc.rect(15, y, 180, 12, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(15, y, 180, 12, 'S')

  doc.setTextColor(darkTextColor)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const purpose = `${contribution?.purposeType ? contribution.purposeType.toUpperCase() : 'BUILDING FUND'}: ${contribution?.purposeName || 'General Church Contribution'}`
  doc.text(purpose, 20, y + 7)
  doc.text(contribution?.method || 'Mobile Money', 110, y + 7)

  doc.setFont('helvetica', 'bold')
  const formattedAmount = Number(contribution?.amount || 0).toLocaleString()
  doc.text(`UGX ${formattedAmount}`, 190, y + 7, { align: 'right' })

  // Total Summary Row
  y += 12
  doc.setFillColor(241, 245, 249)
  doc.rect(15, y, 180, 10, 'F')
  doc.setDrawColor(203, 213, 225)
  doc.rect(15, y, 180, 10, 'S')

  doc.setTextColor(30, 58, 138)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL PAID:', 110, y + 6.5)
  doc.setFontSize(11)
  doc.text(`UGX ${formattedAmount}`, 190, y + 6.5, { align: 'right' })

  // QR Code Verification Block & Signature
  y += 20
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(15, y, 180, 42, 3, 3, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(15, y, 180, 42, 3, 3, 'S')

  // Dynamic QR Code SVG/Canvas Generation URL
  const qrData = encodeURIComponent(
    `SFA-RECEIPT|REF:${contribution?.reference || 'N/A'}|AMT:${contribution?.amount}|STATUS:${status}`
  )
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`

  try {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = qrImageUrl
    await new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 120
        canvas.height = 120
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const dataUri = canvas.toDataURL('image/png')
        doc.addImage(dataUri, 'PNG', 22, y + 6, 30, 30)
        resolve(true)
      }
      img.onerror = () => resolve(false)
    })
  } catch (err) {
    console.warn('QR code embed skipped:', err)
  }

  doc.setTextColor(darkTextColor)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('VERIFICATION & AUTHENTICITY', 56, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.text('Scan QR code with smartphone to verify transaction status', 56, y + 17)
  doc.text(`Verification Key: ${contribution?.reference || 'SFA-VERIFY'}`, 56, y + 22)

  // Signature Block
  doc.setDrawColor(148, 163, 184)
  doc.line(135, y + 26, 185, y + 26)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Authorized Parish Treasurer', 160, y + 30, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text('St. Francis of Assisi Finance Office', 160, y + 34, { align: 'center' })

  // Footer Note
  y += 52
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text(
    'This is a computer-generated official receipt issued by St. Francis of Assisi Catholic Church Management System.',
    105,
    y,
    { align: 'center' }
  )

  // Save PDF
  const filename = `SFA_Receipt_${contribution?.reference || 'Contribution'}.pdf`
  doc.save(filename)
}
