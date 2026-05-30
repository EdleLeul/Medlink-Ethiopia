import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { Empty } from './tabHelpers.jsx'

Chart.register(...registerables)

export default function VitalsTab({ records }) {
  if (!records.length) return <Empty text="No vitals uploaded for this patient." />

  const sorted = [...records].sort((a, b) => {
    const ta = a.createdAt?._seconds || 0
    const tb = b.createdAt?._seconds || 0
    return ta - tb
  })

  const labels = sorted.map(r => {
    const d = r.createdAt?._seconds
      ? new Date(r.createdAt._seconds * 1000)
      : new Date(r.createdAt)
    return d.toLocaleDateString('en-ET', { month: 'short', day: 'numeric', year: '2-digit' })
  })

  return (
    <div style={{ paddingTop: 16 }}>
      <VitalsChart
        label="Blood pressure (mmHg)"
        labels={labels}
        datasets={[
          { label: 'Systolic',  data: sorted.map(r => r.systolic  || null), borderColor: '#E24B4A' },
          { label: 'Diastolic', data: sorted.map(r => r.diastolic || null), borderColor: '#185FA5' },
        ]}
      />
      <VitalsChart
        label="Weight (kg)"
        labels={labels}
        datasets={[{ label: 'Weight', data: sorted.map(r => r.weight || null), borderColor: '#1D9E75' }]}
      />
      <VitalsChart
        label="Blood glucose (mmol/L)"
        labels={labels}
        datasets={[{ label: 'Glucose', data: sorted.map(r => r.bloodGlucose || null), borderColor: '#BA7517' }]}
      />
      <VitalsChart
        label="Oxygen saturation (%)"
        labels={labels}
        datasets={[{ label: 'SpO2', data: sorted.map(r => r.oxygenSaturation || null), borderColor: '#185FA5' }]}
      />
      <VitalsChart
        label="Heart rate (bpm)"
        labels={labels}
        datasets={[{ label: 'HR', data: sorted.map(r => r.heartRate || null), borderColor: '#9B59B6' }]}
      />
    </div>
  )
}

function VitalsChart({ label, labels, datasets }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  const hasData = datasets.some(d => d.data.some(v => v !== null))

  useEffect(() => {
    if (!canvasRef.current || !hasData) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map(d => ({
          ...d,
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
          spanGaps: true,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1, labels: { font: { size: 11 }, boxWidth: 12 } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } },
        },
      },
    })
    return () => chartRef.current?.destroy()
  }, [JSON.stringify(labels), JSON.stringify(datasets)])

  if (!hasData) return null

  return (
    <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 10, fontWeight: 500 }}>{label}</div>
      <div style={{ height: 160, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}