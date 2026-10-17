import { jsPDF } from 'jspdf'
import type { BatsmanStat, Innings, Match } from '../types'
import { oversDisplay } from './engine'
import { playerName, team } from './match'

const MARGIN = 14
const PAGE_WIDTH = 210 // A4 portrait, mm

function dismissalText(match: Match, b: BatsmanStat, innings: Innings): string {
  if (!b.out) return b.playerId === innings.strikerId || b.playerId === innings.nonStrikerId ? 'not out' : 'retired'
  if (b.dismissal!.type === 'Run Out') {
    return `run out${b.dismissal!.fielderId ? ' (' + playerName(match, b.dismissal!.fielderId) + ')' : ''}`
  }
  return `${b.dismissal!.type.toLowerCase()}${b.dismissal!.fielderId ? ' ' + playerName(match, b.dismissal!.fielderId) : ''}`
}

/** Renders the same content as buildScorecardCSV, as a printable PDF. */
export function buildScorecardPDF(match: Match): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  const addLine = (text: string, size: number, bold = false, color: [number, number, number] = [20, 20, 20]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(text, MARGIN, y)
    y += size * 0.5
  }

  const ensureSpace = (needed: number) => {
    if (y + needed > 287) {
      doc.addPage()
      y = MARGIN
    }
  }

  addLine('Star Kala CC — Match Scorecard', 16, true, [31, 107, 69])
  y += 1
  addLine(`${match.teamA.name} vs ${match.teamB.name}`, 12, true)
  addLine(`Overs: ${match.oversLimit} · Toss: ${team(match, match.tossWinner).name} won, chose to ${match.tossDecision}`, 10)
  addLine(`Result: ${match.result ?? 'In progress'}`, 10)
  y += 3

  for (const innings of match.innings) {
    ensureSpace(20)
    const battingTeamName = team(match, innings.battingTeam).name
    addLine(`${battingTeamName} innings — ${innings.runs}/${innings.wickets} (${oversDisplay(innings.legalBalls)} ov)`, 13, true, [31, 107, 69])
    y += 2

    ensureSpace(10)
    const battingRows = Object.values(innings.batsmen)
      .sort((a, b) => a.battingPosition - b.battingPosition)
      .map((b) => [
        playerName(match, b.playerId),
        dismissalText(match, b, innings),
        String(b.runs),
        String(b.ballsFaced),
        String(b.fours),
        String(b.sixes),
        b.ballsFaced === 0 ? '0.0' : ((b.runs / b.ballsFaced) * 100).toFixed(1),
      ])
    y = drawTable(doc, y, ['Batting', 'Status', 'R', 'B', '4s', '6s', 'SR'], battingRows, [48, 42, 14, 14, 14, 14, 16])

    const extrasRuns = innings.runs - Object.values(innings.batsmen).reduce((s, b) => s + b.runs, 0)
    ensureSpace(8)
    addLine(`Extras: ${extrasRuns}    Total: ${innings.runs}/${innings.wickets} (${oversDisplay(innings.legalBalls)} ov)`, 10, true)
    y += 2

    ensureSpace(10)
    const bowlingRows = Object.values(innings.bowlers).map((bw) => [
      playerName(match, bw.playerId),
      oversDisplay(bw.legalBalls),
      String(bw.maidens),
      String(bw.runsConceded),
      String(bw.wickets),
      bw.legalBalls === 0 ? '0.00' : (bw.runsConceded / (bw.legalBalls / 6)).toFixed(2),
    ])
    y = drawTable(doc, y, ['Bowling', 'O', 'M', 'R', 'W', 'Econ'], bowlingRows, [48, 24, 20, 20, 20, 20])

    if (innings.fallOfWickets.length) {
      ensureSpace(14)
      const fow = innings.fallOfWickets
        .map((f) => `${f.score}-${f.wicketNumber} (${playerName(match, f.playerOutId)}, ${f.overBall} ov)`)
        .join(', ')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(20, 20, 20)
      doc.text('Fall of wickets:', MARGIN, y)
      y += 4.5
      doc.setFont('helvetica', 'normal')
      const wrapped = doc.splitTextToSize(fow, PAGE_WIDTH - MARGIN * 2)
      doc.text(wrapped, MARGIN, y)
      y += wrapped.length * 4.5
    }
    y += 4
  }

  return doc
}

function drawTable(doc: jsPDF, startY: number, headers: string[], rows: string[][], colWidths: number[]): number {
  let y = startY
  const rowHeight = 6

  const ensureSpace = (needed: number) => {
    if (y + needed > 287) {
      doc.addPage()
      y = MARGIN
    }
  }

  ensureSpace(rowHeight * (rows.length + 1))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  let x = MARGIN
  headers.forEach((h, i) => {
    doc.text(h, i === 0 ? x : x + colWidths[i], y, i === 0 ? {} : { align: 'right' })
    x += colWidths[i]
  })
  y += 1.5
  doc.setDrawColor(210, 210, 210)
  doc.line(MARGIN, y, MARGIN + colWidths.reduce((a, b) => a + b, 0), y)
  y += 4.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(20, 20, 20)
  for (const row of rows) {
    ensureSpace(rowHeight)
    x = MARGIN
    row.forEach((cell, i) => {
      doc.text(cell, i === 0 ? x : x + colWidths[i], y, i === 0 ? {} : { align: 'right' })
      x += colWidths[i]
    })
    y += rowHeight
  }
  return y
}
