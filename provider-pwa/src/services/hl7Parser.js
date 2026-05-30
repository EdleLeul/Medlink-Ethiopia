// ─────────────────────────────────────────────────────────────────────────────
// HL7 v2 pipe-delimited file parser
// Parses .hl7 or .txt files containing HL7 v2 messages into MedLink records.
// Handles the most common segments for clinical data transfer in LMICs.
// ─────────────────────────────────────────────────────────────────────────────

import { CIEL_LAB_CONCEPTS } from '../config/clinicalConstants'

/**
 * Parse a raw HL7 v2 string into structured MedLink record objects.
 * Returns { recordType, rows[] } where rows are ready to upload.
 */
export function parseHL7(raw) {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const results = {
    labResults:      [],
    medications:     [],
    diagnoses:       [],
    vaccinations:    [],
    allergies:       [],
    surgicalHistory: [],
  }

  let currentPatientID = null

  for (const line of lines) {
    const fields = line.split('|')
    const segment = fields[0]

    // MSH — Message header (ignore for now, used for validation in production)
    if (segment === 'MSH') continue

    // PID — Patient identification
    if (segment === 'PID') {
      // PID.3 = patient identifier list, PID.5 = patient name
      currentPatientID = fields[3] || null
      continue
    }

    // OBX — Observation result (lab results, vitals)
    if (segment === 'OBX') {
      // OBX.3 = observation identifier (LOINC code^display)
      // OBX.5 = observation value
      // OBX.6 = units
      // OBX.7 = reference range
      // OBX.8 = abnormal flag
      // OBX.14 = date of observation
      const [loincCode, testDisplay] = (fields[3] || '').split('^')
      const value = fields[5] || ''
      const unit = fields[6] || ''
      const refRange = fields[7] || ''
      const flag = parseHL7Flag(fields[8])
      const dateStr = parseHL7Date(fields[14] || fields[19])

      // Try to match to CIeL concept by LOINC code
      const cielMatch = CIEL_LAB_CONCEPTS.find(c => c.loincCode === loincCode)

      results.labResults.push({
        testName: cielMatch?.display || testDisplay || loincCode || 'Unknown test',
        loincCode: loincCode || '',
        cielID: cielMatch?.cielID || '',
        result: value,
        unit: cielMatch?.unit || unit,
        referenceRange: cielMatch?.normalRange || refRange,
        flag,
        collectionDate: dateStr,
        _hl7Segment: 'OBX',
      })
      continue
    }

    // RXE — Pharmacy encoded order (medications)
    if (segment === 'RXE') {
      // RXE.2 = give code (drug name^code)
      // RXE.3 = give amount minimum
      // RXE.4 = give amount maximum
      // RXE.5 = give units
      // RXE.6 = give dosage form
      // RXE.16 = number of refills
      const [drugCode, drugName] = (fields[2] || '').split('^')
      results.medications.push({
        medicationName: drugName || drugCode || 'Unknown',
        dosage: `${fields[3] || ''}${fields[5] || ''}`.trim(),
        frequency: fields[6] || '',
        route: '',
        status: 'Active',
        _hl7Segment: 'RXE',
      })
      continue
    }

    // RXA — Pharmacy administration (vaccinations)
    if (segment === 'RXA') {
      // RXA.3 = date/time of substance admin
      // RXA.5 = administered code (CVX^display)
      // RXA.6 = administered amount
      // RXA.10 = administering provider
      const [cvxCode, vaccineName] = (fields[5] || '').split('^')
      results.vaccinations.push({
        vaccineName: vaccineName || cvxCode || 'Unknown vaccine',
        vaccineCode: cvxCode || '',
        dateGiven: parseHL7Date(fields[3]),
        administrator: fields[10] || '',
        _hl7Segment: 'RXA',
      })
      continue
    }

    // DG1 — Diagnosis
    if (segment === 'DG1') {
      // DG1.3 = diagnosis code (ICD^display)
      // DG1.4 = diagnosis description
      // DG1.6 = diagnosis type (A=Admitting, W=Working, F=Final)
      // DG1.19 = diagnosis date
      const [icdCode, icdDisplay] = (fields[3] || '').split('^')
      const diagName = fields[4] || icdDisplay || ''
      const statusMap = { A: 'Active', W: 'Suspected', F: 'Active' }
      results.diagnoses.push({
        diagnosisName: diagName,
        icdCode: icdCode || '',
        status: statusMap[fields[6]] || 'Active',
        diagnosedDate: parseHL7Date(fields[19]),
        _hl7Segment: 'DG1',
      })
      continue
    }

    // AL1 — Patient allergy information
    if (segment === 'AL1') {
      // AL1.3 = allergy code (^display)
      // AL1.4 = allergy severity
      // AL1.5 = allergy reaction code
      const [, allergenName] = (fields[3] || '').split('^')
      const severityMap = { SV: 'Severe — life threatening', MO: 'Moderate', MI: 'Mild' }
      results.allergies.push({
        allergen: allergenName || fields[3] || 'Unknown',
        severity: severityMap[fields[4]] || fields[4] || 'Moderate',
        reaction: fields[5] || '',
        allergenCategory: 'Medication',
        _hl7Segment: 'AL1',
      })
      continue
    }

    // PR1 — Procedures (surgical history)
    if (segment === 'PR1') {
      // PR1.3 = procedure code (ICD-10-PCS^display)
      // PR1.4 = procedure description
      // PR1.5 = procedure date/time
      // PR1.7 = procedure minutes
      const [procCode, procDisplay] = (fields[3] || '').split('^')
      results.surgicalHistory.push({
        procedure: fields[4] || procDisplay || procCode || 'Unknown procedure',
        icdPCSCode: procCode || '',
        date: parseHL7Date(fields[5]),
        outcome: 'Unknown',
        _hl7Segment: 'PR1',
      })
      continue
    }
  }

  // Remove empty arrays
  const nonEmpty = {}
  for (const [type, rows] of Object.entries(results)) {
    if (rows.length > 0) nonEmpty[type] = rows
  }

  return nonEmpty
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseHL7Date(raw) {
  if (!raw) return ''
  // HL7 dates: YYYYMMDD or YYYYMMDDHHMMSS
  const s = raw.replace(/[^0-9]/g, '')
  if (s.length >= 8) {
    const y = s.slice(0, 4), m = s.slice(4, 6), d = s.slice(6, 8)
    return `${y}-${m}-${d}`
  }
  return raw
}

function parseHL7Flag(raw) {
  if (!raw) return 'Normal'
  const map = { H: 'High', L: 'Low', A: 'Abnormal', 'AA': 'Critical high', 'LL': 'Critical low', N: 'Normal', '': 'Normal' }
  return map[raw.trim()] || raw
}

/**
 * Detect if a file is HL7 v2 by checking for MSH segment header.
 */
export function isHL7File(text) {
  return text.trimStart().startsWith('MSH|')
}