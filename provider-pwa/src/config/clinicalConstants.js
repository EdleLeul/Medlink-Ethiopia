// ─────────────────────────────────────────────────────────────────────────────
// FHIR R4 resource type mapping
// Each MedLink record type maps to a FHIR R4 resource.
// These are stored as metadata on every record in Firestore.
// ─────────────────────────────────────────────────────────────────────────────
export const FHIR_RESOURCE_MAP = {
  consultations:   { resourceType: 'Encounter',            profile: 'http://hl7.org/fhir/StructureDefinition/Encounter' },
  diagnoses:       { resourceType: 'Condition',            profile: 'http://hl7.org/fhir/StructureDefinition/Condition' },
  medications:     { resourceType: 'MedicationStatement',  profile: 'http://hl7.org/fhir/StructureDefinition/MedicationStatement' },
  labResults:      { resourceType: 'Observation',          profile: 'http://hl7.org/fhir/StructureDefinition/Observation', category: 'laboratory' },
  vitals:          { resourceType: 'Observation',          profile: 'http://hl7.org/fhir/StructureDefinition/Observation', category: 'vital-signs' },
  allergies:       { resourceType: 'AllergyIntolerance',   profile: 'http://hl7.org/fhir/StructureDefinition/AllergyIntolerance' },
  radiology:       { resourceType: 'ImagingStudy',         profile: 'http://hl7.org/fhir/StructureDefinition/ImagingStudy' },
  referrals:       { resourceType: 'ServiceRequest',       profile: 'http://hl7.org/fhir/StructureDefinition/ServiceRequest' },
  vaccinations:    { resourceType: 'Immunization',         profile: 'http://hl7.org/fhir/StructureDefinition/Immunization' },
  surgicalHistory: { resourceType: 'Procedure',            profile: 'http://hl7.org/fhir/StructureDefinition/Procedure' },
  familyHistory:   { resourceType: 'FamilyMemberHistory',  profile: 'http://hl7.org/fhir/StructureDefinition/FamilyMemberHistory' },
}

// ─────────────────────────────────────────────────────────────────────────────
// LOINC codes for vitals (FHIR Observation.code)
// Source: https://loinc.org
// ─────────────────────────────────────────────────────────────────────────────
export const LOINC_VITALS = {
  systolic:         { code: '8480-6',  display: 'Systolic blood pressure',     unit: 'mmHg' },
  diastolic:        { code: '8462-4',  display: 'Diastolic blood pressure',    unit: 'mmHg' },
  heartRate:        { code: '8867-4',  display: 'Heart rate',                  unit: 'beats/min' },
  temperature:      { code: '8310-5',  display: 'Body temperature',            unit: '°C' },
  oxygenSaturation: { code: '2708-6',  display: 'Oxygen saturation',           unit: '%' },
  weight:           { code: '29463-7', display: 'Body weight',                 unit: 'kg' },
  height:           { code: '8302-2',  display: 'Body height',                 unit: 'cm' },
  bloodGlucose:     { code: '2339-0',  display: 'Glucose [Mass/volume] in Blood', unit: 'mmol/L' },
  bmi:              { code: '39156-5', display: 'Body mass index (BMI)',        unit: 'kg/m2' },
  respiratoryRate:  { code: '9279-1',  display: 'Respiratory rate',            unit: 'breaths/min' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Columbia International eHealth Laboratory (CIeL) concept map
// CIeL provides LOINC-aligned concept IDs for lab tests common in LMICs.
// Source: https://openconceptlab.org/orgs/CIEL/sources/CIEL/
// Each entry: { cielID, loincCode, display, unit, normalRange }
// ─────────────────────────────────────────────────────────────────────────────
export const CIEL_LAB_CONCEPTS = [
  { cielID: '1019', loincCode: '4548-4',  display: 'Haemoglobin A1c (HbA1c)',            unit: '%',        normalRange: '< 7.0 (diabetic target)' },
  { cielID: '887',  loincCode: '2339-0',  display: 'Fasting blood glucose',              unit: 'mmol/L',   normalRange: '3.9 – 5.6' },
  { cielID: '790',  loincCode: '2160-0',  display: 'Serum creatinine',                   unit: 'µmol/L',   normalRange: '60 – 110' },
  { cielID: '1021', loincCode: '17856-6', display: 'CD4 count',                          unit: 'cells/µL', normalRange: '> 500' },
  { cielID: '856',  loincCode: '25836-8', display: 'HIV viral load',                     unit: 'copies/mL',normalRange: '< 20 (undetectable)' },
  { cielID: '653',  loincCode: '58941-6', display: 'Malaria rapid diagnostic test (RDT)',unit: '',          normalRange: 'Negative' },
  { cielID: '718',  loincCode: '1988-5',  display: 'C-reactive protein (CRP)',           unit: 'mg/L',     normalRange: '< 10' },
  { cielID: '21',   loincCode: '718-7',   display: 'Haemoglobin',                        unit: 'g/dL',     normalRange: 'M: 13–17 / F: 12–16' },
  { cielID: '1015', loincCode: '6690-2',  display: 'White blood cell count (WBC)',       unit: '×10⁹/L',   normalRange: '4.5 – 11.0' },
  { cielID: '729',  loincCode: '777-3',   display: 'Platelet count',                     unit: '×10⁹/L',   normalRange: '150 – 400' },
  { cielID: '1334', loincCode: '2823-3',  display: 'Serum potassium',                    unit: 'mmol/L',   normalRange: '3.5 – 5.0' },
  { cielID: '1132', loincCode: '2951-2',  display: 'Serum sodium',                       unit: 'mmol/L',   normalRange: '135 – 145' },
  { cielID: '654',  loincCode: '1742-6',  display: 'Alanine aminotransferase (ALT)',     unit: 'U/L',      normalRange: '7 – 56' },
  { cielID: '655',  loincCode: '1920-8',  display: 'Aspartate aminotransferase (AST)',   unit: 'U/L',      normalRange: '10 – 40' },
  { cielID: '785',  loincCode: '2885-2',  display: 'Total protein',                      unit: 'g/L',      normalRange: '60 – 80' },
  { cielID: '1006', loincCode: '2571-8',  display: 'Triglycerides',                      unit: 'mmol/L',   normalRange: '< 1.7' },
  { cielID: '1007', loincCode: '2085-9',  display: 'HDL cholesterol',                    unit: 'mmol/L',   normalRange: 'M: > 1.0 / F: > 1.2' },
  { cielID: '1008', loincCode: '18262-6', display: 'LDL cholesterol',                    unit: 'mmol/L',   normalRange: '< 3.4' },
  { cielID: '160',  loincCode: '1996-8',  display: 'Serum urea (BUN)',                   unit: 'mmol/L',   normalRange: '2.5 – 6.4' },
  { cielID: '1271', loincCode: '5902-2',  display: 'Prothrombin time (PT)',              unit: 'seconds',  normalRange: '11 – 13' },
  { cielID: '32',   loincCode: '5770-3',  display: 'Urine glucose (dipstick)',           unit: '',         normalRange: 'Negative' },
  { cielID: '5089', loincCode: '55284-4', display: 'Blood pressure panel',               unit: 'mmHg',     normalRange: '< 130/80' },
  { cielID: '1030', loincCode: '10524-7', display: 'Sputum AFB smear (TB)',              unit: '',         normalRange: 'Negative' },
  { cielID: '307',  loincCode: '600-7',   display: 'Blood culture',                      unit: '',         normalRange: 'No growth' },
]

// ─────────────────────────────────────────────────────────────────────────────
// HL7 v2 segment → MedLink record type mapping
// Used by the HL7 file parser in UploadScreen
// ─────────────────────────────────────────────────────────────────────────────
export const HL7_SEGMENT_MAP = {
  OBX: 'labResults',   // Observation result
  OBR: 'labResults',   // Observation request
  RXE: 'medications',  // Pharmacy encoded order
  RXA: 'vaccinations', // Pharmacy administration
  DG1: 'diagnoses',    // Diagnosis
  PR1: 'surgicalHistory',
  AL1: 'allergies',
}

// ─────────────────────────────────────────────────────────────────────────────
// Field definitions per record type
// Each field has: key, label, type, required, options/range/unit
// Types: text | textarea | number | select | slider | date | calculated | ciel
// ─────────────────────────────────────────────────────────────────────────────
export const RECORD_FIELDS = {

  vitals: [
    { key: 'systolic',         label: 'Systolic BP',         type: 'number',  unit: 'mmHg',      min: 50,  max: 300, step: 1,   loinc: LOINC_VITALS.systolic,         warning: v => v > 180 ? 'Hypertensive crisis' : v < 70 ? 'Hypotension' : null },
    { key: 'diastolic',        label: 'Diastolic BP',        type: 'number',  unit: 'mmHg',      min: 30,  max: 150, step: 1,   loinc: LOINC_VITALS.diastolic,        warning: v => v > 120 ? 'Critically high' : v < 40 ? 'Critically low' : null },
    { key: 'heartRate',        label: 'Heart rate',          type: 'number',  unit: 'bpm',       min: 20,  max: 300, step: 1,   loinc: LOINC_VITALS.heartRate,        warning: v => v > 150 ? 'Tachycardia' : v < 40 ? 'Bradycardia' : null },
    { key: 'temperature',      label: 'Temperature',         type: 'number',  unit: '°C',        min: 30,  max: 45,  step: 0.1, loinc: LOINC_VITALS.temperature,      warning: v => v > 38.5 ? 'Fever' : v < 35 ? 'Hypothermia' : null },
    { key: 'oxygenSaturation', label: 'Oxygen saturation',  type: 'slider',  unit: '%',         min: 50,  max: 100, step: 1,   loinc: LOINC_VITALS.oxygenSaturation, warning: v => v < 90 ? 'Critical hypoxia' : v < 94 ? 'Low — review' : null },
    { key: 'respiratoryRate',  label: 'Respiratory rate',   type: 'number',  unit: 'breaths/min',min: 5, max: 60,  step: 1,   loinc: LOINC_VITALS.respiratoryRate,  warning: v => v > 30 ? 'Tachypnoea' : v < 10 ? 'Bradypnoea' : null },
    { key: 'weight',           label: 'Weight',              type: 'number',  unit: 'kg',        min: 1,   max: 300, step: 0.1, loinc: LOINC_VITALS.weight },
    { key: 'height',           label: 'Height',              type: 'number',  unit: 'cm',        min: 30,  max: 250, step: 0.1, loinc: LOINC_VITALS.height },
    { key: 'bmi',              label: 'BMI',                 type: 'calculated', unit: 'kg/m²',  loinc: LOINC_VITALS.bmi,
      calculate: (vals) => {
        const w = parseFloat(vals.weight), h = parseFloat(vals.height)
        if (!w || !h) return null
        return (w / Math.pow(h / 100, 2)).toFixed(1)
      },
      warning: v => v > 30 ? 'Obese' : v > 25 ? 'Overweight' : v < 18.5 ? 'Underweight' : null
    },
    { key: 'bloodGlucose',     label: 'Blood glucose',       type: 'number',  unit: 'mmol/L',   min: 1,   max: 50,  step: 0.1, loinc: LOINC_VITALS.bloodGlucose,    warning: v => v > 11.1 ? 'Hyperglycaemia' : v < 3.9 ? 'Hypoglycaemia' : null },
    { key: 'glucoseContext',   label: 'Glucose context',     type: 'select',  options: ['Fasting', 'Post-prandial (2hr)', 'Random'] },
    { key: 'recordedDate',     label: 'Date recorded',       type: 'date',    required: true },
    { key: 'notes',            label: 'Notes',               type: 'textarea' },
  ],

  labResults: [
    { key: 'cielConcept',      label: 'Test name (CIeL/LOINC)', type: 'ciel', required: true },
    { key: 'result',           label: 'Result value',        type: 'text',    required: true },
    { key: 'flag',             label: 'Flag',                type: 'select',  options: ['Normal', 'High', 'Low', 'Abnormal', 'Critical high', 'Critical low'] },
    { key: 'specimenType',     label: 'Specimen type',       type: 'select',  options: ['Blood', 'Urine', 'Sputum', 'Stool', 'Swab', 'CSF', 'Other'] },
    { key: 'collectionDate',   label: 'Collection date',     type: 'date',    required: true },
    { key: 'comments',         label: 'Comments',            type: 'textarea' },
  ],

  diagnoses: [
    { key: 'diagnosisName',    label: 'Diagnosis',           type: 'text',    required: true },
    { key: 'icdCode',          label: 'ICD-10 code',         type: 'text',    placeholder: 'e.g. E11.9' },
    { key: 'status',           label: 'Status',              type: 'select',  required: true, options: ['Active', 'Resolved', 'Chronic', 'Inactive', 'Suspected'] },
    { key: 'severity',         label: 'Severity',            type: 'select',  options: ['Mild', 'Moderate', 'Severe', 'Critical'] },
    { key: 'diagnosedDate',    label: 'Date diagnosed',      type: 'date' },
    { key: 'notes',            label: 'Clinical notes',      type: 'textarea' },
  ],

  medications: [
    { key: 'medicationName',   label: 'Medication name',     type: 'text',    required: true },
    { key: 'dosage',           label: 'Dose',                type: 'text',    required: true,  placeholder: 'e.g. 500mg' },
    { key: 'frequency',        label: 'Frequency',           type: 'select',  required: true,  options: ['Once daily (OD)', 'Twice daily (BD)', 'Three times daily (TDS)', 'Four times daily (QDS)', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'Weekly', 'Monthly', 'As needed (PRN)'] },
    { key: 'route',            label: 'Route',               type: 'select',  required: true,  options: ['Oral', 'Intravenous (IV)', 'Intramuscular (IM)', 'Subcutaneous (SC)', 'Topical', 'Inhaled', 'Sublingual', 'Rectal', 'Intranasal', 'Transdermal'] },
    { key: 'status',           label: 'Status',              type: 'select',  required: true,  options: ['Active', 'Stopped', 'Completed', 'On hold'] },
    { key: 'startDate',        label: 'Start date',          type: 'date' },
    { key: 'endDate',          label: 'End / stop date',     type: 'date' },
    { key: 'indication',       label: 'Indication',          type: 'text',    placeholder: 'e.g. Type 2 Diabetes' },
    { key: 'prescribingDoctor',label: 'Prescribing doctor',  type: 'text' },
    { key: 'notes',            label: 'Notes',               type: 'textarea' },
  ],

  allergies: [
    { key: 'allergen',         label: 'Allergen',            type: 'text',    required: true },
    { key: 'allergenCategory', label: 'Category',            type: 'select',  required: true,  options: ['Medication', 'Food', 'Environment', 'Latex', 'Other'] },
    { key: 'reaction',         label: 'Reaction type',       type: 'select',  options: ['Anaphylaxis', 'Urticaria / Rash', 'Angioedema', 'Bronchospasm', 'Nausea / Vomiting', 'Steven-Johnson Syndrome', 'Other'] },
    { key: 'severity',         label: 'Severity',            type: 'select',  required: true,  options: ['Mild', 'Moderate', 'Severe — life threatening'] },
    { key: 'onsetDate',        label: 'Onset date',          type: 'date' },
    { key: 'notes',            label: 'Additional notes',    type: 'textarea' },
  ],

  vaccinations: [
    { key: 'vaccineName',      label: 'Vaccine name',        type: 'text',    required: true },
    { key: 'vaccineCode',      label: 'CVX / WHO code',      type: 'text',    placeholder: 'e.g. CVX 207 for COVID-19 mRNA' },
    { key: 'dose',             label: 'Dose number',         type: 'select',  options: ['Dose 1', 'Dose 2', 'Dose 3', 'Booster', 'Single dose'] },
    { key: 'lotNumber',        label: 'Lot number',          type: 'text' },
    { key: 'dateGiven',        label: 'Date administered',   type: 'date',    required: true },
    { key: 'site',             label: 'Injection site',      type: 'select',  options: ['Left deltoid', 'Right deltoid', 'Left thigh', 'Right thigh', 'Oral', 'Other'] },
    { key: 'administrator',    label: 'Administered by',     type: 'text' },
    { key: 'notes',            label: 'Notes',               type: 'textarea' },
  ],

  consultations: [
    { key: 'chiefComplaint',        label: 'Chief complaint',       type: 'textarea', required: true },
    { key: 'duration',              label: 'Duration of complaint', type: 'text',     placeholder: 'e.g. 3 weeks' },
    { key: 'examinationFindings',   label: 'Examination findings',  type: 'textarea' },
    { key: 'assessment',            label: 'Assessment',            type: 'textarea' },
    { key: 'plan',                  label: 'Management plan',       type: 'textarea' },
    { key: 'followUpDate',          label: 'Follow-up date',        type: 'date' },
    { key: 'consultationDate',      label: 'Consultation date',     type: 'date',     required: true },
    { key: 'doctorNotes',           label: 'Additional notes',      type: 'textarea' },
  ],

  surgicalHistory: [
    { key: 'procedure',        label: 'Procedure name',      type: 'text',    required: true },
    { key: 'icdPCSCode',       label: 'ICD-10-PCS code',     type: 'text',    placeholder: 'e.g. 0DBJ4ZZ' },
    { key: 'indication',       label: 'Indication',          type: 'text' },
    { key: 'date',             label: 'Date of procedure',   type: 'date' },
    { key: 'outcome',          label: 'Outcome',             type: 'select',  options: ['Uncomplicated', 'Complicated', 'Ongoing', 'Unknown'] },
    { key: 'surgeon',          label: 'Surgeon',             type: 'text' },
    { key: 'anaesthesia',      label: 'Anaesthesia type',    type: 'select',  options: ['General', 'Spinal', 'Epidural', 'Local', 'Sedation', 'None'] },
    { key: 'notes',            label: 'Notes',               type: 'textarea' },
  ],

  familyHistory: [
    { key: 'relation',         label: 'Relation',            type: 'select',  required: true,  options: ['Father', 'Mother', 'Brother', 'Sister', 'Paternal grandfather', 'Paternal grandmother', 'Maternal grandfather', 'Maternal grandmother', 'Son', 'Daughter', 'Other'] },
    { key: 'condition',        label: 'Condition',           type: 'text',    required: true },
    { key: 'ageOfOnset',       label: 'Age of onset',        type: 'number',  min: 0, max: 120, step: 1 },
    { key: 'deceased',         label: 'Deceased',            type: 'select',  options: ['No', 'Yes — condition related', 'Yes — unrelated'] },
    { key: 'notes',            label: 'Notes',               type: 'textarea' },
  ],

  radiology: [
    { key: 'modality',         label: 'Modality',            type: 'select',  required: true,  options: ['X-ray', 'CT scan', 'MRI', 'Ultrasound', 'Mammography', 'PET scan', 'Fluoroscopy', 'Echocardiogram', 'Other'] },
    { key: 'bodyPart',         label: 'Body part / region',  type: 'text',    required: true },
    { key: 'indication',       label: 'Clinical indication', type: 'text' },
    { key: 'findings',         label: 'Findings',            type: 'textarea', required: true },
    { key: 'impression',       label: 'Impression',          type: 'textarea', required: true },
    { key: 'radiologist',      label: 'Radiologist',         type: 'text' },
    { key: 'studyDate',        label: 'Study date',          type: 'date',    required: true },
    { key: 'accessionNumber',  label: 'Accession number',    type: 'text' },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV / HL7 column → MedLink field auto-mapping hints
// Keys are lowercase normalised column names, values are MedLink field keys
// ─────────────────────────────────────────────────────────────────────────────
export const CSV_COLUMN_HINTS = {
  // Vitals
  'systolic': 'systolic', 'systolicbp': 'systolic', 'sbp': 'systolic',
  'diastolic': 'diastolic', 'diastolicbp': 'diastolic', 'dbp': 'diastolic',
  'heartrate': 'heartRate', 'pulse': 'heartRate', 'hr': 'heartRate',
  'temp': 'temperature', 'temperature': 'temperature',
  'spo2': 'oxygenSaturation', 'o2sat': 'oxygenSaturation', 'oxygensaturation': 'oxygenSaturation',
  'weight': 'weight', 'wt': 'weight',
  'height': 'height', 'ht': 'height',
  'glucose': 'bloodGlucose', 'bloodglucose': 'bloodGlucose', 'bgl': 'bloodGlucose',
  // Labs
  'testname': 'cielConcept', 'test': 'cielConcept', 'labtest': 'cielConcept',
  'result': 'result', 'value': 'result', 'labresult': 'result',
  'unit': 'unit', 'units': 'unit',
  'flag': 'flag', 'abnormal': 'flag',
  'specimen': 'specimenType', 'specimentype': 'specimenType',
  // Medications
  'medication': 'medicationName', 'drug': 'medicationName', 'medicine': 'medicationName',
  'dose': 'dosage', 'dosage': 'dosage',
  'frequency': 'frequency', 'freq': 'frequency',
  'route': 'route',
  'startdate': 'startDate', 'start': 'startDate',
  'enddate': 'endDate', 'stop': 'endDate', 'stopdate': 'endDate',
  // Diagnoses
  'diagnosis': 'diagnosisName', 'condition': 'diagnosisName', 'dx': 'diagnosisName',
  'icd': 'icdCode', 'icdcode': 'icdCode', 'icd10': 'icdCode',
  'status': 'status',
  // Allergies
  'allergen': 'allergen', 'allergy': 'allergen',
  'reaction': 'reaction',
  'severity': 'severity',
  // General
  'date': 'recordedDate', 'visitdate': 'consultationDate', 'collectiondate': 'collectionDate',
  'notes': 'notes', 'comments': 'notes',
  'facility': 'facilityName',
}

export const RECORD_TYPE_LABELS = {
  consultations:   'Consultations',
  diagnoses:       'Diagnoses',
  medications:     'Medications',
  labResults:      'Lab results',
  vitals:          'Vitals',
  allergies:       'Allergies',
  vaccinations:    'Vaccinations',
  surgicalHistory: 'Surgical history',
  familyHistory:   'Family history',
  radiology:       'Radiology',
}